import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { NewAssessment } from './pages/NewAssessment';
import { AssessmentHistory } from './pages/AssessmentHistory';
import { Analytics } from './pages/Analytics';
import { ModelInfo } from './pages/ModelInfo';
import { SystemAudit } from './pages/SystemAudit';
import { UserManagement } from './pages/UserManagement';
import { Settings } from './pages/Settings';
import { ShieldAlert } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400">Verifying session security...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Permission Checks per tab
  const canAccessTab = (tab: string): boolean => {
    const currentRole = role || 'VIEWER';
    if (tab === 'new-assessment') return ['ADMIN', 'CREDIT_OFFICER'].includes(currentRole);
    if (tab === 'analytics') return ['ADMIN', 'CREDIT_OFFICER'].includes(currentRole);
    if (tab === 'audit') return currentRole === 'ADMIN';
    if (tab === 'users') return currentRole === 'ADMIN';
    return true;
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header darkMode={darkMode} setDarkMode={setDarkMode} />
        
        <main className="flex-1 p-8 overflow-y-auto">
          {!canAccessTab(activeTab) ? (
            <div className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-center max-w-md mx-auto my-12 shadow-sm">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">403 Forbidden - Access Restricted</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
                Your assigned role (<span className="font-semibold text-slate-700 dark:text-slate-200">{role}</span>) does not have authorization to view this section.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2 bg-brand-500 text-white font-semibold text-sm rounded-xl shadow-xs"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
              {activeTab === 'new-assessment' && <NewAssessment />}
              {activeTab === 'history' && <AssessmentHistory />}
              {activeTab === 'analytics' && <Analytics />}
              {activeTab === 'model-info' && <ModelInfo />}
              {activeTab === 'audit' && <SystemAudit />}
              {activeTab === 'users' && <UserManagement />}
              {activeTab === 'settings' && <Settings />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
