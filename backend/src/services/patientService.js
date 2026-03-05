import { validationResult } from "express-validator";
import { createPatient } from "../models/patientModel.js";
import { createPrediction } from "../models/predictionModel.js";
import { getRiskScore, getSimilarCases } from "./mlService.js";
import { createEmbeddingForText, generateClinicalRecommendations } from "./openaiService.js";

function mapRiskLevel(score) {
  if (score >= 0.7) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
}

function buildPatientSummary(input) {
  return `
Patient demographics: ${input.age} years old, ${input.gender}, race: ${input.race}.
Admission type: ${input.admission_type_id}, source: ${input.admission_source_id}, discharge disposition: ${input.discharge_disposition_id}.
Hospitalization: time in hospital ${input.time_in_hospital} days, ${input.num_lab_procedures} lab procedures, ${input.num_procedures} procedures.
Medications: ${input.num_medications} meds; diabetesMed=${input.diabetesMed}; change=${input.change}.
Utilization: outpatient ${input.number_outpatient}, emergency ${input.number_emergency}, inpatient ${input.number_inpatient}.
Diagnoses: diag_1=${input.diag_1}, diag_2=${input.diag_2}, diag_3=${input.diag_3}.
  `.trim();
}

function ageToBucket(ageValue) {
  const age = Number(ageValue);
  if (Number.isNaN(age)) return "Unknown";
  const clamped = Math.max(0, Math.min(99, Math.floor(age)));
  const lower = Math.floor(clamped / 10) * 10;
  const upper = lower + 10;
  return `[${lower}-${upper})`;
}

function toNumberOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeInput(input) {
  const defaults = {
    race: "Unknown",
    admission_type_id: 1,
    discharge_disposition_id: 1,
    admission_source_id: 7,
    num_lab_procedures: 0,
    num_procedures: 0,
    number_outpatient: 0,
    number_emergency: 0,
    diag_1: 0,
    diag_2: 0,
    diag_3: 0,
    change: "No",
  };

  const merged = {
    ...defaults,
    ...input,
  };

  return {
    ...merged,
    age: ageToBucket(input.age),
    time_in_hospital: toNumberOr(merged.time_in_hospital, 0),
    num_medications: toNumberOr(merged.num_medications, 0),
    number_inpatient: toNumberOr(merged.number_inpatient, 0),
    admission_type_id: toNumberOr(merged.admission_type_id, 1),
    discharge_disposition_id: toNumberOr(merged.discharge_disposition_id, 1),
    admission_source_id: toNumberOr(merged.admission_source_id, 7),
    num_lab_procedures: toNumberOr(merged.num_lab_procedures, 0),
    num_procedures: toNumberOr(merged.num_procedures, 0),
    number_outpatient: toNumberOr(merged.number_outpatient, 0),
    number_emergency: toNumberOr(merged.number_emergency, 0),
    diag_1: toNumberOr(merged.diag_1, 0),
    diag_2: toNumberOr(merged.diag_2, 0),
    diag_3: toNumberOr(merged.diag_3, 0),
  };
}

export async function handlePredictionRequest(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.details = errors.array();
    throw error;
  }

  const input = req.body;
  const normalizedInput = normalizeInput(input);

  const patientRecord = await createPatient({
    age: String(input.age),
    gender: normalizedInput.gender,
    race: normalizedInput.race,
    time_in_hospital: normalizedInput.time_in_hospital,
    num_medications: normalizedInput.num_medications,
    number_inpatient: normalizedInput.number_inpatient,
  });

  const features = normalizedInput;
  const riskScore = await getRiskScore(features);
  const riskLevel = mapRiskLevel(riskScore);

  const summaryText = buildPatientSummary(normalizedInput);
  const embedding = await createEmbeddingForText(summaryText);

  const similarCases = await getSimilarCases(embedding, 5);

  const recs = await generateClinicalRecommendations({
    patient: normalizedInput,
    riskScore,
    riskLevel,
    similarCases,
  });

  const predictionRecord = await createPrediction({
    patient_id: patientRecord.id,
    risk_score: riskScore,
    risk_level: riskLevel,
    recommendation: JSON.stringify(recs),
  });

  return {
    patient_id: patientRecord.id,
    prediction_id: predictionRecord.id,
    risk_score: riskScore,
    risk_level: riskLevel,
    recommendations: recs,
    similar_cases: similarCases,
  };
}

