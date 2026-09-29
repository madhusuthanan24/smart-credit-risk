import React from 'react';
import { UserCheck, ShieldCheck, ArrowRight, ArrowLeft, Lock } from 'lucide-react';

interface StaffAccessProps {
  onSelectRole: (role: 'CREDIT_OFFICER' | 'ADMIN') => void;
  onBackToViewer: () => void;
}

export const StaffAccess: React.FC<StaffAccessProps> = ({ onSelectRole, onBackToViewer }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border border-amber-200 dark:border-amber-800/50">
          <Lock className="w-3.5 h-3.5" />
          Internal Staff Gateway Unlocked
        </span>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Bank Staff Portals</h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
          Select your authorized staff portal to authenticate your session.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Credit Officer Card */}
        <button
          type="button"
          onClick={() => onSelectRole('CREDIT_OFFICER')}
          className="p-4 bg-slate-50 hover:bg-emerald-50/50 dark:bg-slate-900/60 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 rounded-2xl transition-all text-left group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 rounded-xl flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Credit Officer Portal
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Loan applications, ML risk scoring, and credit approval decisions.
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
        </button>

        {/* System Admin Card */}
        <button
          type="button"
          onClick={() => onSelectRole('ADMIN')}
          className="p-4 bg-slate-50 hover:bg-purple-50/50 dark:bg-slate-900/60 dark:hover:bg-purple-950/30 border border-slate-200 dark:border-slate-700 hover:border-purple-500/50 rounded-2xl transition-all text-left group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                System Administrator Portal
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                User provisioning, role management, and audit log inspection.
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
        </button>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 text-center">
        <button
          type="button"
          onClick={onBackToViewer}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Public Viewer Portal</span>
        </button>
      </div>
    </div>
  );
};
