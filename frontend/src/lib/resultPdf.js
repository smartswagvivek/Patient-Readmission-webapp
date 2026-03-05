function asText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => asText(item)).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => asText(item))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function splitToPoints(value) {
  const text = asText(value);
  if (!text) return [];
  return text
    .split(/\n|\u2022|- |\d+\.\s|;/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toRecommendationObject(rawRecommendations) {
  if (!rawRecommendations) return {};
  if (typeof rawRecommendations === "object") return rawRecommendations;
  if (typeof rawRecommendations === "string") {
    try {
      const parsed = JSON.parse(rawRecommendations);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      return { risk_explanation: rawRecommendations };
    }
  }
  return {};
}

function parseSimilarity(caseItem) {
  if (typeof caseItem?.similarity_score === "number") {
    return Math.max(0, Math.min(100, Math.round(caseItem.similarity_score * 100)));
  }
  if (typeof caseItem?.distance === "number") {
    return Math.max(0, Math.min(100, Math.round((1 - caseItem.distance) * 100)));
  }
  return null;
}

function toAscii(value) {
  return value.replace(/[^\x20-\x7E]/g, " ");
}

function escapePdfText(value) {
  return toAscii(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(value, maxChars = 96) {
  const normalized = asText(value).replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const words = normalized.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function createPdfBuilder() {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 48;

  const pages = [[]];
  let currentPage = 0;
  let y = pageHeight - margin;

  function ensurePageSpace(linesNeeded = 1, lineHeight = 15) {
    if (y - linesNeeded * lineHeight < margin) {
      pages.push([]);
      currentPage += 1;
      y = pageHeight - margin;
    }
  }

  function addLine(text, options = {}) {
    const {
      size = 11,
      bold = false,
      indent = 0,
      lineHeight = size + 4,
      maxChars = 96,
    } = options;

    const wrapped = wrapText(text, maxChars);
    if (wrapped.length === 0) {
      ensurePageSpace(1, lineHeight);
      y -= lineHeight;
      return;
    }

    for (const line of wrapped) {
      ensurePageSpace(1, lineHeight);
      const fontId = bold ? "F2" : "F1";
      const x = margin + indent;
      const safeLine = escapePdfText(line);
      pages[currentPage].push(
        `BT /${fontId} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${safeLine}) Tj ET`
      );
      y -= lineHeight;
    }
  }

  function addSpacer(height = 8) {
    ensurePageSpace(1, height);
    y -= height;
  }

  function addSection(title) {
    addLine(title, { size: 14, bold: true, lineHeight: 20, maxChars: 72 });
    addSpacer(2);
  }

  function addKeyValue(label, value) {
    const text = `${label}: ${asText(value) || "Not available"}`;
    addLine(text, { maxChars: 88 });
  }

  function addBullets(items) {
    const safeItems = items && items.length ? items : ["Not available"];
    for (const item of safeItems) {
      addLine(`- ${item}`, { indent: 6, maxChars: 86 });
    }
  }

  function buildPdfString() {
    const pageCount = pages.length;
    const maxObjectNumber = 4 + pageCount * 2;
    const fontRegularObjectNumber = 3 + pageCount * 2;
    const fontBoldObjectNumber = 4 + pageCount * 2;

    const objects = new Array(maxObjectNumber + 1);
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";

    const pageObjectNumbers = [];
    for (let index = 0; index < pageCount; index += 1) {
      const pageObjectNumber = 3 + index * 2;
      const contentObjectNumber = pageObjectNumber + 1;
      pageObjectNumbers.push(pageObjectNumber);

      const streamContent = `${pages[index].join("\n")}\n`;
      const streamLength = new TextEncoder().encode(streamContent).length;

      objects[pageObjectNumber] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Resources << /Font << /F1 ${fontRegularObjectNumber} 0 R /F2 ${fontBoldObjectNumber} 0 R >> >> ` +
        `/Contents ${contentObjectNumber} 0 R >>`;

      objects[contentObjectNumber] =
        `<< /Length ${streamLength} >>\nstream\n${streamContent}endstream`;
    }

    objects[2] = `<< /Type /Pages /Count ${pageCount} /Kids [${pageObjectNumbers.map((num) => `${num} 0 R`).join(" ")}] >>`;
    objects[fontRegularObjectNumber] =
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[fontBoldObjectNumber] =
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

    let pdf = "%PDF-1.4\n";
    const offsets = new Array(maxObjectNumber + 1).fill(0);

    for (let i = 1; i <= maxObjectNumber; i += 1) {
      offsets[i] = pdf.length;
      pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${maxObjectNumber + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i <= maxObjectNumber; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${maxObjectNumber + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xrefStart}\n%%EOF`;
    return pdf;
  }

  return {
    addLine,
    addSpacer,
    addSection,
    addKeyValue,
    addBullets,
    buildPdfString,
  };
}

export function downloadResultPdf({ result, input, completedAt }) {
  if (!result || typeof result !== "object") {
    throw new Error("Prediction result is missing.");
  }

  const safeResult = result;
  const riskScore = Number(safeResult.risk_score) || 0;
  const riskLevel =
    safeResult.risk_level ||
    (riskScore > 0.7 ? "High" : riskScore > 0.4 ? "Medium" : "Low");

  const recommendations = toRecommendationObject(safeResult.recommendations);
  const explanation =
    asText(recommendations.risk_explanation) || "No explanation available.";
  const preventivePoints = splitToPoints(recommendations.preventive_care_plan);
  const followUpPoints = splitToPoints(recommendations.follow_up_recommendation);
  const medicationPoints = splitToPoints(recommendations.medication_review);

  const similarCases = Array.isArray(safeResult.similar_cases)
    ? safeResult.similar_cases.filter((item) => item && typeof item === "object")
    : [];

  const reportTimestamp = completedAt ? new Date(completedAt) : new Date();
  const generatedAt = Number.isNaN(reportTimestamp.getTime())
    ? new Date().toISOString()
    : reportTimestamp.toISOString();
  const readableDate = generatedAt.replace("T", " ").replace("Z", " UTC");

  const builder = createPdfBuilder();

  builder.addLine("Patient Readmission Risk Report", {
    size: 18,
    bold: true,
    lineHeight: 24,
    maxChars: 58,
  });
  builder.addLine(`Generated: ${readableDate}`, { size: 10, maxChars: 96 });
  builder.addSpacer(10);

  builder.addSection("Risk Summary");
  builder.addKeyValue("Risk Score", `${riskScore.toFixed(3)} (${(riskScore * 100).toFixed(1)}%)`);
  builder.addKeyValue("Risk Level", riskLevel);
  builder.addSpacer(8);

  builder.addSection("Patient Input Snapshot");
  builder.addKeyValue("Age", input?.age);
  builder.addKeyValue("Gender", input?.gender);
  builder.addKeyValue("Time in Hospital (days)", input?.time_in_hospital);
  builder.addKeyValue("Number of Medications", input?.num_medications);
  builder.addKeyValue("Inpatient Visits", input?.number_inpatient);
  builder.addKeyValue("Diabetes Medication", input?.diabetesMed);
  builder.addSpacer(8);

  builder.addSection("AI Explanation");
  builder.addLine(explanation, { maxChars: 92 });
  builder.addSpacer(8);

  builder.addSection("Preventive Care Plan");
  builder.addBullets(preventivePoints);
  builder.addSpacer(8);

  builder.addSection("Follow-Up Recommendation");
  builder.addBullets(followUpPoints);
  builder.addSpacer(8);

  builder.addSection("Medication Review");
  builder.addBullets(medicationPoints);
  builder.addSpacer(8);

  builder.addSection(`Similar Cases (${similarCases.length})`);
  if (similarCases.length === 0) {
    builder.addLine("No similar case data available.");
  } else {
    similarCases.forEach((item, index) => {
      const similarity = parseSimilarity(item);
      const readmission = item?.metadata?.readmission_30;
      const caseName = item.id || `CASE-${index + 1}`;
      const readmissionLabel =
        readmission === 1 || readmission === "1"
          ? "Yes"
          : readmission === 0 || readmission === "0"
            ? "No"
            : "Unknown";
      builder.addLine(
        `${caseName} | Similarity: ${similarity !== null ? `${similarity}%` : "N/A"} | Readmission: ${readmissionLabel}`,
        { bold: true, maxChars: 86 }
      );
      builder.addLine(asText(item.document) || "No summary available.", {
        indent: 10,
        maxChars: 84,
      });
      builder.addSpacer(4);
    });
  }

  const pdfText = builder.buildPdfString();
  const blob = new Blob([pdfText], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const datePart = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `readmission-report-${datePart}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
