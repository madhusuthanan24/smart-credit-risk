# Smart Credit Risk Platform — API Reference Manual

**Base URL**: `http://localhost:8000/api`  
**Authentication**: Bearer Token (`Authorization: Bearer <JWT_ACCESS_TOKEN>`)  
**Format**: `application/json` (except PDF report downloads: `application/pdf`)  
**Correlation Header**: `X-Request-ID` (Returned on all responses)

---

## 1. Health & System Readiness

### `GET /health`
- **Purpose**: Root liveness probe for load balancers and container orchestrators.
- **Authentication**: None (Public)
- **Role**: Public
- **Response**: `200 OK`
  ```json
  {
    "status": "healthy",
    "api": true,
    "database": true,
    "model_loaded": true,
    "preprocessing_loaded": true,
    "threshold_loaded": true,
    "authentication": true,
    "threshold": 0.35
  }
  ```

### `GET /ready`
- **Purpose**: Deep readiness probe verifying database connectivity and loaded ML artifacts.
- **Authentication**: None (Public)
- **Role**: Public
- **Guarantee**: Does **not** execute model inference (`predict_proba`).
- **Response**: `200 OK` (or `503 Service Unavailable` if dependencies fail)
  ```json
  {
    "status": "ready",
    "database": "connected",
    "model": "loaded",
    "preprocessor": "loaded",
    "threshold_config": "loaded",
    "threshold": 0.35,
    "checks": {
      "database": true,
      "model": true,
      "preprocessor": true,
      "threshold": true
    }
  }
  ```

---

## 2. Authentication & User Management

### `POST /api/auth/register`
- **Purpose**: Register a new user account.
- **Authentication**: None (Public)
- **Role**: Public
- **Request Body**:
  ```json
  {
    "email": "analyst@bank.com",
    "password": "Password123!",
    "requested_role": "CREDIT_OFFICER",
    "invite_code": "OFFICER123KEY"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "access_token": "eyJhbGciOiJIUz...",
    "token_type": "bearer",
    "role": "CREDIT_OFFICER",
    "user": {
      "id": "uuid-string",
      "email": "analyst@bank.com",
      "role": "CREDIT_OFFICER",
      "is_active": true
    }
  }
  ```

### `POST /api/auth/login`
- **Purpose**: Authenticate user credentials and issue JWT access token.
- **Authentication**: None (Public, Rate-Limited: 10 attempts/min/IP)
- **Request Body**:
  ```json
  {
    "email": "analyst@bank.com",
    "password": "Password123!"
  }
  ```
- **Response**: `200 OK` (Tokens expire in 60 minutes)

### `GET /api/auth/me`
- **Purpose**: Fetch profile and role of currently authenticated session.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Response**: `200 OK`

---

## 3. Credit Risk Prediction

### `POST /api/predictions`
- **Purpose**: Run authoritative ML inference on a loan applicant, generate NVIDIA AI explanation, and persist the assessment record.
- **Authentication**: Required (Rate-Limited: 30 attempts/min/IP)
- **Role**: `ADMIN`, `CREDIT_OFFICER` (`VIEWER` receives `403 Forbidden`)
- **Request Body**:
  ```json
  {
    "applicant": {
      "status_checking_account": "A14",
      "duration_in_months": 12,
      "credit_history": "A32",
      "purpose": "A40",
      "credit_amount": 1500,
      "savings_account": "A65",
      "present_employment_since": "A74",
      "installment_rate": 2,
      "personal_status_sex": "A93",
      "other_debtors_guarantors": "A101",
      "present_residence_since": 4,
      "property": "A121",
      "age_in_years": 40,
      "other_installment_plans": "A143",
      "housing": "A152",
      "existing_credits": 1,
      "job": "A173",
      "num_people_liable": 1,
      "telephone": "A192",
      "foreign_worker": "A201"
    }
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "prediction_id": "3e640d9f-...",
    "applicant_id": "837f2d06-...",
    "default_probability": 0.0286,
    "default_probability_pct": "2.86%",
    "predicted_class": 0,
    "decision_threshold": 0.35,
    "risk_category": "LOW RISK",
    "credit_decision": "GOOD CREDIT / APPROVED",
    "model_name": "Tuned Logistic Regression",
    "model_version": "1.0.0",
    "risk_factors": [],
    "protective_factors": ["No Checking Account", "Short Loan Horizon (12M)"],
    "ai_explanation": "The applicant exhibits strong liquidity...",
    "ai_summary": "Application falls comfortably within approval threshold...",
    "ai_insights": ["Approve standard terms..."],
    "ai_provider": "NVIDIA LLaMA 3.2 11B / Deterministic Fallback"
  }
  ```

### `GET /api/predictions`
- **Purpose**: Paginated list of historical credit assessments with multi-parameter filtering.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Query Parameters**: `page` (default 1), `page_size` (default 20), `risk_category`, `prediction`, `date_from`, `date_to`.
- **Response**: `200 OK` (Array of `AssessmentSummaryItem`)

### `GET /api/predictions/{assessment_id}`
- **Purpose**: Retrieve full details of an assessment including 20 applicant attributes and AI explanation.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Response**: `200 OK`

---

## 4. Credit Risk Simulator

### `POST /api/simulate`
- **Purpose**: Perform counterfactual what-if simulation by modifying applicant features.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Guarantee**: Memory-only execution; does **not** persist or overwrite database assessments.
- **Request Body**:
  ```json
  {
    "original_applicant": { ... },
    "modifications": {
      "credit_amount": 9000,
      "duration_in_months": 48
    }
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "original": {
      "default_probability": 0.0286,
      "risk_category": "LOW RISK",
      "threshold": 0.35
    },
    "simulated": {
      "default_probability": 0.4120,
      "risk_category": "HIGH RISK",
      "threshold": 0.35
    },
    "difference": {
      "probability_difference": 0.3834,
      "probability_points": 38.34,
      "direction": "higher"
    },
    "risk_changed": true,
    "original_risk": "LOW RISK",
    "simulated_risk": "HIGH RISK",
    "changes_summary": [
      {
        "field": "credit_amount",
        "field_label": "Credit Amount",
        "original_value": 1500,
        "simulated_value": 9000
      }
    ],
    "ai_explanation": "The simulated increase in duration and amount elevates default risk across the threshold..."
  }
  ```

---

## 5. Automated PDF Assessment Reports

### `GET /api/reports/assessment/{assessment_id}`
- **Purpose**: Download a finalized vector PDF assessment report generated from verified database records.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`
- **Response**: `200 OK` (`Content-Type: application/pdf`, binary stream)

### `POST /api/reports/assessment/{assessment_id}/with-simulation`
- **Purpose**: Generate an assessment report augmented with a side-by-side what-if simulation section.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`
- **Request Body**: `SimulationRequest`
- **Response**: `200 OK` (`Content-Type: application/pdf`)

---

## 6. Model Monitoring & Data Drift

### `GET /api/monitoring/overview`
- **Purpose**: Prediction throughput, risk distribution, probability histogram, and threshold metrics.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Query Parameters**: `days` (Optional: 7, 30, 90)
- **Response**: `200 OK`

### `GET /api/monitoring/drift`
- **Purpose**: Population Stability Index (PSI) calculations for all 20 features against reference training data.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Response**: `200 OK`

### `GET /api/monitoring/performance`
- **Purpose**: Model discrimination metrics (ROC-AUC, Precision, Recall) when ground truth default labels are available.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Response**: `200 OK` (Gracefully returns `INSUFFICIENT_OUTCOME_DATA` when outcomes have not matured)

---

## 7. Algorithmic Fairness & Model Governance

### `GET /api/governance/overview`
- **Purpose**: Cryptographic checksum verification of model artifacts, locked threshold certification, and checklist.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Response**: `200 OK`

### `GET /api/governance/groups`
- **Purpose**: Group-level probability and risk distribution analysis across available proxy demographic features.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Query Parameters**: `feature` (default: `age_in_years`), `min_sample_size` (default: 20)
- **Response**: `200 OK`

### `GET /api/governance/limitations`
- **Purpose**: Explicit catalog of known model limitations, data availability boundaries, and responsible AI disclosures.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Response**: `200 OK`

---

## 8. Executive Decision Intelligence & Analytics

### `GET /api/analytics/overview`
- **Purpose**: High-level portfolio KPIs, approval rates, average exposure, and distribution overview.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Query Parameters**: `days`, `risk_category`, `start_date`, `end_date`
- **Response**: `200 OK`

### `GET /api/analytics/trends`
- **Purpose**: Time-series assessment volume and default probability trendlines.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Query Parameters**: `period` (`today`, `7d`, `30d`, `all`), `risk_category`
- **Response**: `200 OK`

### `GET /api/analytics/risk-distribution`
- **Purpose**: Filtered risk category counts and percentages.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Response**: `200 OK`

### `GET /api/analytics/probability-distribution`
- **Purpose**: Default probability distribution histogram grouped into 10% risk bands.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Response**: `200 OK`

### `GET /api/analytics/concentration`
- **Purpose**: Risk concentration analysis across dimensions (`age_bracket`, `housing`, `employment`, `job`).
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Response**: `200 OK`

### `GET /api/analytics/monitoring`
- **Purpose**: Executive snapshot of prediction health and feature drift.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Response**: `200 OK`

### `GET /api/analytics/governance`
- **Purpose**: Executive snapshot of governance verification and artifact integrity.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Response**: `200 OK`

### `POST /api/analytics/ai-summary`
- **Purpose**: Narrative portfolio summary via NVIDIA AI Layer with deterministic fallback.
- **Authentication**: Required
- **Role**: `ADMIN`, `CREDIT_OFFICER`, `VIEWER`
- **Response**: `200 OK`

---

## 9. Admin Control Center (Strictly ADMIN-Only)

### `GET /api/admin/overview`
- **Purpose**: System-wide administrative KPIs: user counts by role, assessment totals, security telemetry.
- **Authentication**: Required
- **Role**: `ADMIN` (`CREDIT_OFFICER` & `VIEWER` receive `403 Forbidden`)
- **Response**: `200 OK`

### `GET /api/admin/users`
- **Purpose**: Paginated list of registered users with role and activity filters.
- **Authentication**: Required
- **Role**: `ADMIN`
- **Response**: `200 OK`

### `POST /api/admin/users`
- **Purpose**: Provision a new staff user directly without invite codes.
- **Authentication**: Required
- **Role**: `ADMIN`
- **Response**: `201 Created`

### `PATCH /api/admin/users/{user_id}`
- **Purpose**: Update user role or active status.
- **Authentication**: Required
- **Role**: `ADMIN`
- **Safeguard**: Rejects self-demotion or self-deactivation with `400 Bad Request`.
- **Response**: `200 OK`

### `GET /api/admin/audit`
- **Purpose**: Searchable, paginated audit log of system events.
- **Authentication**: Required
- **Role**: `ADMIN`
- **Response**: `200 OK`

### `GET /api/admin/security`
- **Purpose**: Security telemetry: successful vs. failed logins, rate-limit status.
- **Authentication**: Required
- **Role**: `ADMIN`
- **Response**: `200 OK`

### `GET /api/admin/model-status`
- **Purpose**: Read-only artifact status and integrity certification.
- **Authentication**: Required
- **Role**: `ADMIN`
- **Response**: `200 OK`

### `GET /api/admin/health`
- **Purpose**: In-depth platform health diagnostics across database, API, artifacts, and AI services.
- **Authentication**: Required
- **Role**: `ADMIN`
- **Response**: `200 OK`
