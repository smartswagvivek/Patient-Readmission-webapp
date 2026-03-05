import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

let openaiClient = null;
let geminiClient = null;
const GEMINI_EMBED_MODEL_ALIASES = {
  "text-embedding-004": "gemini-embedding-001",
  "models/text-embedding-004": "gemini-embedding-001",
  "embedding-001": "gemini-embedding-001",
  "models/embedding-001": "gemini-embedding-001",
};
const GEMINI_CHAT_MODEL_ALIASES = {
  "gemini-1.5-flash-latest": "gemini-2.5-flash",
  "gemini-1.5-flash": "gemini-2.5-flash",
  "gemini-1.5-pro-latest": "gemini-2.5-flash",
  "gemini-1.5-pro": "gemini-2.5-flash",
  "gemini-pro": "gemini-2.5-flash",
};
const GEMINI_CHAT_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

function resolveGeminiEmbeddingModel(model) {
  const configured = (model || "").trim();
  if (!configured) return "gemini-embedding-001";
  return GEMINI_EMBED_MODEL_ALIASES[configured] || configured;
}

function resolveGeminiChatModel(model) {
  const configured = (model || "").trim();
  if (!configured) return "gemini-2.5-flash";
  return GEMINI_CHAT_MODEL_ALIASES[configured] || configured;
}

function extractJsonObject(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return "{}";
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return "{}";
}

function cleanAsterisksInText(value) {
  if (typeof value !== "string") return value;
  return value.replace(/\*\*/g, "").trim();
}

function deepCleanAsterisks(value) {
  if (Array.isArray(value)) {
    return value.map((item) => deepCleanAsterisks(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, deepCleanAsterisks(item)])
    );
  }
  return cleanAsterisksInText(value);
}

async function generateWithGeminiFallback(client, preferredModel, promptText) {
  const candidates = [
    resolveGeminiChatModel(preferredModel),
    ...GEMINI_CHAT_FALLBACK_MODELS,
  ].filter((v, i, arr) => v && arr.indexOf(v) === i);

  let lastNotFoundError = null;
  for (const modelName of candidates) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
      });
      return result.response.text() || "{}";
    } catch (error) {
      const message = error?.message || String(error);
      if (message.includes("404 Not Found")) {
        lastNotFoundError = error;
        continue;
      }
      throw error;
    }
  }

  throw (
    lastNotFoundError ||
    new Error("No compatible Gemini chat model available for generateContent")
  );
}

function getRuntimeConfig() {
  return {
    provider: process.env.LLM_PROVIDER || "openai",
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiEmbeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    openaiChatModel: process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiChatModel: resolveGeminiChatModel(
      process.env.GEMINI_MODEL || "gemini-2.5-flash"
    ),
    geminiEmbeddingModel: resolveGeminiEmbeddingModel(
      process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001"
    ),
  };
}

function getOpenAIClient(apiKey) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

function getGeminiClient(apiKey) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

export async function createEmbeddingForText(text) {
  const config = getRuntimeConfig();

  if (config.provider === "gemini") {
    const client = getGeminiClient(config.geminiApiKey);
    const model = client.getGenerativeModel({
      model: config.geminiEmbeddingModel,
    });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  // Default: OpenAI
  const client = getOpenAIClient(config.openaiApiKey);
  const response = await client.embeddings.create({
    model: config.openaiEmbeddingModel,
    input: text,
  });

  return response.data[0].embedding;
}

export async function generateClinicalRecommendations({
  patient,
  riskScore,
  riskLevel,
  similarCases,
}) {
  const config = getRuntimeConfig();

  const systemPrompt =
    "You are a clinical decision support assistant. Use evidence-based medicine and be concise. Return ONLY valid JSON.";

  const userPayload = {
    patient,
    risk_score: riskScore,
    risk_level: riskLevel,
    similar_cases: similarCases,
  };

  const prompt =
    "Given the following patient discharge data, predicted readmission risk, and similar historical cases, provide:\n" +
    "- Risk explanation\n" +
    "- Preventive care plan\n" +
    "- Follow-up recommendation\n" +
    "- Medication review suggestions\n\n" +
    "Respond as a JSON object with keys: risk_explanation, preventive_care_plan, follow_up_recommendation, medication_review.\n\n" +
    `INPUT:\n${JSON.stringify(userPayload, null, 2)}`;

  if (config.provider === "gemini") {
    const client = getGeminiClient(config.geminiApiKey);
    const text = await generateWithGeminiFallback(
      client,
      config.geminiChatModel,
      `${systemPrompt}\n\n${prompt}`
    );
    return deepCleanAsterisks(JSON.parse(extractJsonObject(text)));
  }

  // Default: OpenAI
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const client = getOpenAIClient(config.openaiApiKey);
  const completion = await client.chat.completions.create({
    model: config.openaiChatModel,
    messages,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content || "{}";
  return deepCleanAsterisks(JSON.parse(content));
}

