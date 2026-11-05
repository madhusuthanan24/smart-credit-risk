from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database.database import get_db
from backend.database.models import User, AuditLog
from backend.schemas.schemas import UserResponse, UserCreateAdmin, UserUpdateAdmin
from backend.core.security import get_password_hash
from backend.api.dependencies import require_role

router = APIRouter()

def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active if hasattr(user, "is_active") else True,
        "created_at": user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else ""
    }

@router.get("/users", response_model=List[UserResponse], summary="List all system users (ADMIN only)")
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by email"),
    role: Optional[str] = Query(None, description="Filter by role: ADMIN, CREDIT_OFFICER, VIEWER"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["ADMIN"]))
):
    query = db.query(User)
    if search:
        query = query.filter(User.email.ilike(f"%{search.strip()}%"))
    if role:
        query = query.filter(User.role == role.strip().upper())
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    offset = (page - 1) * page_size
    users = query.order_by(User.created_at.desc()).offset(offset).limit(page_size).all()
    return [serialize_user(u) for u in users]

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create user account (ADMIN only)")
def create_user_admin(
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
        action="USER_CREATED",
        status="SUCCESS",
        threshold=0.35,
        details=f"Admin {admin_user.email} created user {user.email} with role {user.role}"
    )
    db.add(audit)
    db.commit()

    return serialize_user(user)

@router.patch("/users/{user_id}", response_model=UserResponse, summary="Update user role or active status (ADMIN only)")
def update_user_admin(
    user_id: str,
    user_update: UserUpdateAdmin,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["ADMIN"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Safeguard 1: Prevent administrator from demoting or disabling their own account
    if admin_user.id == user.id and ((user_update.role is not None and user_update.role != "ADMIN") or user_update.is_active is False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot demote or deactivate their own account."
        )

    # Safeguard 2: Prevent removing or disabling the final active ADMIN
    if user.role == "ADMIN" and ((user_update.role is not None and user_update.role != "ADMIN") or user_update.is_active is False):
        admin_count = db.query(User).filter(User.role == "ADMIN", User.is_active == True).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot disable or demote the last remaining active administrative account."
            )

    audit_details = []
    if user_update.role is not None:
        if user_update.role not in ["ADMIN", "CREDIT_OFFICER", "VIEWER"]:
            raise HTTPException(status_code=400, detail="Invalid role specified.")
        old_role = user.role
        user.role = user_update.role
        audit_details.append(f"role: {old_role} -> {user.role}")

    if user_update.is_active is not None:
        old_status = user.is_active
        user.is_active = user_update.is_active
        audit_details.append(f"active: {old_status} -> {user.is_active}")

    action_name = "ADMIN_ROLE_CHANGED" if user_update.role is not None else "USER_UPDATED"
    audit = AuditLog(
        action=action_name,
        status="SUCCESS",
        threshold=0.35,
        details=f"Admin {admin_user.email} updated user {user.email}: {', '.join(audit_details) if audit_details else 'no changes'}"
    )
    db.add(audit)
    db.commit()

    return serialize_user(user)
