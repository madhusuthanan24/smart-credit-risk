# System Architecture — Smart Credit Risk Prediction Platform

## 1. Overview & Architectural Goals
The **Smart Credit Risk Prediction System** is an enterprise-grade full-stack platform designed for retail credit underwriting and automated default risk estimation. It combines a modern React + TypeScript single-page application (SPA), an asynchronous FastAPI REST backend, a persistent PostgreSQL database, and a calibrated machine learning engine based on historical German Credit origination data.

---

## 2. High-Level Architecture Flow

```text
  +-------------------------------------------------------------------------+
  |                             USER / BROWSER                              |
  +-------------------------------------------------------------------------+
                                       |
                         HTTP / JSON   |   (JWT Bearer Header)
                                       v
  +-------------------------------------------------------------------------+
  |                     FRONTEND CONTAINER (Nginx + React)                  |
  |  - React 18 + Vite SPA                                                  |
  |  - Role-Based Dynamic UI Routing (ADMIN, CREDIT_OFFICER, VIEWER)       |
  |  - Tailwind CSS + Lucide Icons + Recharts Data Visualizations           |
  |  - Reverse Proxy (/api/ -> Backend Container)                           |
  +-------------------------------------------------------------------------+
                                       |
                             Proxied   |   REST Requests
                                       v
  +-------------------------------------------------------------------------+
  |                     BACKEND CONTAINER (FastAPI + Uvicorn)               |
  |  - OpenAPI Docs (/docs)                                                 |
  |  - Security & Rate-Limiting Middleware (X-Frame-Options, Nosniff)       |
  |  - JWT Authentication & RBAC Guard Dependencies                       |
  |  - Structured Exception Handlers & Pydantic Validation                  |
  +-------------------------------------------------------------------------+
                        /              |              \
                       /               |               \
                      v                v                v
   +-----------------------+ +--------------------+ +---------------------+
   |   INFERENCE ENGINE    | | DATABASE SERVICES  | |   AUDIT LOGGING     |
   | - joblib Pipeline     | | - SQLAlchemy 2.x   | | - Event Recorder    |
   | - StandardScaler      | | - PostgreSQL DB    | | - LOGIN / LOGOUT    |
   | - OneHotEncoder       | | - Alembic DDL      | | - PREDICTION events |
   | - LogisticRegression  | | - Transactions     | | - USER creation     |
   | - Threshold (0.35)    | +--------------------+ +---------------------+
   +-----------------------+
```

---

## 3. Core Component Layer Breakdown

### A. Presentation Layer (React Frontend)
- **Framework**: Vite + React 18 + TypeScript.
- **Styling**: Tailwind CSS with dark/light theme switching.
- **State & Context**: `AuthContext` managing JWT token storage (`localStorage`), user profile state, and automatic session verification.
- **Routing & Guards**: `App.tsx` tab switching with RBAC permission checks (`canAccessTab`). Unauthenticated users are redirected to `Login.tsx`.

### B. Gateway & API Layer (FastAPI Backend)
- **ASGI Server**: Production Uvicorn with 4 worker processes.
- **Middleware**: CORS restriction via `FRONTEND_URL` settings, security response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
- **Dependencies**: `get_current_user` (JWT validation) and `require_role` (RBAC authorization).

### C. Machine Learning Engine
- **Preprocessor**: `models/preprocessing_pipeline.joblib` (`ColumnTransformer` with `StandardScaler` and `OneHotEncoder`).
- **Champion Model**: `models/final_model.joblib` (Tuned Logistic Regression, $C=0.1$, $max\_iter=1000$).
- **Threshold Config**: `models/threshold_config.json` ($optimal\_threshold = 0.35$).
- **Decision Engine**: Calculates default probability via `model.predict_proba()` and categorizes risk into `LOW RISK` ($p < 0.20$), `MODERATE RISK` ($0.20 \le p < 0.35$), or `HIGH RISK` ($p \ge 0.35$).

### D. Persistence Layer (PostgreSQL Database)
- **ORM**: SQLAlchemy 2.x declarative models (`User`, `Applicant`, `Assessment`, `AuditLog`).
- **Migrations**: Alembic migration tracking.
- **Transactions**: Atomic insert of `Applicant` record, `Assessment` record, and `AuditLog` entry upon prediction execution.

---

## 4. Container Network & Security Boundaries
- **Internal Network**: Docker bridge network `credit_risk_net`.
- **Database Exposure**: PostgreSQL runs on port 5432 bound within container network; production credentials passed via environment variables.
- **Storage Volume**: `postgres_data` volume ensures database state persists across container restarts.
