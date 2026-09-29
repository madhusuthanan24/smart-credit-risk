import React, { useState, useRef } from 'react';
import { CreditCard, ShieldCheck, Sparkles, Lock, CheckCircle2 } from 'lucide-react';
import { ViewerLogin } from './auth/ViewerLogin';
import { ViewerRegister } from './auth/ViewerRegister';
import { StaffAccess } from './auth/StaffAccess';
import { CreditOfficerLogin } from './auth/CreditOfficerLogin';
import { CreditOfficerRegister } from './auth/CreditOfficerRegister';
import { AdminLogin } from './auth/AdminLogin';
import { AdminRegister } from './auth/AdminRegister';

type AuthViewMode =
  | 'viewer-login'
  | 'viewer-register'
  | 'staff-select'
  | 'officer-login'
  | 'officer-register'
  | 'admin-login'
  | 'admin-register';

interface LoginProps {
  initialMode?: AuthViewMode;
}

export const Login: React.FC<LoginProps> = ({ initialMode = 'viewer-login' }) => {
  const [viewMode, setViewMode] = useState<AuthViewMode>(initialMode);
  const [staffUnlocked, setStaffUnlocked] = useState(false);
  const [showGestureFeedback, setShowGestureFeedback] = useState(false);
  
  // 5-tap gesture state tracking
  const tapTimesRef = useRef<number[]>([]);

  const handleLogoTap = () => {
    const now = Date.now();
    // Keep taps within last 2000ms
    const recentTaps = [...tapTimesRef.current, now].filter((t) => now - t <= 2000);
    tapTimesRef.current = recentTaps;

    if (recentTaps.length >= 5) {
      // Secret gesture triggered!
      tapTimesRef.current = [];
      setStaffUnlocked(true);
      setShowGestureFeedback(true);
      setViewMode('staff-select');

      setTimeout(() => {
        setShowGestureFeedback(false);
      }, 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300">
        
        {/* Header Branding with 5-tap logo detector */}
        <div className="bg-gradient-to-br from-brand-600 via-indigo-700 to-slate-900 p-8 text-white text-center relative select-none">
          
          {/* Top secret staff unlock badge */}
          {staffUnlocked && (
            <button
              onClick={() => setViewMode('staff-select')}
              className="absolute top-4 right-4 px-2.5 py-1 bg-amber-400/20 backdrop-blur-md border border-amber-300/40 rounded-full text-[11px] font-semibold text-amber-200 flex items-center gap-1 hover:bg-amber-400/30 transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
              <span>Staff Portal</span>
            </button>
          )}

          {/* Secret Tap Detector on Logo Icon */}
          <button
            type="button"
            onClick={handleLogoTap}
            title="Smart Risk Engine Logo"
            className="w-14 h-14 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner transition-all cursor-pointer"
          >
            <CreditCard className="w-8 h-8 text-white" />
          </button>

          <h2 className="text-2xl font-bold tracking-tight">Smart Risk Engine</h2>
          <p className="text-brand-100 text-xs mt-1 font-medium">Enterprise Credit Risk Platform</p>

          {/* Toast feedback when 5-tap gesture unlocks staff portal */}
          {showGestureFeedback && (
            <div className="mt-3 py-1.5 px-3 bg-amber-500/90 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>Staff Gateway Unlocked!</span>
            </div>
          )}
        </div>

        {/* Dynamic Auth Body */}
        <div className="p-8">
          {viewMode === 'viewer-login' && (
            <ViewerLogin
              onSwitchToRegister={() => setViewMode('viewer-register')}
              onStaffClick={() => setViewMode('staff-select')}
            />
          )}

          {viewMode === 'viewer-register' && (
            <ViewerRegister
              onSwitchToLogin={() => setViewMode('viewer-login')}
            />
          )}

          {viewMode === 'staff-select' && (
            <StaffAccess
              onSelectRole={(role) => setViewMode(role === 'ADMIN' ? 'admin-login' : 'officer-login')}
              onBackToViewer={() => setViewMode('viewer-login')}
            />
          )}

          {viewMode === 'officer-login' && (
            <CreditOfficerLogin
              onSwitchToRegister={() => setViewMode('officer-register')}
              onBackToViewer={() => setViewMode('viewer-login')}
            />
          )}

          {viewMode === 'officer-register' && (
            <CreditOfficerRegister
              onSwitchToLogin={() => setViewMode('officer-login')}
              onBackToViewer={() => setViewMode('viewer-login')}
            />
          )}

          {viewMode === 'admin-login' && (
            <AdminLogin
              onSwitchToRegister={() => setViewMode('admin-register')}
              onBackToViewer={() => setViewMode('viewer-login')}
            />
          )}

          {viewMode === 'admin-register' && (
            <AdminRegister
              onSwitchToLogin={() => setViewMode('admin-login')}
              onBackToViewer={() => setViewMode('viewer-login')}
            />
          )}

          {/* Footer Assistance Section */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 text-center">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
                RBAC Enforced
              </span>

              {/* Only visible when unlocked via secret 5-tap gesture */}
              {staffUnlocked ? (
                <button
                  type="button"
                  onClick={() => setViewMode('staff-select')}
                  className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 text-[11px] font-medium"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Staff Gateway</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  v1.0.0
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
