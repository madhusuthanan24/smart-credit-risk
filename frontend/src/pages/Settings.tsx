import React from 'react';
import { Settings as SettingsIcon, Sliders, Shield, Database, Bell } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure underwriting thresholds, API integration, and user notification rules.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
        <h3 className="font-bold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-brand-500" />
          <span>Decision Cutoff Policy Configuration</span>
        </h3>
        
        <div className="space-y-4 text-sm">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Production Decision Threshold Cutoff</label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Default decision cutoff loaded from <code>models/threshold_config.json</code> (0.35 = 35%).</p>
            <input type="number" step="0.05" min="0.10" max="0.70" defaultValue="0.35" className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none w-48" />
          </div>
          
          <div className="pt-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Financial Loss Ratio Matrix Weights</label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Cost Index = 5 × False Negatives (FN) + 1 × False Positives (FP)</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-500" />
          <span>Demographic Non-Discrimination Policy</span>
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Demographic disclosure attributes (<code>personal_status_sex</code> and <code>foreign_worker</code>) are strictly audited for fair lending compliance and excluded from production scoring feature sets.
        </p>
      </div>
    </div>
  );
};
