import React, { useEffect, useState } from 'react';
import { fetchPredictions, fetchPredictionDetail } from '../services/api';
import { AssessmentItem, PredictionResponse } from '../types';
import { Search, Filter, Eye, X } from 'lucide-react';

export const AssessmentHistory: React.FC = () => {
  const [history, setHistory] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [selectedDetail, setSelectedDetail] = useState<(PredictionResponse & { applicant_features: any }) | null>(null);

  useEffect(() => {
    fetchPredictions()
      .then((data) => {
        setHistory(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load history:', err);
        setLoading(false);
      });
  }, []);

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await fetchPredictionDetail(id);
      setSelectedDetail(detail);
    } catch (err) {
      console.error('Failed to load detail:', err);
    }
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch = item.id.toLowerCase().includes(search.toLowerCase()) || item.applicant_id.toLowerCase().includes(search.toLowerCase());
    const matchesRisk = riskFilter === 'ALL' || item.risk_category === riskFilter;
    return matchesSearch && matchesRisk;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Assessment History</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Audit log of all historical credit predictions stored in PostgreSQL / database.</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Assessment ID or Applicant ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none"
          >
            <option value="ALL">All Risk Categories</option>
            <option value="LOW RISK">Low Risk</option>
            <option value="MODERATE RISK">Moderate Risk</option>
            <option value="HIGH RISK">High Risk</option>
          </select>
        </div>
      </div>

      {/* History Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                <th className="py-3.5 px-6">Prediction ID</th>
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Credit Amount</th>
                <th className="py-3.5 px-6">Duration</th>
                <th className="py-3.5 px-6">Default Prob</th>
                <th className="py-3.5 px-6">Risk Category</th>
                <th className="py-3.5 px-6">Decision</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
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
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleViewDetail(item.id)}
                        className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-slate-700 rounded-lg transition-all"
                        title="View Full Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
                    No historical assessments match the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assessment Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Assessment Details</h3>
              <button onClick={() => setSelectedDetail(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-bold">Assessment ID</span>
                <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{selectedDetail.prediction_id}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold">Default Probability</span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{selectedDetail.default_probability_pct}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold">Risk Category</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{selectedDetail.risk_category}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold">Decision</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{selectedDetail.credit_decision}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-2">Submitted Features</h4>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-xs font-mono max-h-48 overflow-y-auto">
                <pre>{JSON.stringify(selectedDetail.applicant_features, null, 2)}</pre>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setSelectedDetail(null)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
