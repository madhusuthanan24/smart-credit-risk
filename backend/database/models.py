import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean, Index
from sqlalchemy.orm import relationship, synonym
from backend.database.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="VIEWER", nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_users_role_created", "role", "created_at"),
    )

class Applicant(Base):
    __tablename__ = "applicants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # 20 Origination Features
    status_checking_account = Column(String(10), nullable=False)
    duration_in_months = Column(Integer, nullable=False)
    credit_history = Column(String(10), nullable=False)
    purpose = Column(String(10), nullable=False)
    credit_amount = Column(Integer, nullable=False)
    savings_account = Column(String(10), nullable=False)
    present_employment_since = Column(String(10), nullable=False)
    installment_rate = Column(Integer, nullable=False)
    personal_status_sex = Column(String(10), nullable=False)
    other_debtors_guarantors = Column(String(10), nullable=False)
    present_residence_since = Column(Integer, nullable=False)
    property = Column(String(10), nullable=False)
    age_in_years = Column(Integer, nullable=False)
    other_installment_plans = Column(String(10), nullable=False)
    housing = Column(String(10), nullable=False)
    existing_credits = Column(Integer, nullable=False)
    job = Column(String(10), nullable=False)
    num_people_liable = Column(Integer, nullable=False)
    telephone = Column(String(10), nullable=False)
    foreign_worker = Column(String(10), nullable=False)

    assessments = relationship("Assessment", back_populates="applicant", cascade="all, delete-orphan")

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    applicant_id = Column(String(36), ForeignKey("applicants.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    default_probability = Column(Float, nullable=False)
    prediction = Column(Integer, nullable=False, index=True)
    risk_category = Column(String(50), nullable=False, index=True)
    decision = Column(String(100), nullable=False)
    threshold = Column(Float, nullable=False)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), default="1.0.0")

    # NVIDIA AI Explainability Fields
    ai_explanation = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_insights = Column(Text, nullable=True)  # JSON-encoded list of insights
    ai_provider = Column(String(100), nullable=True)
    ai_model = Column(String(100), nullable=True)
    ai_generated_at = Column(DateTime, nullable=True)

    # Synonyms for backward compatibility with schema fields

    predicted_class = synonym("prediction")
    credit_decision = synonym("decision")
    decision_threshold = synonym("threshold")

    applicant = relationship("Applicant", back_populates="assessments")
    audit_logs = relationship("AuditLog", back_populates="assessment", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_assessments_created_risk", "created_at", "risk_category"),
        Index("ix_assessments_applicant_created", "applicant_id", "created_at"),
    )

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    assessment_id = Column(String(36), ForeignKey("assessments.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    model_version = Column(String(50), default="1.0.0")
    threshold = Column(Float, nullable=False)
    status = Column(String(50), default="SUCCESS")
    details = Column(Text, nullable=True)

    assessment = relationship("Assessment", back_populates="audit_logs")

    __table_args__ = (
        Index("ix_audit_logs_action_timestamp", "action", "timestamp"),
    )
