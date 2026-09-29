import React, { useEffect, useState } from 'react';
import { fetchDashboardSummary, fetchAnalyticsOverview } from '../services/api';
import { DashboardSummary, AnalyticsOverview } from '../types';
import { ShieldAlert, ShieldCheck, AlertTriangle, FileText, TrendingUp, DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardSummary(), fetchAnalyticsOverview()])
      .then(([sData, aData]) => {
        setSummary(sData);
        setAnalytics(aData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
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

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  const riskData = summary ? [
    { name: 'Low Risk', value: summary.approved_count },
    { name: 'Moderate Risk', value: Math.max(0, summary.total_assessments - summary.approved_count - summary.high_risk_count) },
    { name: 'High Risk', value: summary.high_risk_count },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Executive Risk Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time credit portfolio performance and machine learning assessment metrics.</p>
        </div>
        <button
          onClick={() => setActiveTab('new-assessment')}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all shadow-md shadow-brand-500/20 text-sm"
        >
          <span>Run New Assessment</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Total Applications</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{summary?.total_assessments || 0}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{summary?.assessments_today || 0} applications today</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Approval Rate</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{summary?.approval_rate_pct || '0.00%'}</p>
          <p className="text-xs text-emerald-600 font-medium mt-2">
            {summary?.approved_count || 0} approved applications
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">High Risk Rate</span>
            <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{summary?.high_risk_rate_pct || '0.00%'}</p>
          <p className="text-xs text-red-600 font-medium mt-2">
            {summary?.high_risk_count || 0} high-risk default alerts
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Default Prob</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{summary?.avg_default_probability_pct || '0.00%'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Avg Principal: {summary?.avg_credit_amount?.toLocaleString() || 0} DM</span>
          </p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4">Risk Category Stratification</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400 mt-2">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Low Risk</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Moderate Risk</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> High Risk</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4">Probability Distribution Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.probability_histogram || []}>
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Assessment Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Recent Credit Assessments</h3>
          <button onClick={() => setActiveTab('history')} className="text-xs font-semibold text-brand-500 hover:text-brand-600">
            View All History →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                <th className="py-3.5 px-6">Assessment ID</th>
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Credit Amount</th>
                <th className="py-3.5 px-6">Duration</th>
                <th className="py-3.5 px-6">Default Prob</th>
                <th className="py-3.5 px-6">Risk Category</th>
                <th className="py-3.5 px-6">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {summary?.recent_assessments && summary.recent_assessments.length > 0 ? (
                summary.recent_assessments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {item.id.substring(0, 8)}...
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400 text-xs">{item.created_at}</td>
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">{item.credit_amount.toLocaleString()} DM</td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400">{item.duration_in_months}m</td>
                    <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">{item.default_probability_pct}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.risk_category === 'LOW RISK'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : item.risk_category === 'MODERATE RISK'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {item.risk_category}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-xs text-slate-700 dark:text-slate-300">{item.credit_decision}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                    No assessments recorded yet. Run a new credit assessment to populate the database.
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
