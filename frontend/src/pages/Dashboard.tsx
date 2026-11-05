import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchDashboardSummary,
  fetchAnalyticsOverview,
  fetchHealth,
  fetchAdminOverview,
  downloadAssessmentReport
} from '../services/api';
import { DashboardSummary, AnalyticsOverview, HealthStatus, AdminOverview } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  TrendingUp,
  DollarSign,
  Calendar,
  ArrowRight,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Database,
  Cpu,
  Layers,
  Lock,
  Sliders,
  RefreshCw,
  Users,
  BarChart3,
  HelpCircle,
  PlusCircle,
  FileDown,
  Shield,
  Eye,
  SlidersHorizontal,
  Scale,
  Sparkles,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

type TimeFilter = '7' | '30' | '90' | 'all';

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { role, user } = useAuth();
  const currentRole = role || 'VIEWER';

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const daysParam = timeFilter === 'all' ? undefined : parseInt(timeFilter, 10);

    try {
      const summaryPromise = fetchDashboardSummary(daysParam);
      const healthPromise = fetchHealth().catch(() => null);
      const analyticsPromise = fetchAnalyticsOverview(daysParam).catch(() => null);
      const adminPromise = currentRole === 'ADMIN' ? fetchAdminOverview().catch(() => null) : Promise.resolve(null);

      const [summaryData, healthData, analyticsData, adminData] = await Promise.all([
        summaryPromise,
        healthPromise,
        analyticsPromise,
        adminPromise
      ]);

      setSummary(summaryData);
      if (healthData) setHealth(healthData);
      setAnalytics(analyticsData);
      if (adminData) setAdminOverview(adminData);
    } catch (err: any) {
      console.error('Dashboard data load failure:', err);
      setError(err.message || 'Unable to load executive dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [timeFilter, currentRole]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleDownloadReport = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadingId(id);
    try {
      await downloadAssessmentReport(id);
    } catch (err: any) {
      alert(err.message || 'Failed to download assessment report.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Color schemes for visualizations
  const RISK_COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  const PRED_COLORS = ['#3b82f6', '#f43f5e'];

  // Risk Distribution Data
  const riskPieData = summary
    ? [
        { name: 'Low Risk', value: summary.approved_count || 0 },
        {
          name: 'Moderate Risk',
          value:
            summary.manual_review_count ||
            Math.max(0, summary.total_assessments - summary.approved_count - summary.high_risk_count)
        },
        { name: 'High Risk', value: summary.high_risk_count || 0 }
      ]
    : [];

  // Prediction Distribution Data
  const predData = analytics?.prediction_distribution
    ? [
        { name: 'Good Credit', count: analytics.prediction_distribution['GOOD CREDIT'] || 0 },
        { name: 'Bad Credit', count: analytics.prediction_distribution['BAD CREDIT'] || 0 }
      ]
    : summary
    ? [
        { name: 'Good Credit', count: summary.good_credit_count ?? summary.approved_count },
        { name: 'Bad Credit', count: summary.bad_credit_count ?? summary.high_risk_count }
      ]
    : [];

  // Checking and Savings mappings
  const checkingLabels: Record<string, string> = {
    A11: '< 0 DM',
    A12: '0-200 DM',
    A13: '>= 200 DM',
    A14: 'No Account'
  };

  const savingsLabels: Record<string, string> = {
    A61: '< 100 DM',
    A62: '100-500 DM',
    A63: '500-1000 DM',
    A64: '>= 1000 DM',
    A65: 'Unknown/None'
  };

  const historyLabels: Record<string, string> = {
    A30: 'No Credits',
    A31: 'All Paid',
    A32: 'Existing Paid',
    A33: 'Past Delays',
    A34: 'Critical Account'
  };

  const formattedCheckingData = (analytics?.checking_vs_risk || []).map((item) => ({
    group: checkingLabels[item.group] || item.group,
    avg_prob_pct: Number((item.avg_prob * 100).toFixed(1)),
    avg_prob: item.avg_prob
  }));

  const formattedSavingsData = (analytics?.savings_vs_risk || []).map((item) => ({
    group: savingsLabels[item.group] || item.group,
    avg_prob_pct: Number((item.avg_prob * 100).toFixed(1)),
    avg_prob: item.avg_prob
  }));

  const formattedHistoryData = (analytics?.credit_history_vs_risk || []).map((item) => ({
    group: historyLabels[item.group] || item.group,
    avg_prob_pct: Number((item.avg_prob * 100).toFixed(1)),
    avg_prob: item.avg_prob
  }));

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-500/30 border-t-brand-500"></div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading {currentRole} Dashboard...</p>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-2xl p-8 text-center max-w-lg mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Unable to Load Dashboard</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 mb-6">{error}</p>
        <button
          onClick={loadDashboardData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* 1. ROLE-SPECIFIC DASHBOARD HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {currentRole === 'ADMIN'
                ? 'Admin Control Dashboard'
                : currentRole === 'CREDIT_OFFICER'
                ? 'Credit Underwriting & Risk Operations'
                : 'Credit Risk Analytics & Portfolio Viewer'}
            </h2>

            {/* Role Badge */}
            {currentRole === 'ADMIN' && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 shadow-xs">
                <Shield className="w-3.5 h-3.5" />
                <span>ADMINISTRATOR</span>
              </span>
            )}
            {currentRole === 'CREDIT_OFFICER' && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>CREDIT OFFICER</span>
              </span>
            )}
            {currentRole === 'VIEWER' && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-xs">
                <Lock className="w-3.5 h-3.5" />
                <span>VIEWER (READ-ONLY)</span>
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            {currentRole === 'ADMIN' &&
              'Centralized administrative command: monitor platform security, audit logs, user governance, and authoritative ML credit risk metrics.'}
            {currentRole === 'CREDIT_OFFICER' &&
              'Operational credit decisioning center: score applicant loan risks, simulate loan restructuring, review calibrated classifications, and generate regulatory PDF reports.'}
            {currentRole === 'VIEWER' &&
              'Portfolio oversight portal: inspect aggregated loan risk distributions, Population Stability Index (PSI) drift, algorithmic fairness metrics, and run safe in-memory simulations.'}
          </p>
        </div>

        {/* Time Filters & Role Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            {(
              [
                { label: '7 Days', value: '7' },
                { label: '30 Days', value: '30' },
                { label: '90 Days', value: '90' },
                { label: 'All Time', value: 'all' }
              ] as const
            ).map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter.value)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all ${
                  timeFilter === filter.value
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Primary Action Button Based on Role */}
          {currentRole !== 'VIEWER' ? (
            <button
              onClick={() => setActiveTab('new-assessment')}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all shadow-md shadow-brand-500/20 text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Assessment</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('simulator')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all shadow-xs text-xs dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              <SlidersHorizontal className="w-4 h-4 text-brand-400" />
              <span>Risk Simulator (Sandbox)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. VIEWER-ONLY INFORMATIONAL BANNER */}
      {currentRole === 'VIEWER' && (
        <div className="bg-gradient-to-r from-blue-500/10 via-slate-500/10 to-brand-500/10 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <h4 className="font-bold text-slate-900 dark:text-white">Read-Only Viewer Experience</h4>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              You are authenticated with read-only audit permissions. You can explore portfolio distributions, inspect model drift and demographic fairness, and test counterfactual scenarios in the <strong>Risk Simulator sandbox</strong> (which executes purely in memory without persisting data). To originate live credit assessments or manage accounts, contact an administrator.
            </p>
          </div>
        </div>
      )}

      {/* 3. ADMIN-ONLY TELEMETRY & MANAGEMENT SHORTCUTS */}
      {currentRole === 'ADMIN' && adminOverview && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-brand-500/10 border border-purple-200 dark:border-purple-800/40 rounded-2xl p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span>Platform Governance & Security Telemetry</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  High-level identity controls, security counters, and platform health indicators.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTab('users')}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>User Management</span>
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>System Audit Logs</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin-center')}
                  className="px-3.5 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 transition-all shadow-sm shadow-purple-600/20 flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Control Center</span>
                </button>
              </div>
            </div>

            {/* 4 Admin Quick KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/50">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Users
                </span>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {adminOverview.total_users}
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {adminOverview.active_users} active accounts
                </span>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/50">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Role Distribution
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5 space-x-2">
                  <span className="text-purple-600">{adminOverview.admin_users ?? adminOverview.users_by_role?.ADMIN ?? 0} Admins</span> •{' '}
                  <span className="text-blue-600">{adminOverview.officer_users ?? adminOverview.users_by_role?.CREDIT_OFFICER ?? 0} Officers</span> •{' '}
                  <span className="text-slate-500">{adminOverview.viewer_users ?? adminOverview.users_by_role?.VIEWER ?? 0} Viewers</span>
                </p>
                <span className="text-[10px] text-slate-400">Strict RBAC enforced</span>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/50">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Security Logins
                </span>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {adminOverview.successful_logins ?? adminOverview.login_success_count ?? 0}
                </p>
                <span className="text-[10px] text-rose-500 font-semibold">
                  {adminOverview.failed_logins ?? adminOverview.login_failure_count ?? 0} failed attempts
                </span>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/50">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  System Health
                </span>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>All Subsystems Ready</span>
                </p>
                <span className="text-[10px] text-slate-400">Model 1.0.0 • Cutoff 0.35</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. CREDIT OFFICER UNDERWRITING SHORTCUTS */}
      {currentRole === 'CREDIT_OFFICER' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <button
            onClick={() => setActiveTab('new-assessment')}
            className="p-4 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl shadow-sm shadow-brand-500/20 text-left transition-all flex items-center justify-between group"
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-100">Primary Workflow</span>
              <h4 className="text-base font-extrabold mt-0.5">New Loan Assessment</h4>
              <p className="text-xs text-brand-100/90 mt-1">Score applicant across 20 German credit dimensions.</p>
            </div>
            <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className="p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs text-left transition-all flex items-center justify-between group"
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Decision Support</span>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">Risk Simulator</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Test counterfactual loan terms & restructuring.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className="p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs text-left transition-all flex items-center justify-between group"
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Audit & Dossiers</span>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">Assessment History</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Inspect scored applicants & download vector PDFs.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* 5. PRIMARY CREDIT RISK KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {/* Total Assessments */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Scored Loans</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary?.total_assessments?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Scope: {timeFilter === 'all' ? 'All historical records' : `Past ${timeFilter} days`}</span>
          </p>
        </div>

        {/* Good Credit Predictions */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Good Credit (Approved)</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {summary?.good_credit_count ?? summary?.approved_count ?? 0}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Approval Rate: <span className="font-semibold text-emerald-600">{summary?.approval_rate_pct || '0.00%'}</span>
          </p>
        </div>

        {/* High Risk Predictions */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">High Risk (Rejected)</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {summary?.high_risk_count || 0}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Rejection Rate: <span className="font-semibold text-rose-600">{summary?.bad_credit_rate_pct || '0.00%'}</span>
          </p>
        </div>

        {/* Model Calibration Status */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Decision Cutoff</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">0.35</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Cost-loss calibrated • 5:1 default penalty
          </p>
        </div>
      </div>

      {/* Secondary Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase">Avg Default Probability</span>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            {summary?.average_default_probability_pct || '0.0%'}
          </p>
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase">Avg Credit Requested</span>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            {summary?.average_credit_amount ? `${Math.round(summary.average_credit_amount).toLocaleString()} DM` : '0 DM'}
          </p>
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase">Avg Loan Duration</span>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            {summary?.average_loan_duration ? `${summary.average_loan_duration.toFixed(1)} Months` : '0 Months'}
          </p>
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase">Model Version</span>
          <p className="text-lg font-bold text-brand-600 dark:text-brand-400 mt-0.5">
            Tuned LR 1.0.0
          </p>
        </div>
      </div>

      {/* 6. CHARTS & PORTFOLIO VISUALIZATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Risk Category Distribution */}
        <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Portfolio Risk Distribution</h3>
              <p className="text-xs text-slate-400 mt-0.5">Classification split across Low, Moderate, and High Risk tiers</p>
            </div>
            <span className="text-xs px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 font-semibold">
              3 Tiers
            </span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {riskPieData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {riskPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No assessment data available for this timeframe.</p>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-600 dark:text-slate-300">Low Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-slate-600 dark:text-slate-300">Moderate Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <span className="text-slate-600 dark:text-slate-300">High Risk</span>
            </div>
          </div>
        </div>

        {/* Prediction Class Split */}
        <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Binary Classification Ratio</h3>
              <p className="text-xs text-slate-400 mt-0.5">Good Credit vs Bad Credit against 0.35 Cutoff</p>
            </div>
            <span className="text-xs px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 font-semibold">
              Binary Target
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                  {predData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={PRED_COLORS[index % PRED_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-slate-600 dark:text-slate-300">Good Credit</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <span className="text-slate-600 dark:text-slate-300">Bad Credit</span>
            </div>
          </div>
        </div>

        {/* Checking Account vs Risk */}
        <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Checking Account vs Risk</h3>
              <p className="text-xs text-slate-400 mt-0.5">Average Default Probability by Liquidity Status</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedCheckingData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="group" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${value}%`, 'Default Risk']}
                />
                <Bar dataKey="avg_prob_pct" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Savings Account vs Risk */}
        <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Savings Account vs Risk</h3>
              <p className="text-xs text-slate-400 mt-0.5">Average Default Probability by Savings Tier</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedSavingsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="group" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${value}%`, 'Default Risk']}
                />
                <Bar dataKey="avg_prob_pct" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 7. RECENT CREDIT ASSESSMENTS TABLE */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span>Recent Credit Assessments</span>
              {currentRole === 'VIEWER' && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-md">
                  Read-Only
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live loan decisions scored by the calibrated Logistic Regression engine
            </p>
          </div>

          <button
            onClick={() => setActiveTab('history')}
            className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1 w-fit"
          >
            <span>{currentRole === 'VIEWER' ? 'View Full History (Read-Only)' : 'View All History'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                <th className="py-3.5 px-6">Assessment ID</th>
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Credit Amount</th>
                <th className="py-3.5 px-6">Duration</th>
                <th className="py-3.5 px-6">Default Prob</th>
                <th className="py-3.5 px-6">Risk Category</th>
                <th className="py-3.5 px-6">Decision</th>
                <th className="py-3.5 px-6 text-right">PDF Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {summary?.recent_assessments && summary.recent_assessments.length > 0 ? (
                summary.recent_assessments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {item.id.substring(0, 8)}...
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400 text-xs">{item.created_at}</td>
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                      {item.credit_amount.toLocaleString()} DM
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400">{item.duration_in_months}m</td>
                    <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                      {item.default_probability_pct}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.risk_category === 'LOW RISK'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : item.risk_category === 'MODERATE RISK'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        }`}
                      >
                        {item.risk_category}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-xs text-slate-700 dark:text-slate-300">
                      {item.credit_decision}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={(e) => handleDownloadReport(item.id, e)}
                        disabled={downloadingId === item.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                        title="Download Regulatory Audit PDF"
                      >
                        {downloadingId === item.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5 text-brand-500" />
                        )}
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
                    No assessments recorded in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. FOOTER NAVIGATION TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <button
          onClick={() => setActiveTab('analytics')}
          className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left hover:border-brand-500/50 transition-colors"
        >
          <BarChart3 className="w-4 h-4 text-brand-500 mb-1" />
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Executive Analytics</h5>
          <p className="text-[10px] text-slate-400">Concentration heatmaps & trends</p>
        </button>

        <button
          onClick={() => setActiveTab('monitoring')}
          className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left hover:border-brand-500/50 transition-colors"
        >
          <Activity className="w-4 h-4 text-emerald-500 mb-1" />
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Model Monitoring</h5>
          <p className="text-[10px] text-slate-400">PSI feature drift tracking</p>
        </button>

        <button
          onClick={() => setActiveTab('governance')}
          className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left hover:border-brand-500/50 transition-colors"
        >
          <Scale className="w-4 h-4 text-purple-500 mb-1" />
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Fairness & Parity</h5>
          <p className="text-[10px] text-slate-400">Demographic auditing guardrails</p>
        </button>

        <button
          onClick={() => setActiveTab('model-info')}
          className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left hover:border-brand-500/50 transition-colors"
        >
          <Cpu className="w-4 h-4 text-blue-500 mb-1" />
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Model Architecture</h5>
          <p className="text-[10px] text-slate-400">Calibrated hyperparameters</p>
        </button>
      </div>
    </div>
  );
};
