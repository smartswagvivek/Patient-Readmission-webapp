import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { RecommendationCard } from "../components/RecommendationCard.jsx";
import { RiskCard } from "../components/RiskCard.jsx";
import { downloadResultPdf } from "../lib/resultPdf.js";

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
  if (typeof caseItem.similarity_score === "number") {
    return Math.max(0, Math.min(100, Math.round(caseItem.similarity_score * 100)));
  }
  if (typeof caseItem.distance === "number") {
    return Math.max(0, Math.min(100, Math.round((1 - caseItem.distance) * 100)));
  }
  return null;
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-3xl border border-slate-200 bg-white" />
        <div className="h-48 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      </div>
      <div className="h-60 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      <div className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white" />
    </div>
  );
}

export function Results() {
  const location = useLocation();
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setShowSkeleton(false), 650);
    return () => clearTimeout(timer);
  }, []);

  const result = location.state?.result;
  const input = location.state?.input;
  const completedAt = location.state?.completedAt;
  const safeResult = result && typeof result === "object" ? result : {};

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

  const highlightedFactors = useMemo(() => {
    const keywords = [
      "age",
      "time in hospital",
      "medications",
      "inpatient",
      "diabetes medication",
      "follow-up",
    ];
    const normalizedText = asText(explanation).toLowerCase();
    return keywords.filter((keyword) => normalizedText.includes(keyword));
  }, [explanation]);

  const similarCases = Array.isArray(safeResult.similar_cases)
    ? safeResult.similar_cases.filter((item) => item && typeof item === "object")
    : [];

  function handleDownloadPdf() {
    try {
      setPdfError("");
      setIsDownloadingPdf(true);
      downloadResultPdf({ result: safeResult, input, completedAt });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to generate PDF report.";
      setPdfError(message);
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  if (!result) {
    return (
      <section className="animate-reveal-soft interactive-lift rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-soft">
        <h1 className="text-3xl font-bold text-slate-900">No Risk Assessment Loaded</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Start a patient assessment to generate risk score, recommendations, and
          similar patient intelligence.
        </p>
        <Link
          to="/predict"
          className="interactive-lift mt-6 inline-flex rounded-2xl bg-medical-primary px-6 py-3 font-bold text-white transition hover:bg-medical-primary-dark"
        >
          Go to Patient Assessment
        </Link>
      </section>
    );
  }

  if (showSkeleton) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="stagger-reveal space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          className="interactive-lift inline-flex items-center justify-center rounded-2xl border border-medical-primary/30 bg-white px-5 py-2.5 text-sm font-bold text-medical-primary transition hover:border-medical-primary hover:bg-medical-surface disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isDownloadingPdf ? "Preparing PDF..." : "Download PDF Report"}
        </button>
      </div>

      {pdfError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {pdfError}
        </div>
      ) : null}

      <RiskCard riskScore={riskScore} riskLevel={riskLevel} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecommendationCard
          title="AI Explanation"
          subtitle="Primary factors influencing this patient risk profile."
        >
          <p className="leading-relaxed text-slate-700">{explanation}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(highlightedFactors.length > 0 ? highlightedFactors : ["clinical history"]).map(
              (factor) => (
                <span
                  key={factor}
                  className="rounded-full border border-medical-primary/20 bg-medical-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-medical-primary"
                >
                  {factor}
                </span>
              )
            )}
          </div>
        </RecommendationCard>

        <RecommendationCard
          title="Preventive Care Plan"
          subtitle="Recommended interventions for safer post-discharge recovery."
        >
          <ul className="space-y-3">
            {(preventivePoints.length > 0 ? preventivePoints : ["No preventive plan provided."]).map(
              (item) => (
                <li key={item} className="flex gap-3 text-slate-700">
                  <span className="mt-2 h-2 w-2 rounded-full bg-medical-primary" />
                  <span>{item}</span>
                </li>
              )
            )}
          </ul>
        </RecommendationCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecommendationCard
          title="Follow-Up Recommendation"
          subtitle="Suggested timeline for post-discharge monitoring."
        >
          <ol className="space-y-4">
            {(followUpPoints.length > 0 ? followUpPoints : ["No follow-up recommendation provided."]).map(
              (item, index) => (
                <li key={`${index}-${item}`} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-medical-surface text-sm font-bold text-medical-primary">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-slate-700">{item}</p>
                </li>
              )
            )}
          </ol>
        </RecommendationCard>

        <RecommendationCard
          title="Medication Review"
          subtitle="Medication guidance points for reconciliation."
        >
          <ul className="space-y-3">
            {(medicationPoints.length > 0 ? medicationPoints : ["No medication guidance provided."]).map(
              (item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-medical-ice px-3 py-2 text-slate-700 transition duration-300 hover:border-medical-primary/40 hover:bg-white"
                >
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-medical-primary" />
                  <span>{item}</span>
                </li>
              )
            )}
          </ul>
        </RecommendationCard>
      </div>

      <RecommendationCard
        title="Similar Patient Cases"
        subtitle="Historical matches to support comparative clinical judgment."
        className="overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-medical-ice text-xs uppercase tracking-[0.09em] text-slate-600">
              <tr>
                <th className="px-4 py-3">Patient ID</th>
                <th className="px-4 py-3">Similarity</th>
                <th className="px-4 py-3">Readmission</th>
                <th className="px-4 py-3">Summary</th>
              </tr>
            </thead>
            <tbody>
              {similarCases.length > 0 ? (
                similarCases.map((item, index) => {
                  const similarity = parseSimilarity(item);
                  const readmission = item?.metadata?.readmission_30;
                  return (
                    <tr key={item.id || `case-${index}`} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {item.id || `CASE-${index + 1}`}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {similarity !== null ? `${similarity}%` : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {readmission === 1 || readmission === "1"
                          ? "Yes"
                          : readmission === 0 || readmission === "0"
                            ? "No"
                            : "Unknown"}
                      </td>
                      <td className="max-w-xl px-4 py-3 text-slate-600">
                        <p className="table-summary">
                          {asText(item.document) || "No summary available."}
                        </p>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    Similar case data is not available for this assessment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </RecommendationCard>
    </div>
  );
}
