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
    # NVIDIA AI Explainability Layer
    ai_explanation: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_insights: Optional[List[str]] = []
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    ai_generated_at: Optional[str] = None

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
    ai_summary: Optional[str] = None
    ai_provider: Optional[str] = None


class DashboardSummaryResponse(BaseModel):
    total_assessments: int
    approved_count: int
    good_credit_count: int
    high_risk_count: int
    bad_credit_count: int
    manual_review_count: int = 0
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
    default_probability_trend: Optional[List[Dict[str, Any]]] = []
    probability_histogram: List[Dict[str, Any]]
    duration_vs_risk: List[Dict[str, Any]]
    credit_amount_vs_risk: List[Dict[str, Any]]
    checking_vs_risk: Optional[List[Dict[str, Any]]] = []
    savings_vs_risk: Optional[List[Dict[str, Any]]] = []
    credit_history_vs_risk: Optional[List[Dict[str, Any]]] = []
    portfolio_kpis: Optional[Dict[str, Any]] = None
    operational_summary: Optional[Dict[str, Any]] = None
    model_governance_snapshot: Optional[Dict[str, Any]] = None
    executive_summary_text: Optional[str] = None

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

# ==================================================
# Credit Risk Simulator Schemas (Phase C)
# ==================================================

class SimulationRequest(BaseModel):
    original_applicant: ApplicantSchema
    simulated_applicant: Optional[ApplicantSchema] = None
    modifications: Optional[Dict[str, Any]] = None

class SimulationResultItem(BaseModel):
    default_probability: float
    default_probability_pct: str
    predicted_class: int
    prediction: int
    decision_threshold: float
    threshold: float
    risk_category: str
    credit_decision: str
    decision: str
    risk_factors: List[str] = []
    protective_factors: List[str] = []

class SimulationDifference(BaseModel):
    probability_difference: float
    probability_points: float
    direction: str  # "lower" | "higher" | "unchanged"

class FieldChangeSummary(BaseModel):
    field: str
    field_label: str
    original_value: Any
    simulated_value: Any
    display_original: str
    display_simulated: str

class SimulationResponse(BaseModel):
    success: bool = True
    original: SimulationResultItem
    simulated: SimulationResultItem
    difference: SimulationDifference
    risk_changed: bool
    original_risk: str
    simulated_risk: str
    changes_summary: List[FieldChangeSummary] = []
    ai_explanation: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_insights: Optional[List[str]] = []
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    ai_generated_at: Optional[str] = None

# ==================================================
# Model Monitoring & Data Drift Schemas (Phase E)
# ==================================================

class PredictionVolumeMetrics(BaseModel):
    today: int
    last_7_days: int
    last_30_days: int
    all_time: int

class RiskDistributionCategory(BaseModel):
    count: int
    percentage: float
    percentage_formatted: str

class RiskDistributionMetrics(BaseModel):
    low_risk: RiskDistributionCategory
    moderate_risk: RiskDistributionCategory
    high_risk: RiskDistributionCategory
    total: int

class ProbabilityStats(BaseModel):
    mean: float
    median: float
    min: float
    max: float

class ProbabilityHistogramBucket(BaseModel):
    bin: str
    min: float
    max: float
    count: int
    percentage: float

class ThresholdMetrics(BaseModel):
    threshold: float
    below_threshold_count: int
    below_threshold_pct: float
    at_or_above_threshold_count: int
    at_or_above_threshold_pct: float

class ModelInfoMetrics(BaseModel):
    model_name: str
    model_version: str
    status: str
    last_monitored: str

class MonitoringOverviewResponse(BaseModel):
    volume: PredictionVolumeMetrics
    risk_distribution: RiskDistributionMetrics
    probability_metrics: ProbabilityStats
    probability_histogram: List[ProbabilityHistogramBucket]
    threshold_metrics: ThresholdMetrics
    model_info: ModelInfoMetrics
    time_filter_days: Optional[int] = None

class FeatureDriftItem(BaseModel):
    feature_name: str
    feature_type: str
    psi: Optional[float] = None
    drift_level: str
    status: str
    message: str

class DataDriftResponse(BaseModel):
    status: str
    overall_drift_status: str
    reference_dataset: str
    reference_count: int
    production_count: int
    time_filter_days: Optional[int] = None
    total_features_monitored: int
    drifted_features_count: int
    high_drift_count: int
    medium_drift_count: int
    low_drift_count: int
    features: List[FeatureDriftItem]
    message: str

class BaselineModelMetrics(BaseModel):
    dataset: str
    roc_auc: float
    pr_auc: float
    recall: float
    f1_score: float
    brier_score: float
    threshold: float
    label: str

class ProductionPerformanceMetrics(BaseModel):
    outcome_data_available: bool
    status: str
    message: str
    evaluated_samples: int = 0
    production_roc_auc: Optional[float] = None
    production_pr_auc: Optional[float] = None

class ModelHealthStatus(BaseModel):
    status: str
    model_name: str
    model_version: str
    threshold: float
    data_drift_status: str
    performance_degradation_detected: bool
    explanation: str

class ModelPerformanceResponse(BaseModel):
    baseline_metrics: BaselineModelMetrics
    production_performance: ProductionPerformanceMetrics
    model_health: ModelHealthStatus

# ==================================================
# Fairness & Model Governance Schemas (Phase F)
# ==================================================

class GovernanceControlItem(BaseModel):
    control: str
    status: str
    details: str

class GovernanceOverviewResponse(BaseModel):
    model_name: str
    model_type: str
    model_version: str
    threshold: float
    threshold_pct: str
    reference_dataset: str
    reference_samples: int
    production_assessments_count: int
    model_artifact_hash: str
    preprocessor_hash: str
    threshold_hash: str
    integrity_status: str
    ai_provider: str
    ai_role: str
    monitoring_status: str
    checklist: List[GovernanceControlItem]

class GroupStatisticItem(BaseModel):
    group_key: str
    group_label: str
    sample_count: int
    population_share_pct: float
    has_sufficient_sample: bool
    sample_status: str
    warning: Optional[str] = None
    average_predicted_probability: float
    median_predicted_probability: float
    low_risk_count: int
    low_risk_rate: float
    moderate_risk_count: int
    moderate_risk_rate: float
    high_risk_count: int
    high_risk_rate: float
    approval_rate: float
    disparate_impact_ratio: Optional[float] = None
    probability_gap: Optional[float] = None

class GovernanceGroupAnalysisResponse(BaseModel):
    feature_name: str
    feature_label: str
    feature_type: str
    min_sample_size: int
    total_samples: int
    benchmark_group: Optional[str] = None
    groups: List[GroupStatisticItem]
    observed_differences: Dict[str, Any]
    disclaimer: str

class GovernanceLimitationsResponse(BaseModel):
    available_attributes: List[Dict[str, str]]
    unavailable_protected_attributes: List[str]
    production_outcomes_available: bool
    production_outcome_status: str
    outcome_message: str
    sample_guardrail_threshold: int
    disclaimers: List[str]

class AIGovernanceResponse(BaseModel):
    ai_provider: str
    ai_model: str
    ai_role: str
    prediction_authority: str
    boundaries: List[str]
    safety_notice: str

# ==================================================
# Advanced Admin & Audit Center Schemas (Phase G)
# ==================================================

class AdminOverviewResponse(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    officer_users: int
    viewer_users: int
    total_assessments: int
    assessments_today: int
    assessments_last_7_days: int
    reports_generated: str
    simulations_performed: str
    total_audit_events: int
    successful_logins: int
    failed_logins: int
    recent_audit_events: List[AuditLogResponse]

class PaginatedUsersResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[UserResponse]

class PaginatedAuditResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[AuditLogResponse]

class AdminSecurityResponse(BaseModel):
    login_success_count: int
    login_failure_count: int
    recent_failed_logins: List[AuditLogResponse]
    recent_successful_logins: List[AuditLogResponse]
    user_management_activity: List[AuditLogResponse]
    login_rate_limit: str
    prediction_rate_limit: str
    rate_limit_persistence_note: str
    jwt_algorithm: str
    token_expiry_minutes: int

class AdminModelStatusResponse(BaseModel):
    model_name: str
    model_type: str
    model_version: str
    threshold: float
    threshold_pct: str
    threshold_status: str
    model_artifact_integrity: str
    preprocessor_artifact_integrity: str
    threshold_config_integrity: str
    model_hash_short: str
    preprocessor_hash_short: str
    monitoring_status: str
    governance_status: str
    prediction_authority: str
    administrative_controls: str

class PlatformHealthComponent(BaseModel):
    status: str
    details: str

class PlatformHealthResponse(BaseModel):
    overall_status: str
    components: Dict[str, PlatformHealthComponent]
    timestamp: str

# ==================================================
# Phase H — Executive Decision Intelligence & Analytics Schemas
# ==================================================

class ExecutiveKPIs(BaseModel):
    total_assessments: int
    assessments_today: int
    assessments_last_7_days: int
    assessments_last_30_days: int
    low_risk_count: int
    moderate_risk_count: int
    high_risk_count: int
    low_risk_percentage: float
    moderate_risk_percentage: float
    high_risk_percentage: float
    low_risk_pct_str: str
    moderate_risk_pct_str: str
    high_risk_pct_str: str
    avg_default_probability: float
    avg_default_probability_pct: str
    median_default_probability: float
    median_default_probability_pct: str
    max_default_probability: float
    min_default_probability: float

class OperationalSummary(BaseModel):
    total_assessments: int
    reports_status: str
    simulations_status: str
    audit_events_count: int
    active_users_count: int

class ModelGovernanceSnapshot(BaseModel):
    model_version: str
    decision_threshold: float
    governance_lock: str
    prediction_authority: str
    monitoring_status: str
    drift_status: str
    monitored_features_count: int
    model_sha256_short: str
    preprocessor_sha256_short: str

class ExecutiveAnalyticsResponse(AnalyticsOverviewResponse):
    portfolio_kpis: Optional[ExecutiveKPIs] = None
    operational_summary: Optional[OperationalSummary] = None
    model_governance_snapshot: Optional[ModelGovernanceSnapshot] = None
    executive_summary_text: Optional[str] = None

class TrendsResponse(BaseModel):
    period: str
    total_period_assessments: int
    period_avg_probability: float
    period_avg_probability_pct: str
    trends: List[Dict[str, Any]]

class RiskDistributionCategory(BaseModel):
    category: str
    count: int
    percentage: float
    percentage_str: str
    color: str
    threshold_rule: str

class RiskDistributionResponse(BaseModel):
    decision_threshold: float
    total_assessments: int
    categories: List[RiskDistributionCategory]

class ProbabilityDistributionResponse(BaseModel):
    decision_threshold: float
    threshold_label: str
    mean_probability: float
    mean_probability_pct: str
    median_probability: float
    median_probability_pct: str
    total_assessments: int
    histogram: List[Dict[str, Any]]

class RiskConcentrationGroup(BaseModel):
    group_key: str
    group_label: str
    applicant_count: int
    population_share_pct: float
    avg_probability: float
    avg_probability_pct: str
    low_risk_pct: float
    moderate_risk_pct: float
    high_risk_pct: float

class RiskConcentrationResponse(BaseModel):
    dimension: str
    dimension_label: str
    analysis_type: str
    disclaimer: str
    total_applicants: int
    groups: List[RiskConcentrationGroup]

class ExecutiveMonitoringSnapshotResponse(BaseModel):
    monitoring_status: str
    total_assessments_monitored: int
    drift_status: str
    psi_thresholds: Dict[str, str]
    monitored_features_count: int
    sufficient_samples: bool
    sample_status_note: str

class ExecutiveGovernanceSnapshotResponse(BaseModel):
    model_artifact: str
    model_sha256_short: str
    preprocessing_artifact: str
    preprocessing_sha256_short: str
    decision_threshold: float
    threshold_status: str
    prediction_authority: str
    ai_role: str
    governance_link: str

class ExecutiveAISummaryRequest(BaseModel):
    period: Optional[str] = "30d"

class ExecutiveAISummaryResponse(BaseModel):
    portfolio_summary: str
    notable_observations: List[str]
    operational_recommendations: List[str]
    ai_provider: str
    ai_model: str
    generated_at: str


