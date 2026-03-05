import axios from "axios";

const ML_BASE_URL = process.env.ML_SERVICE_URL || "http://ml-service:8000";

function throwMlServiceError(operation, error) {
  const wrapped = new Error("ML service request failed");

  if (error?.response) {
    wrapped.status = 502;
    const detail =
      error.response.data?.detail ||
      error.response.data?.error?.message ||
      error.response.statusText ||
      "unknown upstream error";
    wrapped.message = `ML service ${operation} failed: ${detail}`;
  } else if (
    error?.code === "ECONNREFUSED" ||
    error?.code === "ECONNRESET" ||
    error?.code === "ETIMEDOUT" ||
    error?.code === "ECONNABORTED"
  ) {
    wrapped.status = 503;
    wrapped.message =
      "ML service is unavailable at http://localhost:8000. Start ml-service and retry.";
  } else {
    wrapped.status = 502;
    wrapped.message = `ML service ${operation} failed: ${error?.message || "unknown error"}`;
  }

  wrapped.cause = error;
  throw wrapped;
}

export async function getRiskScore(features) {
  try {
    const response = await axios.post(`${ML_BASE_URL}/predict`, { features });
    return response.data.risk_score;
  } catch (error) {
    throwMlServiceError("prediction", error);
  }
}

export async function getSimilarCases(embedding, topK = 5) {
  try {
    const response = await axios.post(`${ML_BASE_URL}/similar-cases`, {
      embedding,
      top_k: topK,
    });
    return response.data.cases || [];
  } catch (error) {
    throwMlServiceError("similar-cases lookup", error);
  }
}

