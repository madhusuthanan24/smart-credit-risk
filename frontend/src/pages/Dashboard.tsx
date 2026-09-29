import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchDashboardSummary, fetchAnalyticsOverview, fetchHealth } from '../services/api';
import { DashboardSummary, AnalyticsOverview, HealthStatus } from '../types';
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
  HelpCircle
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
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

type TimeFilter = '7' | '30' | '90' | 'all';

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { role } = useAuth();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const daysParam = timeFilter === 'all' ? undefined : parseInt(timeFilter, 10);

    try {
      const summaryPromise = fetchDashboardSummary(daysParam);
      const healthPromise = fetchHealth().catch(() => null);
      
      // RBAC check: VIEWER role cannot access /analytics/overview
      const canAccessAnalytics = role === 'ADMIN' || role === 'CREDIT_OFFICER';
      const analyticsPromise = canAccessAnalytics
        ? fetchAnalyticsOverview(daysParam).catch(() => null)
        : Promise.resolve(null);

      const [summaryData, analyticsData, healthData] = await Promise.all([
        summaryPromise,
        analyticsPromise,
        healthPromise
      ]);

      setSummary(summaryData);
      setAnalytics(analyticsData);
      if (healthData) setHealth(healthData);
    } catch (err: any) {
      console.error('Dashboard data load failure:', err);
      setError(err.message || 'Unable to load executive dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [timeFilter, role]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Color schemes for visualizations
  const RISK_COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  const PRED_COLORS = ['#3b82f6', '#f43f5e'];

  // Risk Distribution Data from live values
  const riskPieData = summary
    ? [
        { name: 'Low Risk', value: summary.approved_count || 0 },
        { name: 'Moderate Risk', value: summary.manual_review_count || Math.max(0, summary.total_assessments - summary.approved_count - summary.high_risk_count) },
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

  // Checking and Savings mappings for readability
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
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading Executive Dashboard...</p>
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
    <div className="space-y-8">
      {/* Top Executive Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Executive Risk Dashboard</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/50 dark:border-brand-800/50">
              {role === 'ADMIN' ? 'Executive Oversight' : role === 'CREDIT_OFFICER' ? 'Underwriting Ops' : 'Read-Only Portal'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time portfolio intelligence, calibrated ML risk decisions, and system health status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Horizon Filters */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
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
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeFilter === filter.value
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Role-Specific Primary Action */}
          {role !== 'VIEWER' ? (
            <button
              onClick={() => setActiveTab('new-assessment')}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all shadow-md shadow-brand-500/20 text-xs"
            >
              <span>Run New Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Read-Only Viewer</span>
            </div>
          )}
        </div>
      </div>

      {/* 8 Primary Dashboard KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Total Assessments */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Total Assessments</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary?.total_assessments?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Scope: {timeFilter === 'all' ? 'Complete history' : `Last ${timeFilter} days`}</span>
          </p>
        </div>

        {/* 2. Good Credit Predictions */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
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

        {/* 3. High Risk Predictions */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">High Risk (Rejected)</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {summary?.high_risk_count || 0}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Rejection Rate: <span className="font-semibold text-rose-600">{summary?.bad_credit_rate_pct || summary?.high_risk_rate_pct || '0.00%'}</span>
          </p>
        </div>

        {/* 4. Manual Review Cases */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Manual Review Cases</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {summary?.manual_review_count || 0}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Borderline risk corridor (0.20 – 0.35)
          </p>
        </div>

        {/* 5. Average Default Probability */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Default Probability</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary?.average_default_probability_pct || summary?.avg_default_probability_pct || '0.00%'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Target Cutoff: <span className="font-semibold text-slate-700 dark:text-slate-300">35.0%</span>
          </p>
        </div>

        {/* 6. Average Credit Amount */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Loan Amount</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {(summary?.average_credit_amount || summary?.avg_credit_amount || 0).toLocaleString()} <span className="text-sm font-semibold text-slate-500">DM</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Average principal per assessment
          </p>
        </div>

        {/* 7. Average Loan Duration */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Loan Duration</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary?.average_loan_duration || 0} <span className="text-sm font-semibold text-slate-500">Months</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Repayment commitment horizon
          </p>
        </div>

        {/* 8. Assessments Today */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Assessments Today</span>
            <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary?.assessments_today || 0}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Originating underwriting volume
          </p>
        </div>
      </div>

      {/* Live System Health Panel */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Live System Health Architecture</h3>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            health?.status === 'healthy'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
          }`}>
            {health?.status === 'healthy' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {health?.status === 'healthy' ? 'ALL SYSTEMS OPERATIONAL' : 'SYSTEM DEGRADED'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* API */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold">FastAPI Engine</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online (v1.0)
            </p>
          </div>

          {/* Database */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold">PostgreSQL</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Connected
            </p>
          </div>

          {/* ML Model */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Cpu className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-semibold">ML Classifier</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              LogisticReg (C=0.1)
            </p>
          </div>

          {/* Preprocessing */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Layers className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-semibold">Preprocessing</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              ColumnTransformer
            </p>
          </div>

          {/* Threshold */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Sliders className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold">Cutoff Threshold</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {health?.threshold !== undefined ? `${health.threshold} (Calibrated)` : '0.35'}
            </p>
          </div>

          {/* Authentication */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Lock className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-semibold">Security / RBAC</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              JWT + Bcrypt Active
            </p>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Risk Stratification, Prediction & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Risk Category Stratification */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Risk Distribution</h3>
            <span className="text-xs text-slate-500 font-medium">Categorical Stratification</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                  {riskPieData.map((_, index) => (
                    <Cell key={`risk-cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
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
          </div>
          <div className="flex justify-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400 mt-2">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Low Risk</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Moderate Risk</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500"></span> High Risk</span>
          </div>
        </div>

        {/* 2. Prediction Distribution */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Prediction Distribution</h3>
            <span className="text-xs text-slate-500 font-medium">Binary Decision Breakdown</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {predData.map((_, index) => (
                    <Cell key={`pred-cell-${index}`} fill={PRED_COLORS[index % PRED_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400 mt-2">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Good Credit (Approved)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500"></span> Bad Credit (Default Risk)</span>
          </div>
        </div>

        {/* 3. Assessment Trend */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Assessment Volume Trend</h3>
            <span className="text-xs text-slate-500 font-medium">Daily Application Count</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.assessment_trend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#0284c7" fill="#0284c7" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Default Probability Trend */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Default Probability Trend</h3>
            <span className="text-xs text-slate-500 font-medium">Average Daily Portfolio Risk %</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.default_probability_trend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${(Number(value) * 100).toFixed(2)}%`, 'Avg Probability']}
                />
                <Line type="monotone" dataKey="avg_prob" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Credit Amount vs Risk */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Credit Amount vs Risk</h3>
            <span className="text-xs text-slate-500 font-medium">Default Probability by Principal Tier</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.credit_amount_vs_risk || analytics?.amount_vs_risk || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="group" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${(Number(value) * 100).toFixed(1)}%`, 'Default Prob']}
                />
                <Bar dataKey="avg_prob" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6. Loan Duration vs Risk */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Loan Duration vs Risk</h3>
            <span className="text-xs text-slate-500 font-medium">Default Probability by Term Horizon</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.duration_vs_risk || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="group" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${(Number(value) * 100).toFixed(1)}%`, 'Default Prob']}
                />
                <Bar dataKey="avg_prob" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7. Checking Account vs Risk */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Checking Account vs Risk</h3>
            <span className="text-xs text-slate-500 font-medium">Impact of Account Liquidity</span>
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
                <Bar dataKey="avg_prob_pct" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 8. Savings Account vs Risk */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Savings Account vs Risk</h3>
            <span className="text-xs text-slate-500 font-medium">Impact of Reserve Balances</span>
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

        {/* 9. Credit History vs Risk */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Credit History vs Risk</h3>
            <span className="text-xs text-slate-500 font-medium">Repayment Track Record vs Default Probability</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedHistoryData}>
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
                <Bar dataKey="avg_prob_pct" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Assessment Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Recent Credit Assessments</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Live database applicant assessments scored by the ML pipeline</p>
          </div>
          <button
            onClick={() => setActiveTab('history')}
            className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                <th className="py-3.5 px-6">Assessment ID</th>
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Credit Amount</th>
                <th className="py-3.5 px-6">Duration</th>
                <th className="py-3.5 px-6">Default Prob</th>
                <th className="py-3.5 px-6">Risk Category</th>
                <th className="py-3.5 px-6">Decision</th>
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
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">{item.credit_amount.toLocaleString()} DM</td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400">{item.duration_in_months}m</td>
                    <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">{item.default_probability_pct}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.risk_category === 'LOW RISK'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : item.risk_category === 'MODERATE RISK'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                      }`}>
                        {item.risk_category}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-xs text-slate-700 dark:text-slate-300">{item.credit_decision}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                    No assessments recorded in this period. Run a new assessment to populate real portfolio records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Governance Quick Links */}
      {role === 'ADMIN' && (
        <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-brand-500/10 border border-purple-200 dark:border-purple-800/40 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Administrative Governance Shortcuts
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage system operators, review audit events, and configure security roles.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('users')}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 transition-colors shadow-md shadow-purple-600/20"
            >
              Audit Log Feed
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
