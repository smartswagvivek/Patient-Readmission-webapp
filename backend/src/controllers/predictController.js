import { handlePredictionRequest } from "../services/patientService.js";

export async function predictController(req, res, next) {
  try {
    const result = await handlePredictionRequest(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

