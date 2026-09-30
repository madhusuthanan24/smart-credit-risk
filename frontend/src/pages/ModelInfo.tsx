import React, { useEffect, useState } from 'react';
import { fetchModelInfo } from '../services/api';
import { ModelInfo as ModelInfoType } from '../types';
import { Cpu, CheckCircle, ShieldCheck, Layers, Award } from 'lucide-react';

export const ModelInfo: React.FC = () => {
  const [info, setInfo] = useState<ModelInfoType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModelInfo()
      .then((data) => {
        setInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load model info:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Model Architecture & Metadata</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Technical specifications, hyperparameters, test metrics, and cross-validation stability.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Champion Algorithm</span>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">{info?.model_name}</p>
          <p className="text-[11px] sm:text-xs text-slate-500 truncate">Hyperparameters: C = {info?.hyperparameters?.C}, max_iter = {info?.hyperparameters?.max_iter}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Test Set ROC-AUC</span>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{info?.test_roc_auc}</p>
          <p className="text-[11px] sm:text-xs text-slate-500">PR-AUC: {info?.test_pr_auc}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2 min-w-0 sm:col-span-2 md:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Decision Cutoff Threshold</span>
          <p className="text-xl sm:text-2xl font-extrabold text-brand-600 dark:text-brand-400">{info?.decision_threshold} (35%)</p>
          <p className="text-[11px] sm:text-xs text-slate-500">Bad-Credit Recall: {info?.test_recall_at_optimal_threshold ? (info.test_recall_at_optimal_threshold * 100).toFixed(2) : '76.67'}%</p>
        </div>
      </div>

      {/* Stability Audit Card */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 min-w-0">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>10-Seed Cross-Validation Stability Audit</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 text-center">
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 rounded-xl min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 block truncate">Mean CV ROC-AUC</span>
            <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mt-1">{info?.cross_validation_stability?.mean_roc_auc}</p>
          </div>
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 rounded-xl min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 block truncate">Std Deviation</span>
            <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mt-1">{info?.cross_validation_stability?.std_roc_auc}</p>
          </div>
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 rounded-xl min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 block truncate">Min ROC-AUC</span>
            <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mt-1">{info?.cross_validation_stability?.min_roc_auc}</p>
          </div>
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 rounded-xl min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 block truncate">Max ROC-AUC</span>
            <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mt-1">{info?.cross_validation_stability?.max_roc_auc}</p>
          </div>
        </div>
      </div>

      {/* Dataset & Pipeline Specifications */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 min-w-0">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-500 shrink-0" />
          <span>Preprocessing Pipeline & Feature Metadata</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Training Partitioning</h4>
            <ul className="space-y-2 text-xs">
              <li>• Total Training Samples: <strong>{info?.total_train_samples} (80%)</strong></li>
              <li>• Total Test Samples: <strong>{info?.total_test_samples} (20%)</strong></li>
              <li>• Baseline Default Rate: <strong>30.00% (300/1000)</strong></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Feature Transformation</h4>
            <ul className="space-y-2 text-xs">
              <li>• Raw Input Predictors: <strong>{info?.raw_feature_count} features</strong></li>
              <li>• Transformed One-Hot Features: <strong>{info?.transformed_feature_count} columns</strong></li>
              <li className="break-all">• Preprocessing: <code>OneHotEncoder(handle_unknown='ignore')</code> + <code>StandardScaler()</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
