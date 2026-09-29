import {
  ApplicantInput,
  PredictionResponse,
  DashboardSummary,
  AnalyticsOverview,
  ModelInfo,
  AuditLog,
  HealthStatus,
  AssessmentItem,
  SimulationRequest,
  SimulationResponse,
  MonitoringOverviewResponse,
  DataDriftResponse,
  ModelPerformanceResponse,
  GovernanceOverviewResponse,
  GovernanceGroupAnalysisResponse,
  GovernanceLimitationsResponse,
  AIGovernanceResponse,
  User,
  AdminOverview,
  PaginatedUsers,
  PaginatedAudit,
  AdminSecurity,
  AdminModelStatus,
  PlatformHealth,
  TrendsResponse,
  RiskDistributionResponse,
  ProbabilityDistributionResponse,
  RiskConcentrationResponse,
  ExecutiveMonitoringSnapshotResponse,
  ExecutiveGovernanceSnapshotResponse,
  ExecutiveAISummaryResponse
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('smart_credit_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err: any) {
    if (err.name === 'TypeError' || (err.message && err.message.toLowerCase().includes('fetch'))) {
      throw new Error('Network error: Unable to connect to backend server. Please verify your connection.');
    }
    throw err;
  }
}

async function handleResponse<T>(res: Response, errorMessage: string): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem('smart_credit_token');
    localStorage.removeItem('smart_credit_user');
    window.dispatchEvent(new Event('auth_expired'));
    throw new Error('Session expired or unauthorized. Please log in again.');
  }
  if (res.status === 403) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Access Forbidden: You do not have permission for this action.');
  }
  if (res.status === 404) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Resource not found. The requested item or endpoint does not exist.');
  }
  if (res.status === 422) {
    const errData = await res.json().catch(() => ({}));
    let msg = '';
    if (Array.isArray(errData.errors) && errData.errors.length > 0) {
      msg = errData.errors.map((e: any) => `${e.loc ? e.loc.filter((x: any) => x !== 'body').join('.') + ': ' : ''}${e.msg}`).join(', ');
    } else if (Array.isArray(errData.detail)) {
      msg = errData.detail.map((e: any) => `${e.loc ? e.loc.filter((x: any) => x !== 'body').join('.') + ': ' : ''}${e.msg}`).join(', ');
    } else if (typeof errData.detail === 'string') {
      msg = errData.detail;
    }
    throw new Error(msg || 'Validation error: Invalid input data submitted.');
  }
  if (res.status === 429) {
    throw new Error('Too many requests. Please pause before trying again.');
  }
  if (res.status >= 500) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || errData.message || 'Server error encountered. Please try again shortly.');
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || errData.message || errorMessage);
  }
  return res.json();
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await safeFetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend service unavailable');
  return res.json();
}

export async function fetchReady(): Promise<{ status: string; checks: Record<string, boolean> }> {
  const res = await safeFetch(`${API_BASE}/ready`);
  return handleResponse(res, 'Backend service not ready');
}

export async function fetchDashboardSummary(days?: number): Promise<DashboardSummary> {
  const url = days ? `${API_BASE}/dashboard/summary?days=${days}` : `${API_BASE}/dashboard/summary`;
  const res = await fetch(url, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<DashboardSummary>(res, 'Failed to fetch dashboard summary');
}

export async function fetchAnalyticsOverview(
  days?: number,
  riskCategory?: string,
  startDate?: string,
  endDate?: string
): Promise<AnalyticsOverview> {
  const params = new URLSearchParams();
  if (days) params.set('days', days.toString());
  if (riskCategory) params.set('risk_category', riskCategory);
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/analytics/overview${query}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<AnalyticsOverview>(res, 'Failed to fetch analytics overview');
}

export async function fetchModelInfo(): Promise<ModelInfo> {
  const res = await fetch(`${API_BASE}/model/info`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<ModelInfo>(res, 'Failed to fetch model metadata');
}

export async function fetchPredictions(): Promise<AssessmentItem[]> {
  const res = await fetch(`${API_BASE}/predictions`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<AssessmentItem[]>(res, 'Failed to fetch assessment history');
}

export async function fetchPredictionDetail(id: string): Promise<PredictionResponse & { applicant_features: ApplicantInput }> {
  const res = await fetch(`${API_BASE}/predictions/${id}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<PredictionResponse & { applicant_features: ApplicantInput }>(res, 'Failed to fetch assessment detail');
}

export async function submitPrediction(applicant: ApplicantInput): Promise<PredictionResponse> {
  const res = await fetch(`${API_BASE}/predictions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ applicant })
  });
  return handleResponse<PredictionResponse>(res, 'Assessment prediction failed');
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/audit/logs`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<AuditLog[]>(res, 'Failed to fetch audit logs');
}

export async function runSimulation(payload: SimulationRequest): Promise<SimulationResponse> {
  const res = await fetch(`${API_BASE}/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<SimulationResponse>(res, 'Credit risk simulation failed');
}

export async function downloadAssessmentReport(assessmentId: string, filename?: string): Promise<void> {
  const token = localStorage.getItem('smart_credit_token');
  const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
  
  const res = await fetch(`${API_BASE}/reports/assessment/${assessmentId}`, {
    method: 'GET',
    headers
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to download assessment report.');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `credit-risk-assessment-${assessmentId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function previewAssessmentReport(assessmentId: string): Promise<void> {
  const token = localStorage.getItem('smart_credit_token');
  const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
  
  const res = await fetch(`${API_BASE}/reports/assessment/${assessmentId}`, {
    method: 'GET',
    headers
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to preview assessment report.');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export async function fetchMonitoringOverview(days?: number): Promise<MonitoringOverviewResponse> {
  const url = days ? `${API_BASE}/monitoring/overview?days=${days}` : `${API_BASE}/monitoring/overview`;
  const res = await fetch(url, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<MonitoringOverviewResponse>(res, 'Failed to fetch monitoring overview');
}

export async function fetchDataDrift(days?: number): Promise<DataDriftResponse> {
  const url = days ? `${API_BASE}/monitoring/drift?days=${days}` : `${API_BASE}/monitoring/drift`;
  const res = await fetch(url, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<DataDriftResponse>(res, 'Failed to fetch data drift analysis');
}

export async function fetchModelPerformance(): Promise<ModelPerformanceResponse> {
  const res = await fetch(`${API_BASE}/monitoring/performance`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<ModelPerformanceResponse>(res, 'Failed to fetch model performance');
}

export async function fetchGovernanceOverview(): Promise<GovernanceOverviewResponse> {
  const res = await fetch(`${API_BASE}/governance/overview`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<GovernanceOverviewResponse>(res, 'Failed to fetch governance overview');
}

export async function fetchGovernanceGroups(feature: string = 'age_in_years', minSampleSize: number = 20): Promise<GovernanceGroupAnalysisResponse> {
  const res = await fetch(`${API_BASE}/governance/groups?feature=${encodeURIComponent(feature)}&min_sample_size=${minSampleSize}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<GovernanceGroupAnalysisResponse>(res, 'Failed to fetch group fairness analysis');
}

export async function fetchGovernanceLimitations(): Promise<GovernanceLimitationsResponse> {
  const res = await fetch(`${API_BASE}/governance/limitations`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<GovernanceLimitationsResponse>(res, 'Failed to fetch governance limitations');
}

export async function fetchAIGovernance(): Promise<AIGovernanceResponse> {
  const res = await fetch(`${API_BASE}/governance/ai`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<AIGovernanceResponse>(res, 'Failed to fetch AI governance info');
}

// ==================================================
// Admin & Audit Center API Functions (Phase G)
// ==================================================

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const res = await fetch(`${API_BASE}/admin/overview`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<AdminOverview>(res, 'Failed to fetch admin overview metrics');
}

export async function fetchAdminUsers(
  page: number = 1,
  limit: number = 10,
  search?: string,
  role?: string,
  isActive?: boolean
): Promise<PaginatedUsers> {
  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('limit', limit.toString());
  if (search) params.set('search', search);
  if (role) params.set('role', role);
  if (isActive !== undefined) params.set('is_active', isActive.toString());

  const res = await fetch(`${API_BASE}/admin/users?${params.toString()}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<PaginatedUsers>(res, 'Failed to fetch users');
}

export async function createAdminUser(userData: {
  username: string;
  email: string;
  full_name?: string;
  password: string;
  role: string;
  is_active?: boolean;
}): Promise<User> {
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(userData)
  });
  return handleResponse<User>(res, 'Failed to create user');
}

export async function updateAdminUser(
  userId: string | number,
  userData: {
    role?: string;
    is_active?: boolean;
    full_name?: string;
    email?: string;
  }
): Promise<User> {
  const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(userData)
  });
  return handleResponse<User>(res, 'Failed to update user');
}

export async function fetchAdminAudit(
  page: number = 1,
  limit: number = 15,
  action?: string,
  status?: string,
  search?: string,
  startDate?: string,
  endDate?: string
): Promise<PaginatedAudit> {
  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('limit', limit.toString());
  if (action) params.set('action', action);
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);

  const res = await fetch(`${API_BASE}/admin/audit?${params.toString()}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<PaginatedAudit>(res, 'Failed to fetch audit logs');
}

export async function fetchAdminSecurity(): Promise<AdminSecurity> {
  const res = await fetch(`${API_BASE}/admin/security`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<AdminSecurity>(res, 'Failed to fetch security activity');
}

export async function fetchAdminModelStatus(): Promise<AdminModelStatus> {
  const res = await fetch(`${API_BASE}/admin/model-status`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<AdminModelStatus>(res, 'Failed to fetch model status');
}

export async function fetchAdminHealth(): Promise<PlatformHealth> {
  const res = await fetch(`${API_BASE}/admin/health`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<PlatformHealth>(res, 'Failed to fetch platform health');
}

// ==================================================
// Phase H — Executive Decision Intelligence API Functions
// ==================================================

export async function fetchAnalyticsTrends(
  period: string = '30d',
  riskCategory?: string
): Promise<TrendsResponse> {
  const params = new URLSearchParams();
  params.set('period', period);
  if (riskCategory) params.set('risk_category', riskCategory);
  const res = await fetch(`${API_BASE}/analytics/trends?${params.toString()}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<TrendsResponse>(res, 'Failed to fetch assessment trends');
}

export async function fetchRiskDistribution(
  days?: number,
  startDate?: string,
  endDate?: string
): Promise<RiskDistributionResponse> {
  const params = new URLSearchParams();
  if (days) params.set('days', days.toString());
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/analytics/risk-distribution${query}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<RiskDistributionResponse>(res, 'Failed to fetch risk distribution');
}

export async function fetchProbabilityDistribution(
  days?: number
): Promise<ProbabilityDistributionResponse> {
  const query = days ? `?days=${days}` : '';
  const res = await fetch(`${API_BASE}/analytics/probability-distribution${query}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<ProbabilityDistributionResponse>(res, 'Failed to fetch probability distribution');
}

export async function fetchRiskConcentration(
  dimension: string = 'age_bracket',
  days?: number
): Promise<RiskConcentrationResponse> {
  const params = new URLSearchParams();
  params.set('dimension', dimension);
  if (days) params.set('days', days.toString());
  const res = await fetch(`${API_BASE}/analytics/concentration?${params.toString()}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<RiskConcentrationResponse>(res, 'Failed to fetch risk concentration');
}

export async function fetchExecutiveMonitoringSnapshot(): Promise<ExecutiveMonitoringSnapshotResponse> {
  const res = await fetch(`${API_BASE}/analytics/monitoring`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<ExecutiveMonitoringSnapshotResponse>(res, 'Failed to fetch monitoring snapshot');
}

export async function fetchExecutiveGovernanceSnapshot(): Promise<ExecutiveGovernanceSnapshotResponse> {
  const res = await fetch(`${API_BASE}/analytics/governance`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<ExecutiveGovernanceSnapshotResponse>(res, 'Failed to fetch governance snapshot');
}

export async function fetchExecutiveAISummary(
  period: string = '30d'
): Promise<ExecutiveAISummaryResponse> {
  const res = await fetch(`${API_BASE}/analytics/ai-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ period })
  });
  return handleResponse<ExecutiveAISummaryResponse>(res, 'Failed to fetch AI executive summary');
}




