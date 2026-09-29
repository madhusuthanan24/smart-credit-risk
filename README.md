# Smart Credit Risk Platform

[![Production Status](https://img.shields.io/badge/Status-Production%20Ready-emerald.svg)](#)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](#)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](#)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript%20%7C%20Vite-61DAFB.svg)](#)
[![ML Engine](https://img.shields.io/badge/ML%20Engine-Calibrated%20Logistic%20Regression-orange.svg)](#)
[![Cutoff Threshold](https://img.shields.io/badge/Decision%20Cutoff-0.35%20(Locked)-purple.svg)](#)
[![Explainability](https://img.shields.io/badge/Explainability-NVIDIA%20LLaMA%203.2-76B900.svg)](#)
[![Tests](https://img.shields.io/badge/Tests-207%2F207%20Passing-brightgreen.svg)](#)

An enterprise-grade, full-stack Credit Risk Prediction, Explainability, and Model Governance Platform. Built with a calibrated machine learning engine, an NVIDIA AI-powered explainability layer, what-if credit risk simulation, automated regulatory audit reports, continuous drift monitoring, algorithmic fairness governance, executive analytics, and hardened administrative controls.

---

## Table of Contents
1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Key Features](#3-key-features)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [ML Pipeline & Prediction Authority](#6-ml-pipeline--prediction-authority)
7. [NVIDIA AI Explainability Layer](#7-nvidia-ai-explainability-layer)
8. [Authentication & Role-Based Access Control (RBAC)](#8-authentication--role-based-access-control-rbac)
9. [Credit Risk Simulator](#9-credit-risk-simulator)
10. [Automated Credit Assessment Reports](#10-automated-credit-assessment-reports)
11. [Model Monitoring & Data Drift Detection](#11-model-monitoring--data-drift-detection)
12. [Fairness & Model Governance](#12-fairness--model-governance)
13. [Admin Control Center](#13-admin-control-center)
14. [Executive Decision Intelligence & Analytics](#14-executive-decision-intelligence--analytics)
15. [Production Hardening & Reliability](#15-production-hardening--reliability)
16. [Docker & Containerized Deployment](#16-docker--containerized-deployment)
17. [Environment Variables](#17-environment-variables)
18. [Installation & Setup](#18-installation--setup)
19. [Running Locally](#19-running-locally)
20. [Running the Test Suite](#20-running-the-test-suite)
21. [API Documentation](#21-api-documentation)
22. [Backup & Disaster Recovery](#22-backup--disaster-recovery)
23. [Known Limitations & Responsible AI Boundaries](#23-known-limitations--responsible-ai-boundaries)

---

## 1. Problem Statement

Commercial retail and SME lending face a critical operational dilemma:
- **Default Risk**: Incorrectly extending credit to high-risk applicants triggers severe loan charge-offs and capital depletion.
- **Lost Revenue**: Overly conservative underwriting turns away creditworthy borrowers and damages institutional market share.
- **Regulatory Onerousness**: Consumer credit regulations (such as the Equal Credit Opportunity Act and Fair Credit Reporting Act) mandate transparent, explainable Adverse Action notices for rejected applicants.
- **Black-Box AI Fragility**: Large Language Models cannot be entrusted with autonomous lending decisions due to hallucinations, stochastic unpredictability, and uncalibrated risk probabilities.

---

## 2. Solution Overview

The **Smart Credit Risk Platform** implements a clear separation of concerns:
1. **Mathematical Prediction Authority**: A frozen, calibrated local Machine Learning model (`scikit-learn`) is the **sole decision authority**, delivering deterministic default probabilities and applying an optimal cost-sensitive threshold ($0.35$).
2. **Generative Explainability Layer**: The **NVIDIA AI Layer** (utilizing `meta/llama-3.2-11b-vision-instruct` via the NVIDIA API Catalog) generates contextual underwriting narratives, adverse action justifications, and protective factor breakdowns, backed by a deterministic regulatory ruleset fallback.
3. **Comprehensive Governance**: Integrated drift monitoring, fairness parity metrics, interactive scenario simulation, executive portfolio analytics, and automated immutable PDF report generation.

---

## 3. Key Features

- **Authoritative ML Inference**: Predicts default probability using 20 UCI German Credit applicant financial and biographical attributes.
- **Cost-Optimized Cutoff**: Decision threshold dynamically locked at **0.35**, capturing **76.67% of default applicants** and reducing loan loss exposure by **37.6%** compared to a naive 0.50 threshold.
- **NVIDIA AI Underwriting Summaries**: Generates executive narrative summaries, borderline condition alerts, and mitigating factor breakdowns with zero external decision authority.
- **Interactive Credit Risk Simulator**: Real-time counterfactual simulation allowing credit officers to evaluate how modifying income, duration, loan amount, or collateral affects risk without mutating production records.
- **Enterprise PDF Assessment Reports**: Two-pass vector PDF generator rendering applicant profiles, model probabilities, decision thresholds, risk drivers, and disclaimers.
- **Continuous Drift Monitoring**: Real-time tracking of prediction volume, default probability distributions, and feature population stability index (PSI).
- **Algorithmic Fairness & Governance**: Descriptive demographic parity, sample guardrails ($N \ge 20$), and cryptographic model artifact checksum verification.
- **Executive Analytics**: Interactive portfolio metrics, probability histograms, risk concentrations, and 30-day temporal trend tracking.
- **Admin Control Center**: User lifecycle management, platform health telemetry, rate limiting, and immutable audit logs.
- **Enterprise Security**: Request ID correlation (`X-Request-ID`), strict CORS origins, security response headers, and structured error responses.

---

## 4. System Architecture

```text
                    React Frontend (SPA)
             (TypeScript + Vite + Tailwind CSS)
                             │
                     (JWT Bearer Token)
                             ▼
                    FastAPI REST Backend
  ┌──────────────────────────┴──────────────────────────┐
  │                                                     │
  ▼                                                     ▼
Credit ML Engine                              NVIDIA AI Layer
├── final_model.joblib (LogisticReg)          ├── LLaMA 3.2 11B Vision Instruct
├── preprocessing_pipeline.joblib             ├── Assessment Narrative
└── threshold_config.json (0.35)              ├── Underwriter Insights
  │                                           └── Deterministic Ruleset Fallback
  │                                                     │
  └──────────────────────────┬──────────────────────────┘
                             │
                             ▼
               PostgreSQL / SQLite Database
               ├── users (RBAC & Provisioning)
               ├── applicants (20 Origination Features)
               ├── assessments (Predictions & AI Explanations)
               └── audit_logs (Event Telemetry)
```

---

## 5. Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2, Starlette |
| **Database & ORM** | PostgreSQL 16 (Production) / SQLite3 (Dev/Test), SQLAlchemy 2.0, Alembic |
| **Machine Learning** | Scikit-learn 1.4+, Pandas, NumPy, Joblib, SciPy |
| **Generative AI** | NVIDIA API Catalog (`meta/llama-3.2-11b-vision-instruct`), HTTPX |
| **PDF Reporting** | ReportLab 4.0+ (Custom vector canvas, two-pass pagination) |
| **DevOps & Containers** | Docker (Multi-stage build), Docker Compose, Nginx Reverse Proxy |

---

## 6. ML Pipeline & Prediction Authority

### Authoritative Artifacts
- **Model**: `models/final_model.joblib` (Tuned Logistic Regression with balanced class weights)
  - SHA-256: `7FCC6EC2B5E481EEA9A6BE007CC7679E28F9ABACAE8D4DBDA19BA5C18EB3C768`
- **Preprocessor**: `models/preprocessing_pipeline.joblib` (One-Hot Encoder + StandardScaler)
  - SHA-256: `8B0BB086C63FDB928E0D5840FB9B29B23A75F638665A86915B17A7E46984288A`
- **Threshold Config**: `models/threshold_config.json`
  - SHA-256: `13FD9163C88B4109B5BFE479898F3D65E40137FABF3BF0A102F2CAA491F94EAC`
  - **Optimal Cutoff Threshold**: `0.35`

### Risk Classification Thresholds
$$\text{Risk Category} = \begin{cases} 
\text{LOW RISK (Approved)} & \text{if } P(\text{default}) < 0.20 \\
\text{MODERATE RISK (Manual Review)} & \text{if } 0.20 \le P(\text{default}) < 0.35 \\
\text{HIGH RISK (Rejected)} & \text{if } P(\text{default}) \ge 0.35 
\end{cases}$$

---

## 7. NVIDIA AI Explainability Layer

The NVIDIA AI layer transforms raw model weights and input attributes into professional underwriting narratives.

- **Model Endpoint**: `meta/llama-3.2-11b-vision-instruct` via `https://integrate.api.nvidia.com/v1`
- **Strict Boundary**: The AI layer receives pre-computed inference outputs from the ML engine. It is mathematically incapable of changing probabilities, thresholds, or decisions.
- **Fail-Safe Deterministic Fallback**: In the event of network disruption, rate limits, timeouts, or missing API keys, the system instantly engages a deterministic underwriting ruleset (`regulatory-ruleset-v1`), ensuring 100% platform availability.

---

## 8. Authentication & Role-Based Access Control (RBAC)

The platform provides strict role-based authorization enforced via JWT tokens and backend FastAPI dependencies:

| Role | Accessible Views | Permissions |
| :--- | :--- | :--- |
| **`ADMIN`** | All views (Dashboard, New Assessment, History, Simulator, Reports, Analytics, Monitoring, Governance, Admin Center, Audit, Users) | Full platform administration, user provisioning, security audits. |
| **`CREDIT_OFFICER`** | Dashboard, New Assessment, History, Simulator, Reports, Analytics, Monitoring, Governance | Submit new loan applications, execute simulations, download PDF reports. |
| **`VIEWER`** | Dashboard, History, Simulator (Read), Analytics, Monitoring, Governance | Read-only inspection. Cannot create assessments or modify users. |

---

## 9. Credit Risk Simulator

The simulator provides interactive what-if analysis:
- Allows credit officers to toggle financial features (loan duration, requested amount, savings bracket, collateral).
- Instantly computes new probabilities and calculates the **probability delta** ($\Delta P$).
- Highlights risk category transitions (e.g. `HIGH RISK` $\rightarrow$ `MODERATE RISK`).
- **Guarantee**: Simulations run exclusively in memory and **never overwrite** or persist production assessment records.

---

## 10. Automated Credit Assessment Reports

Automated vector PDF reports can be generated on demand for any historical assessment:
- **Contents**: Full applicant profile, ML prediction, calibrated default probability, 0.35 threshold reference, risk/protective factor breakdown, NVIDIA underwriting narrative, and regulatory disclaimers.
- **Two-Pass Dynamic Layout**: ReportLab vector layout with running headers, footers, confidentiality notices, and exact page numbering (`Page X of Y`).
- **Security Audit**: PDF streams are sanitized to prevent the inclusion of API keys, JWT tokens, database connection strings, or system paths.

---

## 11. Model Monitoring & Data Drift Detection

Tracks production inference health against baseline training distributions:
- **Prediction Volume**: Real-time throughput metrics (today, 7 days, 30 days, all-time).
- **Population Stability Index (PSI)**: Monitors continuous numerical and categorical feature shifts.
  - $\text{PSI} < 0.10$: Low drift (stable)
  - $0.10 \le \text{PSI} \le 0.25$: Moderate drift (investigate)
  - $\text{PSI} > 0.25$: High drift (significant population shift)
- **Outcome Data Safeguard**: Clearly flags when ground-truth default outcomes are unavailable, preventing fabricated performance metrics.

---

## 12. Fairness & Model Governance

Provides transparent compliance and algorithmic accountability:
- **Cryptographic Verification**: Continuously validates SHA-256 checksums of production model files.
- **Threshold Lock**: Formally certifies the 0.35 decision cutoff cannot be mutated via runtime API calls.
- **Sample Guardrail**: Suppresses disparity calculations when subgroup sample size $N < 20$ to prevent statistical noise.
- **Limitations Transparency**: Displays explicit disclosures regarding model boundaries and dataset scope.

---

## 13. Admin Control Center

Administrative command center restricted strictly to `ADMIN` accounts:
- **User Management**: Provision new staff accounts, deactivate rogue users, manage roles.
- **Self-Protection Safety**: Built-in backend safeguards prevent administrators from accidentally demoting, deactivating, or deleting their own account.
- **Audit Logging**: Structured query interface for system events, authorization attempts, and prediction requests.
- **Platform Telemetry**: Real-time diagnostic evaluation of database latency, ML artifact readiness, and API health.

---

## 14. Executive Decision Intelligence & Analytics

Tailored executive dashboard for portfolio risk managers:
- **Portfolio KPIs**: Aggregate exposure, approval rate, average default probability.
- **Temporal Trends**: Volume and risk-mix trendlines across 7-day, 30-day, and all-time windows.
- **Risk Concentrations**: Multi-dimensional cross-tabulations across age brackets, housing types, and employment tenures.
- **Integrated Snapshots**: Synchronized feeds from monitoring and governance subsystems.

---

## 15. Production Hardening & Reliability

Hardened in accordance with enterprise production standards:
- **Startup Validation**: In production mode (`ENVIRONMENT=production`), the backend halts immediately if `SECRET_KEY` is a default placeholder or shorter than 32 characters, or if wildcard `*` CORS is detected.
- **Request Correlation**: Automatically assigns and propagates a unique UUID `X-Request-ID` across all HTTP response headers and application logs.
- **Security Headers**: Standard injection of `nosniff`, `DENY`, `strict-origin-when-cross-origin`, and `X-XSS-Protection`.
- **Database Connection Pooling**: PostgreSQL pool configured with `pool_size=10`, `max_overflow=20`, `pool_recycle=1800`, and `pool_pre_ping=True`.
- **Composite Indexing**: Optimized multi-column indexes across `assessments`, `audit_logs`, and `users`.
- **Structured Error Responses**: Clean error schemas (`VALIDATION_ERROR`, `HTTP_404`, `INTERNAL_SERVER_ERROR`) preventing Python traceback leaks.

---

## 16. Docker & Containerized Deployment

The platform is fully containerized using Docker and Docker Compose:
- **Backend**: Non-root container (`appuser`), multi-worker Uvicorn ASGI server, built-in container health check.
- **Frontend**: Multi-stage build (Node 20 Alpine $\rightarrow$ Nginx Alpine) serving static assets with security headers and API reverse proxying.
- **Database**: PostgreSQL 16 container with health check dependencies and volume persistence.
- **Clean Context**: Strict `.dockerignore` filters out `.env`, local SQLite databases, virtual environments, and node modules.

---

## 17. Environment Variables

Create a `.env` file in the project root:

```ini
# Application Environment (production, development, test)
ENVIRONMENT=development

# Database Connection (PostgreSQL for Docker/Production, SQLite for local dev)
DATABASE_URL=sqlite:///./smart_credit.db

# JWT & Security Configuration (Must be >= 32 characters in production)
SECRET_KEY=smart_credit_risk_secret_key_change_in_production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Allowed Frontend Origins (Comma-separated)
FRONTEND_URL=http://localhost:5173,http://localhost:3000

# Staff Provisioning Invite Codes
ADMIN_INVITE_CODE=ADMIN123KEY
CREDIT_OFFICER_INVITE_CODE=OFFICER123KEY

# ML Model Paths
MODEL_PATH=models/final_model.joblib
PREPROCESSOR_PATH=models/preprocessing_pipeline.joblib
THRESHOLD_PATH=models/threshold_config.json
METADATA_PATH=models/final_model_metadata.json

# NVIDIA AI Explainability Layer
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_MODEL=meta/llama-3.2-11b-vision-instruct
NVIDIA_API_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_TIMEOUT_SECONDS=20.0
```

---

## 18. Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ (LTS recommended)
- Git

### 1. Clone Repository
```bash
git clone https://github.com/your-org/smart-credit-risk.git
cd smart-credit-risk
```

### 2. Backend Environment Setup
```bash
# Create virtual environment
python -m venv credit-risk

# Activate virtual environment
# Windows PowerShell:
.\credit-risk\Scripts\Activate.ps1
# Linux / macOS:
source credit-risk/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Database Migration
```bash
python -m alembic upgrade head
```

### 4. Frontend Environment Setup
```bash
cd frontend
npm install
cd ..
```

---

## 19. Running Locally

### Start Backend Server
```bash
# From project root with virtual environment activated:
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Health Probe: `http://localhost:8000/health`
- Readiness Probe: `http://localhost:8000/ready`

### Start Frontend Dev Server
```bash
cd frontend
npm run dev
```
- SPA UI: `http://localhost:5173`

### Run with Docker Compose
```bash
docker compose up --build
```
- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:8000`

---

## 20. Running the Test Suite

The platform includes 207 automated tests covering unit, regression, RBAC, integration, and ML inference suites:

```bash
# 1. Run all backend unit and integration tests (202 tests)
python -m unittest discover -s backend/tests -p "test_*.py"

# 2. Run core ML prediction and calibration tests (5 tests)
python -m unittest tests/test_predict.py

# 3. Run frontend TypeScript type checking and production build
cd frontend
npm run build
```

---

## 21. API Documentation

Detailed interactive Swagger and ReDoc documentation are automatically served at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

For the complete endpoint specifications, request payloads, and status codes, see [docs/API.md](docs/API.md).

---

## 22. Backup & Disaster Recovery

The platform includes formal enterprise backup and recovery documentation. For details on compressed database snapshots, RTO/RPO targets, and Alembic rollback strategies, see [docs/backup_and_recovery.md](docs/backup_and_recovery.md).

---

## 23. Known Limitations & Responsible AI Boundaries

1. **Human Underwriter Oversight**: The system is designed as a Decision Support System (DSS). It does **not** make autonomous, unattended credit approvals or rejections without human underwriting review.
2. **Dataset Specificity**: The predictive model was trained on historical retail credit data (UCI German Credit Dataset). Model retraining and validation on local geographic data must be performed before commercial deployment.
3. **Outcome Delays**: Real-world default outcomes take 12–36 months to mature. Performance metrics (ROC-AUC, Precision, Recall) cannot be computed on newly originated loans until default observations are recorded.
4. **NVIDIA AI Independence**: The NVIDIA AI narrative layer is purely explanatory. If the external AI service times out or becomes unreachable, the platform defaults safely to internal deterministic rule generation.
