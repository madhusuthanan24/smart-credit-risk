import { ApplicantInput, PredictionResponse, DashboardSummary, AnalyticsOverview, ModelInfo, AuditLog, HealthStatus, AssessmentItem } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('smart_credit_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response, errorMessage: string): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem('smart_credit_token');
    localStorage.removeItem('smart_credit_user');
    window.dispatchEvent(new Event('auth_expired'));
    throw new Error('Session expired. Please log in again.');
  }
  if (res.status === 403) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Access Forbidden: You do not have permission for this action.');
  }
  if (res.status === 429) {
    throw new Error('Too many requests. Please pause before trying again.');
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || errData.message || errorMessage);
  }
  return res.json();
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend service unavailable');
  return res.json();
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE}/dashboard/summary`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<DashboardSummary>(res, 'Failed to fetch dashboard summary');
}

export async function fetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  const res = await fetch(`${API_BASE}/analytics/overview`, {
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
