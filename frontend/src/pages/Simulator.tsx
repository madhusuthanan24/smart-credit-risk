import React, { useState, useEffect } from 'react';
import {
  ApplicantInput,
  SimulationResponse,
  SimulationRequest
} from '../types';
import { runSimulation } from '../services/api';
import {
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
  Layers,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';

const CHECKING_OPTIONS = [
  { label: '< 0 DM (Account in Deficit)', value: 'A11' },
  { label: '0 to 200 DM (Low Balance)', value: 'A12' },
  { label: '>= 200 DM / Salary Account', value: 'A13' },
  { label: 'No Checking Account', value: 'A14' },
];

const SAVINGS_OPTIONS = [
  { label: '< 100 DM (Low Savings)', value: 'A61' },
  { label: '100 to 500 DM', value: 'A62' },
  { label: '500 to 1000 DM', value: 'A63' },
  { label: '>= 1000 DM (High Savings)', value: 'A64' },
  { label: 'Unknown / No Savings Account', value: 'A65' },
];

const HISTORY_OPTIONS = [
  { label: 'Critical account / Other existing credits elsewhere', value: 'A34' },
  { label: 'Delay in paying back in past', value: 'A33' },
  { label: 'Existing credits paid back duly till now', value: 'A32' },
  { label: 'All credits at this bank paid back duly', value: 'A31' },
  { label: 'No credits taken / All paid back duly', value: 'A30' },
];

const EMPLOYMENT_OPTIONS = [
  { label: 'Unemployed', value: 'A71' },
  { label: '< 1 year', value: 'A72' },
  { label: '1 to 4 years', value: 'A73' },
  { label: '4 to 7 years', value: 'A74' },
  { label: '>= 7 years', value: 'A75' },
];

const PURPOSE_OPTIONS = [
  { label: 'Car (New)', value: 'A40' },
  { label: 'Car (Used)', value: 'A41' },
  { label: 'Furniture / Equipment', value: 'A42' },
  { label: 'Radio / Television', value: 'A43' },
  { label: 'Domestic Appliances', value: 'A44' },
  { label: 'Repairs', value: 'A45' },
  { label: 'Education', value: 'A46' },
  { label: 'Vacation', value: 'A48' },
  { label: 'Retraining', value: 'A49' },
  { label: 'Business', value: 'A410' },
];

const HOUSING_OPTIONS = [
  { label: 'Rent', value: 'A151' },
  { label: 'Own Home', value: 'A152' },
  { label: 'For Free / Provided by Employer', value: 'A153' },
];

const PROPERTY_OPTIONS = [
  { label: 'Real Estate / Land', value: 'A121' },
  { label: 'Building Society Savings / Life Insurance', value: 'A122' },
  { label: 'Car or Other Assets', value: 'A123' },
  { label: 'Unknown / No Property', value: 'A124' },
];

const GUARANTOR_OPTIONS = [
  { label: 'None', value: 'A101' },
  { label: 'Co-applicant', value: 'A102' },
  { label: 'Guarantor', value: 'A103' },
];

const PLANS_OPTIONS = [
  { label: 'Bank', value: 'A141' },
  { label: 'Stores / Retail', value: 'A142' },
  { label: 'None', value: 'A143' },
];

const JOB_OPTIONS = [
  { label: 'Unemployed / Unskilled Non-resident', value: 'A171' },
  { label: 'Unskilled Resident', value: 'A172' },
  { label: 'Skilled Employee / Official', value: 'A173' },
  { label: 'Management / Self-employed / Highly Qualified', value: 'A174' },
];

const SEX_STATUS_OPTIONS = [
  { label: 'Male: Single', value: 'A93' },
  { label: 'Female: Divorced / Separated / Married', value: 'A92' },
  { label: 'Male: Married / Widowed', value: 'A94' },
  { label: 'Male: Divorced / Separated', value: 'A91' },
];

const PRESETS: Record<string, { label: string; desc: string; data: ApplicantInput }> = {
  high_risk: {
    label: 'High Risk Applicant (Deficit Checking, 48m, 8,000 DM)',
    desc: 'Checking account in deficit, extended repayment period, high principal.',
    data: {
      status_checking_account: 'A11',
      duration_in_months: 48,
      credit_history: 'A30',
      purpose: 'A46',
      credit_amount: 8000,
      savings_account: 'A61',
      present_employment_since: 'A72',
      installment_rate: 4,
      personal_status_sex: 'A92',
      other_debtors_guarantors: 'A101',
      present_residence_since: 2,
      property: 'A124',
      age_in_years: 22,
      other_installment_plans: 'A141',
      housing: 'A151',
      existing_credits: 2,
      job: 'A172',
      num_people_liable: 1,
      telephone: 'A191',
      foreign_worker: 'A201'
    }
  },
  moderate_risk: {
    label: 'Moderate / Borderline Applicant (24m, 2,500 DM)',
    desc: 'Typical applicant near the 0.35 decision boundary with average liquidity.',
    data: {
      status_checking_account: 'A12',
      duration_in_months: 24,
      credit_history: 'A32',
      purpose: 'A40',
      credit_amount: 2500,
      savings_account: 'A61',
      present_employment_since: 'A73',
      installment_rate: 3,
      personal_status_sex: 'A93',
      other_debtors_guarantors: 'A101',
      present_residence_since: 2,
      property: 'A122',
      age_in_years: 32,
      other_installment_plans: 'A143',
      housing: 'A151',
      existing_credits: 1,
      job: 'A173',
      num_people_liable: 1,
      telephone: 'A191',
      foreign_worker: 'A201'
    }
  },
  low_risk: {
    label: 'Prime / Low Risk Applicant (Salary Account, 12m, 1,500 DM)',
    desc: 'High savings reserve, home owner, conservative debt burden.',
    data: {
      status_checking_account: 'A14',
      duration_in_months: 12,
      credit_history: 'A32',
      purpose: 'A40',
      credit_amount: 1500,
      savings_account: 'A65',
      present_employment_since: 'A74',
      installment_rate: 2,
      personal_status_sex: 'A93',
      other_debtors_guarantors: 'A101',
      present_residence_since: 4,
      property: 'A121',
      age_in_years: 40,
      other_installment_plans: 'A143',
      housing: 'A152',
      existing_credits: 1,
      job: 'A173',
      num_people_liable: 1,
      telephone: 'A192',
      foreign_worker: 'A201'
    }
  }
};

export const Simulator: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<string>('high_risk');
  const [baseProfile, setBaseProfile] = useState<ApplicantInput>(PRESETS.high_risk.data);
  const [simProfile, setSimProfile] = useState<ApplicantInput>(PRESETS.high_risk.data);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [copiedAI, setCopiedAI] = useState<boolean>(false);

  // Handle Preset Selection
  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const preset = PRESETS[presetKey];
    if (preset) {
      setBaseProfile(preset.data);
      setSimProfile(preset.data);
      setSimulationResult(null);
    }
  };

  // Modify simulated field
  const handleSimChange = (field: keyof ApplicantInput, value: any) => {
    setSimProfile((prev) => ({ ...prev, [field]: value }));
  };

  // Reset simulated profile to base profile
  const handleReset = () => {
    setSimProfile({ ...baseProfile });
    setError(null);
  };

  // Execute simulation
  const handleRunSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: SimulationRequest = {
        original_applicant: baseProfile,
        simulated_applicant: simProfile
      };
      const response = await runSimulation(payload);
      setSimulationResult(response);
    } catch (err: any) {
      setError(err.message || 'Simulation request failed.');
    } finally {
      setLoading(false);
    }
  };

  // Run initial simulation on load
  useEffect(() => {
    handleRunSimulation();
  }, []);

  const handleCopyAI = () => {
    if (!simulationResult) return;
    const text = `CREDIT RISK SIMULATION REPORT\n\nORIGINAL PROBABILITY: ${simulationResult.original.default_probability_pct} (${simulationResult.original.risk_category})\nSIMULATED PROBABILITY: ${simulationResult.simulated.default_probability_pct} (${simulationResult.simulated.risk_category})\nCHANGE: ${simulationResult.difference.probability_points > 0 ? '+' : ''}${simulationResult.difference.probability_points.toFixed(2)} percentage points\n\nAI SUMMARY:\n${simulationResult.ai_summary || ''}\n\nEXPLANATION:\n${simulationResult.ai_explanation || ''}\n\nINSIGHTS:\n${(simulationResult.ai_insights || []).map((ins, i) => `${i + 1}. ${ins}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedAI(true);
    setTimeout(() => setCopiedAI(false), 2000);
  };

  // Count modified fields
  const modifiedCount = Object.keys(baseProfile).filter(
    (k) => (baseProfile as any)[k] !== (simProfile as any)[k]
  ).length;

  // Chart data
  const chartData = simulationResult ? [
    {
      name: 'Original',
      probability: Math.round(simulationResult.original.default_probability * 1000) / 10,
      fill: '#64748b'
    },
    {
      name: 'Simulated',
      probability: Math.round(simulationResult.simulated.default_probability * 1000) / 10,
      fill: simulationResult.simulated.default_probability >= 0.35 ? '#e11d48' : '#059669'
    }
  ] : [];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12 min-w-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 sm:pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 sm:p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex-shrink-0">
              <SlidersHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Credit Risk Simulator
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Explore how changes to an applicant profile affect the model's predicted credit risk.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700">
            <Cpu className="w-3.5 h-3.5 text-brand-500" />
            <span>Threshold: <strong>0.35 (35.0%)</strong></span>
          </div>
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium border border-emerald-200 dark:border-emerald-800/40">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Production ML Pipeline</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 sm:p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preset Profiles Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
          Select Baseline Applicant Scenario
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(PRESETS).map(([key, item]) => {
            const isSelected = selectedPreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handlePresetChange(key)}
                className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-slate-900 dark:text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{item.label.split(' (')[0]}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-brand-500"></span>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Parameters & Adjustments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 min-w-0">
        {/* Left Column: Simulation Inputs */}
        <div className="lg:col-span-6 space-y-6 min-w-0">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm space-y-5 sm:space-y-6 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Simulate Parameter Changes
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Modify applicant inputs below to test scenario impact.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {modifiedCount > 0 ? (
                  <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-semibold">
                    {modifiedCount} {modifiedCount === 1 ? 'Field' : 'Fields'} Modified
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
                    Baseline Unchanged
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={modifiedCount === 0}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-40 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  title="Reset to Baseline Profile"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Core Sliders & Numbers */}
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Financial Dimensions
              </h3>

              {/* Credit Amount */}
              <div>
                <div className="flex justify-between items-center text-sm font-medium mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Credit Amount</span>
                  <div className="flex items-center gap-2">
                    {baseProfile.credit_amount !== simProfile.credit_amount && (
                      <span className="text-xs text-slate-400 line-through">
                        {baseProfile.credit_amount.toLocaleString()} DM
                      </span>
                    )}
                    <span className="font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded-md">
                      {simProfile.credit_amount.toLocaleString()} DM
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={250}
                  max={20000}
                  step={250}
                  value={simProfile.credit_amount}
                  onChange={(e) => handleSimChange('credit_amount', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>250 DM</span>
                  <span>10,000 DM</span>
                  <span>20,000 DM</span>
                </div>
              </div>

              {/* Loan Duration */}
              <div>
                <div className="flex justify-between items-center text-sm font-medium mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Loan Duration (Months)</span>
                  <div className="flex items-center gap-2">
                    {baseProfile.duration_in_months !== simProfile.duration_in_months && (
                      <span className="text-xs text-slate-400 line-through">
                        {baseProfile.duration_in_months} mos
                      </span>
                    )}
                    <span className="font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded-md">
                      {simProfile.duration_in_months} Months
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={4}
                  max={72}
                  step={1}
                  value={simProfile.duration_in_months}
                  onChange={(e) => handleSimChange('duration_in_months', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>4 Months</span>
                  <span>36 Months</span>
                  <span>72 Months</span>
                </div>
              </div>

              {/* Installment Rate */}
              <div>
                <div className="flex justify-between items-center text-sm font-medium mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Installment Burden (% of Income)</span>
                  <div className="flex items-center gap-2">
                    {baseProfile.installment_rate !== simProfile.installment_rate && (
                      <span className="text-xs text-slate-400 line-through">
                        Tier {baseProfile.installment_rate}%
                      </span>
                    )}
                    <span className="font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded-md">
                      Tier {simProfile.installment_rate}%
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={simProfile.installment_rate}
                  onChange={(e) => handleSimChange('installment_rate', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>1% (Low)</span>
                  <span>2%</span>
                  <span>3%</span>
                  <span>4% (High)</span>
                </div>
              </div>

              {/* Applicant Age */}
              <div>
                <div className="flex justify-between items-center text-sm font-medium mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Applicant Age (Years)</span>
                  <div className="flex items-center gap-2">
                    {baseProfile.age_in_years !== simProfile.age_in_years && (
                      <span className="text-xs text-slate-400 line-through">
                        {baseProfile.age_in_years} yrs
                      </span>
                    )}
                    <span className="font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded-md">
                      {simProfile.age_in_years} Years
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={18}
                  max={75}
                  step={1}
                  value={simProfile.age_in_years}
                  onChange={(e) => handleSimChange('age_in_years', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>18 Yrs</span>
                  <span>45 Yrs</span>
                  <span>75 Yrs</span>
                </div>
              </div>
            </div>

            {/* Categorical Dropdowns */}
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Banking & Account Factors
              </h3>

              {/* Checking Account */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Checking Account Balance
                </label>
                <select
                  value={simProfile.status_checking_account}
                  onChange={(e) => handleSimChange('status_checking_account', e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition ${
                    baseProfile.status_checking_account !== simProfile.status_checking_account
                      ? 'border-amber-500 ring-1 ring-amber-500'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {CHECKING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Savings Account */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Liquid Savings Reserves
                </label>
                <select
                  value={simProfile.savings_account}
                  onChange={(e) => handleSimChange('savings_account', e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition ${
                    baseProfile.savings_account !== simProfile.savings_account
                      ? 'border-amber-500 ring-1 ring-amber-500'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {SAVINGS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Credit History */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Credit Repayment History
                </label>
                <select
                  value={simProfile.credit_history}
                  onChange={(e) => handleSimChange('credit_history', e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition ${
                    baseProfile.credit_history !== simProfile.credit_history
                      ? 'border-amber-500 ring-1 ring-amber-500'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {HISTORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Employment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Employment Tenure
                </label>
                <select
                  value={simProfile.present_employment_since}
                  onChange={(e) => handleSimChange('present_employment_since', e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition ${
                    baseProfile.present_employment_since !== simProfile.present_employment_since
                      ? 'border-amber-500 ring-1 ring-amber-500'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {EMPLOYMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Housing & Property */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Housing
                  </label>
                  <select
                    value={simProfile.housing}
                    onChange={(e) => handleSimChange('housing', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {HOUSING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Property / Collateral
                  </label>
                  <select
                    value={simProfile.property}
                    onChange={(e) => handleSimChange('property', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {PROPERTY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Guarantor / Co-applicant */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Other Debtors / Guarantors
                </label>
                <select
                  value={simProfile.other_debtors_guarantors}
                  onChange={(e) => handleSimChange('other_debtors_guarantors', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {GUARANTOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Computing Simulation...</span>
                  </>
                ) : (
                  <>
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Run Simulation</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={modifiedCount === 0 || loading}
                className="py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Comparison & Results */}
        <div className="lg:col-span-6 space-y-6 min-w-0">
          {simulationResult ? (
            <>
              {/* Primary Comparison Cards */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm space-y-5 sm:space-y-6 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Prediction Variance
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">
                    Model: Tuned Logistic Regression
                  </span>
                </div>

                {/* Side-by-Side Probabilities */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Original Card */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Original Baseline
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                      {simulationResult.original.default_probability_pct}
                    </div>
                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        simulationResult.original.risk_category === 'LOW RISK'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : simulationResult.original.risk_category === 'MODERATE RISK'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                      }`}>
                        {simulationResult.original.risk_category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      {simulationResult.original.credit_decision}
                    </p>
                  </div>

                  {/* Simulated Card */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 space-y-2">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                      Simulated Profile
                    </span>
                    <div className={`text-2xl sm:text-3xl font-extrabold ${
                      simulationResult.simulated.default_probability >= 0.35
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {simulationResult.simulated.default_probability_pct}
                    </div>
                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        simulationResult.simulated.risk_category === 'LOW RISK'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : simulationResult.simulated.risk_category === 'MODERATE RISK'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                      }`}>
                        {simulationResult.simulated.risk_category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      {simulationResult.simulated.credit_decision}
                    </p>
                  </div>
                </div>

                {/* Probability & Risk Transition Banner */}
                <div className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  simulationResult.difference.direction === 'lower'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                    : simulationResult.difference.direction === 'higher'
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  <div className="flex items-center gap-3">
                    {simulationResult.difference.direction === 'lower' ? (
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-lg flex-shrink-0">
                        <TrendingDown className="w-5 h-5" />
                      </div>
                    ) : simulationResult.difference.direction === 'higher' ? (
                      <div className="p-2 bg-rose-100 dark:bg-rose-900/50 text-rose-600 rounded-lg flex-shrink-0">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-lg flex-shrink-0">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider opacity-80">
                        Probability Difference
                      </div>
                      <div className="text-sm sm:text-base font-bold">
                        {simulationResult.difference.probability_points > 0 ? '+' : ''}
                        {simulationResult.difference.probability_points.toFixed(2)} percentage points
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider opacity-80">
                      Risk Transition
                    </div>
                    <div className="text-sm font-bold flex items-center gap-1.5 justify-start sm:justify-end">
                      <span>{simulationResult.original_risk}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                      <span>{simulationResult.simulated_risk}</span>
                    </div>
                  </div>
                </div>

                {/* Recharts Probability Visualizer */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Model Comparison & Threshold
                    </span>
                    <span className="text-xs text-slate-400">
                      Cutoff = 35%
                    </span>
                  </div>
                  <div className="h-40 sm:h-44 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.2} />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                          width={75}
                        />
                        <Tooltip
                          formatter={(value: any) => [`${value}%`, 'Default Probability']}
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            color: '#f8fafc',
                            fontSize: '12px'
                          }}
                        />
                        <ReferenceLine
                          x={35}
                          stroke="#f43f5e"
                          strokeDasharray="4 4"
                          strokeWidth={2}
                          label={{ value: '35% Cutoff', fill: '#f43f5e', fontSize: 11, position: 'top' }}
                        />
                        <Bar dataKey="probability" radius={[0, 8, 8, 0]} barSize={26}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Changed Fields Summary */}
                {simulationResult.changes_summary.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                      Applied Modifications ({simulationResult.changes_summary.length})
                    </h3>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {simulationResult.changes_summary.map((change, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-xs"
                        >
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {change.field_label}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 line-through">
                              {change.display_original}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {change.display_simulated}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* NVIDIA AI Insight Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm space-y-4 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 rounded-lg flex-shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        NVIDIA AI Simulation Insight
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Downstream Explainability & Risk Mitigation Analysis
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                      {simulationResult.ai_provider || 'NVIDIA AI'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAI}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      title="Copy AI Simulation Brief"
                    >
                      {copiedAI ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Summary */}
                {simulationResult.ai_summary && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Scenario Comparison Summary
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      {simulationResult.ai_summary}
                    </p>
                  </div>
                )}

                {/* Explanation */}
                {simulationResult.ai_explanation && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Model Decision Explanation
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {simulationResult.ai_explanation}
                    </p>
                  </div>
                )}

                {/* Actionable Insights */}
                {simulationResult.ai_insights && simulationResult.ai_insights.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Risk Mitigation Interpretation
                    </h4>
                    <ul className="space-y-1.5">
                      {simulationResult.ai_insights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <span className="text-brand-500 font-bold">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 italic">
                  * Note: Numerical probabilities and decision thresholds are produced solely by the calibrated ML model. Explanations distinguish model association from direct causal determinism.
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400">
              <SlidersHorizontal className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Adjust parameters on the left and click "Run Simulation" to view comparative results.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
