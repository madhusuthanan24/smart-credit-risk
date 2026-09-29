import os
from pathlib import Path
from pydantic import BaseModel

# Automatically load .env file from project root if present
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.is_file():
    with open(_env_path, "r", encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                _k = _k.strip()
                _v = _v.strip().strip("'\"")
                if _k and _k not in os.environ:
                    os.environ[_k] = _v

import logging
from typing import List, Set

logger = logging.getLogger("smart_credit_risk.config")

INSECURE_DEFAULT_SECRETS: Set[str] = {
    "smart_credit_risk_secret_key_change_in_production",
    "CHANGE_ME_TO_A_LONG_RANDOM_SECRET",
    "your-super-secret-jwt-key-change-in-production",
    "secret",
    "changeme",
    "admin",
    "password",
    "12345678",
}

class Settings(BaseModel):
    PROJECT_NAME: str = "Smart Credit Risk Prediction System"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()

    SECRET_KEY: str = os.getenv("SECRET_KEY", "smart_credit_risk_secret_key_change_in_production")
    ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./smart_credit.db")
    
    MODEL_PATH: str = os.getenv("MODEL_PATH", "models/final_model.joblib")
    PREPROCESSOR_PATH: str = os.getenv("PREPROCESSOR_PATH", "models/preprocessing_pipeline.joblib")
    THRESHOLD_PATH: str = os.getenv("THRESHOLD_PATH", "models/threshold_config.json")
    METADATA_PATH: str = os.getenv("METADATA_PATH", "models/final_model_metadata.json")

    ADMIN_INVITE_CODE: str = os.getenv("ADMIN_INVITE_CODE", "ADMIN123KEY")
    CREDIT_OFFICER_INVITE_CODE: str = os.getenv("CREDIT_OFFICER_INVITE_CODE", "OFFICER123KEY")

    # NVIDIA AI Explainability Layer
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    NVIDIA_MODEL: str = os.getenv("NVIDIA_MODEL", "meta/llama-3.2-11b-vision-instruct")
    NVIDIA_API_BASE_URL: str = os.getenv("NVIDIA_API_BASE_URL", "https://integrate.api.nvidia.com/v1")
    NVIDIA_TIMEOUT_SECONDS: float = float(os.getenv("NVIDIA_TIMEOUT_SECONDS", "20.0"))

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT in ("test", "testing")

    @property
    def allowed_origins(self) -> List[str]:
        raw_origins = [o.strip() for o in self.FRONTEND_URL.split(",") if o.strip()]
        if not raw_origins:
            return ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
        return raw_origins

    def validate_production_configuration(self) -> None:
        """
        Validates critical configuration for production readiness.
        Fails fast if production mode is active but security invariants are violated.
        """
        if self.is_production:
            # 1. SECRET_KEY validation
            if not self.SECRET_KEY or self.SECRET_KEY in INSECURE_DEFAULT_SECRETS or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: Production mode requires a secure, non-default "
                    "SECRET_KEY with at least 32 characters. Do not use default or placeholder secrets."
                )
            
            # 2. Database validation
            if self.DATABASE_URL.startswith("sqlite"):
                logger.warning(
                    "PRODUCTION WARNING: DATABASE_URL is pointing to a SQLite database. "
                    "For high-concurrency production deployments, PostgreSQL is strongly recommended."
                )
            
            # 3. CORS origin validation
            if "*" in self.allowed_origins:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: Wildcard '*' CORS origin is not permitted in production "
                    "when credentials support is enabled. Specify explicit origins in FRONTEND_URL."
                )

settings = Settings()
if settings.is_production:
    settings.validate_production_configuration()


