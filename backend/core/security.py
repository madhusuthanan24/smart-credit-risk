import hashlib
import hmac
import jwt
from datetime import datetime, timedelta
from typing import Optional, Union, Any, Dict
from passlib.context import CryptContext
from backend.core.config import settings

# CryptContext with bcrypt scheme for secure password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Generate secure salted hash for user passwords using bcrypt with fallback to salted PBKDF2-HMAC."""
    try:
        return pwd_context.hash(password)
    except Exception:
        # Fallback to salted PBKDF2-HMAC-SHA256
        salt = settings.SECRET_KEY.encode('utf-8')
        return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000).hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed stored value."""
    if not hashed_password or not plain_password:
        return False
    try:
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        pass
    
    # Check fallback PBKDF2 or SHA-256 legacy hash for backward compatibility
    salt = settings.SECRET_KEY.encode('utf-8')
    pbkdf2_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000).hex()
    if hmac.compare_digest(pbkdf2_hash, hashed_password):
        return True
        
    sha256_hash = hashlib.sha256((plain_password + settings.SECRET_KEY).encode('utf-8')).hexdigest()
    return hmac.compare_digest(sha256_hash, hashed_password)

def create_access_token(
    user_id: str,
    email: str,
    role: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Generate JWT Access Token containing user_id (sub), email, and role."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT Access Token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
