import React, { useEffect, useState } from 'react';
import { Search, Sun, Moon, CheckCircle2, AlertCircle, LogOut, Shield, Menu } from 'lucide-react';
import { fetchHealth } from '../services/api';
import { HealthStatus } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ darkMode, setDarkMode, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'CREDIT_OFFICER':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <header className="h-16 sm:h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl lg:hidden transition"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Search Bar (visible on md+) */}
        <div className="relative w-full hidden md:block">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search assessments, applicants, or rules..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend / API Health Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium">
          {health?.status === 'healthy' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline text-slate-700 dark:text-slate-300">API Connected</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
              <span className="hidden sm:inline text-slate-700 dark:text-slate-300">Connecting...</span>
            </>
          )}
        </div>

        {/* Dark/Light Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 sm:p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
          title="Toggle Dark/Light Mode"
          aria-label="Toggle Dark/Light Mode"
        >
          {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* User Profile Info */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-600 text-white font-semibold flex items-center justify-center text-xs sm:text-sm shadow-xs shrink-0">
            {user?.email ? user.email.substring(0, 2).toUpperCase() : 'US'}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight truncate max-w-[140px]">
              {user?.email || 'Authenticated User'}
            </p>
            <div className="mt-0.5">
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${getRoleBadgeStyle(user?.role)}`}>
                {user?.role || 'VIEWER'}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="p-1.5 sm:p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-all"
            title="Log Out Session"
            aria-label="Log Out Session"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
