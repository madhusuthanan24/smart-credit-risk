from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.database.models import User, AuditLog
from backend.schemas.schemas import UserRegister, UserLogin, TokenResponse, UserResponse
from backend.core.security import get_password_hash, verify_password, create_access_token
from backend.api.dependencies import get_current_user, limit_login_attempts
from backend.core.config import settings

router = APIRouter()

def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active if hasattr(user, "is_active") else True,
        "created_at": user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else ""
    }

@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, summary="Register new user account")
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    target_role = (user_in.requested_role or "VIEWER").upper()
    if target_role not in ["VIEWER", "CREDIT_OFFICER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role requested: {target_role}"
        )

    if target_role == "ADMIN":
        if not user_in.invite_code or user_in.invite_code.strip() != settings.ADMIN_INVITE_CODE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid setup invite code for ADMIN role."
            )
    elif target_role == "CREDIT_OFFICER":
        if not user_in.invite_code or user_in.invite_code.strip() != settings.CREDIT_OFFICER_INVITE_CODE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid setup invite code for CREDIT_OFFICER role."
            )

    user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=target_role,
        is_active=True
    )
    db.add(user)
    db.flush()

    audit = AuditLog(
        action="USER_CREATED",
        status="SUCCESS",
        threshold=0.35,
        details=f"Registration: {user.email} with role {user.role}"
    )
    db.add(audit)
    db.commit()

    token = create_access_token(user_id=user.id, email=user.email, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user)
    }

@router.post("/auth/login", response_model=TokenResponse, summary="User authentication login", dependencies=[Depends(limit_login_attempts)])
def login_user(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        audit = AuditLog(
            action="LOGIN_FAILURE",
            status="FAILURE",
            threshold=0.35,
            details=f"Failed login attempt for email: {user_in.email}"
        )
        db.add(audit)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if hasattr(user, "is_active") and not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )

    if user_in.portal:
        portal_name = user_in.portal.strip().upper()
        if portal_name == "ADMIN" and user.role != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account is not authorized for this portal."
            )
        elif portal_name in ["CREDIT_OFFICER", "OFFICER"] and user.role not in ["CREDIT_OFFICER", "ADMIN"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account is not authorized for this portal."
            )
        elif portal_name == "STAFF" and user.role not in ["ADMIN", "CREDIT_OFFICER"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account is not authorized for this portal."
            )

    audit = AuditLog(
        action="LOGIN_SUCCESS",
        status="SUCCESS",
        threshold=0.35,
        details=f"User {user.email} logged in with role {user.role}"
    )
    db.add(audit)
    db.commit()

    token = create_access_token(user_id=user.id, email=user.email, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user)
    }

@router.get("/auth/me", response_model=UserResponse, summary="Get current user profile")
def get_me(current_user: User = Depends(get_current_user)):
    return serialize_user(current_user)

@router.post("/auth/logout", summary="Log out current user")
def logout_user(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    audit = AuditLog(
        action="LOGOUT",
        status="SUCCESS",
        threshold=0.35,
        details=f"User {current_user.email} logged out"
    )
    db.add(audit)
    db.commit()
    return {"message": "Successfully logged out"}
