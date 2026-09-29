from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.database.models import User
from backend.schemas.schemas import (
    AnalyticsOverviewResponse,
    TrendsResponse,
    RiskDistributionResponse,
    ProbabilityDistributionResponse,
    RiskConcentrationResponse,
    ExecutiveMonitoringSnapshotResponse,
    ExecutiveGovernanceSnapshotResponse,
    ExecutiveAISummaryRequest,
    ExecutiveAISummaryResponse
)
from backend.services.analytics_service import (
    get_analytics_overview,
    get_portfolio_kpis,
    get_assessment_trends,
    get_risk_distribution,
    get_probability_distribution,
    get_risk_concentration,
    get_operational_analytics,
    get_monitoring_snapshot,
    get_governance_snapshot
)
from backend.services.nvidia_ai_service import nvidia_ai_service
from backend.api.dependencies import require_role

router = APIRouter()

ALLOWED_RISK_CATEGORIES = ["LOW RISK", "MODERATE RISK", "HIGH RISK"]
ALLOWED_PERIODS = ["today", "7d", "30d", "all"]
ALLOWED_DIMENSIONS = [
    "age_bracket", "housing", "employment", "job", "foreign_worker", "personal_status_sex"
]

def _validate_dates(start_date: Optional[str], end_date: Optional[str]):
    if start_date:
        try:
            datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid start_date '{start_date}'. Format must be YYYY-MM-DD."
            )
    if end_date:
        try:
            datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid end_date '{end_date}'. Format must be YYYY-MM-DD."
            )
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date cannot be later than end_date."
        )

@router.get(
    "/analytics/overview",
    response_model=AnalyticsOverviewResponse,
    summary="Comprehensive portfolio & risk analytics overview"
)
def analytics_overview(
    days: Optional[int] = Query(None, description="Time filter in days (e.g., 7, 30, 90)"),
    risk_category: Optional[str] = Query(None, description="Risk category filter: LOW RISK, MODERATE RISK, HIGH RISK"),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    if risk_category and risk_category not in ALLOWED_RISK_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid risk_category '{risk_category}'. Allowed: {', '.join(ALLOWED_RISK_CATEGORIES)}"
        )
    _validate_dates(start_date, end_date)
    return get_analytics_overview(
        db,
        days=days,
        risk_category=risk_category,
        start_date=start_date,
        end_date=end_date
    )

@router.get(
    "/analytics/trends",
    response_model=TrendsResponse,
    summary="Assessment volume and default probability time-series trends"
)
def analytics_trends(
    period: str = Query("30d", description="Period: today, 7d, 30d, all"),
    risk_category: Optional[str] = Query(None, description="Optional risk category filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    if period not in ALLOWED_PERIODS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid period '{period}'. Allowed: {', '.join(ALLOWED_PERIODS)}"
        )
    if risk_category and risk_category not in ALLOWED_RISK_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid risk_category '{risk_category}'. Allowed: {', '.join(ALLOWED_RISK_CATEGORIES)}"
        )
    return get_assessment_trends(db, period=period, risk_category=risk_category)

@router.get(
    "/analytics/risk-distribution",
    response_model=RiskDistributionResponse,
    summary="Portfolio risk category distribution"
)
def analytics_risk_distribution(
    days: Optional[int] = Query(None, description="Time filter in days"),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    _validate_dates(start_date, end_date)
    return get_risk_distribution(db, days=days, start_date=start_date, end_date=end_date)

@router.get(
    "/analytics/probability-distribution",
    response_model=ProbabilityDistributionResponse,
    summary="Predicted default probability distribution histogram"
)
def analytics_probability_distribution(
    days: Optional[int] = Query(None, description="Time filter in days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    return get_probability_distribution(db, days=days)

@router.get(
    "/analytics/concentration",
    response_model=RiskConcentrationResponse,
    summary="Descriptive portfolio risk concentration across applicant dimensions"
)
def analytics_risk_concentration(
    dimension: str = Query("age_bracket", description="Grouping dimension: age_bracket, housing, employment, job, foreign_worker, personal_status_sex"),
    days: Optional[int] = Query(None, description="Time filter in days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    if dimension not in ALLOWED_DIMENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid dimension '{dimension}'. Supported: {', '.join(ALLOWED_DIMENSIONS)}"
        )
    return get_risk_concentration(db, dimension=dimension, days=days)

@router.get(
    "/analytics/monitoring",
    response_model=ExecutiveMonitoringSnapshotResponse,
    summary="Executive model monitoring snapshot"
)
def analytics_monitoring_snapshot(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    return get_monitoring_snapshot(db)

@router.get(
    "/analytics/governance",
    response_model=ExecutiveGovernanceSnapshotResponse,
    summary="Executive governance and model verification snapshot"
)
def analytics_governance_snapshot(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    return get_governance_snapshot(db)

@router.post(
    "/analytics/ai-summary",
    response_model=ExecutiveAISummaryResponse,
    summary="Optional executive narrative summary via NVIDIA AI Layer with deterministic fallback"
)
def analytics_ai_summary(
    payload: Optional[ExecutiveAISummaryRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    period = payload.period if payload and payload.period else "30d"
    days = 1 if period == "today" else 7 if period == "7d" else 30 if period == "30d" else None
    
    kpis = get_portfolio_kpis(db, days=days)
    return nvidia_ai_service.generate_executive_summary(kpis)
