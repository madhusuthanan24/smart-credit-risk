import React from 'react';
import { LayoutDashboard, PlusCircle, History, BarChart3, Cpu, ShieldCheck, Shield, Settings as SettingsIcon, CreditCard, Users, SlidersHorizontal, Activity, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
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
    { id: 'admin-center', label: 'Admin Control Center', icon: Shield, roles: ['ADMIN'] },
    { id: 'audit', label: 'System Audit', icon: ShieldCheck, roles: ['ADMIN'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['ADMIN'] },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['ADMIN', 'CREDIT_OFFICER', 'VIEWER'] },
  ];

  const currentRole = role || 'VIEWER';
  const menuItems = allMenuItems.filter((item) => item.roles.includes(currentRole));

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col h-screen sticky top-0 z-30">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
        <div className="p-2.5 bg-brand-500 text-white rounded-xl shadow-md">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight">Smart Risk Engine</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Credit Risk Platform</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 m-4 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-2xl">
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
  );
};
