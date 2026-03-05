## Patient Readmission Risk Prediction System

This monorepo contains a full-stack, production-ready web application for predicting 30-day hospital readmission risk and generating preventive healthcare recommendations using classical ML and LLMs.

### Structure

- `frontend/` – React SPA for doctors to enter discharge data and view risk dashboard.
- `backend/` – Node.js + Express API, MySQL integration, OpenAI + Chroma/ML orchestration.
- `ml-service/` – Python FastAPI microservice for ML prediction and ChromaDB similarity search.

### High-Level Flow

1. Doctor enters discharge data in the React UI.
2. `frontend` calls `POST /api/predict` on the `backend`.
3. `backend` validates input and stores patient data in MySQL.
4. `backend` calls `ml-service /predict` to get a readmission probability.
5. `backend` computes OpenAI embeddings for the patient summary.
6. `backend` sends the embedding to `ml-service /similar-cases`, which queries ChromaDB (`patient_cases` collection).
7. `backend` calls OpenAI Chat Completion with patient data, risk score, and similar cases to get structured recommendations.
8. Response is persisted in MySQL (`predictions` table) and returned to the frontend.
9. React renders a risk dashboard with explanations and recommendations.

### Services

- **Frontend**: React (Hooks), Axios, modern UI.
- **Backend**: Node.js, Express, MySQL, OpenAI SDK.
- **ML Service**: FastAPI, scikit-learn `RandomForestClassifier`, Pandas, ChromaDB.
- **Database**: MySQL (patients, predictions tables).

Detailed setup, environment variables, and run instructions are provided at the end of this file after all services are implemented.

