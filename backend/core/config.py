import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Smart Credit Risk Prediction System"
    API_V1_STR: str = "/api"
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

settings = Settings()
