import os
import re
import time
from typing import Any, Dict, List

import pandas as pd
import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv

try:
    import google.genai as genai
except ImportError:
    import google.generativeai as genai

load_dotenv()

DATA_PATH = os.getenv("DATA_PATH", "./data/Patient_Readmission_200_Records.xlsx")
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_EMBEDDING_MODEL = os.getenv(
    "GEMINI_EMBEDDING_MODEL",
    "models/gemini-embedding-001",
)
LEGACY_EMBEDDING_MODEL_ALIASES = {
    "models/embedding-001": "models/gemini-embedding-001",
    "embedding-001": "models/gemini-embedding-001",
}
GEMINI_EMBED_BATCH_SIZE = max(1, int(os.getenv("GEMINI_EMBED_BATCH_SIZE", "20")))
GEMINI_EMBED_ITEMS_PER_MIN = max(1, int(os.getenv("GEMINI_EMBED_ITEMS_PER_MIN", "100")))
GEMINI_EMBED_MAX_RETRIES = max(1, int(os.getenv("GEMINI_EMBED_MAX_RETRIES", "5")))


def load_dataset() -> pd.DataFrame:
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Dataset not found at {DATA_PATH}. "
            "Place the processed Diabetes 130-US hospitals Excel file there."
        )
    return pd.read_excel(DATA_PATH)


def build_patient_summary(row: pd.Series) -> str:
    return (
        f"Patient {row.get('age', 'unknown')} years old, gender {row.get('gender', 'unknown')}, "
        f"race {row.get('race', 'unknown')}. Time in hospital {row.get('time_in_hospital', 'n/a')} days, "
        f"{row.get('num_medications', 'n/a')} medications, {row.get('number_inpatient', 'n/a')} prior inpatient visits. "
        f"Primary diagnosis {row.get('diag_1', 'n/a')}. Readmission within 30 days: {row.get('readmission_30', 'n/a')}."
    )


def resolve_embedding_model(client: Any, configured_model: str) -> str:
    model_name = (configured_model or "").strip()
    model_name = LEGACY_EMBEDDING_MODEL_ALIASES.get(model_name, model_name)
    if not model_name:
        model_name = "models/gemini-embedding-001"
    if not model_name.startswith("models/"):
        model_name = f"models/{model_name}"

    try:
        supported = [
            model.name
            for model in client.models.list()
            if "embedContent" in (getattr(model, "supported_actions", []) or [])
        ]
        if model_name in supported:
            return model_name
        if supported:
            fallback = supported[0]
            print(
                f"Embedding model '{model_name}' is unavailable. "
                f"Using '{fallback}' instead."
            )
            return fallback
    except Exception as exc:
        print(
            f"Could not list embedding models. "
            f"Using '{model_name}'. Details: {exc}"
        )

    return model_name


def _parse_retry_delay_seconds(error_message: str) -> float:
    match = re.search(r"retry in ([0-9]*\\.?[0-9]+)s", error_message, flags=re.IGNORECASE)
    if not match:
        return 0.0
    try:
        return float(match.group(1))
    except ValueError:
        return 0.0


def embed_batch_with_retry(client: Any, model: str, batch: List[str]) -> Any:
    for attempt in range(1, GEMINI_EMBED_MAX_RETRIES + 1):
        try:
            return client.models.embed_content(
                model=model,
                contents=batch,
            )
        except Exception as exc:
            message = str(exc)
            is_quota = "429" in message or "RESOURCE_EXHAUSTED" in message
            if not is_quota or attempt == GEMINI_EMBED_MAX_RETRIES:
                raise

            retry_after = _parse_retry_delay_seconds(message)
            backoff_seconds = min(30.0, float(2 ** (attempt - 1)))
            sleep_seconds = max(retry_after, backoff_seconds, 1.0)
            print(
                f"Embed quota reached (attempt {attempt}/{GEMINI_EMBED_MAX_RETRIES}). "
                f"Sleeping for {sleep_seconds:.1f}s..."
            )
            time.sleep(sleep_seconds)

    raise RuntimeError("Failed to embed batch after retries.")


def build_vector_db() -> None:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY must be set to build vector DB.")

    df = load_dataset()
    
    # Use google.genai Client API
    client = genai.Client(api_key=GEMINI_API_KEY)
    embedding_model = resolve_embedding_model(client, GEMINI_EMBEDDING_MODEL)

    client_chroma = chromadb.PersistentClient(
        path=CHROMA_DB_PATH,
        settings=Settings(anonymized_telemetry=False),
    )
    collection = client_chroma.get_or_create_collection(
        "patient_cases",
        embedding_function=None,
    )

    if collection.count() > 0:
        print("Chroma collection already populated; skipping.")
        return

    sample_df = df.sample(n=min(500, len(df)), random_state=42).reset_index(drop=True)

    texts: List[str] = []
    metadatas: List[Dict[str, Any]] = []
    ids: List[str] = []

    for idx, row in sample_df.iterrows():
        summary = build_patient_summary(row)
        texts.append(summary)
        metadatas.append(
            {
                "readmission_30": int(row["readmission_30"]),
                "age": str(row.get("age", "")),
                "gender": str(row.get("gender", "")),
                "race": str(row.get("race", "")),
            }
        )
        ids.append(f"patient_{idx}")

    embeddings: List[List[float]] = []
    batch_size = min(GEMINI_EMBED_BATCH_SIZE, GEMINI_EMBED_ITEMS_PER_MIN)
    window_start = time.monotonic()
    window_items = 0
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]

        if window_items + len(batch) > GEMINI_EMBED_ITEMS_PER_MIN:
            elapsed = time.monotonic() - window_start
            sleep_seconds = max(0.0, 60.0 - elapsed) + 0.5
            if sleep_seconds > 0:
                print(
                    "Embedding quota window reached. "
                    f"Sleeping for {sleep_seconds:.1f}s..."
                )
                time.sleep(sleep_seconds)
            window_start = time.monotonic()
            window_items = 0

        result = embed_batch_with_retry(client, embedding_model, batch)
        # result.embeddings is a list of Embedding objects with .values attribute
        for embedding_obj in result.embeddings:
            embeddings.append(embedding_obj.values)
        window_items += len(batch)

    collection.upsert(
        ids=ids,
        documents=texts,
        metadatas=metadatas,
        embeddings=embeddings,
    )


if __name__ == "__main__":
    print("Building ChromaDB vector store from historical dataset...")
    build_vector_db()
    print(f"ChromaDB collection 'patient_cases' ready at {CHROMA_DB_PATH}")

