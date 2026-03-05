import os
from typing import Any, Dict, List

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sklearn.pipeline import Pipeline
from dotenv import load_dotenv
import chromadb
from chromadb.config import Settings

load_dotenv()

MODEL_PATH = os.getenv("MODEL_PATH", "./model.pkl")
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma")


class PredictRequest(BaseModel):
    features: Dict[str, Any]


class SimilarCasesRequest(BaseModel):
    embedding: List[float]
    top_k: int = 5


def load_model_bundle() -> Dict[str, Any]:
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(
            f"Model file not found at {MODEL_PATH}. "
            "Run train_model.py during setup to create it."
        )
    return joblib.load(MODEL_PATH)


def load_patient_collection() -> chromadb.Collection:
    client = chromadb.PersistentClient(
        path=CHROMA_DB_PATH,
        settings=Settings(anonymized_telemetry=False),
    )
    try:
        collection = client.get_collection("patient_cases")
    except Exception as exc:  # collection does not exist
        raise RuntimeError(
            "Chroma collection 'patient_cases' not found. "
            "Run build_vector_db.py during setup to create it."
        ) from exc
    return collection


model_bundle = load_model_bundle()
patient_collection = load_patient_collection()

app = FastAPI(title="Patient Readmission ML Service", version="1.0.0")


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "service": "ml-service"}


@app.post("/predict")
def predict(req: PredictRequest) -> Dict[str, float]:
    features = req.features
    feature_columns = model_bundle["feature_columns"]

    X_row = {col: features.get(col) for col in feature_columns}
    X_df = pd.DataFrame([X_row])

    model: Pipeline = model_bundle["model"]
    try:
        proba = model.predict_proba(X_df)[0][1]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {exc}") from exc

    return {"risk_score": float(proba)}


@app.post("/similar-cases")
def similar_cases(req: SimilarCasesRequest) -> Dict[str, Any]:
    embedding = req.embedding
    top_k = req.top_k

    if not isinstance(embedding, list) or len(embedding) == 0:
        raise HTTPException(status_code=400, detail="embedding must be a non-empty list")

    try:
        results = patient_collection.query(
            query_embeddings=[embedding],
            n_results=top_k,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"ChromaDB query failed: {exc}") from exc

    cases: List[Dict[str, Any]] = []
    for i in range(len(results.get("ids", [[]])[0])):
        cases.append(
            {
                "id": results["ids"][0][i],
                "distance": float(results.get("distances", [[None]])[0][i])
                if results.get("distances")
                else None,
                "document": results.get("documents", [[None]])[0][i],
                "metadata": results.get("metadatas", [[None]])[0][i],
            }
        )

    return {"cases": cases}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

