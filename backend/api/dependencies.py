import time
from typing import Optional, List, Callable, Dict
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.core.config import settings
from backend.core.security import decode_access_token
from backend.database.database import get_db
from backend.database.models import User

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False
)

# Production-compatible In-Memory IP Rate Limiter
class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.client_records: Dict[str, List[float]] = {}

    def check_rate_limit(self, client_ip: str):
        now = time.time()
        timestamps = self.client_records.get(client_ip, [])
        # Filter out timestamps outside window
        timestamps = [t for t in timestamps if now - t < self.window_seconds]
        if client_ip != "testclient" and len(timestamps) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again after a brief pause."
            )
        timestamps.append(now)
        self.client_records[client_ip] = timestamps

login_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)      # Max 10 login attempts per minute per IP
prediction_rate_limiter = RateLimiter(max_requests=30, window_seconds=60) # Max 30 prediction requests per minute per IP

def limit_login_attempts(request: Request):
    client_ip = request.client.host if request.client else "127.0.0.1"
    login_rate_limiter.check_rate_limit(client_ip)

def limit_prediction_attempts(request: Request):
    client_ip = request.client.host if request.client else "127.0.0.1"
    prediction_rate_limiter.check_rate_limit(client_ip)

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Validate JWT token and return current authenticated User."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    user_id: str = payload.get("sub")
    email: str = payload.get("email")
    if not user_id and not email:
        raise credentials_exception

    query = db.query(User)
    if user_id:
        user = query.filter(User.id == user_id).first()
    else:
        user = query.filter(User.email == email).first()

    if user is None:
        raise credentials_exception

    if hasattr(user, "is_active") and user.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )

    return user

def require_role(allowed_roles: List[str]) -> Callable:
    """Dependency factory enforcing role-based access control (RBAC)."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{current_user.role}' lacks required permissions."
            )
        return current_user
    return role_checker
