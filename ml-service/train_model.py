import os
from typing import Any, Dict

import joblib
import pandas as pd
from dotenv import load_dotenv
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

load_dotenv()

MODEL_PATH = os.getenv("MODEL_PATH", "./model.pkl")
DATA_PATH = os.getenv("DATA_PATH", "./data/Patient_Readmission_200_Records.xlsx")
TEST_SIZE = float(os.getenv("TEST_SIZE", "0.2"))
RANDOM_STATE = int(os.getenv("RANDOM_STATE", "42"))


def _build_model_hyperparameters() -> Dict[str, Any]:
    return {
        "n_estimators": 200,
        "max_depth": 10,
        "random_state": RANDOM_STATE,
        "n_jobs": -1,
    }


# ==============================
# LOAD DATASET
# ==============================
def load_dataset() -> pd.DataFrame:
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Dataset not found at {DATA_PATH}. "
            "Place the dataset file inside /data folder."
        )

    if DATA_PATH.lower().endswith(".csv"):
        df = pd.read_csv(DATA_PATH)
    else:
        df = pd.read_excel(DATA_PATH)

    return df


# ==============================
# CLEAN DATAFRAME
# ==============================
def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    # Convert datetime columns to strings for consistent encoding
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].astype(str)

    # Fill and cast categorical text columns
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].fillna("Unknown").astype(str)

    # Fill numeric null values
    for col in df.select_dtypes(include=["number"]).columns:
        df[col] = df[col].fillna(0)

    return df


def _select_average_mode(y_true: pd.Series) -> str:
    return "binary" if y_true.nunique() == 2 else "weighted"


def _select_positive_label(y_true: pd.Series) -> Any:
    labels = set(y_true.unique().tolist())
    return 1 if 1 in labels else sorted(labels)[-1]


def _build_split_metrics(y_true: pd.Series, y_pred: pd.Series) -> Dict[str, float]:
    average = _select_average_mode(y_true)
    pos_label = _select_positive_label(y_true)

    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(
            precision_score(
                y_true,
                y_pred,
                average=average,
                zero_division=0,
                pos_label=pos_label if average == "binary" else None,
            )
        ),
        "recall": float(
            recall_score(
                y_true,
                y_pred,
                average=average,
                zero_division=0,
                pos_label=pos_label if average == "binary" else None,
            )
        ),
        "f1_score": float(
            f1_score(
                y_true,
                y_pred,
                average=average,
                zero_division=0,
                pos_label=pos_label if average == "binary" else None,
            )
        ),
    }


def evaluate_model(
    model: Pipeline,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> Dict[str, Any]:
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)

    train_metrics = _build_split_metrics(y_train, y_pred_train)
    test_metrics = _build_split_metrics(y_test, y_pred_test)

    metrics: Dict[str, Any] = {
        "train_accuracy": train_metrics["accuracy"],
        "train_precision": train_metrics["precision"],
        "train_recall": train_metrics["recall"],
        "train_f1_score": train_metrics["f1_score"],
        "test_accuracy": test_metrics["accuracy"],
        "test_precision": test_metrics["precision"],
        "test_recall": test_metrics["recall"],
        "test_f1_score": test_metrics["f1_score"],
        "confusion_matrix": confusion_matrix(y_test, y_pred_test).tolist(),
    }

    if hasattr(model, "predict_proba") and y_test.nunique() == 2:
        y_prob_test = model.predict_proba(X_test)[:, 1]
        metrics["roc_auc"] = float(roc_auc_score(y_test, y_prob_test))
    else:
        metrics["roc_auc"] = None

    return metrics


def print_training_summary(bundle: Dict[str, Any]) -> None:
    training_info = bundle.get("training_info", {})
    metrics = training_info.get("metrics", {})

    print("\n=== Training Diagnostics Report ===")
    print(f"Model: {training_info.get('model_name', 'Unknown')}")
    print(f"Target column: {training_info.get('target_column', 'N/A')}")
    print(f"Training rows: {training_info.get('train_rows', 'N/A')}")
    print(f"Test rows: {training_info.get('test_rows', 'N/A')}")
    print(f"Feature count: {training_info.get('feature_count', 'N/A')}")

    params = training_info.get("model_params", {})
    if params:
        print("Key Hyperparameters:")
        print(f"  n_estimators: {params.get('n_estimators')}")
        print(f"  max_depth:    {params.get('max_depth')}")
        print(f"  random_state: {params.get('random_state')}")
        print(f"  n_jobs:       {params.get('n_jobs')}")

    if metrics:
        print("\nMetrics:")
        print("  Split   Accuracy  Precision  Recall    F1 Score")
        print(
            f"  Train   {metrics.get('train_accuracy', 0.0):<8.4f}  "
            f"{metrics.get('train_precision', 0.0):<9.4f}  "
            f"{metrics.get('train_recall', 0.0):<8.4f}  "
            f"{metrics.get('train_f1_score', 0.0):<8.4f}"
        )
        print(
            f"  Test    {metrics.get('test_accuracy', 0.0):<8.4f}  "
            f"{metrics.get('test_precision', 0.0):<9.4f}  "
            f"{metrics.get('test_recall', 0.0):<8.4f}  "
            f"{metrics.get('test_f1_score', 0.0):<8.4f}"
        )
        roc_auc = metrics.get("roc_auc")
        print(f"  Test ROC AUC: {roc_auc:.4f}" if roc_auc is not None else "  Test ROC AUC: N/A")
        print(f"  Test Confusion Matrix: {metrics.get('confusion_matrix')}")


# ==============================
# TRAIN MODEL
# ==============================
def train_and_save_model() -> Dict[str, Any]:
    df = load_dataset()
    df = clean_dataframe(df)

    target_col = "readmission_30"
    if target_col not in df.columns:
        raise ValueError(f"Dataset must contain target column '{target_col}'")

    X = df.drop(columns=[target_col])
    y = df[target_col]

    categorical_cols = X.select_dtypes(include=["object"]).columns.tolist()
    numeric_cols = [c for c in X.columns if c not in categorical_cols]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
            ("num", "passthrough", numeric_cols),
        ]
    )

    model_hyperparameters = _build_model_hyperparameters()
    clf = RandomForestClassifier(**model_hyperparameters)

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", clf),
        ]
    )

    stratify_target = y if y.nunique() > 1 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=stratify_target,
    )

    trained_model = clone(model)
    trained_model.fit(X_train, y_train)
    metrics = evaluate_model(trained_model, X_train, y_train, X_test, y_test)

    bundle = {
        "model": trained_model,
        "feature_columns": X.columns.tolist(),
        "training_info": {
            "model_name": clf.__class__.__name__,
            "model_params": model_hyperparameters,
            "target_column": target_col,
            "train_rows": int(len(X_train)),
            "test_rows": int(len(X_test)),
            "feature_count": int(len(X.columns)),
            "metrics": metrics,
        },
    }

    os.makedirs(os.path.dirname(MODEL_PATH) or ".", exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)

    return bundle


# ==============================
# RUN TRAINING
# ==============================
if __name__ == "__main__":
    print("Training model from historical dataset...")
    saved_bundle = train_and_save_model()
    print_training_summary(saved_bundle)
    print(f"\nModel saved to {MODEL_PATH}")
