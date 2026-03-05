import express from "express";
import { body } from "express-validator";
import { predictController } from "../controllers/predictController.js";

export const router = express.Router();

const validationMiddleware = [
  body("age")
    .exists()
    .withMessage("age is required")
    .isInt({ min: 18, max: 120 })
    .withMessage("age must be between 18 and 120")
    .toInt(),
  body("gender")
    .exists()
    .withMessage("gender is required")
    .isIn(["Male", "Female", "Other"])
    .withMessage("gender must be Male, Female, or Other"),
  body("time_in_hospital")
    .exists()
    .withMessage("time_in_hospital is required")
    .isInt({ min: 0 })
    .withMessage("time_in_hospital must be a non-negative integer")
    .toInt(),
  body("num_medications")
    .exists()
    .withMessage("num_medications is required")
    .isInt({ min: 0 })
    .withMessage("num_medications must be a non-negative integer")
    .toInt(),
  body("number_inpatient")
    .exists()
    .withMessage("number_inpatient is required")
    .isInt({ min: 0 })
    .withMessage("number_inpatient must be a non-negative integer")
    .toInt(),
  body("diabetesMed")
    .exists()
    .withMessage("diabetesMed is required")
    .isIn(["Yes", "No"])
    .withMessage("diabetesMed must be Yes or No"),
];

router.post("/", validationMiddleware, predictController);

