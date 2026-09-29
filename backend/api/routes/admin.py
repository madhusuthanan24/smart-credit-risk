from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.database.models import User, AuditLog
from backend.schemas.schemas import (
    AdminOverviewResponse,
    PaginatedUsersResponse,
    PaginatedAuditResponse,
    AdminSecurityResponse,
    AdminModelStatusResponse,
    PlatformHealthResponse,
    UserResponse,
    UserCreateAdmin,
    UserUpdateAdmin
)
from backend.services.admin_service import admin_service
from backend.core.security import get_password_hash
from backend.api.dependencies import require_role

router = APIRouter()

@router.get(
    "/admin/overview",
    response_model=AdminOverviewResponse,
    summary="Centralized system KPIs and operational status (ADMIN only)"
)
def get_admin_overview(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["ADMIN"]))
):
    """
    Returns high-level platform administrative KPIs:
    - User totals by role
    - Assessment volumes (today, 7 days, all-time)
    - Authentication security counts (logins, failures)
    - Recent system audit events
    """
    return admin_service.get_system_overview(db)


@router.get(
    "/admin/users",
    response_model=PaginatedUsersResponse,
    summary="Paginated user accounts with search and role filters (ADMIN only)"
)
def get_admin_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    search: Optional[str] = Query(None, max_length=100, description="Search by email"),
    role: Optional[str] = Query(None, description="Filter by role: ADMIN, CREDIT_OFFICER, VIEWER"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["ADMIN"]))
):
    """
    List user accounts with pagination, text search, and role filtering.
    """
    return admin_service.list_users(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        is_active=is_active
    )


@router.post(
    "/admin/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new system user account (ADMIN only)"
)
def create_user_from_admin(
    user_in: UserCreateAdmin,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["ADMIN"]))
):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    if user_in.role not in ["ADMIN", "CREDIT_OFFICER", "VIEWER"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified. Must be ADMIN, CREDIT_OFFICER, or VIEWER."
        )

    user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True
    )
    db.add(user)
    db.flush()

    audit = AuditLog(
        action="ADMIN_USER_CREATED",
        status="SUCCESS",
        threshold=0.35,
        details=f"Administrator {admin_user.email} provisioned user {user.email} with role {user.role}"
    )
    db.add(audit)
    db.commit()

    return admin_service._format_user(user)


@router.patch(
    "/admin/users/{user_id}",
    response_model=UserResponse,
    summary="Update user role or active status (ADMIN only)"
)
def update_user_from_admin(
    user_id: str,
    user_update: UserUpdateAdmin,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["ADMIN"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Guard: Prevent administrator from demoting or disabling their own account
    if admin_user.id == user.id and (user_update.role is not None and user_update.role != "ADMIN" or user_update.is_active is False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot demote or deactivate their own account."
        )

    # Guard: Prevent removing or disabling the final active administrator
    if user.role == "ADMIN" and (user_update.role is not None and user_update.role != "ADMIN" or user_update.is_active is False):
        active_admins = db.query(User).filter(User.role == "ADMIN", User.is_active == True).count()
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot disable or demote the last remaining active administrative account."
            )

    action_name = "USER_UPDATED"
    audit_notes = []

    if user_update.role is not None:
        if user_update.role not in ["ADMIN", "CREDIT_OFFICER", "VIEWER"]:
            raise HTTPException(status_code=400, detail="Invalid role specified.")
        old_role = user.role
        user.role = user_update.role
        action_name = "ADMIN_ROLE_CHANGED"
        audit_notes.append(f"role changed from {old_role} to {user.role}")

    if user_update.is_active is not None:
        old_active = user.is_active
        user.is_active = user_update.is_active
        if action_name != "ADMIN_ROLE_CHANGED":
            action_name = "ADMIN_ACCOUNT_STATUS_CHANGED"
        audit_notes.append(f"status changed from {old_active} to {user.is_active}")

    audit = AuditLog(
        action=action_name,
        status="SUCCESS",
        threshold=0.35,
        details=f"Administrator {admin_user.email} modified user {user.email}: {', '.join(audit_notes)}"
    )
    db.add(audit)
    db.commit()

    return admin_service._format_user(user)


@router.get(
    "/admin/audit",
    response_model=PaginatedAuditResponse,
    summary="Paginated audit logs with search, event, status, and date filters (ADMIN only)"
)
def get_admin_audit_logs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    action: Optional[str] = Query(None, description="Filter by event action"),
    status: Optional[str] = Query(None, description="Filter by status (SUCCESS, FAILURE)"),
    search: Optional[str] = Query(None, max_length=100, description="Search details or action"),
    start_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["ADMIN"]))
):
    """
    Search and filter system audit events.
    """
    return admin_service.list_audit_logs(
        db=db,
        page=page,
        page_size=page_size,
        action=action,
        status=status,
        search=search,
        start_date=start_date,
        end_date=end_date
    )


@router.get(
    "/admin/security",
    response_model=AdminSecurityResponse,
    summary="Authentication and security activity metrics (ADMIN only)"
)
def get_admin_security_activity(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["ADMIN"]))
):
    """
    Provides security monitoring telemetry:
    - Successful vs failed authentication counts
    - Recent failed login attempts
    - Rate limit configurations
    """
    return admin_service.get_security_activity(db)


@router.get(
    "/admin/model-status",
    response_model=AdminModelStatusResponse,
    summary="Read-only model artifact status and integrity verification (ADMIN only)"
)
def get_admin_model_status(
    admin_user: User = Depends(require_role(["ADMIN"]))
):
    """
    Informational read-only model status:
    - Verifies artifact hashes against baseline
    - Affirms prediction authority remains with the local ML pipeline
    - Confirms that retraining/reconfiguration is strictly prohibited via admin APIs
    """
    return admin_service.get_model_status()


@router.get(
    "/admin/health",
    response_model=PlatformHealthResponse,
    summary="Detailed platform health diagnostics across all subsystems (ADMIN only)"
)
def get_admin_platform_health(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["ADMIN"]))
):
    """
    Full diagnostic health evaluation across API, database, ML artifacts, monitoring, governance, and AI services.
    """
    return admin_service.get_platform_health(db)
