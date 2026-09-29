import React, { useState } from 'react';
import { ApplicantInput, PredictionResponse } from '../types';
import { submitPrediction } from '../services/api';
import { ProbabilityGauge } from '../components/ProbabilityGauge';
import { CheckCircle, AlertTriangle, ArrowRight, ArrowLeft, RefreshCw, FileCheck } from 'lucide-react';

const CHECKING_OPTIONS = [
  { label: 'Below 0 DM (Account in Deficit)', value: 'A11' },
  { label: '0 to 200 DM (Low Balance)', value: 'A12' },
  { label: '>= 200 DM / Salary Account', value: 'A13' },
  { label: 'No Checking Account', value: 'A14' },
];

const SAVINGS_OPTIONS = [
  { label: 'Below 100 DM (Low Savings)', value: 'A61' },
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

const TELEPHONE_OPTIONS = [
  { label: 'Yes, Registered Under Customer Name', value: 'A192' },
  { label: 'None / Unregistered', value: 'A191' },
];

const FOREIGN_OPTIONS = [
  { label: 'Yes', value: 'A201' },
  { label: 'No', value: 'A202' },
];

export const NewAssessment: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);

  const [formData, setFormData] = useState<ApplicantInput>({
    status_checking_account: 'A14',
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
    property: 'A121',
    age_in_years: 35,
    other_installment_plans: 'A143',
    housing: 'A152',
    existing_credits: 1,
    job: 'A173',
    num_people_liable: 1,
    telephone: 'A191',
    foreign_worker: 'A201',
  });

  const handleChange = (field: keyof ApplicantInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await submitPrediction(formData);
      setResult(response);
      setStep(4); // Result step
    } catch (err: any) {
      setError(err.message || 'Assessment execution failed.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">New Credit Assessment</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Complete the multi-step origination disclosure form to generate real ML risk predictions.
        </p>
      </div>

      {/* Progress Bar */}
      {step <= 3 && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span className={step >= 1 ? 'text-brand-600 font-bold' : ''}>1. Personal Info</span>
            <span className={step >= 2 ? 'text-brand-600 font-bold' : ''}>2. Financial Info</span>
            <span className={step >= 3 ? 'text-brand-600 font-bold' : ''}>3. Loan & History</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: PERSONAL INFORMATION */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg border-b border-slate-100 dark:border-slate-700 pb-3">
            Step 1: Personal Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Age in Years
              </label>
              <input
                type="number"
                min={18}
                max={90}
                value={formData.age_in_years}
                onChange={(e) => handleChange('age_in_years', parseInt(e.target.value) || 18)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Personal Status & Gender/Marital
              </label>
              <select
                value={formData.personal_status_sex}
                onChange={(e) => handleChange('personal_status_sex', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                {SEX_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Housing Tenure
              </label>
              <select
                value={formData.housing}
                onChange={(e) => handleChange('housing', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                {HOUSING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Present Employment Tenure
              </label>
              <select
                value={formData.present_employment_since}
                onChange={(e) => handleChange('present_employment_since', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                {EMPLOYMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Foreign Worker Status
              </label>
              <select
                value={formData.foreign_worker}
                onChange={(e) => handleChange('foreign_worker', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                {FOREIGN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Telephone Registration
              </label>
              <select
                value={formData.telephone}
                onChange={(e) => handleChange('telephone', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                {TELEPHONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-brand-500/20"
            >
              <span>Next: Financial Info</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FINANCIAL INFORMATION */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg border-b border-slate-100 dark:border-slate-700 pb-3">
            Step 2: Financial Accounts & Assets
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Checking Account Status
              </label>
              <select
                value={formData.status_checking_account}
                onChange={(e) => handleChange('status_checking_account', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                {CHECKING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Savings Account Balance
              </label>
              <select
                value={formData.savings_account}
                onChange={(e) => handleChange('savings_account', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                {SAVINGS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Property & Assets
              </label>
              <select
                value={formData.property}
                onChange={(e) => handleChange('property', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                {PROPERTY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Other External Installment Plans
              </label>
              <select
                value={formData.other_installment_plans}
                onChange={(e) => handleChange('other_installment_plans', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                {PLANS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Existing Credits at Bank (Count: {formData.existing_credits})
              </label>
              <input
                type="range"
                min={1}
                max={4}
                value={formData.existing_credits}
                onChange={(e) => handleChange('existing_credits', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Dependents Count (Count: {formData.num_people_liable})
              </label>
              <input
                type="range"
                min={1}
                max={2}
                value={formData.num_people_liable}
                onChange={(e) => handleChange('num_people_liable', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-brand-500/20"
            >
              <span>Next: Loan & History</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: LOAN & CREDIT HISTORY */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg border-b border-slate-100 dark:border-slate-700 pb-3">
            Step 3: Loan Request & Credit History
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Credit Amount Requested (DM)
              </label>
              <input
                type="number"
                min={250}
                max={20000}
                step={250}
                value={formData.credit_amount}
                onChange={(e) => handleChange('credit_amount', parseInt(e.target.value) || 250)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Loan Duration (Months)
              </label>
              <input
                type="number"
                min={4}
                max={72}
                step={2}
                value={formData.duration_in_months}
                onChange={(e) => handleChange('duration_in_months', parseInt(e.target.value) || 12)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Credit Repayment History
              </label>
              <select
                value={formData.credit_history}
                onChange={(e) => handleChange('credit_history', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                {HISTORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Loan Purpose
              </label>
              <select
                value={formData.purpose}
                onChange={(e) => handleChange('purpose', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                {PURPOSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Installment Burden (Tier: {formData.installment_rate})
              </label>
              <input
                type="range"
                min={1}
                max={4}
                value={formData.installment_rate}
                onChange={(e) => handleChange('installment_rate', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Co-signers / Guarantors
              </label>
              <select
                value={formData.other_debtors_guarantors}
                onChange={(e) => handleChange('other_debtors_guarantors', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                {GUARANTOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-brand-500/30 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing application...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Run Credit Assessment</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: PREDICTION RESULT CARD */}
      {step === 4 && result && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Prediction Output</span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Credit Risk Assessment Result</h3>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                result.risk_category === 'LOW RISK'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                  : result.risk_category === 'MODERATE RISK'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
              }`}>
                {result.risk_category}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <ProbabilityGauge probability={result.default_probability} threshold={result.decision_threshold} />
              
              <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Model Recommendation</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{result.credit_decision}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Prediction ID</span>
                    <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{result.prediction_id.substring(0, 8)}...</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Model Version</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{result.model_name} ({result.model_version})</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Explainability Panel */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
              <h4 className="font-bold text-slate-900 dark:text-white text-base mb-3">Model Risk Explanations</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-red-50/60 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-xl">
                  <h5 className="font-bold text-red-800 dark:text-red-300 mb-2">⚠️ Risk Increasing Factors</h5>
                  {result.risk_factors.length > 0 ? (
                    <ul className="space-y-1.5 text-red-700 dark:text-red-300">
                      {result.risk_factors.map((rf, idx) => (
                        <li key={idx}>• {rf}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic">No major risk-increasing factors identified.</p>
                  )}
                </div>

                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-xl">
                  <h5 className="font-bold text-emerald-800 dark:text-emerald-300 mb-2">✅ Risk Reducing / Protective Factors</h5>
                  {result.protective_factors.length > 0 ? (
                    <ul className="space-y-1.5 text-emerald-700 dark:text-emerald-300">
                      {result.protective_factors.map((pf, idx) => (
                        <li key={idx}>• {pf}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic">No major protective factors identified.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-slate-500 dark:text-slate-400">
              📌 <strong>Disclaimer</strong>: {result.disclaimer}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={resetForm}
                className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-brand-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Run Another Assessment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
