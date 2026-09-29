from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class ApplicantSchema(BaseModel):
    status_checking_account: str = Field(..., example="A14", description="Checking account status code")
    duration_in_months: int = Field(..., ge=4, le=72, example=24, description="Loan duration in months")
    credit_history: str = Field(..., example="A32", description="Credit repayment history code")
    purpose: str = Field(..., example="A40", description="Loan purpose code")
    credit_amount: int = Field(..., ge=250, le=20000, example=2500, description="Credit amount requested in DM")
    savings_account: str = Field(..., example="A61", description="Savings account balance code")
    present_employment_since: str = Field(..., example="A73", description="Present employment tenure code")
    installment_rate: int = Field(..., ge=1, le=4, example=3, description="Installment burden as % of disposable income")
    personal_status_sex: str = Field(..., example="A93", description="Personal status and gender code")
    other_debtors_guarantors: str = Field(..., example="A101", description="Co-signers or guarantors code")
    present_residence_since: int = Field(..., ge=1, le=4, example=2, description="Residence duration in years")
    property: str = Field(..., example="A121", description="Property ownership code")
    age_in_years: int = Field(..., ge=18, le=90, example=35, description="Applicant age in years")
    other_installment_plans: str = Field(..., example="A143", description="Other external installment plans code")
    housing: str = Field(..., example="A152", description="Housing tenure code")
    existing_credits: int = Field(..., ge=1, le=4, example=1, description="Number of existing credits at this bank")
    job: str = Field(..., example="A173", description="Occupational qualification code")
    num_people_liable: int = Field(..., ge=1, le=2, example=1, description="Number of financial dependents")
    telephone: str = Field(..., example="A192", description="Telephone registration code")
    foreign_worker: str = Field(..., example="A201", description="Foreign worker status code")

class PredictionRequest(BaseModel):
    applicant: ApplicantSchema

class RiskFactor(BaseModel):
    factor: str
    impact: str
    description: str

class PredictionResponse(BaseModel):
    success: bool = True
    prediction_id: str
    applicant_id: str
    default_probability: float
    default_probability_pct: str
    predicted_class: int
    prediction: int
    decision_threshold: float
    threshold: float
    risk_category: str
    credit_decision: str
    decision: str
    model_name: str
    model_version: str
    created_at: str
    risk_factors: List[str] = []
    protective_factors: List[str] = []
    disclaimer: str = ""

class AssessmentSummaryItem(BaseModel):
    id: str
    created_at: str
    applicant_id: str
    credit_amount: int
    duration_in_months: int
    default_probability: float
    default_probability_pct: str
    risk_category: str
    credit_decision: str
    decision: str
    model_version: str

class DashboardSummaryResponse(BaseModel):
    total_assessments: int
    approved_count: int
    good_credit_count: int
    high_risk_count: int
    bad_credit_count: int
    approval_rate: float
    approval_rate_pct: str
    bad_credit_rate: float
    bad_credit_rate_pct: str
    average_default_probability: float
    average_default_probability_pct: str
    average_credit_amount: float
    average_loan_duration: float
    assessments_today: int
    recent_assessments: List[AssessmentSummaryItem]

class AnalyticsOverviewResponse(BaseModel):
    risk_distribution: Dict[str, int]
    prediction_distribution: Dict[str, int]
    decision_distribution: Dict[str, int]
    assessment_trend: List[Dict[str, Any]]
    probability_histogram: List[Dict[str, Any]]
    duration_vs_risk: List[Dict[str, Any]]
    credit_amount_vs_risk: List[Dict[str, Any]]
    checking_vs_risk: Optional[List[Dict[str, Any]]] = []
    savings_vs_risk: Optional[List[Dict[str, Any]]] = []

class AuditLogResponse(BaseModel):
    id: str
    timestamp: str
    assessment_id: Optional[str]
    action: str
    model_version: str
    threshold: float
    status: str
    details: Optional[str]

class ModelInfoResponse(BaseModel):
    model_name: str
    hyperparameters: Dict[str, Any]
    test_roc_auc: float
    test_pr_auc: float
    decision_threshold: float
    test_recall_at_optimal_threshold: float
    test_f1_at_optimal_threshold: float
    cross_validation_stability: Dict[str, Any]
    total_train_samples: int
    total_test_samples: int
    raw_feature_count: int
    transformed_feature_count: int

# User & Auth Schemas
class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: str
    is_active: bool = True
    created_at: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="User password (min 6 chars)")
    requested_role: Optional[str] = Field(None, description="Requested role: ADMIN, CREDIT_OFFICER, or VIEWER")
    invite_code: Optional[str] = Field(None, description="Setup invite code required for ADMIN/CREDIT_OFFICER")

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    portal: Optional[str] = Field(None, description="Target portal name for role authorization check")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserCreateAdmin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field("CREDIT_OFFICER", description="ADMIN, CREDIT_OFFICER, or VIEWER")

class UserUpdateAdmin(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
