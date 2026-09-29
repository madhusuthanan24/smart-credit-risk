from fastapi import APIRouter, Depends
from backend.services.prediction_service import prediction_service
from backend.schemas.schemas import ModelInfoResponse
from backend.database.models import User
from backend.api.dependencies import get_current_user

router = APIRouter()

@router.get("/model/info", response_model=ModelInfoResponse, summary="Get model metadata")
def get_model_info(current_user: User = Depends(get_current_user)):
    meta = prediction_service.metadata
    return {
        "model_name": meta.get("model_type", "LogisticRegression"),
        "hyperparameters": meta.get("hyperparameters", {"C": 0.1, "max_iter": 1000, "random_state": 42}),
        "test_roc_auc": meta.get("test_roc_auc", 0.8095),
        "test_pr_auc": meta.get("test_pr_auc", 0.6584),
        "decision_threshold": prediction_service.threshold,
        "test_recall_at_optimal_threshold": meta.get("test_recall_at_optimal_threshold", 0.7667),
        "test_f1_at_optimal_threshold": meta.get("test_f1_at_optimal_threshold", 0.6715),
        "cross_validation_stability": {
            "mean_roc_auc": 0.7799,
            "std_roc_auc": 0.0036,
            "min_roc_auc": 0.7730,
            "max_roc_auc": 0.7850,
            "seeds_tested": 10
        },
        "total_train_samples": 800,
        "total_test_samples": 200,
        "raw_feature_count": 20,
        "transformed_feature_count": 61
    }
