from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.database.models import User
from backend.schemas.schemas import (
    MonitoringOverviewResponse,
    DataDriftResponse,
    ModelPerformanceResponse
)
from backend.services.monitoring_service import monitoring_service
from backend.api.dependencies import require_role

router = APIRouter()

@router.get(
    "/monitoring/overview",
    response_model=MonitoringOverviewResponse,
    summary="Prediction volume, risk-category and probability distribution overview"
)
def get_monitoring_overview(
    days: Optional[int] = Query(None, description="Optional time filter in days (7, 30, 90, or None for all-time)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    """
    Retrieve model monitoring statistics:
    - Prediction volume (today, 7d, 30d, all-time)
    - Risk category distribution (Low, Moderate, High)
    - Default probability metrics (mean, median, min, max) and 10-bucket histogram
    - Threshold compliance monitoring (0.35)
    """
    return monitoring_service.get_monitoring_overview(db, days=days)


@router.get(
    "/monitoring/drift",
    response_model=DataDriftResponse,
    summary="Population Stability Index (PSI) feature drift analysis"
)
def get_data_drift(
    days: Optional[int] = Query(None, description="Optional time filter in days (7, 30, 90, or None for all-time)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    """
    Calculates Population Stability Index (PSI) comparing reference training data (1,000 samples)
    with production applicant records across 20 features:
    - PSI < 0.10: LOW (Stable)
    - 0.10 <= PSI <= 0.25: MEDIUM (Moderate Drift)
    - PSI > 0.25: HIGH (Significant Drift)
    """
    return monitoring_service.calculate_data_drift(db, days=days)


@router.get(
    "/monitoring/performance",
    response_model=ModelPerformanceResponse,
    summary="Model health and performance tracking"
)
def get_model_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    """
    Provides:
    - Baseline model validation metrics (ROC-AUC, PR-AUC, Recall, Brier Score)
    - Production outcome performance status (with explicit maturity notice if ground truth default labels are pending)
    - Overall model operational health
    """
    return monitoring_service.get_model_performance(db)
