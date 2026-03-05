"""
RAG Service for Patient Readmission Risk Model

This module provides retrieval functionality for finding similar historical
patient cases using ChromaDB and Gemini embeddings.
"""

import os
from typing import Any, Dict, List, Optional

import chromadb
import dotenv
from chromadb.config import Settings
from dotenv import load_dotenv

try:
    import google.genai as genai
except ImportError:
    import google.generativeai as genai

load_dotenv()

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

# Global variables for initialized services
_chroma_client: Optional[chromadb.PersistentClient] = None
_collection: Optional[chromadb.Collection] = None
_gemini_client: Optional[Any] = None
_embedding_model: Optional[str] = None


def _resolve_embedding_model(client: Any, configured_model: str) -> str:
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


def initialize_rag() -> None:
    """
    Initialize the RAG system by loading ChromaDB from disk
    and connecting to the existing collection.
    
    Raises:
        RuntimeError: If GEMINI_API_KEY is not set or collection is not found.
    """
    global _chroma_client, _collection, _gemini_client, _embedding_model
    
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY must be set to initialize RAG.")
    
    print("Initializing RAG service...")
    
    # Initialize Gemini client
    _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    _embedding_model = _resolve_embedding_model(_gemini_client, GEMINI_EMBEDDING_MODEL)
    
    # Initialize ChromaDB client
    _chroma_client = chromadb.PersistentClient(
        path=CHROMA_DB_PATH,
        settings=Settings(anonymized_telemetry=False),
    )
    
    # Get or create collection
    _collection = _chroma_client.get_or_create_collection(
        "patient_cases",
        embedding_function=None,
    )
    
    print(f"RAG initialized. Collection contains {_collection.count()} patient cases.")


def _convert_patient_to_text(patient_input: Dict[str, Any]) -> str:
    """
    Convert patient input dictionary to clinical text for embedding.
    
    Args:
        patient_input: Dictionary containing patient information
        
    Returns:
        Clinical text representation of the patient
    """
    return (
        f"Patient {patient_input.get('age', 'unknown')} years old, "
        f"gender {patient_input.get('gender', 'unknown')}, "
        f"race {patient_input.get('race', 'unknown')}. "
        f"Time in hospital {patient_input.get('time_in_hospital', 'n/a')} days, "
        f"{patient_input.get('num_medications', 'n/a')} medications, "
        f"{patient_input.get('number_inpatient', 'n/a')} prior inpatient visits. "
        f"Primary diagnosis {patient_input.get('diag_1', 'n/a')}."
    )


def _get_embedding(text: str) -> List[float]:
    """
    Generate embedding for text using Gemini API.
    
    Args:
        text: Text to embed
        
    Returns:
        List of embedding values
    """
    global _gemini_client, _embedding_model
    
    if _gemini_client is None:
        raise RuntimeError("RAG not initialized. Call initialize_rag() first.")
    if _embedding_model is None:
        raise RuntimeError("Embedding model not initialized. Call initialize_rag() first.")
    
    result = _gemini_client.models.embed_content(
        model=_embedding_model,
        contents=[text],
    )
    
    return result.embeddings[0].values


def retrieve_similar_cases(
    patient_input: Dict[str, Any],
    top_k: int = 3
) -> List[Dict[str, Any]]:
    """
    Retrieve similar historical patient cases based on new patient input.
    
    Args:
        patient_input: Dictionary containing new patient information
                     Expected keys: age, gender, race, time_in_hospital,
                                   num_medications, number_inpatient, diag_1
        top_k: Number of similar cases to retrieve (default: 3)
        
    Returns:
        List of dictionaries containing similar cases with:
            - case: Clinical text of the historical patient
            - similarity_score: Similarity score (0-1, higher is more similar)
            - metadata: Patient metadata (readmission_30, age, gender, race)
            
    Raises:
        RuntimeError: If RAG is not initialized
    """
    global _collection
    
    if _collection is None:
        raise RuntimeError("RAG not initialized. Call initialize_rag() first.")
    
    # Convert patient input to text
    patient_text = _convert_patient_to_text(patient_input)
    
    # Generate embedding for the new patient
    embedding = _get_embedding(patient_text)
    
    # Query ChromaDB for similar cases
    results = _collection.query(
        query_embeddings=[embedding],
        n_results=top_k,
    )
    
    # Format results
    similar_cases = []
    if results and results.get("documents") and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            case = {
                "case": doc,
                "similarity_score": float(1 - results.get("distances", [[]])[0][i]) if results.get("distances") else None,
                "metadata": results.get("metadatas", [{}])[0][i] if results.get("metadatas") else {}
            }
            similar_cases.append(case)
    
    return similar_cases


def get_collection_count() -> int:
    """
    Get the number of patient cases in the ChromaDB collection.
    
    Returns:
        Number of patient cases stored
    """
    global _collection
    
    if _collection is None:
        raise RuntimeError("RAG not initialized. Call initialize_rag() first.")
    
    return _collection.count()


# Example usage
if __name__ == "__main__":
    # Initialize RAG service
    initialize_rag()
    
    print(f"\nTotal patient cases in database: {get_collection_count()}")
    
    # Example: Retrieve similar cases for a new patient
    sample_patient = {
        "age": 65,
        "gender": "Male",
        "race": "Caucasian",
        "time_in_hospital": 7,
        "num_medications": 12,
        "number_inpatient": 2,
        "diag_1": "Diabetes"
    }
    
    print("\nSearching for similar cases for sample patient...")
    similar_cases = retrieve_similar_cases(sample_patient, top_k=3)
    
    for i, case in enumerate(similar_cases, 1):
        print(f"\n--- Similar Case {i} ---")
        print(f"Case: {case['case']}")
        print(f"Similarity Score: {case['similarity_score']:.2f}")
        print(f"Metadata: {case['metadata']}")

