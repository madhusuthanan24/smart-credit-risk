from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from backend.database.database import get_db
from backend.database.models import AuditLog, User
from backend.schemas.schemas import AuditLogResponse
from backend.api.dependencies import require_role

router = APIRouter()

@router.get("/audit/logs", response_model=List[AuditLogResponse], summary="System audit logs (ADMIN only)")
def get_audit_logs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["ADMIN"]))
):
    offset = (page - 1) * page_size
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(offset).limit(page_size).all()
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.strftime('%Y-%m-%d %H:%M:%S') if l.timestamp else '',
            "assessment_id": l.assessment_id,
            "action": l.action,
            "model_version": l.model_version,
            "threshold": l.threshold,
            "status": l.status,
            "details": l.details
        }
        for l in logs
    ]
