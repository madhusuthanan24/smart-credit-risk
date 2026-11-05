import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUsersApi, createUserApi, updateUserApi } from '../services/auth';
import { User } from '../types';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Lock,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Check,
  X
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { token, user: currentUser, refreshUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'CREDIT_OFFICER' | 'VIEWER'>('CREDIT_OFFICER');
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Action Loading tracking (userId -> boolean)
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  const loadUsers = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsersApi(token);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user records from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [token]);

  // Count active administrators to enforce last-admin protection in the UI
  const activeAdminsCount = useMemo(() => {
    return users.filter((u) => u.role === 'ADMIN' && u.is_active !== false).length;
  }, [users]);

  // Statistics KPIs
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.is_active !== false).length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    const officers = users.filter((u) => u.role === 'CREDIT_OFFICER').length;
    const viewers = users.filter((u) => u.role === 'VIEWER').length;
    return { total, active, admins, officers, viewers };
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = searchQuery.trim() === '' || u.email.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.is_active !== false) ||
        (statusFilter === 'DISABLED' && u.is_active === false);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccessMessage(null);
    } else {
      setSuccessMessage(msg);
      setError(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError(null);
    setCreating(true);
    try {
      await createUserApi(token, { email: newEmail, password: newPassword, role: newRole });
      setShowCreateModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewRole('CREDIT_OFFICER');
      showNotification(`User account created successfully for ${newEmail}`);
      await loadUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user account.');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (targetUser: User, newTargetRole: string) => {
    if (!token) return;
    if (targetUser.role === newTargetRole) return;

    // Frontend Guard: Self-demotion check
    if (targetUser.id === currentUser?.id && newTargetRole !== 'ADMIN') {
      showNotification('Administrators cannot demote their own account.', true);
      return;
    }

    // Frontend Guard: Last Admin check
    if (targetUser.role === 'ADMIN' && newTargetRole !== 'ADMIN' && activeAdminsCount <= 1) {
      showNotification('Cannot demote the last remaining active Administrator.', true);
      return;
    }

    setActionLoadingId(targetUser.id);
    setError(null);
    try {
      await updateUserApi(token, String(targetUser.id), { role: newTargetRole });
      showNotification(`Role for ${targetUser.email} updated to ${newTargetRole}. Event logged to audit trail.`);
      if (targetUser.id === currentUser?.id) {
        await refreshUser();
      }
      await loadUsers();
    } catch (err: any) {
      showNotification(err.message || 'Failed to update user role.', true);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleActive = async (targetUser: User) => {
    if (!token) return;
    const newStatus = !targetUser.is_active;

    // Frontend Guard: Self-deactivation check
    if (targetUser.id === currentUser?.id && !newStatus) {
      showNotification('Administrators cannot deactivate their own account.', true);
      return;
    }

    // Frontend Guard: Last Admin check
    if (targetUser.role === 'ADMIN' && !newStatus && activeAdminsCount <= 1) {
      showNotification('Cannot deactivate the last remaining active Administrator.', true);
      return;
    }

    setActionLoadingId(targetUser.id);
    setError(null);
    try {
      await updateUserApi(token, String(targetUser.id), { is_active: newStatus });
      showNotification(
        `Account ${targetUser.email} has been ${newStatus ? 'activated' : 'disabled'}. Event logged to audit trail.`
      );
      if (targetUser.id === currentUser?.id) {
        await refreshUser();
      }
      await loadUsers();
    } catch (err: any) {
      showNotification(err.message || 'Failed to update user status.', true);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
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
    <div className="space-y-6 min-w-0">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-200 dark:border-purple-800">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>User Access & Role Management</span>
                <span className="text-xs px-2.5 py-0.5 font-bold uppercase rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Admin Only
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Govern authenticated identities, assign system privileges, and control account lifecycles.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2 text-xs sm:text-sm"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Users</span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{stats.total}</p>
          <span className="text-[11px] text-slate-400">All registered</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active</span>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</p>
          <span className="text-[11px] text-slate-400">Allowed login</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Admins</span>
          <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{stats.admins}</p>
          <span className="text-[11px] text-slate-400">{activeAdminsCount} active</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Credit Officers</span>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{stats.officers}</p>
          <span className="text-[11px] text-slate-400">Assessors</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Viewers</span>
          <p className="text-2xl font-extrabold text-slate-700 dark:text-slate-300 mt-1">{stats.viewers}</p>
          <span className="text-[11px] text-slate-400">Read-only</span>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 sm:p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 sm:p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-slate-800 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by email address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="CREDIT_OFFICER">CREDIT_OFFICER</option>
              <option value="VIEWER">VIEWER</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="DISABLED">Disabled Only</option>
            </select>
          </div>

          {(searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
            <span>Registered Accounts</span>
            <span className="text-xs font-normal text-slate-400">({filteredUsers.length} matching)</span>
          </h3>
          <span className="text-[11px] text-slate-400">All modifications are committed to immutable audit logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">User / Email</th>
                <th className="py-3.5 px-4 sm:px-6">Assigned Role</th>
                <th className="py-3.5 px-4 sm:px-6">Account Status</th>
                <th className="py-3.5 px-4 sm:px-6">Registration Date</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs sm:text-sm">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                    <p className="text-xs font-medium">Fetching verified platform users...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">No users matching search or filter criteria</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the role or status filter</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id || u.email === currentUser?.email;
                  const isLastAdmin = u.role === 'ADMIN' && activeAdminsCount <= 1;
                  const isBusy = actionLoadingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all">
                      <td className="py-3.5 sm:py-4 px-4 sm:px-6 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold flex items-center justify-center text-xs shrink-0">
                            {u.email.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[200px] sm:max-w-none">
                                {u.email}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold px-2 py-0.5 rounded-full shrink-0 border border-brand-200 dark:border-brand-800">
                                  You (Active Admin)
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono block truncate">
                              ID: {String(u.id).substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={u.role}
                            disabled={isBusy || isCurrent || isLastAdmin}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            className={`px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-brand-500/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${getRoleBadgeStyle(
                              u.role
                            )}`}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="CREDIT_OFFICER">CREDIT_OFFICER</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                          {(isCurrent || isLastAdmin) && (
                            <span
                              title={
                                isCurrent
                                  ? 'Self-demotion disabled: You cannot change your own role'
                                  : 'Protected: Cannot demote the last remaining active Administrator'
                              }
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                        {u.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-xs font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-full text-xs font-semibold">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 sm:py-4 px-4 sm:px-6 text-slate-500 dark:text-slate-400 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{u.created_at || 'Pre-configured'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 sm:py-4 px-4 sm:px-6 text-right">
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={isBusy || isCurrent || isLastAdmin}
                          title={
                            isCurrent
                              ? 'You cannot disable your own account'
                              : isLastAdmin
                              ? 'Cannot disable the last active Administrator'
                              : u.is_active !== false
                              ? 'Disable this user account'
                              : 'Re-enable this user account'
                          }
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                            u.is_active !== false
                              ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          {isBusy ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : u.is_active !== false ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-500 shrink-0" />
                <span>Provision New User Account</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="my-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    placeholder="officer@bank.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Temporary Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Assign Platform Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-brand-500/20 font-medium"
                >
                  <option value="CREDIT_OFFICER">CREDIT_OFFICER — Operational Underwriter & Loan Scoring</option>
                  <option value="ADMIN">ADMIN — Full Administrative, User & System Security Control</option>
                  <option value="VIEWER">VIEWER — Read-Only Portfolio Analytics & Isolated Simulator</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Role assignments immediately apply on next session authentication or refresh.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full sm:w-auto px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs text-center inline-flex items-center justify-center gap-1.5"
                >
                  {creating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{creating ? 'Provisioning...' : 'Provision Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
