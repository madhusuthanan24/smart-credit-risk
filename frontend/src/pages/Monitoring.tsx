import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
  Sliders,
  ShieldCheck,
  AlertCircle,
  Database,
  BarChart2,
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import {
  fetchMonitoringOverview,
  fetchDataDrift,
  fetchModelPerformance
} from '../services/api';
import {
  MonitoringOverviewResponse,
  DataDriftResponse,
  ModelPerformanceResponse,
  FeatureDriftItem
} from '../types';

export const Monitoring: React.FC = () => {
  const [daysFilter, setDaysFilter] = useState<number | undefined>(undefined);
  const [overview, setOverview] = useState<MonitoringOverviewResponse | null>(null);
  const [driftData, setDriftData] = useState<DataDriftResponse | null>(null);
  const [performance, setPerformance] = useState<ModelPerformanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [featureSearch, setFeatureSearch] = useState<string>('');
  const [featureTypeFilter, setFeatureTypeFilter] = useState<'all' | 'numerical' | 'categorical'>('all');

  const loadData = async (days?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const [ovRes, driftRes, perfRes] = await Promise.all([
        fetchMonitoringOverview(days),
        fetchDataDrift(days),
        fetchModelPerformance()
      ]);
      setOverview(ovRes);
      setDriftData(driftRes);
      setPerformance(perfRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load monitoring metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(daysFilter);
  }, [daysFilter]);

  const handleFilterChange = (days?: number) => {
    setDaysFilter(days);
  };

  // Filter features by search term and type
  const filteredFeatures: FeatureDriftItem[] = (driftData?.features || []).filter((f) => {
    const matchesSearch = f.feature_name.toLowerCase().includes(featureSearch.toLowerCase());
    const matchesType = featureTypeFilter === 'all' || f.feature_type === featureTypeFilter;
    return matchesSearch && matchesType;
  });

  const getDriftBadge = (level: string) => {
    switch (level) {
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Stable (&lt;0.10)
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Moderate (0.10-0.25)
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3.5 h-3.5" /> High Drift (&gt;0.25)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Insufficient Data
          </span>
        );
    }
  };

  const getOverallStatusBanner = () => {
    if (!driftData) return null;

    if (driftData.overall_drift_status === 'INSUFFICIENT_DATA') {
      return (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-start gap-3.5">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">Insufficient Production Data for PSI Drift Analysis</h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">{driftData.message}</p>
          </div>
        </div>
      );
    }

    if (driftData.overall_drift_status === 'SIGNIFICANT_DRIFT') {
      return (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3.5">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-rose-900 dark:text-rose-200 text-sm">Significant Data Drift Detected</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{driftData.message}</p>
          </div>
        </div>
      );
    }

    if (driftData.overall_drift_status === 'MODERATE_DRIFT') {
      return (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Moderate Data Drift Detected</h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">{driftData.message}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3.5">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm">All Monitored Features Stable</h4>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">{driftData.message}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 rounded-xl border border-brand-200 dark:border-brand-800">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Model Monitoring & Data Drift</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time inference volume tracking, Population Stability Index (PSI) feature drift analysis, and model health.
          </p>
        </div>

        {/* Timeframe Filter Buttons & Refresh */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button
              onClick={() => handleFilterChange(undefined)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                daysFilter === undefined
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handleFilterChange(7)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                daysFilter === 7
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => handleFilterChange(30)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                daysFilter === 30
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => handleFilterChange(90)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                daysFilter === 90
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              90 Days
            </button>
          </div>

          <button
            onClick={() => loadData(daysFilter)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between text-rose-700 dark:text-rose-300 text-sm">
          <span>{error}</span>
          <button
            onClick={() => loadData(daysFilter)}
            className="underline font-semibold hover:text-rose-900 dark:hover:text-rose-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Volume Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today's Volume</span>
            <span className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : overview?.volume.today ?? 0}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">assessments</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Predictions evaluated today</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last 7 Days</span>
            <span className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : overview?.volume.last_7_days ?? 0}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">assessments</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Rolling 7-day volume</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last 30 Days</span>
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : overview?.volume.last_30_days ?? 0}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">assessments</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Rolling 30-day volume</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">All-Time Total</span>
            <span className="p-2 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 rounded-xl">
              <Database className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : overview?.volume.all_time ?? 0}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">lifetime</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Total origination database records</p>
        </div>
      </div>

      {/* Risk Category Distribution & Threshold Compliance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Category Distribution */}
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-500" />
              Risk Category Distribution
            </h3>
            <span className="text-xs font-medium text-slate-500">
              Total: {overview?.risk_distribution.total ?? 0}
            </span>
          </div>

          <div className="space-y-4">
            {/* Low Risk */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Low Risk (&lt;20%)
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {overview?.risk_distribution.low_risk.count ?? 0} ({overview?.risk_distribution.low_risk.percentage_formatted ?? '0.00%'})
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${overview?.risk_distribution.low_risk.percentage ?? 0}%` }}
                ></div>
              </div>
            </div>

            {/* Moderate Risk */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Moderate Risk (20%-35%)
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {overview?.risk_distribution.moderate_risk.count ?? 0} ({overview?.risk_distribution.moderate_risk.percentage_formatted ?? '0.00%'})
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${overview?.risk_distribution.moderate_risk.percentage ?? 0}%` }}
                ></div>
              </div>
            </div>

            {/* High Risk */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  High Risk (≥35%)
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {overview?.risk_distribution.high_risk.count ?? 0} ({overview?.risk_distribution.high_risk.percentage_formatted ?? '0.00%'})
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${overview?.risk_distribution.high_risk.percentage ?? 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Threshold Monitoring (0.35) */}
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-500" />
              Threshold Compliance
            </h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-mono font-bold">
              Cutoff = {overview?.threshold_metrics.threshold ?? 0.35}
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Below Cutoff (Approve / Refer)</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {overview?.threshold_metrics.below_threshold_count ?? 0} ({overview?.threshold_metrics.below_threshold_pct ?? 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 mt-2">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${overview?.threshold_metrics.below_threshold_pct ?? 0}%` }}
                ></div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">At or Above Cutoff (Reject)</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {overview?.threshold_metrics.at_or_above_threshold_count ?? 0} ({overview?.threshold_metrics.at_or_above_threshold_pct ?? 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 mt-2">
                <div
                  className="bg-rose-500 h-1.5 rounded-full"
                  style={{ width: `${overview?.threshold_metrics.at_or_above_threshold_pct ?? 0}%` }}
                ></div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Model threshold is calibrated at 0.35 (35.0%) to balance recall and precision under the cost-sensitive lending matrix.
            </p>
          </div>
        </div>

        {/* Probability Summary Statistics */}
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-brand-500" />
                Default Probability Stats
              </h3>
              <span className="text-xs text-slate-400">Continuous Metric</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">Mean</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {overview ? `${(overview.probability_metrics.mean * 100).toFixed(2)}%` : '--'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">Median</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {overview ? `${(overview.probability_metrics.median * 100).toFixed(2)}%` : '--'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">Min</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {overview ? `${(overview.probability_metrics.min * 100).toFixed(2)}%` : '--'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">Max</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {overview ? `${(overview.probability_metrics.max * 100).toFixed(2)}%` : '--'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <span>Model: {overview?.model_info.model_name ?? 'Logistic Regression'}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {overview?.model_info.status ?? 'HEALTHY'}
            </span>
          </div>
        </div>
      </div>

      {/* 10-Bucket Probability Distribution Histogram (Recharts) */}
      <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-brand-500" />
              Default Probability Distribution (10 Decile Bins)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Production distribution across probability intervals. Red line denotes the active decision boundary (0.35).
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 rounded-xs bg-brand-500 inline-block"></span>
              Prediction Frequency
            </span>
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <span className="w-3 h-0.5 bg-rose-500 inline-block"></span>
              Threshold (0.35)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={overview?.probability_histogram || []}
              margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis
                dataKey="bin"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                formatter={(value: any, _name: any, item: any) => [
                  `${value} applicant(s) (${item.payload.percentage}%)`,
                  'Volume'
                ]}
                labelFormatter={(label) => `Range: ${label}`}
              />
              <ReferenceLine x="30-40%" stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Cutoff 0.35', fill: '#ef4444', fontSize: 10, position: 'top' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Population Stability Index (PSI) Feature Drift Section */}
      <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Feature Drift Analysis (Population Stability Index - PSI)
              </h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                20 Features Monitored
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Compares production applicant distributions against baseline German Credit reference data (1,000 samples).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search features..."
              value={featureSearch}
              onChange={(e) => setFeatureSearch(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            {/* Feature Type Filter */}
            <select
              value={featureTypeFilter}
              onChange={(e: any) => setFeatureTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Types</option>
              <option value="numerical">Numerical (7)</option>
              <option value="categorical">Categorical (13)</option>
            </select>
          </div>
        </div>

        {/* Overall Status Banner */}
        {getOverallStatusBanner()}

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 font-medium">Reference Samples</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{driftData?.reference_count ?? 1000}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 font-medium">Production Samples</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{driftData?.production_count ?? 0}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 font-medium">Stable Features</span>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{driftData?.low_drift_count ?? 0}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 font-medium">Drifted Features</span>
            <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">{driftData?.drifted_features_count ?? 0}</p>
          </div>
        </div>

        {/* Feature Drift Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Feature Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">PSI Score</th>
                <th className="py-3 px-4">Drift Level</th>
                <th className="py-3 px-4">Status & Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-200">
              {filteredFeatures.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {driftData?.status === 'INSUFFICIENT_DATA'
                      ? 'No feature drift calculated yet. At least 5 production applicant samples are required.'
                      : 'No features matched your search filter.'}
                  </td>
                </tr>
              ) : (
                filteredFeatures.map((f) => (
                  <tr key={f.feature_name} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      {f.feature_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        {f.feature_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {f.psi !== null ? f.psi.toFixed(4) : '--'}
                    </td>
                    <td className="py-3 px-4">
                      {getDriftBadge(f.drift_level)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {f.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PSI Scale Reference Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-brand-500" />
            Population Stability Index (PSI) Standards:
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
            <li><strong className="text-emerald-600 dark:text-emerald-400">PSI &lt; 0.10:</strong> No significant shift. The production population matches the reference distribution.</li>
            <li><strong className="text-amber-600 dark:text-amber-400">0.10 ≤ PSI ≤ 0.25:</strong> Moderate drift. Population distribution has shifted; monitoring is advised.</li>
            <li><strong className="text-rose-600 dark:text-rose-400">PSI &gt; 0.25:</strong> Significant drift. Large population change; investigate originations or model alignment.</li>
          </ul>
        </div>
      </div>

      {/* Model Health & Validation Metrics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Baseline Model Metrics */}
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Baseline Validation Metrics
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {performance?.baseline_metrics.dataset || 'German Credit Test Set (Holdout 200 samples)'}
              </p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
              Benchmark
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl text-center border border-slate-100 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">ROC-AUC</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {performance?.baseline_metrics.roc_auc ?? 0.8095}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl text-center border border-slate-100 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">PR-AUC</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {performance?.baseline_metrics.pr_auc ?? 0.6584}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl text-center border border-slate-100 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Recall @ 0.35</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {performance ? `${(performance.baseline_metrics.recall * 100).toFixed(1)}%` : '76.7%'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl text-center border border-slate-100 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">F1-Score</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {performance?.baseline_metrics.f1_score ?? 0.6715}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl text-center border border-slate-100 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Brier Score</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {performance?.baseline_metrics.brier_score ?? 0.1546}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl text-center border border-slate-100 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Decision Cutoff</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {performance?.baseline_metrics.threshold ?? 0.35}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Metrics established during test holdout validation. Serve as authoritative ground-truth reference standards.
          </p>
        </div>

        {/* Production Performance & Outcome Notice */}
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Production Performance & Outcome Tracking
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Realized Loan Maturation Monitoring</p>
              </div>
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold">
                Maturation Stage
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 space-y-2 mt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Outcome Data Maturation Notice</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {performance?.production_performance.message ||
                  'Outcome data not yet available. Production ROC-AUC, PR-AUC, and default tracking require realized loan default labels which mature over time.'}
              </p>
            </div>
          </div>

          {/* Educational Distinction Banner */}
          <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed">
            <strong className="font-semibold block mb-0.5">Monitoring Distinction:</strong>
            {performance?.model_health.explanation ||
              'Data drift reflects shifts in applicant input distributions (observable at origination). Model performance degradation reflects prediction accuracy decay (observable only after loan default/repayment maturation).'}
          </div>
        </div>
      </div>
    </div>
  );
};
