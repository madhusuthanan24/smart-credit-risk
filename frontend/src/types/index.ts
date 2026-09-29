export interface User {
  id: string | number;
  username?: string;
  email: string;
  full_name?: string;
  role: 'ADMIN' | 'CREDIT_OFFICER' | 'VIEWER' | string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  portal?: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  requested_role?: string;
  invite_code?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApplicantInput {
  status_checking_account: string;
  duration_in_months: number;
  credit_history: string;
  purpose: string;
  credit_amount: number;
  savings_account: string;
  present_employment_since: string;
  installment_rate: number;
  personal_status_sex: string;
  other_debtors_guarantors: string;
  present_residence_since: number;
  property: string;
  age_in_years: number;
  other_installment_plans: string;
  housing: string;
  existing_credits: number;
  job: string;
  num_people_liable: number;
  telephone: string;
  foreign_worker: string;
}

export interface PredictionResponse {
  prediction_id: string;
  applicant_id: string;
  default_probability: number;
  default_probability_pct: string;
  predicted_class: number;
  decision_threshold: number;
  risk_category: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK';
  credit_decision: string;
  model_name: string;
  model_version: string;
  created_at: string;
  risk_factors: string[];
  protective_factors: string[];
  disclaimer: string;
  // NVIDIA AI Explainability Layer
  ai_explanation?: string;
  ai_summary?: string;
  ai_insights?: string[];
  ai_provider?: string;
  ai_model?: string;
  ai_generated_at?: string;
}

export interface AssessmentItem {
  id: string;
  created_at: string;
  applicant_id: string;
  credit_amount: number;
  duration_in_months: number;
  default_probability: number;
  default_probability_pct: string;
  risk_category: string;
  credit_decision: string;
  model_version: string;
  ai_summary?: string;
  ai_provider?: string;
}

export interface DashboardSummary {
  total_assessments: number;
  approved_count: number;
  good_credit_count?: number;
  high_risk_count: number;
  bad_credit_count?: number;
  manual_review_count?: number;
  approval_rate_pct: string;
  high_risk_rate_pct?: string;
  bad_credit_rate_pct?: string;
  avg_default_probability: number;
  avg_default_probability_pct: string;
  average_default_probability_pct?: string;
  avg_credit_amount: number;
  average_credit_amount?: number;
  average_loan_duration?: number;
  assessments_today: number;
  recent_assessments: AssessmentItem[];
}

export interface AnalyticsOverview {
  risk_distribution: Record<string, number>;
  prediction_distribution?: Record<string, number>;
  decision_distribution?: Record<string, number>;
  assessment_trend?: Array<{ date: string; count: number }>;
  default_probability_trend?: Array<{ date: string; avg_prob: number; avg_prob_pct?: string }>;
  probability_histogram: Array<{ range: string; count: number }>;
  duration_vs_risk: Array<{ group: string; avg_prob: number }>;
  amount_vs_risk?: Array<{ group: string; avg_prob: number }>;
  credit_amount_vs_risk?: Array<{ group: string; avg_prob: number }>;
  checking_vs_risk: Array<{ group: string; avg_prob: number }>;
  savings_vs_risk: Array<{ group: string; avg_prob: number }>;
  credit_history_vs_risk?: Array<{ group: string; avg_prob: number }>;
  portfolio_kpis?: ExecutiveKPIs;
  operational_summary?: OperationalSummary;
  model_governance_snapshot?: ModelGovernanceSnapshot;
  executive_summary_text?: string;
}

export interface ModelInfo {
  model_name: string;
  hyperparameters: Record<string, any>;
  test_roc_auc: number;
  test_pr_auc: number;
  decision_threshold: number;
  test_recall_at_optimal_threshold: number;
  test_f1_at_optimal_threshold: number;
  cross_validation_stability: {
    mean_roc_auc: number;
    std_roc_auc: number;
    min_roc_auc: number;
    max_roc_auc: number;
    seeds_tested: number;
  };
  total_train_samples: number;
  total_test_samples: number;
  raw_feature_count: number;
  transformed_feature_count: number;
}

export interface AuditLog {
  id: string | number;
  timestamp?: string;
  assessment_id?: string;
  user_id?: string | number;
  action: string;
  model_version: string;
  threshold: number;
  status: string;
  details?: string;
}

export interface HealthStatus {
  status: string;
  api?: boolean;
  database: boolean | string;
  model_loaded?: boolean;
  preprocessing_loaded?: boolean;
  threshold_loaded?: boolean;
  authentication?: boolean;
  ml_model?: string;
  threshold: number;
}

// ==================================================
// Credit Risk Simulator Interfaces (Phase C)
// ==================================================

export interface SimulationResultItem {
  default_probability: number;
  default_probability_pct: string;
  predicted_class: number;
  prediction: number;
  decision_threshold: number;
  threshold: number;
  risk_category: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK' | string;
  credit_decision: string;
  decision: string;
  risk_factors: string[];
  protective_factors: string[];
}

export interface SimulationDifference {
  probability_difference: number;
  probability_points: number;
  direction: 'lower' | 'higher' | 'unchanged' | string;
}

export interface FieldChangeSummary {
  field: string;
  field_label: string;
  original_value: any;
  simulated_value: any;
  display_original: string;
  display_simulated: string;
}

export interface SimulationRequest {
  original_applicant: ApplicantInput;
  simulated_applicant?: ApplicantInput;
  modifications?: Partial<Record<keyof ApplicantInput, any>>;
}

export interface SimulationResponse {
  success: boolean;
  original: SimulationResultItem;
  simulated: SimulationResultItem;
  difference: SimulationDifference;
  risk_changed: boolean;
  original_risk: string;
  simulated_risk: string;
  changes_summary: FieldChangeSummary[];
  ai_explanation?: string;
  ai_summary?: string;
  ai_insights?: string[];
  ai_provider?: string;
  ai_model?: string;
  ai_generated_at?: string;
}

// ==================================================
// Model Monitoring & Data Drift Interfaces (Phase E)
// ==================================================

export interface PredictionVolumeMetrics {
  today: number;
  last_7_days: number;
  last_30_days: number;
  all_time: number;
}

export interface RiskDistributionCategory {
  count: number;
  percentage: number;
  percentage_formatted: string;
}

export interface RiskDistributionMetrics {
  low_risk: RiskDistributionCategory;
  moderate_risk: RiskDistributionCategory;
  high_risk: RiskDistributionCategory;
  total: number;
}

export interface ProbabilityStats {
  mean: number;
  median: number;
  min: number;
  max: number;
}

export interface ProbabilityHistogramBucket {
  bin: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface ThresholdMetrics {
  threshold: number;
  below_threshold_count: number;
  below_threshold_pct: number;
  at_or_above_threshold_count: number;
  at_or_above_threshold_pct: number;
}

export interface ModelInfoMetrics {
  model_name: string;
  model_version: string;
  status: string;
  last_monitored: string;
}

export interface MonitoringOverviewResponse {
  volume: PredictionVolumeMetrics;
  risk_distribution: RiskDistributionMetrics;
  probability_metrics: ProbabilityStats;
  probability_histogram: ProbabilityHistogramBucket[];
  threshold_metrics: ThresholdMetrics;
  model_info: ModelInfoMetrics;
  time_filter_days?: number | null;
}

export interface FeatureDriftItem {
  feature_name: string;
  feature_type: 'numerical' | 'categorical' | string;
  psi: number | null;
  drift_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'INSUFFICIENT_DATA' | string;
  status: string;
  message: string;
}

export interface DataDriftResponse {
  status: string;
  overall_drift_status: 'STABLE' | 'MODERATE_DRIFT' | 'SIGNIFICANT_DRIFT' | 'INSUFFICIENT_DATA' | string;
  reference_dataset: string;
  reference_count: number;
  production_count: number;
  time_filter_days?: number | null;
  total_features_monitored: number;
  drifted_features_count: number;
  high_drift_count: number;
  medium_drift_count: number;
  low_drift_count: number;
  features: FeatureDriftItem[];
  message: string;
}

export interface BaselineModelMetrics {
  dataset: string;
  roc_auc: number;
  pr_auc: number;
  recall: number;
  f1_score: number;
  brier_score: number;
  threshold: number;
  label: string;
}

export interface ProductionPerformanceMetrics {
  outcome_data_available: boolean;
  status: string;
  message: string;
  evaluated_samples: number;
  production_roc_auc?: number | null;
  production_pr_auc?: number | null;
}

export interface ModelHealthStatus {
  status: string;
  model_name: string;
  model_version: string;
  threshold: number;
  data_drift_status: string;
  performance_degradation_detected: boolean;
  explanation: string;
}

export interface ModelPerformanceResponse {
  baseline_metrics: BaselineModelMetrics;
  production_performance: ProductionPerformanceMetrics;
  model_health: ModelHealthStatus;
}

// ==================================================
// Fairness & Model Governance Interfaces (Phase F)
// ==================================================

export interface GovernanceControlItem {
  control: string;
  status: string;
  details: string;
}

export interface GovernanceOverviewResponse {
  model_name: string;
  model_type: string;
  model_version: string;
  threshold: number;
  threshold_pct: string;
  reference_dataset: string;
  reference_samples: number;
  production_assessments_count: number;
  model_artifact_hash: string;
  preprocessor_hash: string;
  threshold_hash: string;
  integrity_status: string;
  ai_provider: string;
  ai_role: string;
  monitoring_status: string;
  checklist: GovernanceControlItem[];
}

export interface GroupStatisticItem {
  group_key: string;
  group_label: string;
  sample_count: number;
  population_share_pct: number;
  has_sufficient_sample: boolean;
  sample_status: string;
  warning?: string | null;
  average_predicted_probability: number;
  median_predicted_probability: number;
  low_risk_count: number;
  low_risk_rate: number;
  moderate_risk_count: number;
  moderate_risk_rate: number;
  high_risk_count: number;
  high_risk_rate: number;
  approval_rate: number;
  disparate_impact_ratio?: number | null;
  probability_gap?: number | null;
}

export interface GovernanceGroupAnalysisResponse {
  feature_name: string;
  feature_label: string;
  feature_type: string;
  min_sample_size: number;
  total_samples: number;
  benchmark_group?: string | null;
  groups: GroupStatisticItem[];
  observed_differences: {
    status: string;
    benchmark_group?: string | null;
    sufficient_groups_count: number;
    total_groups_count: number;
    max_probability_difference: number;
    max_probability_difference_pct: string;
    max_high_risk_rate_difference: number;
    max_high_risk_rate_difference_pct: string;
    interpretation_note: string;
  };
  disclaimer: string;
}

export interface GovernanceLimitationsResponse {
  available_attributes: Array<{ attribute: string; type: string; status: string }>;
  unavailable_protected_attributes: string[];
  production_outcomes_available: boolean;
  production_outcome_status: string;
  outcome_message: string;
  sample_guardrail_threshold: number;
  disclaimers: string[];
}

export interface AIGovernanceResponse {
  ai_provider: string;
  ai_model: string;
  ai_role: string;
  prediction_authority: string;
  boundaries: string[];
  safety_notice: string;
}

// ==================================================
// Admin & Audit Center Interfaces (Phase G)
// ==================================================

export interface AdminOverview {
  total_users: number;
  active_users: number;
  users_by_role: Record<string, number>;
  total_assessments: number;
  assessments_today: number;
  assessments_last_7_days: number;
  total_audit_events: number;
  audit_events_today: number;
  audit_events_last_7_days: number;
  login_success_count: number;
  login_failure_count: number;
  total_reports_generated: string;
  total_simulations_run: string;
}

export interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedAudit {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AdminSecurity {
  login_stats: {
    total_attempts: number;
    successful_logins: number;
    failed_logins: number;
    failure_rate_pct: number;
  };
  recent_failed_logins: AuditLog[];
  recent_successful_logins: AuditLog[];
  recent_user_management_activity: AuditLog[];
  rate_limiting: {
    enabled: boolean;
    policy: string;
    rate_limit_per_minute: number;
    storage_mode: string;
    active_buckets_tracked: number;
    notes: string;
  };
}

export interface AdminModelStatus {
  model_file: string;
  model_loaded: boolean;
  model_sha256: string;
  preprocessing_file: string;
  preprocessing_loaded: boolean;
  preprocessing_sha256: string;
  threshold_file: string;
  threshold_loaded: boolean;
  threshold_sha256: string;
  current_threshold: number;
  threshold_status: string;
  governance_lock: string;
  prediction_authority: string;
}

export interface PlatformHealthComponent {
  component: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'FAILED' | string;
  details: string;
  error?: string | null;
}

export interface PlatformHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | string;
  timestamp: string;
  components: PlatformHealthComponent[];
}

// ==================================================
// Executive Decision Intelligence Interfaces (Phase H)
// ==================================================

export interface ExecutiveKPIs {
  total_assessments: number;
  assessments_today: number;
  assessments_last_7_days: number;
  assessments_last_30_days: number;
  low_risk_count: number;
  moderate_risk_count: number;
  high_risk_count: number;
  low_risk_percentage: number;
  moderate_risk_percentage: number;
  high_risk_percentage: number;
  low_risk_pct_str: string;
  moderate_risk_pct_str: string;
  high_risk_pct_str: string;
  avg_default_probability: number;
  avg_default_probability_pct: string;
  median_default_probability: number;
  median_default_probability_pct: string;
  max_default_probability: number;
  min_default_probability: number;
}

export interface OperationalSummary {
  total_assessments: number;
  reports_status: string;
  simulations_status: string;
  audit_events_count: number;
  active_users_count: number;
}

export interface ModelGovernanceSnapshot {
  model_version: string;
  decision_threshold: number;
  governance_lock: string;
  prediction_authority: string;
  monitoring_status: string;
  drift_status: string;
  monitored_features_count: number;
  model_sha256_short: string;
  preprocessor_sha256_short: string;
}

export interface TrendItem {
  date: string;
  assessments_count: number;
  avg_probability: number;
  avg_probability_pct: string;
  high_risk_count: number;
  moderate_risk_count: number;
  low_risk_count: number;
}

export interface TrendsResponse {
  period: string;
  total_period_assessments: number;
  period_avg_probability: number;
  period_avg_probability_pct: string;
  trends: TrendItem[];
}

export interface RiskDistributionCategoryItem {
  category: string;
  count: number;
  percentage: number;
  percentage_str: string;
  color: string;
  threshold_rule: string;
}

export interface RiskDistributionResponse {
  decision_threshold: number;
  total_assessments: number;
  categories: RiskDistributionCategoryItem[];
}

export interface ProbabilityHistogramItem {
  range: string;
  min_val: number;
  max_val: number;
  count: number;
  percentage: number;
  is_above_threshold?: boolean;
}

export interface ProbabilityDistributionResponse {
  decision_threshold: number;
  threshold_label: string;
  mean_probability: number;
  mean_probability_pct: string;
  median_probability: number;
  median_probability_pct: string;
  total_assessments: number;
  histogram: ProbabilityHistogramItem[];
}

export interface RiskConcentrationGroupItem {
  group_key: string;
  group_label: string;
  applicant_count: number;
  population_share_pct: number;
  avg_probability: number;
  avg_probability_pct: string;
  low_risk_pct: number;
  moderate_risk_pct: number;
  high_risk_pct: number;
}

export interface RiskConcentrationResponse {
  dimension: string;
  dimension_label: string;
  analysis_type: string;
  disclaimer: string;
  total_applicants: number;
  groups: RiskConcentrationGroupItem[];
}

export interface ExecutiveMonitoringSnapshotResponse {
  monitoring_status: string;
  total_assessments_monitored: number;
  drift_status: string;
  psi_thresholds: Record<string, string>;
  monitored_features_count: number;
  sufficient_samples: boolean;
  sample_status_note: string;
}

export interface ExecutiveGovernanceSnapshotResponse {
  model_artifact: string;
  model_sha256_short: string;
  preprocessing_artifact: string;
  preprocessing_sha256_short: string;
  decision_threshold: number;
  threshold_status: string;
  prediction_authority: string;
  ai_role: string;
  governance_link: string;
}

export interface ExecutiveAISummaryResponse {
  portfolio_summary: string;
  notable_observations: string[];
  operational_recommendations: string[];
  ai_provider: string;
  ai_model: string;
  generated_at: string;
}



