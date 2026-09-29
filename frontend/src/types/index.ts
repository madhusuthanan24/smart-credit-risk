export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'CREDIT_OFFICER' | 'VIEWER' | string;
  is_active: boolean;
  created_at: string;
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
}

export interface DashboardSummary {
  total_assessments: number;
  approved_count: number;
  high_risk_count: number;
  approval_rate_pct: string;
  high_risk_rate_pct: string;
  avg_default_probability: number;
  avg_default_probability_pct: string;
  avg_credit_amount: number;
  assessments_today: number;
  recent_assessments: AssessmentItem[];
}

export interface AnalyticsOverview {
  risk_distribution: Record<string, number>;
  decision_distribution: Record<string, number>;
  probability_histogram: Array<{ range: string; count: number }>;
  duration_vs_risk: Array<{ group: string; avg_prob: number }>;
  amount_vs_risk: Array<{ group: string; avg_prob: number }>;
  checking_vs_risk: Array<{ group: string; avg_prob: number }>;
  savings_vs_risk: Array<{ group: string; avg_prob: number }>;
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
  id: string;
  timestamp: string;
  assessment_id?: string;
  action: string;
  model_version: string;
  threshold: number;
  status: string;
  details?: string;
}

export interface HealthStatus {
  status: string;
  database: boolean | string;
  model_loaded?: boolean;
  preprocessing_loaded?: boolean;
  threshold_loaded?: boolean;
  ml_model?: string;
  threshold: number;
}
