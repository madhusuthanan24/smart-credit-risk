# Smart Credit Risk Prediction Platform

An enterprise-grade, end-to-end full-stack credit risk scoring platform built with a **React + TypeScript + Vite** frontend, a **FastAPI** REST backend, a **PostgreSQL** database with **Alembic** migrations, **JWT authentication & Role-Based Access Control (RBAC)**, and a calibrated **Machine Learning prediction engine** based on historical German Credit origination data.

---

## 🌟 Key Features

- **Machine Learning Core**: Tuned Logistic Regression model ($C=0.1$, $max\_iter=1000$) achieving ROC-AUC **0.8095**, PR-AUC **0.6584**, and Brier score **0.1546**.
- **Calibrated Decision Cutoff**: Optimal decision threshold set dynamically to **0.35**, capturing **76.67% of default applicants** (Recall) and reducing expected portfolio financial loss by **37.6%**.
- **Full-Stack Architecture**: React 18 + Vite SPA frontend communicating asynchronously with FastAPI REST backend endpoints.
- **Enterprise Security**: JWT token authentication, bcrypt password hashing, CORS protection, HTTP security response headers (`X-Frame-Options`, `X-Content-Type-Options`), and in-memory IP rate limiting.
- **Role-Based Access Control (RBAC)**:
  - `ADMIN`: Complete system administrative access including User Management (`/users`) and Audit Logs (`/audit`).
  - `CREDIT_OFFICER`: Full underwriting capability (New Assessment, History, Analytics, Model Info).
  - `VIEWER`: Read-only access to Dashboard, Assessment History, and Model Info (`POST /api/predictions` returns 403 Forbidden).
- **PostgreSQL Persistence & Alembic Migrations**: Atomic transactions storing applicant disclosures, model outputs, and audit logs.
- **Explainable Underwriting**: Feature importance explanations and protective vs. risk-increasing factor breakdowns for Adverse Action disclosures.
- **Containerized Deployment**: Multi-stage Docker Compose setup (`postgres:16`, `backend`, `frontend` Nginx).

---

## 🏗️ System Architecture

```text
  React 18 SPA (Vite + Tailwind)
               │
      (JWT Bearer Header)
               ▼
  FastAPI Backend (Uvicorn ASGI)
        ┌──────┴──────┐
        ▼             ▼
   ML Engine     PostgreSQL DB
 (LogisticReg)   (Alembic DDL)
```

For detailed architectural diagrams and data flow specifications, see [docs/architecture.md](docs/architecture.md).

---

## 🚀 Quick Start & Local Development

### 1. Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 16+ (or local SQLite fallback)
- Docker & Docker Compose (optional for containerized setup)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure configuration keys are set:
```ini
DATABASE_URL=postgresql+psycopg://postgres:postgrespassword@localhost:5432/credit_risk
SECRET_KEY=smart_credit_risk_secret_key_change_in_production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
FRONTEND_URL=http://localhost:5173,http://localhost:3000
```

### 3. Backend Setup
```bash
# Activate virtual environment
credit-risk/Scripts/activate

# Install dependencies
pip install -r requirements.txt

# Run Alembic migrations
python -m alembic upgrade head

# Launch FastAPI backend dev server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive Swagger API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- React SPA Dashboard: [http://localhost:5173](http://localhost:5173)

### 5. Role-Focused Authentication Portals
- **Public Viewer Portal** (`/viewer/login`): Main default landing page for read-only access.
- **Hidden Staff Gateway** (`/staff`): Discovered via the **5-tap gesture** on the top logo icon (or discreet staff link).
- **Credit Officer Portal** (`/credit-officer/login`): Loan assessment workflow. Staff registration requires `OFFICER123KEY`.
- **System Admin Portal** (`/admin/login`): User management and audit logs. Admin registration requires `ADMIN123KEY`.
- **Backend Portal Guard**: Strict role validation rejects mismatched access attempts with HTTP 403 Forbidden.

---

## 🐳 Docker Deployment

To launch the complete containerized stack (PostgreSQL + FastAPI + Nginx React Frontend):

```bash
docker-compose up --build
```

- React Application: [http://localhost:3000](http://localhost:3000)
- FastAPI REST Backend: [http://localhost:8000](http://localhost:8000)
- Swagger OpenAPI Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧪 Testing & Quality Assurance

Run the comprehensive 42-test automated suite covering Authentication, Role-Based Access Control, Portal Verification, Database Operations, API Endpoints, and ML Model Predictions:

```bash
credit-risk/Scripts/python.exe -m unittest backend/tests/test_auth.py backend/tests/test_database.py backend/tests/test_api.py tests/test_predict.py
```

### Build Production Bundle Test
```bash
npm run build --prefix frontend
```

---

## 📖 API Endpoints Reference

| Endpoint | Method | Role Required | Description |
| :--- | :---: | :---: | :--- |
| `/api/auth/register` | `POST` | Public | Register new user (default `VIEWER` role) |
| `/api/auth/login` | `POST` | Public | Authenticate user & obtain JWT token |
| `/api/auth/me` | `GET` | Authenticated | Retrieve current user profile |
| `/api/predictions` | `POST` | `ADMIN`, `CREDIT_OFFICER` | Execute real ML credit risk assessment |
| `/api/predictions` | `GET` | Authenticated | Paginated credit assessment history |
| `/api/predictions/{id}` | `GET` | Authenticated | Detailed applicant assessment breakdown |
| `/api/dashboard/summary` | `GET` | Authenticated | Dynamic database dashboard summary |
| `/api/analytics/overview` | `GET` | `ADMIN`, `CREDIT_OFFICER` | Portfolio analytics & distributions |
| `/api/audit/logs` | `GET` | `ADMIN` | System audit logs feed |
| `/api/users` | `GET/POST/PATCH` | `ADMIN` | User account & role administration |
| `/api/health` | `GET` | Public | System component health check |

---

## 💾 Database Backup & Restore

See [docs/backup_restore.md](docs/backup_restore.md) for full commands:
```bash
# Backup
docker exec -t credit_risk_postgres pg_dump -U postgres -d credit_risk -F c -b -f /tmp/backup.dump

# Restore
docker exec -t credit_risk_postgres pg_restore -U postgres -d credit_risk -v --clean /tmp/backup.dump
```

---

## 🛡️ Governance & Educational Disclaimer

> **IMPORTANT NOTICE**:
> This platform is an educational and research statistical prediction system based on historical credit origination data (German Credit Dataset). It is not an automated legally binding lending decision system. Real-world lending operations require compliance with applicable banking regulations, demographic fairness auditing, and mandatory human underwriter review prior to decision execution.
