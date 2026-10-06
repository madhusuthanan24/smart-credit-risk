import React from 'react';
import { LayoutDashboard, PlusCircle, History, BarChart3, Cpu, ShieldCheck, Shield, Settings as SettingsIcon, CreditCard, Users, SlidersHorizontal, Activity, Scale, X, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen = false, onClose }) => {
  const { role } = useAuth();

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'CREDIT_OFFICER', 'VIEWER'] },
    { id: 'new-assessment', label: 'New Assessment', icon: PlusCircle, roles: ['ADMIN', 'CREDIT_OFFICER'] },
    { id: 'simulator', label: 'Risk Simulator', icon: SlidersHorizontal, roles: ['ADMIN', 'CREDIT_OFFICER', 'VIEWER'] },
    { id: 'history', label: 'Assessment History', icon: History, roles: ['ADMIN', 'CREDIT_OFFICER', 'VIEWER'] },
    { id: 'analytics', label: 'Executive Analytics', icon: BarChart3, roles: ['ADMIN', 'CREDIT_OFFICER', 'VIEWER'] },
    { id: 'monitoring', label: 'Model Monitoring', icon: Activity, roles: ['ADMIN', 'CREDIT_OFFICER', 'VIEWER'] },
    { id: 'governance', label: 'Fairness & Governance', icon: Scale, roles: ['ADMIN', 'CREDIT_OFFICER', 'VIEWER'] },
    { id: 'model-info', label: 'Model Information', icon: Cpu, roles: ['ADMIN', 'CREDIT_OFFICER', 'VIEWER'] },
    { id: 'landing', label: 'Public Landing Page', icon: Compass, roles: ['ADMIN', 'CREDIT_OFFICER', 'VIEWER'] },
    { id: 'admin-center', label: 'Admin Control Center', icon: Shield, roles: ['ADMIN'] },
    { id: 'audit', label: 'System Audit', icon: ShieldCheck, roles: ['ADMIN'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['ADMIN'] },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['ADMIN', 'CREDIT_OFFICER', 'VIEWER'] },
  ];

  const currentRole = role || 'VIEWER';
  const menuItems = allMenuItems.filter((item) => item.roles.includes(currentRole));

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

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
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500 text-white rounded-xl shadow-md">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight">Smart Risk Engine</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Credit Risk Platform</p>
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

        <nav className="flex-1 px-4 py-4 sm:py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3.5 sm:p-4 m-3 sm:m-4 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-2xl">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Logistic Regression</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            Cutoff Threshold: <strong className="text-slate-700 dark:text-slate-200 font-semibold">0.35 (35%)</strong><br/>
            ROC-AUC: <strong className="text-slate-700 dark:text-slate-200 font-semibold">0.8095</strong>
          </p>
        </div>
      </aside>
    </>
  );
};
