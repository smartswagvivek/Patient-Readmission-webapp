import { query } from "./db.js";

export async function createPrediction(prediction) {
  const sql = `
    INSERT INTO predictions (
      patient_id,
      risk_score,
      risk_level,
      recommendation,
      created_at
    )
    VALUES (?, ?, ?, ?, NOW())
  `;

  const params = [
    prediction.patient_id,
    prediction.risk_score,
    prediction.risk_level,
    prediction.recommendation,
  ];

  const result = await query(sql, params);
  return { id: result.insertId, ...prediction };
}

