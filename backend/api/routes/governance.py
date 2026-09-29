from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.database.models import User
from backend.schemas.schemas import (
    GovernanceOverviewResponse,
    GovernanceGroupAnalysisResponse,
    GovernanceLimitationsResponse,
    AIGovernanceResponse
)
from backend.services.governance_service import governance_service
from backend.api.dependencies import require_role

router = APIRouter()

@router.get(
    "/governance/overview",
    response_model=GovernanceOverviewResponse,
    summary="Model governance metadata, artifact integrity, and control checklist"
)
def get_governance_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    """
    Retrieve authoritative model governance summary:
    - Model type, version, threshold, reference sample counts
    - Cryptographic artifact integrity verification hashes
    - Formal model governance checklist
    """
    return governance_service.get_governance_overview(db)


@router.get(
    "/governance/groups",
    response_model=GovernanceGroupAnalysisResponse,
    summary="Descriptive group-level probability and risk distribution analysis"
)
def get_group_analysis(
    feature: Optional[str] = Query("age_in_years", description="Feature for group analysis (age_in_years, personal_status_sex, foreign_worker, housing, present_employment_since, job)"),
    min_sample_size: Optional[int] = Query(20, ge=1, description="Minimum sample size guardrail for comparative disparity calculations"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    """
    Evaluates descriptive group distributions on available demographic/proxy features:
    - Population counts and shares
    - Average and median predicted default probabilities
    - Risk category distribution across groups
    - Descriptive disparity indicators (with strict small-sample guardrails)
    """
    return governance_service.get_group_analysis(db, feature=feature, min_sample_size=min_sample_size)


@router.get(
    "/governance/limitations",
    response_model=GovernanceLimitationsResponse,
    summary="Fairness data limitations and outcome maturity status"
)
def get_fairness_limitations(
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    """
    Provides transparency regarding data availability limitations:
    - Available demographic/proxy attributes vs. unavailable protected attributes
    - Realized repayment/default outcome maturity status
    - Guardrail explanation and non-conclusion legal disclaimers
    """
    return governance_service.get_fairness_limitations()


@router.get(
    "/api/governance/ai" if False else "/governance/ai",
    response_model=AIGovernanceResponse,
    summary="AI governance boundary controls and explainability safety guidelines"
)
def get_ai_governance(
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    """
    Documents AI boundary controls:
    - Provider, model, and strict explainability-only role
    - Inability of AI layer to alter probabilities, thresholds, or decisions
    - Safety and non-causal explanation notices
    """
    return governance_service.get_ai_governance_info()
