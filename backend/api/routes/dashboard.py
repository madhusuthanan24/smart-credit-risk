from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.database.models import User
from backend.schemas.schemas import DashboardSummaryResponse
from backend.services.analytics_service import get_dashboard_summary
from backend.api.dependencies import get_current_user

router = APIRouter()

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse, summary="Executive dashboard summary metrics")
def dashboard_summary(
    days: Optional[int] = Query(None, description="Optional time filter in days (7, 30, 90)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_dashboard_summary(db, days=days)
