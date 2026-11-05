import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  BarChart3,
  Cpu,
  ShieldCheck,
  Shield,
  Settings as SettingsIcon,
  CreditCard,
  Users,
  SlidersHorizontal,
  Activity,
  Scale,
  X,
  Compass,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen = false, onClose }) => {
  const { role } = useAuth();
  const currentRole = role || 'VIEWER';

  // Role-specific customized navigation items
  const menuItems = React.useMemo(() => {
    if (currentRole === 'ADMIN') {
      return [
        { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
        { id: 'admin-center', label: 'Admin Control Center', icon: Shield },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'audit', label: 'System Audit Logs', icon: ShieldCheck },
        { id: 'new-assessment', label: 'New Assessment', icon: PlusCircle },
        { id: 'simulator', label: 'Risk Simulator', icon: SlidersHorizontal },
        { id: 'history', label: 'Assessment History', icon: History },
        { id: 'analytics', label: 'Executive Analytics', icon: BarChart3 },
        { id: 'monitoring', label: 'Model Monitoring', icon: Activity },
        { id: 'governance', label: 'Fairness & Governance', icon: Scale },
        { id: 'model-info', label: 'Model Information', icon: Cpu },
        { id: 'landing', label: 'Public Landing Page', icon: Compass },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
      ];
    }

    if (currentRole === 'CREDIT_OFFICER') {
      return [
        { id: 'dashboard', label: 'Officer Dashboard', icon: LayoutDashboard },
        { id: 'new-assessment', label: 'New Assessment', icon: PlusCircle },
        { id: 'simulator', label: 'Risk Simulator', icon: SlidersHorizontal },
        { id: 'history', label: 'Assessment History', icon: History },
        { id: 'analytics', label: 'Executive Analytics', icon: BarChart3 },
        { id: 'monitoring', label: 'Model Monitoring', icon: Activity },
        { id: 'governance', label: 'Fairness & Governance', icon: Scale },
        { id: 'model-info', label: 'Model Information', icon: Cpu },
        { id: 'landing', label: 'Public Landing Page', icon: Compass },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
      ];
    }

    // Default: VIEWER role
    return [
      { id: 'dashboard', label: 'Viewer Dashboard', icon: LayoutDashboard },
      { id: 'analytics', label: 'Executive Analytics', icon: BarChart3 },
      { id: 'monitoring', label: 'Model Monitoring & Drift', icon: Activity },
      { id: 'governance', label: 'Fairness & Governance', icon: Scale },
      { id: 'model-info', label: 'Model Information', icon: Cpu },
      { id: 'history', label: 'Assessment History (Read-Only)', icon: History },
      { id: 'simulator', label: 'Risk Simulator (Sandbox)', icon: SlidersHorizontal },
      { id: 'landing', label: 'Public Landing Page', icon: Compass },
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ];
  }, [currentRole]);

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  const getRoleBadge = () => {
    switch (currentRole) {
      case 'ADMIN':
        return {
          label: 'Administrator',
          style: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        };
      case 'CREDIT_OFFICER':
        return {
          label: 'Credit Officer',
          style: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      default:
        return {
          label: 'Viewer (Read-Only)',
          style: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
        };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:sticky lg:top-0 lg:h-screen lg:z-30 shrink-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500 text-white rounded-xl shadow-md">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight">Smart Risk Engine</h1>
              <div className="mt-1">
                <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${roleBadge.style}`}>
                  {roleBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg lg:hidden"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3.5 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Model Calibration Guard Badge */}
        <div className="p-3.5 m-3 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-2xl">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Logistic Regression</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            Cutoff Threshold: <strong className="text-slate-700 dark:text-slate-200 font-semibold">0.35 (35%)</strong><br />
            ROC-AUC: <strong className="text-slate-700 dark:text-slate-200 font-semibold">0.8095</strong>
          </p>
        </div>
      </aside>
    </>
  );
};
