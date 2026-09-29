from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.database.models import User
from backend.schemas.schemas import AnalyticsOverviewResponse
from backend.services.analytics_service import get_analytics_overview
from backend.api.dependencies import require_role

router = APIRouter()

@router.get("/analytics/overview", response_model=AnalyticsOverviewResponse, summary="Comprehensive risk analytics overview")
def analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER"]))
):
    return get_analytics_overview(db)
