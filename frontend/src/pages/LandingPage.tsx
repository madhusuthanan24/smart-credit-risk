import React, { useState } from 'react';
import {
  CreditCard,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Cpu,
  Layers,
  Database,
  Lock,
  FileText,
  BarChart3,
  TrendingUp,
  Check,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Info,
  Scale,
  Activity,
  LayoutDashboard,
  Server,
  FileCheck,
  UserCheck,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
  onGoToDashboard?: () => void;
  isAuthenticated?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLogin,
  onRegister,
  onGoToDashboard,
  isAuthenticated = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [interactiveRiskTier, setInteractiveRiskTier] = useState<'low' | 'moderate' | 'high'>('moderate');

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Sample data for the interactive gauge visual
  const tierSamples = {
    low: {
      probability: 14.2,
      label: 'Low Risk',
      color: '#10b981',
      bgLight: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      action: 'Standard Underwriting / Eligible for Approval',
      offset: 0.142,
    },
    moderate: {
      probability: 21.52,
      label: 'Moderate Risk',
      color: '#f59e0b',
      bgLight: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      action: 'Manual Review / Refer to Underwriter',
      offset: 0.2152,
    },
    high: {
      probability: 43.8,
      label: 'High Risk',
      color: '#ef4444',
      bgLight: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      action: 'High Default Risk / Requires Collateral',
      offset: 0.438,
    },
  };

  const currentSample = tierSamples[interactiveRiskTier];
  const radius = 70;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth * 0.5;
  const circumference = normalizedRadius * Math.PI;
  const strokeDashoffset = circumference - (currentSample.offset * circumference);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-500 selection:text-white overflow-x-hidden">
      {/* ==================================================
          A. NAVIGATION BAR
          ================================================== */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/85 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left side: Project Logo & Identity */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 border border-brand-400/30">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-white leading-none">
                    Credit Risk Engine
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-brand-500/15 text-brand-400 border border-brand-500/30">
                    Indian Edition
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block mt-0.5">
                  ML Decision Support Platform
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
              <button
                onClick={() => scrollToSection('about')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('ml-engine')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                ML Methodology
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('risk-policy')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Risk Policy
              </button>
              <button
                onClick={() => scrollToSection('technology')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Technology
              </button>
            </div>

            {/* Right side: Action Buttons */}
            <div className="hidden sm:flex items-center gap-3">
              {isAuthenticated ? (
                <button
                  onClick={onGoToDashboard}
                  className="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-brand-600/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <>
                  <button
                    onClick={onLogin}
                    className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-700/60 rounded-xl transition-all cursor-pointer"
                  >
                    Login
                  </button>
                  <button
                    onClick={onRegister}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-brand-500/25 transition-all cursor-pointer"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="flex sm:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3">
            <div className="flex flex-col space-y-2 text-sm font-medium text-slate-300">
              <button
                onClick={() => scrollToSection('about')}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-800/70 hover:text-white"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-800/70 hover:text-white"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('ml-engine')}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-800/70 hover:text-white"
              >
                ML Methodology
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-800/70 hover:text-white"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('risk-policy')}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-800/70 hover:text-white"
              >
                Risk Policy
              </button>
              <button
                onClick={() => scrollToSection('technology')}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-800/70 hover:text-white"
              >
                Technology
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onGoToDashboard) onGoToDashboard();
                  }}
                  className="w-full py-2.5 bg-brand-500 text-white font-semibold rounded-xl text-center flex items-center justify-center gap-2 text-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to Dashboard</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogin();
                    }}
                    className="w-full py-2.5 bg-slate-800 border border-slate-700 text-white font-semibold rounded-xl text-center text-sm"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onRegister();
                    }}
                    className="w-full py-2.5 bg-brand-500 text-white font-semibold rounded-xl text-center text-sm"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ==================================================
          B. HERO SECTION
          ================================================== */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-32 border-b border-slate-800/60">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-brand-500/10 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute -top-32 right-10 w-80 h-80 bg-indigo-500/10 blur-[110px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline and Call-to-actions */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-brand-400 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                <span>Decision Support Platform • Indian Edition</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                AI-Powered{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-sky-300 to-indigo-400">
                  Credit Risk Assessment
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Evaluate loan default risk using machine learning, explainable predictions, and application-specific financial analysis.
              </p>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Credit Risk Scoring Engine helps assess borrower risk using personal, financial, loan, and credit-history information. The system generates a default probability and provides an explainable risk recommendation.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
                {isAuthenticated ? (
                  <button
                    onClick={onGoToDashboard}
                    className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 text-sm sm:text-base transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onLogin}
                      className="w-full sm:w-auto px-7 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 text-sm sm:text-base transition-all transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={onRegister}
                      className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 text-sm sm:text-base transition-all cursor-pointer"
                    >
                      <span>Create Account</span>
                    </button>
                  </>
                )}
              </div>

              {/* Quick Trust Highlights */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Decision Cutoff</span>
                  <span className="text-xs font-bold text-slate-200">0.35 Calibrated</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Inference Engine</span>
                  <span className="text-xs font-bold text-slate-200">Logistic Regression</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Explainability</span>
                  <span className="text-xs font-bold text-slate-200">NVIDIA AI Layer</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Storage</span>
                  <span className="text-xs font-bold text-slate-200">PostgreSQL ACID</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Representation (Credit Risk Gauge & Dashboard Preview) */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Glow backdrop */}
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 to-indigo-500/20 rounded-3xl blur-xl" />

                <div className="relative bg-slate-900/90 border border-slate-700/70 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Inference Output Preview
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      ID: DEMO-APP-2026
                    </span>
                  </div>

                  {/* Interactive Tab Switcher for Low / Moderate / High demo */}
                  <div className="mt-4 flex items-center justify-between p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                    <button
                      onClick={() => setInteractiveRiskTier('low')}
                      className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                        interactiveRiskTier === 'low'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Low (&lt;20%)
                    </button>
                    <button
                      onClick={() => setInteractiveRiskTier('moderate')}
                      className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                        interactiveRiskTier === 'moderate'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Moderate (20-35%)
                    </button>
                    <button
                      onClick={() => setInteractiveRiskTier('high')}
                      className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                        interactiveRiskTier === 'high'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      High (≥35%)
                    </button>
                  </div>

                  {/* Visual Credit Risk Gauge */}
                  <div className="relative flex flex-col items-center justify-center py-6">
                    <svg
                      height={radius + strokeWidth + 10}
                      width={radius * 2 + strokeWidth + 20}
                      className="overflow-visible"
                    >
                      {/* Background Arc */}
                      <path
                        d={`M ${strokeWidth / 2 + 10} ${radius + 5} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${
                          radius * 2 + strokeWidth / 2 + 10
                        } ${radius + 5}`}
                        fill="none"
                        stroke="#334155"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                      />
                      {/* Dynamic Gauge Arc */}
                      <path
                        d={`M ${strokeWidth / 2 + 10} ${radius + 5} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${
                          radius * 2 + strokeWidth / 2 + 10
                        } ${radius + 5}`}
                        fill="none"
                        stroke={currentSample.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${circumference} ${circumference}`}
                        style={{
                          strokeDashoffset,
                          transition: 'stroke-dashoffset 0.6s ease-in-out, stroke 0.6s ease-in-out',
                        }}
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Centered Probability Counter */}
                    <div className="absolute top-12 flex flex-col items-center">
                      <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        {currentSample.probability}%
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        Predicted Default Probability
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                      <span>Cutoff Boundary:</span>
                      <strong className="text-brand-300 font-bold">35.0%</strong>
                    </div>
                  </div>

                  {/* Recommendation Card */}
                  <div className={`p-3.5 rounded-2xl border ${currentSample.bgLight} transition-all`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider">Classification</span>
                      <span className="text-xs font-extrabold">{currentSample.label}</span>
                    </div>
                    <p className="text-xs mt-1 font-medium text-slate-200">
                      Recommendation: {currentSample.action}
                    </p>
                  </div>

                  {/* Model Metadata footer in card */}
                  <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-[10px] font-mono text-slate-400">
                    <div>
                      <span className="block text-slate-400 font-bold uppercase text-[9px]">Model</span>
                      <span className="text-slate-200 font-semibold">LogReg (C=0.1)</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-bold uppercase text-[9px]">Pipeline</span>
                      <span className="text-slate-200 font-semibold">ColumnTrans</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-bold uppercase text-[9px]">AUC-ROC</span>
                      <span className="text-emerald-400 font-semibold">0.793</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          C. ABOUT THE PROJECT
          ================================================== */}
      <section id="about" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-800/60">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-400">
            <Info className="w-3.5 h-3.5" />
            <span>Project Scope & Architecture</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            What is Credit Risk Scoring Engine?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            This project is an ML-based credit risk assessment and decision-support system. It estimates the probability of loan default based on applicant characteristics, financial information, loan details, and credit history.
          </p>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left text-xs sm:text-sm text-slate-300 space-y-2 mt-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
              <p>
                <strong>Decision-Support System:</strong> Designed to augment financial institutions and underwriter workflows with objective probability calculations.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
              <p>
                <strong>Non-Bureau Replacement:</strong> This system does not replace CIBIL, Experian, or statutory credit bureaus.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
              <p>
                <strong>Application-Specific Focus:</strong> Demonstrates how machine learning evaluates the specific loan facility requested, liquid reserves, and debt service ratios.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
              <p>
                <strong>Complementary Synergy:</strong> In real-world lending, credit bureau scores and application-specific ML complement each other for a complete 360° risk evaluation.
              </p>
            </div>
          </div>
        </div>

        {/* Three Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-12">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 hover:border-brand-500/40 transition-all shadow-md group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">1. Application-Specific Risk</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Evaluate risk for a particular loan application considering duration, installment burden, loan purpose, and personal liquid buffers.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 hover:border-brand-500/40 transition-all shadow-md group">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">2. Machine Learning</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Use a trained Logistic Regression model to estimate default probability with frozen weights and a cost-sensitive 0.35 boundary.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 hover:border-brand-500/40 transition-all shadow-md group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">3. Explainable Decisions</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Show factors that increase or reduce predicted risk to support Adverse Action notices and underwriter confidence.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================
          D. HOW IT WORKS
          ================================================== */}
      <section id="how-it-works" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-800/60">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-400 mb-3">
            <Activity className="w-3.5 h-3.5" />
            <span>Workflow Lifecycle</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            How It Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            A 5-step structured pipeline transforming borrower data into explainable lending recommendations.
          </p>
        </div>

        {/* 5-Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* STEP 1 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/40 text-brand-400 font-black text-sm flex items-center justify-center">
                  01
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Input</span>
              </div>
              <h3 className="font-bold text-white text-base mb-2">Applicant Information</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Personal, employment, housing and demographic information.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
              Age • Employment • Housing
            </div>
          </div>

          {/* STEP 2 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/40 text-brand-400 font-black text-sm flex items-center justify-center">
                  02
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Reserves</span>
              </div>
              <h3 className="font-bold text-white text-base mb-2">Financial Information</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Savings, checking account, assets, existing credits and dependents.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
              Savings • Checking • Assets
            </div>
          </div>

          {/* STEP 3 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/40 text-brand-400 font-black text-sm flex items-center justify-center">
                  03
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Facility</span>
              </div>
              <h3 className="font-bold text-white text-base mb-2">Loan Information</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Loan amount, duration, purpose, repayment history and installment burden.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
              Amount • Duration • Rate
            </div>
          </div>

          {/* STEP 4 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 font-black text-sm flex items-center justify-center">
                  04
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Engine</span>
              </div>
              <h3 className="font-bold text-white text-base mb-2">ML Risk Prediction</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Data is preprocessed using ColumnTransformer and evaluated using the trained Logistic Regression model.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
              OneHot • Scale • LogReg
            </div>
          </div>

          {/* STEP 5 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-sm flex items-center justify-center">
                  05
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Output</span>
              </div>
              <h3 className="font-bold text-white text-base mb-2">Risk Decision</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate default probability and classify the application into Low, Moderate, or High Risk.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
              Prob % • Tier • Factors
            </div>
          </div>
        </div>

        {/* Visual Pipeline Sequence Flow Ribbon */}
        <div className="mt-12 p-4 sm:p-6 bg-slate-900/70 border border-slate-800 rounded-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-4 text-center sm:text-left">
            End-to-End Prediction Flow
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-semibold">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
              Applicant
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
              Data Collection
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
              Preprocessing
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
            <span className="px-3 py-1.5 rounded-lg bg-brand-500/20 border border-brand-500/40 text-brand-300">
              Logistic Regression
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
              Default Probability
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
              Risk Classification
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
              Explainable Result
            </span>
          </div>
        </div>
      </section>

      {/* ==================================================
          E. MACHINE LEARNING SECTION
          ================================================== */}
      <section id="ml-engine" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-800/60">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-400 mb-3">
            <Cpu className="w-3.5 h-3.5" />
            <span>Supervised Learning Methodology</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            Powered by Machine Learning
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            A frozen, calibrated supervised pipeline delivering transparent mathematical probabilities.
          </p>
        </div>

        {/* Pipeline Step Sequence Visual */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-8 mb-10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 text-center">
            Machine Learning Pipeline Architecture
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5 text-center text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold">Step 1</span>
              <span className="font-semibold text-white mt-1">German Credit Dataset</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold">Step 2</span>
              <span className="font-semibold text-white mt-1">Exploratory Data Analysis</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold">Step 3</span>
              <span className="font-semibold text-white mt-1">Data Preparation</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold">Step 4</span>
              <span className="font-semibold text-white mt-1">Train/Test Split</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold">Step 5</span>
              <span className="font-semibold text-brand-300 mt-1">Column Transformer</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold">Step 6</span>
              <span className="font-semibold text-brand-300 mt-1">Logistic Regression</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold">Step 7</span>
              <span className="font-semibold text-white mt-1">Model Evaluation</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold">Step 8</span>
              <span className="font-semibold text-amber-300 mt-1">Threshold Calibration</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold">Step 9</span>
              <span className="font-semibold text-emerald-300 mt-1">Production Deployment</span>
            </div>
          </div>
        </div>

        {/* Dataset & Parameter Metrics Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Dataset</span>
            <span className="text-base sm:text-lg font-extrabold text-white mt-1 block">German Credit Dataset</span>
            <span className="text-xs text-slate-400 mt-1 block">UCI Machine Learning Repo</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Records</span>
            <span className="text-base sm:text-lg font-extrabold text-white mt-1 block">1,000 Applicants</span>
            <span className="text-xs text-slate-400 mt-1 block">700 Good (70%) / 300 Bad (30%)</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Input Features</span>
            <span className="text-base sm:text-lg font-extrabold text-white mt-1 block">21 Predictors</span>
            <span className="text-xs text-slate-400 mt-1 block">Biographical, Financial & Loan</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Algorithm & C Value</span>
            <span className="text-base sm:text-lg font-extrabold text-brand-400 mt-1 block">Logistic Regression</span>
            <span className="text-xs text-slate-400 mt-1 block">Tuned C value = 0.1</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Preprocessing</span>
            <span className="text-base sm:text-lg font-extrabold text-white mt-1 block">ColumnTransformer</span>
            <span className="text-xs text-slate-400 mt-1 block">OneHotEncoder + StandardScaler</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Optimal Cutoff</span>
            <span className="text-base sm:text-lg font-extrabold text-amber-400 mt-1 block">0.35 Calibrated</span>
            <span className="text-xs text-slate-400 mt-1 block">Cost-sensitive default capture</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Default Recall</span>
            <span className="text-base sm:text-lg font-extrabold text-emerald-400 mt-1 block">76.67%</span>
            <span className="text-xs text-slate-400 mt-1 block">Catches 76.7% of bad credit</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Test ROC-AUC</span>
            <span className="text-base sm:text-lg font-extrabold text-emerald-400 mt-1 block">0.793</span>
            <span className="text-xs text-slate-400 mt-1 block">10-fold cross-validated</span>
          </div>
        </div>

        {/* Clear Inference Disclaimer Box */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-brand-500/30 flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-brand-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-slate-300 space-y-1">
            <p className="font-bold text-white">
              Immutable Offline Training & Frozen Inference Authority
            </p>
            <p className="text-slate-400 leading-relaxed">
              Training is performed beforehand. The deployed website uses the trained model for inference on new applications.
              The model is never altered dynamically by web user input, ensuring audited, deterministic, and reproducible credit decisions.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================
          F. KEY FEATURES
          ================================================== */}
      <section id="features" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-800/60">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-400 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Platform Capabilities</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            Key Features
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Engineered with enterprise fintech standards for risk underwriters, credit officers, and auditors.
          </p>
        </div>

        {/* 14 Key Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-3">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">ML-Based Default Prediction</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Calculates deterministic default probability on new applications in milliseconds.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Probability-Based Risk Scoring</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Mathematical scoring mapped from 0.0% to 100.0% calibrated default probabilities.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Low / Moderate / High Risk Classification</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Three-tiered stratification separating safe loans, borderline cases, and high-risk loans.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Manual Review / Refer for Borderline Cases</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Automated referral flag for borderline applications between 20% and 35% probability.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Explainable Risk Factors</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Identifies top risk-increasing drivers and protective mitigating factors per applicant.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">AI-Generated Risk Insights</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Contextual narrative underwriting summaries synthesized by NVIDIA LLaMA 3.2.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Assessment History</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Immutable ledger of all past credit assessments with search and status filtering.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Executive Risk Dashboard</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Real-time portfolio metrics, probability histograms, and 30-day decision volume.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">PostgreSQL Data Storage</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              ACID-compliant relational database for applicants, assessments, and audit trails.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Secure Authentication</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Granular Role-Based Access Control (Admin, Credit Officer, Viewer roles).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">JWT Authentication</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Stateless cryptographically signed tokens protecting all REST backend endpoints.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">bcrypt Password Hashing</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Salted cryptographic hashing safeguarding user authentication credentials.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Downloadable Assessment Reports</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Automated two-pass vector PDF reports with score breakdowns and disclaimers.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Responsive Web Interface</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Mobile-first, desktop-optimized dashboard with dark/light theme support.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================
          G. RISK CLASSIFICATION
          ================================================== */}
      <section id="risk-policy" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-800/60">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-400 mb-3">
            <Scale className="w-3.5 h-3.5" />
            <span>Decision Governance</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            Risk Policy & Classification
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Standardized three-tier risk governance calibrated to minimize lending charge-offs.
          </p>
        </div>

        {/* 3 Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* LOW RISK */}
          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-6 relative">
            <div className="w-3 h-3 rounded-full bg-emerald-400 mb-3" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Low Risk</span>
            <h3 className="text-xl font-extrabold text-white mt-1 mb-2">&lt; 20% Probability</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Default probability below 20%. Indicates a lower-risk application with healthy liquidity and steady repayment record.
            </p>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-emerald-300 font-medium">
              Action: Standard underwriting / Lower-risk application
            </div>
          </div>

          {/* MODERATE RISK */}
          <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-6 relative">
            <div className="w-3 h-3 rounded-full bg-amber-400 mb-3" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Moderate Risk</span>
            <h3 className="text-xl font-extrabold text-white mt-1 mb-2">20% – 35% Probability</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Default probability between 20% and 35%. Borderline condition requiring secondary review or compensatory factors.
            </p>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-amber-300 font-medium">
              Action: Manual Review / Refer to credit officer
            </div>
          </div>

          {/* HIGH RISK */}
          <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-6 relative">
            <div className="w-3 h-3 rounded-full bg-rose-400 mb-3" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">High Risk</span>
            <h3 className="text-xl font-extrabold text-white mt-1 mb-2">≥ 35% Probability</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Default probability at or above 35%. Exceeds the optimal loss threshold; high-risk application.
            </p>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-rose-300 font-medium">
              Action: High-risk application / Collateral restructuring
            </div>
          </div>
        </div>

        {/* Visual Linear Risk Gauge Spectrum */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span>0% (Lowest Risk)</span>
            <span className="text-amber-400 font-extrabold">Decision Cutoff: 35.0%</span>
            <span>100% (Highest Risk)</span>
          </div>

          {/* Spectrum Bar */}
          <div className="relative h-4 rounded-full overflow-hidden flex bg-slate-800">
            <div className="h-full bg-emerald-500" style={{ width: '20%' }} title="Low Risk (<20%)" />
            <div className="h-full bg-amber-500" style={{ width: '15%' }} title="Moderate Risk (20%-35%)" />
            <div className="h-full bg-rose-500" style={{ width: '65%' }} title="High Risk (≥35%)" />
          </div>

          {/* Indicator Marks */}
          <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-2">
            <span>0%</span>
            <span className="text-emerald-400 font-bold">20% Tier</span>
            <span className="text-amber-400 font-bold">35% Cutoff</span>
            <span className="text-rose-400 font-bold">100%</span>
          </div>

          {/* Mandatory Boundary Notice */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              <strong className="text-slate-300">Important Policy Note:</strong> These are project decision thresholds calibrated for cost-sensitive risk evaluation and are not official CIBIL or statutory banking regulatory thresholds.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================
          H. WHY THIS PROJECT?
          ================================================== */}
      <section id="why-this-project" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-800/60">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-400 mb-3">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Value Proposition</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            Why Application-Specific Risk Assessment?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl mx-auto leading-relaxed">
            Credit bureau scores provide valuable information about historical credit behaviour. This project demonstrates an additional ML-based layer that evaluates the current loan application using multiple applicant, financial, and loan characteristics.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center mb-4">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Credit Bureau Information</h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-4 leading-relaxed">
              Provides essential track records of past borrowings, historical defaults, credit inquiry frequency, and age of credit lines across institutions.
            </p>
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-300 font-mono">
              Primary Role: Historical Credit Behaviour
            </div>
          </div>

          <div className="bg-slate-900/70 border border-brand-500/30 rounded-2xl p-6 sm:p-8">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Our ML Risk Engine</h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-4 leading-relaxed">
              Evaluates the specific new facility: debt service burden, applicant liquidity reserves, purpose, duration, and asset collateral for the requested loan.
            </p>
            <div className="p-3.5 bg-slate-950 rounded-xl border border-brand-500/30 text-xs text-brand-300 font-mono">
              Primary Role: Application-Specific Default Risk
            </div>
          </div>
        </div>

        {/* Combined Synthesis Banner */}
        <div className="mt-8 p-6 bg-gradient-to-r from-slate-900 via-brand-950/40 to-slate-900 border border-brand-500/20 rounded-2xl text-center space-y-2">
          <h4 className="text-base font-bold text-white">Combined in a Real-World Lending Environment</h4>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Historical bureau reports + Application-specific ML risk scoring = More comprehensive, fair, and resilient decision support.
            This project does not claim to replace or outperform CIBIL; it illustrates a complementary underwriting intelligence layer.
          </p>
        </div>
      </section>

      {/* ==================================================
          J. EXPLAINABLE AI SECTION
          ================================================== */}
      <section id="explainable-ai" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-800/60">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-400 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Adverse Action Transparency</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            Understand Why the Model Made Its Prediction
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            The platform goes beyond opaque numbers by surfacing positive and negative financial drivers.
          </p>
        </div>

        {/* Live Case Study Card */}
        <div className="max-w-4xl mx-auto bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sample Application Decision</span>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">Applicant #CR-84920</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Default Probability</span>
                <span className="text-xl font-black text-amber-400">21.52%</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs">
                Moderate Risk
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <span>Recommendation:</span>
            <strong className="text-amber-400 font-bold">Manual Review / Refer</strong>
          </div>

          {/* Factors Split Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Risk Increasing Factors */}
            <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20">
              <div className="flex items-center gap-2 mb-3 text-rose-400 font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Risk Increasing Factors</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Low liquid savings (balance &lt; €100 / minimal emergency buffer)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Higher installment burden relative to disposable income (4% bracket)</span>
                </li>
              </ul>
            </div>

            {/* Protective Factors */}
            <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-3 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Protective Factors</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Home ownership (secured property asset backing)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Short/moderate loan duration (18 months tenure)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Positive repayment history on existing credits</span>
                </li>
              </ul>
            </div>
          </div>

          {/* NVIDIA AI Insight Synthesis Note */}
          <div className="mt-6 p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>NVIDIA AI Underwriting Insights (LLaMA 3.2 11B Vision Instruct)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              "Applicant shows disciplined historical credit repayments and stable home ownership. However, low liquid savings buffers paired with high monthly installment commitments push default risk to 21.52%. Recommend manual underwriter review to verify secondary collateral or co-signer before loan sanction."
            </p>
          </div>

          {/* Strict Separation of Concerns Callout */}
          <div className="mt-4 text-center">
            <p className="text-[11px] text-slate-400">
              The Logistic Regression model generates the risk probability and the application provides human-readable explanations.
              The generative AI model provides narrative synthesis and is never the primary decision authority.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================
          I. TECHNOLOGY STACK
          ================================================== */}
      <section id="technology" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-800/60">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-400 mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Modern Production Stack</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            Technology Stack
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Engineered with modern, reliable technologies across the entire application lifecycle.
          </p>
        </div>

        {/* Tech Stack Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Frontend */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                FE
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Frontend</h3>
                <span className="text-xs text-slate-400">Client-Side Architecture</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-brand-400" />
                <span>React 18 & TypeScript</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-brand-400" />
                <span>Vite Build Tooling</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-brand-400" />
                <span>Tailwind CSS</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-brand-400" />
                <span>Lucide React Icons</span>
              </li>
            </ul>
          </div>

          {/* Backend */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                BE
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Backend</h3>
                <span className="text-xs text-slate-400">High-Performance REST API</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-teal-400" />
                <span>Python 3.11</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-teal-400" />
                <span>FastAPI Framework</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-teal-400" />
                <span>Pydantic v2 Validation</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-teal-400" />
                <span>Uvicorn ASGI Server</span>
              </li>
            </ul>
          </div>

          {/* Machine Learning */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                ML
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Machine Learning</h3>
                <span className="text-xs text-slate-400">Statistical Modeling</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400" />
                <span>Scikit-learn</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400" />
                <span>Logistic Regression (C=0.1)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400" />
                <span>ColumnTransformer Pipeline</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400" />
                <span>Pandas & NumPy</span>
              </li>
            </ul>
          </div>

          {/* Database */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                DB
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Database</h3>
                <span className="text-xs text-slate-400">Persistent Relational Store</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400" />
                <span>PostgreSQL</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400" />
                <span>SQLAlchemy ORM</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400" />
                <span>Alembic Schema Migrations</span>
              </li>
            </ul>
          </div>

          {/* Authentication & Security */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                SEC
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Authentication</h3>
                <span className="text-xs text-slate-400">Identity & Access Control</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-rose-400" />
                <span>JWT (JSON Web Tokens)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-rose-400" />
                <span>bcrypt Password Hashing</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-rose-400" />
                <span>Role-Based Access Control (RBAC)</span>
              </li>
            </ul>
          </div>

          {/* AI Explanation & DevOps */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                OPS
              </div>
              <div>
                <h3 className="font-bold text-white text-base">AI & Deployment</h3>
                <span className="text-xs text-slate-400">LLM & Containerization</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-purple-400" />
                <span>NVIDIA AI Integration (LLaMA 3.2)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-purple-400" />
                <span>Docker & Docker Compose</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-purple-400" />
                <span>Nginx Reverse Proxy Ready</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ==================================================
          K. SECURITY SECTION
          ================================================== */}
      <section id="security" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-800/60">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-400 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Defensive Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            Secure by Design
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2">
            Authentication and authorization protect access to assessment and dashboard functionality.
          </p>
        </div>

        {/* 4 Security Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">JWT Authentication</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cryptographically signed tokens ensuring stateless, authenticated session authorization.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">bcrypt Password Hashing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              High-work-factor salted password hashes preventing credential leakage.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">Role-Based Access</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict tier enforcement: Viewers, Credit Officers, and System Administrators.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-4">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">Protected API Endpoints</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Input validation schemas, token verification, and defense against injection.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================
          L. CALL TO ACTION
          ================================================== */}
      <section id="cta" className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-950 via-slate-900 to-indigo-950 border border-brand-500/30 p-8 sm:p-14 text-center shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-500/20 border border-brand-500/40 text-brand-300 flex items-center justify-center mx-auto shadow-inner">
              <CreditCard className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Ready to Assess Credit Risk?
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Create an account and explore the ML-powered credit risk assessment platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
              {isAuthenticated ? (
                <button
                  onClick={onGoToDashboard}
                  className="w-full sm:w-auto px-8 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 text-sm sm:text-base transition-all cursor-pointer"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Go to Dashboard</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={onLogin}
                    className="w-full sm:w-auto px-8 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 text-sm sm:text-base transition-all cursor-pointer"
                  >
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onRegister}
                    className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 text-sm sm:text-base transition-all cursor-pointer"
                  >
                    <span>Create Account</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          M. FOOTER
          ================================================== */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800">
            {/* Identity */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/40 text-brand-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">
                  Credit Risk Scoring Engine
                </span>
                <span className="text-[11px] text-brand-400">Indian Edition</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300">
              <button onClick={() => scrollToSection('about')} className="hover:text-white transition-colors">
                About
              </button>
              <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">
                How It Works
              </button>
              <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">
                Features
              </button>
              <button onClick={() => scrollToSection('ml-engine')} className="hover:text-white transition-colors">
                ML Methodology
              </button>
              <button onClick={() => scrollToSection('technology')} className="hover:text-white transition-colors">
                Technology
              </button>
              {isAuthenticated ? (
                <button onClick={onGoToDashboard} className="hover:text-white font-bold text-brand-400 transition-colors">
                  Dashboard
                </button>
              ) : (
                <>
                  <button onClick={onLogin} className="hover:text-white transition-colors">
                    Login
                  </button>
                  <button onClick={onRegister} className="hover:text-white font-bold text-brand-400 transition-colors">
                    Sign Up
                  </button>
                </>
              )}
            </div>

            <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[11px] font-semibold text-slate-300">
              Educational / Research Project
            </div>
          </div>

          <div className="text-center max-w-3xl mx-auto space-y-3">
            <p className="text-slate-300 font-medium">
              ML-powered credit risk assessment and decision-support platform.
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              This system provides statistical predictions based on historical data and is not a guarantee of default. It is an educational/research project and requires appropriate legal, regulatory, fairness, and human-review controls before real-world lending use.
            </p>
            <p className="text-slate-400 text-[10px]">
              &copy; {new Date().getFullYear()} Credit Risk Scoring Engine — Indian Edition. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
