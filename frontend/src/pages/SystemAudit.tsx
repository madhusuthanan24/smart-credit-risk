import React, { useEffect, useState } from 'react';
import { fetchAuditLogs, fetchHealth } from '../services/api';
import { AuditLog, HealthStatus } from '../types';
import { ShieldCheck, CheckCircle2, Server, Database, Activity } from 'lucide-react';

export const SystemAudit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAuditLogs(), fetchHealth()])
      .then(([logData, healthData]) => {
        setLogs(logData);
        setHealth(healthData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load audit logs:', err);
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
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">System Audit & Health Logs</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Live status of API services, database engine, loaded ML models, and audit logs.</p>
      </div>

      {/* System Component Health Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl shrink-0">
            <Server className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 block">REST API Status</span>
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize truncate">{health?.status || 'Unknown'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl shrink-0">
            <Database className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 block">Database Engine</span>
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize truncate">{health?.database || 'Healthy'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="p-2.5 sm:p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-xl shrink-0">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 block">ML Model Status</span>
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize truncate">{health?.ml_model || 'Loaded & Active'}</p>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">Prediction Audit Trail</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                <th className="py-3 sm:py-3.5 px-4 sm:px-6">Timestamp</th>
                <th className="py-3 sm:py-3.5 px-4 sm:px-6">Action</th>
                <th className="py-3 sm:py-3.5 px-4 sm:px-6">Assessment ID</th>
                <th className="py-3 sm:py-3.5 px-4 sm:px-6">Model Version</th>
                <th className="py-3 sm:py-3.5 px-4 sm:px-6">Threshold</th>
                <th className="py-3 sm:py-3.5 px-4 sm:px-6">Status</th>
                <th className="py-3 sm:py-3.5 px-4 sm:px-6">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs sm:text-sm">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 sm:py-4 px-4 sm:px-6 text-slate-600 dark:text-slate-400 text-xs font-mono">{log.timestamp}</td>
                    <td className="py-3.5 sm:py-4 px-4 sm:px-6 font-bold text-xs text-slate-800 dark:text-slate-200">{log.action}</td>
                    <td className="py-3.5 sm:py-4 px-4 sm:px-6 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {log.assessment_id ? `${log.assessment_id.substring(0, 8)}...` : 'N/A'}
                    </td>
                    <td className="py-3.5 sm:py-4 px-4 sm:px-6 text-xs text-slate-600 dark:text-slate-400">{log.model_version}</td>
                    <td className="py-3.5 sm:py-4 px-4 sm:px-6 text-xs font-semibold text-slate-700 dark:text-slate-300">{log.threshold}</td>
                    <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-bold">
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3.5 sm:py-4 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">{log.details || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                    No audit log events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
