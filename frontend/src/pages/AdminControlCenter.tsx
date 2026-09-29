import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  AdminOverview,
  PaginatedUsers,
  PaginatedAudit,
  AdminSecurity,
  AdminModelStatus,
  PlatformHealth,
  User,
  AuditLog
} from '../types';
import {
  fetchAdminOverview,
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  fetchAdminAudit,
  fetchAdminSecurity,
  fetchAdminModelStatus,
  fetchAdminHealth
} from '../services/api';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users as UsersIcon,
  Activity,
  Cpu,
  Sparkles,
  Database,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Lock,
  FileText,
  Sliders,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  UserCheck,
  UserX,
  Clock,
  Key
} from 'lucide-react';

export const AdminControlCenter: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'users' | 'audit' | 'security'>('overview');

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [modelStatus, setModelStatus] = useState<AdminModelStatus | null>(null);
  const [securityData, setSecurityData] = useState<AdminSecurity | null>(null);

  // User Management state
  const [usersData, setUsersData] = useState<PaginatedUsers | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userActiveFilter, setUserActiveFilter] = useState<string>('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('CREDIT_OFFICER');
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Audit state
  const [auditData, setAuditData] = useState<PaginatedAudit | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');

  // Initial load
  const loadCoreData = async () => {
    try {
      setError(null);
      const [ov, hl, ms, sec] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminHealth(),
        fetchAdminModelStatus(),
        fetchAdminSecurity()
      ]);
      setOverview(ov);
      setHealth(hl);
      setModelStatus(ms);
      setSecurityData(sec);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin telemetry data.');
    }
  };

  const loadUsers = async () => {
    try {
      const activeParam = userActiveFilter === 'true' ? true : userActiveFilter === 'false' ? false : undefined;
      const res = await fetchAdminUsers(userPage, 10, userSearch || undefined, userRoleFilter || undefined, activeParam);
      setUsersData(res);
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to fetch users');
    }
  };

  const loadAudit = async () => {
    try {
      const res = await fetchAdminAudit(
        auditPage,
        15,
        auditActionFilter || undefined,
        auditStatusFilter || undefined,
        auditSearch || undefined,
        auditStartDate || undefined,
        auditEndDate || undefined
      );
      setAuditData(res);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadCoreData(), loadUsers(), loadAudit()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [userPage, userRoleFilter, userActiveFilter]);

  useEffect(() => {
    loadAudit();
  }, [auditPage, auditActionFilter, auditStatusFilter]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([loadCoreData(), loadUsers(), loadAudit()]);
    setRefreshing(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);
    setUserActionSuccess(null);
    setSubmittingUser(true);
    try {
      await createAdminUser({
        username: newUsername || newEmail.split('@')[0],
        email: newEmail,
        full_name: newFullName || undefined,
        password: newPassword,
        role: newRole,
        is_active: true
      });
      setUserActionSuccess(`User ${newEmail} created successfully.`);
      setShowCreateUserModal(false);
      setNewUsername('');
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
      setNewRole('CREDIT_OFFICER');
      await Promise.all([loadUsers(), loadCoreData()]);
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to create user');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleRoleChange = async (userId: string | number, role: string) => {
    setUserActionError(null);
    setUserActionSuccess(null);
    try {
      await updateAdminUser(userId, { role });
      setUserActionSuccess(`User role updated to ${role}.`);
      await Promise.all([loadUsers(), loadCoreData()]);
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to update user role.');
    }
  };

  const handleToggleActive = async (user: User) => {
    setUserActionError(null);
    setUserActionSuccess(null);
    try {
      const nextStatus = !user.is_active;
      await updateAdminUser(user.id, { is_active: nextStatus });
      setUserActionSuccess(`User ${user.email} ${nextStatus ? 'activated' : 'deactivated'} successfully.`);
      await Promise.all([loadUsers(), loadCoreData()]);
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to change user active status.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading Admin & Audit Center telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-500 text-white rounded-xl shadow-md">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Control & Audit Center</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Phase G Verified
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Unified administrative governance, user access management, security auditing, and system diagnostics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* Global Alerts / Feedback */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {userActionError && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{userActionError}</span>
        </div>
      )}
      {userActionSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{userActionSuccess}</span>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'overview'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Overview & Health</span>
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'users'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          <span>User Access Control</span>
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'audit'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Log Center</span>
        </button>
        <button
          onClick={() => setActiveSubTab('security')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'security'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Security & Rate Limits</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW & HEALTH                                       */}
      {/* ============================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Users */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Users</span>
                <UsersIcon className="w-5 h-5 text-brand-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{overview?.total_users ?? 0}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{overview?.active_users ?? 0} active</span>
                <span>•</span>
                <span>{(overview?.total_users ?? 0) - (overview?.active_users ?? 0)} inactive</span>
              </div>
            </div>

            {/* Total Assessments */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assessments</span>
                <Activity className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{overview?.total_assessments ?? 0}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">+{overview?.assessments_today ?? 0} today</span>
                <span>•</span>
                <span>{overview?.assessments_last_7_days ?? 0} in 7d</span>
              </div>
            </div>

            {/* Total Audit Events */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Audit Events</span>
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{overview?.total_audit_events ?? 0}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{overview?.audit_events_today ?? 0} today</span>
                <span>•</span>
                <span>{overview?.audit_events_last_7_days ?? 0} in 7d</span>
              </div>
            </div>

            {/* Authentication Activity */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Auth Telemetry</span>
                <Key className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {overview?.login_success_count ?? 0}
                <span className="text-sm font-normal text-slate-500 ml-1">success</span>
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                <span className="text-rose-600 dark:text-rose-400 font-semibold">{overview?.login_failure_count ?? 0} failures</span>
                <span>•</span>
                <span>
                  {overview?.login_success_count && (overview.login_success_count + overview.login_failure_count > 0)
                    ? `${Math.round(((overview.login_failure_count) / (overview.login_success_count + overview.login_failure_count)) * 100)}% fail rate`
                    : '0% fail rate'}
                </span>
              </div>
            </div>
          </div>

          {/* Persistent vs Ephemeral Resource Notice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <div>
                <span className="font-semibold block text-slate-800 dark:text-slate-200">Credit Assessment Reports</span>
                <span>Status: {overview?.total_reports_generated ?? 'Generated on-demand (not persisted)'}</span>
              </div>
              <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-[11px] font-mono">On-Demand</span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <div>
                <span className="font-semibold block text-slate-800 dark:text-slate-200">What-If Risk Simulations</span>
                <span>Status: {overview?.total_simulations_run ?? 'Evaluated on-demand (not persisted)'}</span>
              </div>
              <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-[11px] font-mono">Interactive</span>
            </div>
          </div>

          {/* Platform Health Diagnostic Section */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">Platform Health & Subsystem Diagnostics</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Status:</span>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase ${
                  health?.status === 'HEALTHY'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {health?.status ?? 'OPERATIONAL'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {health?.components.map((comp) => {
                const isOp = comp.status === 'OPERATIONAL';
                return (
                  <div
                    key={comp.component}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-start gap-3"
                  >
                    {isOp ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{comp.component}</h4>
                        <span className={`text-[10px] font-semibold uppercase ${isOp ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {comp.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed truncate">
                        {comp.details}
                      </p>
                      {comp.error && (
                        <p className="text-[10px] text-rose-500 mt-1 font-mono">{comp.error}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Read-Only Model & AI Status Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Status Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-brand-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Credit ML Model Verification</h3>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  Read-Only Authority
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Model Artifact</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{modelStatus?.model_file}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Model SHA-256 Hash</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded text-[11px]">
                    {modelStatus?.model_sha256}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Preprocessing Pipeline</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{modelStatus?.preprocessing_file}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Pipeline SHA-256 Hash</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded text-[11px]">
                    {modelStatus?.preprocessing_sha256}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Decision Threshold</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand-600 dark:text-brand-400 text-sm">
                      {modelStatus?.current_threshold} (35%)
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-semibold">
                      {modelStatus?.threshold_status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500">Governance Lock</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {modelStatus?.governance_lock}
                  </span>
                </div>
              </div>
            </div>

            {/* NVIDIA AI Status Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">NVIDIA AI Explainability Layer</h3>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Integrated
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">AI Provider</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">NVIDIA NIM / Cloud Inference</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Target Foundation Model</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded text-[11px]">
                    meta/llama-3.1-70b-instruct
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Secret Storage</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Server-Side Only (Zero Frontend Exposure)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Fallback Protection</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Deterministic Feature Engine (100% resilient)
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 mt-2">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    <strong>Governance Note:</strong> NVIDIA AI functions strictly as an explanatory and advisory layer. The authoritative prediction and classification decision is generated by the local Credit ML Engine.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: USER MANAGEMENT                                         */}
      {/* ============================================================== */}
      {activeSubTab === 'users' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Platform User Access Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grant, restrict, and audit user roles and credentials across the organization.
              </p>
            </div>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New User</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search username or email..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/50"
              />
            </div>

            <div>
              <select
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setUserPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="">All Roles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="CREDIT_OFFICER">CREDIT_OFFICER</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>

            <div>
              <select
                value={userActiveFilter}
                onChange={(e) => {
                  setUserActiveFilter(e.target.value);
                  setUserPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {usersData?.items.map((u) => {
                  const isSelf = currentUser?.id === u.id || currentUser?.email === u.email;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {u.full_name || u.username}
                        </div>
                        {isSelf && (
                          <span className="text-[10px] text-brand-600 font-medium">(Current Admin)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{u.email}</td>
                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden disabled:opacity-50"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="CREDIT_OFFICER">CREDIT_OFFICER</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          u.is_active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={isSelf}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${
                            u.is_active
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {usersData?.items.length ?? 0} of {usersData?.total ?? 0} users (Page {usersData?.page ?? 1} of {usersData?.total_pages ?? 1})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                disabled={userPage <= 1}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setUserPage((p) => Math.min(usersData?.total_pages || 1, p + 1))}
                disabled={userPage >= (usersData?.total_pages || 1)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: AUDIT LOG CENTER                                        */}
      {/* ============================================================== */}
      {activeSubTab === 'audit' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Security & Operation Audit Logs</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Immutable ledger of platform authentication attempts, role modifications, and ML prediction runs.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search details..."
                value={auditSearch}
                onChange={(e) => {
                  setAuditSearch(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden"
              >
                <option value="">All Actions</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
                <option value="PREDICTION_CREATED">PREDICTION_CREATED</option>
                <option value="USER_CREATED">USER_CREATED</option>
                <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
                <option value="USER_STATUS_CHANGED">USER_STATUS_CHANGED</option>
              </select>
            </div>

            <div>
              <select
                value={auditStatusFilter}
                onChange={(e) => {
                  setAuditStatusFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden"
              >
                <option value="">All Statuses</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILURE">FAILURE</option>
                <option value="ERROR">ERROR</option>
              </select>
            </div>

            <div>
              <input
                type="date"
                value={auditStartDate}
                onChange={(e) => {
                  setAuditStartDate(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden text-slate-600 dark:text-slate-300"
              />
            </div>

            <div>
              <input
                type="date"
                value={auditEndDate}
                onChange={(e) => {
                  setAuditEndDate(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden text-slate-600 dark:text-slate-300"
              />
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Threshold</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {auditData?.items.map((log) => {
                  const isSuccess = log.status === 'SUCCESS';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {log.action}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          isSuccess
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {log.user_id ? `#${log.user_id}` : 'system'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {log.threshold ?? 0.35}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-[11px] max-w-xs truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {auditData?.items.length ?? 0} of {auditData?.total ?? 0} events (Page {auditData?.page ?? 1} of {auditData?.total_pages ?? 1})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                disabled={auditPage <= 1}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAuditPage((p) => Math.min(auditData?.total_pages || 1, p + 1))}
                disabled={auditPage >= (auditData?.total_pages || 1)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: SECURITY & RATE LIMITS                                  */}
      {/* ============================================================== */}
      {activeSubTab === 'security' && (
        <div className="space-y-6">
          {/* Rate Limiting Configuration Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-brand-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">Active Rate Limiting Policies</h3>
              </div>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Active Enforcing
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block mb-1">Login Endpoint Policy</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  10 attempts / min per IP
                </span>
                <p className="text-[11px] text-slate-400 mt-1">Protects against credential stuffing</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block mb-1">Prediction Endpoint Policy</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  30 requests / min per IP
                </span>
                <p className="text-[11px] text-slate-400 mt-1">Safeguards inference throughput</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block mb-1">Storage Mode</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {securityData?.rate_limiting.storage_mode ?? 'In-memory Sliding Window'}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  {securityData?.rate_limiting.active_buckets_tracked ?? 0} active IP buckets tracked
                </p>
              </div>
            </div>
          </div>

          {/* Recent Security Activity Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Failed Login Attempts */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="w-5 h-5 text-rose-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Recent Failed Logins</h3>
                </div>
                <span className="text-xs text-rose-500 font-semibold">
                  {securityData?.login_stats.failed_logins ?? 0} Total Recorded
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-72 overflow-y-auto">
                {securityData?.recent_failed_logins && securityData.recent_failed_logins.length > 0 ? (
                  securityData.recent_failed_logins.map((item) => (
                    <div key={item.id} className="py-2.5 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {item.details || 'Failed login attempt'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded font-semibold">
                        FAIL
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No recent failed logins detected.</p>
                )}
              </div>
            </div>

            {/* Recent User Management Activity */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-brand-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">User Management Modifications</h3>
                </div>
                <span className="text-xs text-slate-400">Security Events</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-72 overflow-y-auto">
                {securityData?.recent_user_management_activity && securityData.recent_user_management_activity.length > 0 ? (
                  securityData.recent_user_management_activity.map((item) => (
                    <div key={item.id} className="py-2.5 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {item.action}: {item.details || 'Role or state modified'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded font-semibold">
                        {item.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No recent administrative modifications.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Platform User</h3>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="analyst@bank.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="analyst1"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden"
                >
                  <option value="CREDIT_OFFICER">CREDIT_OFFICER (Assessment Creation & Review)</option>
                  <option value="VIEWER">VIEWER (Read-Only Access)</option>
                  <option value="ADMIN">ADMIN (Full Administrative Control)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl shadow-xs"
                >
                  {submittingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
