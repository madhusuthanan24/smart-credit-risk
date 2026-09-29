import React, { useEffect, useState } from 'react';
import {
  fetchAnalyticsOverview,
  fetchAnalyticsTrends,
  fetchRiskDistribution,
  fetchProbabilityDistribution,
  fetchRiskConcentration,
  fetchExecutiveMonitoringSnapshot,
  fetchExecutiveGovernanceSnapshot,
  fetchExecutiveAISummary
} from '../services/api';
import {
  AnalyticsOverview,
  TrendsResponse,
  RiskDistributionResponse,
  ProbabilityDistributionResponse,
  RiskConcentrationResponse,
  ExecutiveMonitoringSnapshotResponse,
  ExecutiveGovernanceSnapshotResponse,
  ExecutiveAISummaryResponse
} from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Shield,
  ShieldCheck,
  Activity,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Calendar,
  Filter,
  ArrowRight,
  Database,
  Users,
  Lock,
  PieChart as PieIcon
} from 'lucide-react';

interface AnalyticsProps {
  setActiveTab?: (tab: string) => void;
}

export const Analytics: React.FC<AnalyticsProps> = ({ setActiveTab }) => {
  // State for data
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [riskDist, setRiskDist] = useState<RiskDistributionResponse | null>(null);
  const [probDist, setProbDist] = useState<ProbabilityDistributionResponse | null>(null);
  const [concentration, setConcentration] = useState<RiskConcentrationResponse | null>(null);
  const [monitoringSnap, setMonitoringSnap] = useState<ExecutiveMonitoringSnapshotResponse | null>(null);
  const [govSnap, setGovSnap] = useState<ExecutiveGovernanceSnapshotResponse | null>(null);
  const [aiSummary, setAiSummary] = useState<ExecutiveAISummaryResponse | null>(null);

  // Filter States
  const [timePeriod, setTimePeriod] = useState<string>('30d');
  const [selectedRiskCategory, setSelectedRiskCategory] = useState<string>('');
  const [selectedDimension, setSelectedDimension] = useState<string>('age_bracket');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDaysFromPeriod = (p: string): number | undefined => {
    if (p === 'today') return 1;
    if (p === '7d') return 7;
    if (p === '30d') return 30;
    return undefined;
  };

  const loadAllAnalytics = async () => {
    try {
      setError(null);
      const days = getDaysFromPeriod(timePeriod);
      const riskCat = selectedRiskCategory || undefined;
      const sDate = startDate || undefined;
      const eDate = endDate || undefined;

      const [ov, tr, rd, pd, rc, ms, gs] = await Promise.all([
        fetchAnalyticsOverview(days, riskCat, sDate, eDate),
        fetchAnalyticsTrends(timePeriod, riskCat),
        fetchRiskDistribution(days, sDate, eDate),
        fetchProbabilityDistribution(days),
        fetchRiskConcentration(selectedDimension, days),
        fetchExecutiveMonitoringSnapshot(),
        fetchExecutiveGovernanceSnapshot()
      ]);

      setOverview(ov);
      setTrends(tr);
      setRiskDist(rd);
      setProbDist(pd);
      setConcentration(rc);
      setMonitoringSnap(ms);
      setGovSnap(gs);
    } catch (err: any) {
      setError(err.message || 'Failed to load executive analytics data.');
    }
  };

  const loadAISummary = async () => {
    setAiLoading(true);
    try {
      const res = await fetchExecutiveAISummary(timePeriod);
      setAiSummary(res);
    } catch (err: any) {
      console.warn('AI Summary loading fallback:', err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadAllAnalytics();
      setLoading(false);
    };
    init();
  }, [timePeriod, selectedRiskCategory, selectedDimension, startDate, endDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllAnalytics();
    if (aiSummary) {
      await loadAISummary();
    }
    setRefreshing(false);
  };

  const handleResetFilters = () => {
    setTimePeriod('30d');
    setSelectedRiskCategory('');
    setSelectedDimension('age_bracket');
    setStartDate('');
    setEndDate('');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Synthesizing executive decision intelligence & portfolio analytics...
        </p>
      </div>
    );
  }

  const kpis = overview?.portfolio_kpis;
  const totalAssessments = kpis?.total_assessments ?? 0;
  const isZeroRecords = totalAssessments === 0;

  const PIE_COLORS = {
    'Low Risk': '#10b981',
    'Moderate Risk': '#f59e0b',
    'High Risk': '#ef4444'
  };

  const pieChartData = riskDist?.categories.map((cat) => ({
    name: cat.category,
    value: cat.count,
    percentage: cat.percentage_str,
    color: cat.color || PIE_COLORS[cat.category as keyof typeof PIE_COLORS] || '#64748b'
  })) || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-500 text-white rounded-xl shadow-md">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Executive Decision Intelligence</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Phase H Verified
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Portfolio risk overview, assessment volume trends, probability distributions, and operational telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Executive Headline Summary Banner */}
      <div className="bg-gradient-to-r from-brand-50 to-indigo-50/60 dark:from-slate-800 dark:to-slate-800/80 p-5 rounded-2xl border border-brand-200/60 dark:border-slate-700 shadow-xs flex items-start gap-4">
        <div className="p-2.5 bg-brand-500 text-white rounded-xl shrink-0 mt-0.5 shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
              Executive Portfolio Brief
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Threshold: 0.35 (Locked)
            </span>
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
            {overview?.executive_summary_text || 'Synthesizing portfolio intelligence...'}
          </p>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-brand-500" />
            <span>Portfolio Filter Controls</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
          >
            Reset All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Period Selector */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">Reporting Window</label>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden font-medium"
            >
              <option value="today">Today (1 Day)</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days (Default)</option>
              <option value="all">All Available History</option>
            </select>
          </div>

          {/* Risk Category Filter */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">Risk Category Segment</label>
            <select
              value={selectedRiskCategory}
              onChange={(e) => setSelectedRiskCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden font-medium"
            >
              <option value="">All Risk Classes</option>
              <option value="LOW RISK">Low Risk Only (&lt; 0.20)</option>
              <option value="MODERATE RISK">Moderate Risk Only (0.20 - 0.35)</option>
              <option value="HIGH RISK">High Risk Only (&ge; 0.35)</option>
            </select>
          </div>

          {/* Custom Date Range: Start Date */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">Custom Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden text-slate-700 dark:text-slate-300 font-medium"
            />
          </div>

          {/* Custom Date Range: End Date */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">Custom End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden text-slate-700 dark:text-slate-300 font-medium"
            />
          </div>
        </div>
      </div>

      {/* SECTION 1: PORTFOLIO OVERVIEW KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Assessments */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Volume
            </span>
            <Activity className="w-5 h-5 text-brand-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{kpis?.total_assessments ?? 0}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{kpis?.assessments_today ?? 0} today</span>
            <span>•</span>
            <span>{kpis?.assessments_last_7_days ?? 0} in 7d</span>
          </div>
        </div>

        {/* Low Risk */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Low Risk
            </span>
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{kpis?.low_risk_count ?? 0}</p>
          <p className="text-xs text-slate-500 mt-2">
            Share: <strong className="text-slate-800 dark:text-slate-200">{kpis?.low_risk_pct_str ?? '0.0%'}</strong> of portfolio
          </p>
        </div>

        {/* Moderate Risk */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Moderate Risk
            </span>
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{kpis?.moderate_risk_count ?? 0}</p>
          <p className="text-xs text-slate-500 mt-2">
            Share: <strong className="text-slate-800 dark:text-slate-200">{kpis?.moderate_risk_pct_str ?? '0.0%'}</strong> (Buffer Zone)
          </p>
        </div>

        {/* High Risk */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              High Risk
            </span>
            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">{kpis?.high_risk_count ?? 0}</p>
          <p className="text-xs text-slate-500 mt-2">
            Share: <strong className="text-slate-800 dark:text-slate-200">{kpis?.high_risk_pct_str ?? '0.0%'}</strong> (&ge; 35% Cutoff)
          </p>
        </div>

        {/* Average Default Probability */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Avg Probability
            </span>
            <TrendingUp className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {kpis?.avg_default_probability_pct ?? '0.0%'}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Median: <strong className="text-slate-800 dark:text-slate-200">{kpis?.median_default_probability_pct ?? '0.0%'}</strong>
          </p>
        </div>
      </div>

      {isZeroRecords ? (
        <div className="p-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
          <Info className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Assessment Data Available</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            There are currently no credit evaluations recorded matching the selected filter criteria. Create new assessments or adjust reporting filters to view live telemetry.
          </p>
        </div>
      ) : (
        <>
          {/* SECTION 2 & 3: ASSESSMENT ACTIVITY TRENDS & RISK DISTRIBUTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Assessment Volume & Probability Time-Series (2 cols) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-500" />
                    <span>Assessment Activity &amp; Probability Trend</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Daily evaluation volume and mean predicted default probability across the selected period.
                  </p>
                </div>
                <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700/60 rounded-lg font-mono text-slate-600 dark:text-slate-300">
                  {trends?.period ? `Period: ${trends.period.toUpperCase()}` : '30D'}
                </span>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#0284c7" fontSize={11} label={{ value: 'Assessments', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#0284c7' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={11} domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} label={{ value: 'Avg Prob', angle: 90, position: 'insideRight', fontSize: 10, fill: '#f59e0b' }} />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        if (name === 'Average Probability') return [`${(Number(value) * 100).toFixed(1)}%`, name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="assessments_count" name="Evaluations" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="avg_probability" name="Average Probability" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk Distribution Donut (1 col) */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-emerald-500" />
                  <span>Risk Distribution</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cutoff threshold calibrated at 0.35 (35%).
                </p>
              </div>

              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                      {pieChartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: string) => [`${val} (${((Number(val) / (totalAssessments || 1)) * 100).toFixed(1)}%)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60">
                {riskDist?.categories.map((c) => (
                  <div key={c.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{c.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{c.count}</span>
                      <span className="text-slate-400 font-mono text-[11px]">({c.percentage_str})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: PROBABILITY DISTRIBUTION HISTOGRAM (10% BINS & 35% THRESHOLD) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  <span>Predicted Default Probability Distribution</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Continuous probability density segmented into 10% bins with the 35% production threshold demarcation line.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-mono">
                  Mean: {probDist?.mean_probability_pct ?? '0.0%'}
                </span>
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-mono">
                  Median: {probDist?.median_probability_pct ?? '0.0%'}
                </span>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={probDist?.histogram || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    formatter={(val: any) => [`${val} assessments`, 'Count']}
                  />
                  <ReferenceLine x="30-40%" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" label={{ value: '35% Cutoff', fill: '#ef4444', fontSize: 11, position: 'top' }} />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-500 shrink-0" />
              <span>
                Applicants to the left of the 35% cutoff boundary fall into acceptable risk criteria; applicants to the right represent high default risk requiring rejection or enhanced covenants.
              </span>
            </div>
          </div>

          {/* SECTION 5: RISK CONCENTRATION ANALYSIS */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand-500" />
                  <span>Risk Concentration Analysis</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Portfolio composition breakdown across applicant demographic and profile dimensions.
                </p>
              </div>

              {/* Dimension Switcher */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Dimension:</span>
                <select
                  value={selectedDimension}
                  onChange={(e) => setSelectedDimension(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
                >
                  <option value="age_bracket">Applicant Age Brackets</option>
                  <option value="housing">Housing Tenure</option>
                  <option value="employment">Employment Duration</option>
                  <option value="job">Occupational Category</option>
                  <option value="foreign_worker">Foreign Worker Status</option>
                  <option value="personal_status_sex">Personal Status &amp; Sex</option>
                </select>
              </div>
            </div>

            {/* Non-causal Descriptive Analysis Notice */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Descriptive Portfolio Analysis (Governance Neutral)</strong>
                <p className="text-[11px] mt-0.5 leading-relaxed text-amber-700 dark:text-amber-400">
                  {concentration?.disclaimer || 'Descriptive portfolio analysis only. Does NOT establish causality. Non-normative analysis. Fairness conclusions belong to governance.'}
                </p>
              </div>
            </div>

            {/* Concentration Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Group Segment</th>
                    <th className="py-3 px-4">Applicants</th>
                    <th className="py-3 px-4">Portfolio Share</th>
                    <th className="py-3 px-4">Avg Default Prob</th>
                    <th className="py-3 px-4">Low Risk %</th>
                    <th className="py-3 px-4">Moderate Risk %</th>
                    <th className="py-3 px-4">High Risk %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {concentration?.groups.map((grp) => (
                    <tr key={grp.group_key} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {grp.group_label}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {grp.applicant_count}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {grp.population_share_pct}%
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {grp.avg_probability_pct}
                      </td>
                      <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                        {grp.low_risk_pct}%
                      </td>
                      <td className="py-3 px-4 text-amber-600 dark:text-amber-400 font-semibold">
                        {grp.moderate_risk_pct}%
                      </td>
                      <td className="py-3 px-4 text-rose-600 dark:text-rose-400 font-semibold">
                        {grp.high_risk_pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 6 & 7: OPERATIONAL ACTIVITY & GOVERNANCE SNAPSHOT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Operational Activity Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand-500" />
                  <span>Platform Operational Telemetry</span>
                </h3>
                <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold">
                  Audited
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Stored Credit Evaluations</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{overview?.operational_summary?.total_assessments ?? 0}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Credit Assessment Reports</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {overview?.operational_summary?.reports_status ?? 'Generated on-demand (not persisted)'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">What-If Risk Simulations</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {overview?.operational_summary?.simulations_status ?? 'Evaluated on-demand (not persisted)'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Security &amp; Operational Audit Events</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{overview?.operational_summary?.audit_events_count ?? 0}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500">Active Authorized User Accounts</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{overview?.operational_summary?.active_users_count ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Model & Governance Snapshot Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-500" />
                  <span>Model Governance &amp; Artifact Verification</span>
                </h3>
                <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-semibold">
                  Locked
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Decision Threshold</span>
                  <div className="flex items-center gap-2">
                    <strong className="text-brand-600 dark:text-brand-400 font-mono">0.35 (35%)</strong>
                    <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-700 rounded font-semibold">IMMUTABLE</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Production Model Hash</span>
                  <span className="font-mono bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded text-[11px]">
                    {govSnap?.model_sha256_short ?? '7fcc6ec2b5e481ee'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Pipeline Hash</span>
                  <span className="font-mono bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded text-[11px]">
                    {govSnap?.preprocessing_sha256_short ?? '8b0bb086c63fdb92'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Prediction Authority</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Local ML Engine (Scikit-Learn)
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500">Data Drift Tracking</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    PSI Active (20 Monitored Features)
                  </span>
                </div>
              </div>

              {setActiveTab && (
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('governance')}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/40 dark:hover:bg-slate-700/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center justify-center gap-2 transition"
                  >
                    <span>View Full Governance &amp; Fairness Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 8: OPTIONAL NVIDIA AI EXECUTIVE NARRATIVE */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Executive AI Portfolio Commentary (Optional)
                </h3>
              </div>
              <button
                onClick={loadAISummary}
                disabled={aiLoading}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition"
              >
                <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
                <span>{aiLoading ? 'Generating...' : aiSummary ? 'Regenerate Narrative' : 'Generate AI Summary'}</span>
              </button>
            </div>

            {aiSummary ? (
              <div className="space-y-4 pt-2 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Portfolio Synthesis</h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {aiSummary.portfolio_summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Notable Risk Observations</h4>
                    <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-300">
                      {aiSummary.notable_observations.map((obs, idx) => (
                        <li key={idx} className="leading-relaxed">{obs}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Operational Recommendations</h4>
                    <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-300">
                      {aiSummary.operational_recommendations.map((rec, idx) => (
                        <li key={idx} className="leading-relaxed">{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Provider: {aiSummary.ai_provider} ({aiSummary.ai_model})</span>
                  <span>Advisory only — Credit scoring governed exclusively by local ML engine</span>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click <strong>Generate AI Summary</strong> to synthesize a high-level natural language executive narrative from current deterministic analytics.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
