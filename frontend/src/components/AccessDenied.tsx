import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AccessDeniedProps {
  attemptedTab?: string;
  onReturnDashboard: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ attemptedTab, onReturnDashboard }) => {
  const { user, role } = useAuth();

  const getRequiredRoles = (tab?: string): string[] => {
    switch (tab) {
      case 'admin-center':
      case 'audit':
      case 'users':
        return ['ADMIN'];
      case 'new-assessment':
        return ['ADMIN', 'CREDIT_OFFICER'];
      default:
        return ['ADMIN'];
    }
  };

  const getTabLabel = (tab?: string): string => {
    switch (tab) {
      case 'admin-center':
        return 'Admin Control Center';
      case 'audit':
        return 'System Audit Logs';
      case 'users':
        return 'User & Role Management';
      case 'new-assessment':
        return 'New Credit Assessment';
      default:
        return 'Restricted Area';
    }
  };

  const getRoleBadgeStyle = (userRole?: string | null) => {
    switch (userRole) {
      case 'ADMIN':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'CREDIT_OFFICER':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const requiredRoles = getRequiredRoles(attemptedTab);
  const resourceName = getTabLabel(attemptedTab);

  return (
    <div className="max-w-xl mx-auto my-8 sm:my-16 px-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-10 shadow-xl text-center relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-rose-500/10 dark:bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 mb-3">
          <Lock className="w-3.5 h-3.5" />
          <span>HTTP 403 • Access Denied</span>
        </span>

        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Restricted Permission Area
        </h3>

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6 max-w-md mx-auto leading-relaxed">
          You do not have the required operational privileges to access <strong className="text-slate-800 dark:text-slate-200">{resourceName}</strong>.
        </p>

        {/* Role Matrix Diagnostics */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 mb-6 text-left space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Your Active Session:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
              {user?.email || 'Anonymous'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Your Assigned Role:</span>
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase border ${getRoleBadgeStyle(role)}`}>
              {role || 'VIEWER'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Required Authorization:</span>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {requiredRoles.map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onReturnDashboard}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-brand-500/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Role Dashboard</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-6 flex items-center justify-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>If you believe this is in error, contact your bank system administrator.</span>
        </p>
      </div>
    </div>
  );
};
