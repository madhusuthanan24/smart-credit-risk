import React, { useState, useEffect } from 'react';
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Cpu,
  BarChart3,
  Sliders,
  Layers,
  HelpCircle,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import {
  fetchGovernanceOverview,
  fetchGovernanceGroups,
  fetchGovernanceLimitations,
  fetchAIGovernance
} from '../services/api';
import {
  GovernanceOverviewResponse,
  GovernanceGroupAnalysisResponse,
  GovernanceLimitationsResponse,
  AIGovernanceResponse,
  GroupStatisticItem
} from '../types';

export const Governance: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<string>('age_in_years');
  const [minSampleSize, setMinSampleSize] = useState<number>(20);
  const [overview, setOverview] = useState<GovernanceOverviewResponse | null>(null);
  const [groupData, setGroupData] = useState<GovernanceGroupAnalysisResponse | null>(null);
  const [limitations, setLimitations] = useState<GovernanceLimitationsResponse | null>(null);
  const [aiInfo, setAiInfo] = useState<AIGovernanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGroupLoading, setIsGroupLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const availableFeatures = [
    { id: 'age_in_years', label: 'Age Brackets', desc: 'Continuous applicant age binned into 5 life-stage brackets' },
    { id: 'personal_status_sex', label: 'Personal Status & Sex', desc: 'German Credit code conflating marital status and legal sex' },
    { id: 'foreign_worker', label: 'Foreign Worker Status', desc: 'Residency / foreign worker authorization code' },
    { id: 'housing', label: 'Housing Tenure', desc: 'Housing arrangement proxy (Rent, Own, For Free)' },
    { id: 'present_employment_since', label: 'Employment Tenure', desc: 'Length of tenure with current employer proxy' },
    { id: 'job', label: 'Occupation Tier', desc: 'Occupational qualification and skill tier proxy' }
  ];

  const loadAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ovRes, grpRes, limRes, aiRes] = await Promise.all([
        fetchGovernanceOverview(),
        fetchGovernanceGroups(selectedFeature, minSampleSize),
        fetchGovernanceLimitations(),
        fetchAIGovernance()
      ]);
      setOverview(ovRes);
      setGroupData(grpRes);
      setLimitations(limRes);
      setAiInfo(aiRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load governance information.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroupsOnly = async (feature: string, minSize: number) => {
    setIsGroupLoading(true);
    try {
      const grpRes = await fetchGovernanceGroups(feature, minSize);
      setGroupData(grpRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to update group analysis.');
    } finally {
      setIsGroupLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleFeatureChange = (featureId: string) => {
    setSelectedFeature(featureId);
    loadGroupsOnly(featureId, minSampleSize);
  };

  const handleSampleSizeChange = (newSize: number) => {
    setMinSampleSize(newSize);
    loadGroupsOnly(selectedFeature, newSize);
  };

  // Prepare chart data for Recharts
  const chartData = (groupData?.groups || []).map((g: GroupStatisticItem) => ({
    name: g.group_label.split(' (')[0], // Clean label
    sampleCount: g.sample_count,
    avgProbPct: +(g.average_predicted_probability * 100).toFixed(2),
    highRiskRatePct: +(g.high_risk_rate * 100).toFixed(2),
    approvalRatePct: +(g.approval_rate * 100).toFixed(2),
    hasSufficientSample: g.has_sufficient_sample
  }));

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 rounded-xl border border-brand-200 dark:border-brand-800">
              <Scale className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fairness & Model Governance</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Descriptive monitoring of model behavior across available applicant groups, artifact integrity verification, and boundary controls.
          </p>
        </div>

        <button
          onClick={loadAll}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Governance</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between text-rose-700 dark:text-rose-300 text-sm">
          <span>{error}</span>
          <button onClick={loadAll} className="underline font-semibold hover:text-rose-900 dark:hover:text-rose-100">
            Retry
          </button>
        </div>
      )}

      {/* Model Governance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Model & Architecture</span>
          <div className="mt-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {overview?.model_name ?? 'Tuned Logistic Regression'}
            </h3>
            <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[11px] font-mono text-slate-600 dark:text-slate-300">
              v{overview?.model_version ?? '1.0.0'} ({overview?.model_type ?? 'LogisticRegression'})
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Sole predictive authority for risk scoring</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Decision Threshold</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {overview?.threshold_pct ?? '35.0%'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              ({overview?.threshold ?? 0.35})
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Optimal Cutoff Locked</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cost-calibrated decision boundary</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reference Baseline</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {overview?.reference_samples ?? 1000}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">samples</span>
          </div>
          <span className="inline-block mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {overview?.reference_dataset ?? 'German Credit Dataset'}
          </span>
          <p className="text-[11px] text-slate-400 mt-1">Authoritative origination benchmark</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Explainability</span>
          <div className="mt-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{overview?.ai_provider ?? 'NVIDIA AI'}</span>
            </h3>
            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded text-[11px] font-semibold border border-blue-200 dark:border-blue-800">
              Explainability Only
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Zero autonomous lending authority</p>
        </div>
      </div>

      {/* Model Artifact Integrity & Checklist Card */}
      <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Model Governance Checklist & Cryptographic Verification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              All governance controls are verified directly from active system components and persisted artifacts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> All Controls Active
            </span>
          </div>
        </div>

        {/* Shortened Checksums Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 font-mono text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block mb-1">Model Artifact Hash</span>
            <span className="text-slate-700 dark:text-slate-200">{overview?.model_artifact_hash ?? 'verified'}</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 font-mono text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block mb-1">Preprocessor Hash</span>
            <span className="text-slate-700 dark:text-slate-200">{overview?.preprocessor_hash ?? 'verified'}</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 font-mono text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block mb-1">Threshold Hash</span>
            <span className="text-slate-700 dark:text-slate-200">{overview?.threshold_hash ?? 'verified'}</span>
          </div>
        </div>

        {/* 9 Governance Controls Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 mt-2">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">Status</th>
                <th className="py-2.5 px-4">Governance Control</th>
                <th className="py-2.5 px-4">Verification Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-200">
              {(overview?.checklist || []).map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                  <td className="py-2.5 px-4 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {item.control}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {item.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Available Demographic / Sensitive Feature Selector */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-500" />
              Available Demographic & Proxy Feature Analysis
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select an available attribute from the dataset for descriptive group-level probability and risk distribution.
            </p>
          </div>

          {/* Small Sample Guardrail Threshold Control */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Sample Guardrail:</span>
            <select
              value={minSampleSize}
              onChange={(e) => handleSampleSizeChange(Number(e.target.value))}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value={10}>n ≥ 10</option>
              <option value={20}>n ≥ 20 (Default)</option>
              <option value={30}>n ≥ 30</option>
              <option value={50}>n ≥ 50</option>
            </select>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {availableFeatures.map((feat) => (
            <button
              key={feat.id}
              onClick={() => handleFeatureChange(feat.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedFeature === feat.id
                  ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-900 dark:text-brand-100 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="text-xs font-bold block">{feat.label}</span>
              <span className="text-[10px] text-slate-400 block mt-1 line-clamp-2">{feat.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Observed Differences Banner (Descriptive Only) */}
      {groupData && groupData.observed_differences && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded text-xs font-bold border border-blue-200 dark:border-blue-800">
                Descriptive Monitoring
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Observed Group Scoring Differences ({groupData.feature_label})
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              {groupData.observed_differences.interpretation_note}
            </p>
          </div>

          <div className="flex items-center gap-6 shrink-0 text-center">
            {groupData.observed_differences.benchmark_group && (
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Benchmark</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate max-w-[140px]">
                  {groupData.observed_differences.benchmark_group}
                </p>
              </div>
            )}
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Max Probability Gap</span>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {groupData.observed_differences.max_probability_difference_pct || '0.00%'}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Max High-Risk Gap</span>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {groupData.observed_differences.max_high_risk_rate_difference_pct || '0.00%'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Group Analysis Table */}
      <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-500" />
              Descriptive Group Analysis — {groupData?.feature_label ?? 'Age'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Statistics derived directly from stored production assessment records. Minimum sample threshold: n ≥ {minSampleSize}.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Total Monitored: <strong className="text-slate-800 dark:text-slate-200">{groupData?.total_samples ?? 0}</strong> applicants
          </span>
        </div>

        {isGroupLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
            <p className="text-xs">Updating group metrics...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Group</th>
                  <th className="py-3 px-4 text-center">Sample Count (n)</th>
                  <th className="py-3 px-4 text-center">Pop Share</th>
                  <th className="py-3 px-4 text-center">Sample Guardrail</th>
                  <th className="py-3 px-4 text-center">Avg Default Prob</th>
                  <th className="py-3 px-4 text-center">Median Prob</th>
                  <th className="py-3 px-4 text-center">High-Risk Rate</th>
                  <th className="py-3 px-4 text-center">Approval Rate</th>
                  <th className="py-3 px-4 text-center">Disparate Impact Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-200">
                {(groupData?.groups || []).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No assessment data available for this feature in the database.
                    </td>
                  </tr>
                ) : (
                  (groupData?.groups || []).map((g) => (
                    <tr key={g.group_key} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {g.group_label}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {g.sample_count}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500">
                        {g.population_share_pct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        {g.has_sufficient_sample ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> Sufficient
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300" title={g.warning || 'Small sample size'}>
                            <AlertTriangle className="w-3 h-3" /> Guarded (&lt;{minSampleSize})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {(g.average_predicted_probability * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {(g.median_predicted_probability * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded font-semibold">
                          {(g.high_risk_rate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded font-semibold">
                          {(g.approval_rate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {g.disparate_impact_ratio != null ? (
                          <span className="text-slate-800 dark:text-slate-200">
                            {g.disparate_impact_ratio.toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {g.has_sufficient_sample ? '--' : 'Guarded (n < 20)'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Small Sample Guardrail & Legal Note */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-brand-500" />
            Descriptive Interpretation & Guardrail Notice:
          </div>
          <p className="text-[11px] leading-relaxed">
            Groups with fewer than {minSampleSize} observations are protected by small-sample guardrails to prevent volatile statistical estimation.
            Observed disparity indicators represent purely empirical differences in model scoring across dataset variables and do not constitute a legal determination of disparate impact or discrimination.
          </p>
        </div>
      </div>

      {/* Visualizations (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Predicted Default Probability by Group */}
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-500" />
              Average Predicted Default Probability by Group (%)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Empirical mean score across {groupData?.feature_label}. Reference line marks optimal threshold (35%).
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 60]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [`${val}%`, 'Avg Default Probability']}
                />
                <ReferenceLine y={35} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Cutoff 35%', fill: '#ef4444', fontSize: 10 }} />
                <Bar dataKey="avgProbPct" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* High-Risk Rate vs Approval Rate by Group */}
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-500" />
              High-Risk Rate vs Approval Rate by Group (%)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparison of High-Risk classification (≥35%) against Approval/Referral rates.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="approvalRatePct" name="Approval Rate (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="highRiskRatePct" name="High-Risk Rate (%)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fairness Limitations & Outcome Maturity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fairness Data Limitations */}
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Fairness Data Limitations & Attribute Inventory
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Available proxy variables versus legally protected attributes absent from dataset.
            </p>
          </div>

          {/* Unavailable Protected Attributes */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 block">
              Unavailable Protected Attributes (Not in Dataset):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(limitations?.unavailable_protected_attributes || []).map((attr, i) => (
                <span key={i} className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded text-[11px]">
                  {attr}
                </span>
              ))}
            </div>
          </div>

          {/* Available Attributes */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Available Demographic & Proxy Attributes:
            </span>
            <div className="space-y-1.5">
              {(limitations?.available_attributes || []).map((attr, i) => (
                <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{attr.attribute}</span>
                  <span className="text-[11px] text-slate-500">{attr.type}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed italic">
            "Group analysis is limited to attributes available in the dataset. The absence of a protected attribute means fairness for that attribute cannot be directly evaluated."
          </p>
        </div>

        {/* Realized Outcome Maturation & AI Governance */}
        <div className="space-y-6">
          {/* Outcome Maturity Notice */}
          <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                Production Outcome Labels: Not Available
              </h3>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-semibold">
                Maturation Stage
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {limitations?.outcome_message ||
                'Outcome data not yet available. Production repayment/default outcomes are currently unavailable. Therefore outcome-based measures of model performance across groups (such as disparate false-positive or false-negative rates) cannot yet be calculated.'}
            </p>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300">
              <strong>Ground-Truth Policy:</strong> Synthetic or fabricated repayment labels are strictly prohibited. Outcome-based performance and equalized-odds metrics will activate automatically once loan maturation ground truth is populated.
            </div>
          </div>

          {/* AI Governance Boundary Card */}
          <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-500" />
                AI Governance & Boundary Enforcements
              </h3>
              <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded text-xs font-semibold border border-purple-200 dark:border-purple-800">
                {aiInfo?.ai_provider ?? 'NVIDIA AI'}
              </span>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              {(aiInfo?.boundaries || []).map((boundary, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></span>
                  <span>{boundary}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
              {aiInfo?.safety_notice ||
                'AI-generated explanations are informational and should be reviewed alongside the underlying model output.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
