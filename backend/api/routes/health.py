from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database.database import get_db
from backend.services.prediction_service import prediction_service

router = APIRouter()

@router.get("/health", summary="Liveness / Health check API")
def check_health(response: Response, db: Session = Depends(get_db)):
    """
    Standard health check endpoint reporting service component status.
    """
    db_healthy = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_healthy = False

    model_loaded = hasattr(prediction_service, 'model') and prediction_service.model is not None
    preprocessing_loaded = hasattr(prediction_service, 'preprocessor') and prediction_service.preprocessor is not None
    threshold_loaded = hasattr(prediction_service, 'threshold') and prediction_service.threshold is not None

    is_healthy = db_healthy and model_loaded and preprocessing_loaded and threshold_loaded

    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "api": True,
        "database": db_healthy,
        "model_loaded": model_loaded,
        "preprocessing_loaded": preprocessing_loaded,
        "threshold_loaded": threshold_loaded,
        "authentication": True,
        "threshold": getattr(prediction_service, 'threshold', 0.35)
    }

@router.get("/ready", summary="Readiness probe for container orchestrators")
def check_readiness(response: Response, db: Session = Depends(get_db)):
    """
    Readiness probe validating DB connectivity and ML artifact readiness.
    DO NOT invoke model.predict_proba() during readiness checks.
    """
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    model_ok = hasattr(prediction_service, 'model') and prediction_service.model is not None
    preprocessor_ok = hasattr(prediction_service, 'preprocessor') and prediction_service.preprocessor is not None
    threshold_ok = hasattr(prediction_service, 'threshold') and prediction_service.threshold is not None

    all_ready = db_ok and model_ok and preprocessor_ok and threshold_ok

    if not all_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "database": "connected" if db_ok else "disconnected",
            "model": "loaded" if model_ok else "not_loaded",
            "preprocessor": "loaded" if preprocessor_ok else "not_loaded",
            "threshold_config": "loaded" if threshold_ok else "not_loaded",
            "threshold": getattr(prediction_service, 'threshold', None),
            "checks": {
                "database": db_ok,
                "model": model_ok,
                "preprocessor": preprocessor_ok,
                "threshold": threshold_ok
            }
        }

    return {
        "status": "ready",
        "database": "connected",
        "model": "loaded",
        "preprocessor": "loaded",
        "threshold_config": "loaded",
        "threshold": prediction_service.threshold,
        "checks": {
            "database": True,
            "model": True,
            "preprocessor": True,
            "threshold": True
        }
    }

