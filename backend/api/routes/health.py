from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database.database import get_db
from backend.services.prediction_service import prediction_service

router = APIRouter()

@router.get("/health", summary="Health check API")
def check_health(db: Session = Depends(get_db)):
    db_healthy = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_healthy = False

    model_loaded = hasattr(prediction_service, 'model') and prediction_service.model is not None
    preprocessing_loaded = hasattr(prediction_service, 'preprocessor') and prediction_service.preprocessor is not None
    threshold_loaded = hasattr(prediction_service, 'threshold') and prediction_service.threshold is not None

    is_healthy = db_healthy and model_loaded and preprocessing_loaded and threshold_loaded

    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "database": db_healthy,
        "model_loaded": model_loaded,
        "preprocessing_loaded": preprocessing_loaded,
        "threshold_loaded": threshold_loaded,
        "threshold": prediction_service.threshold
    }
