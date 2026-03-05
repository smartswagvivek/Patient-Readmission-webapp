import { query } from "./db.js";

export async function createPatient(patient) {
  const sql = `
    INSERT INTO patients (
      age, gender, race,
      time_in_hospital, num_medications, number_inpatient
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const params = [
    patient.age,
    patient.gender,
    patient.race,
    patient.time_in_hospital,
    patient.num_medications,
    patient.number_inpatient,
  ];

  const result = await query(sql, params);
  return { id: result.insertId, ...patient };
}

