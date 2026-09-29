# Smart Credit Risk Platform — Engineering Portfolio Summary

## 1. Project Overview

The **Smart Credit Risk Platform** is an enterprise-grade full-stack machine learning system developed to address real-world financial risk modeling, automated regulatory compliance, and responsible AI explainability.

The platform bridges the gap between statistical machine learning models and operational lending workflows by providing an authoritative prediction engine paired with an NVIDIA-powered explainability layer, interactive what-if simulation, regulatory PDF reporting, real-time drift monitoring, and algorithmic fairness governance.

---

## 2. Problem Solved

Traditional financial institutions struggle with two competing imperatives:
1. **Financial Loss Mitigation**: Lending to credit applicants with high likelihood of default leads to catastrophic portfolio write-downs. Naive 50% classification cutoffs fail to balance the asymmetrical cost of default vs. false rejection.
2. **Regulatory & Explainability Mandates**: Regulatory frameworks (e.g., Fair Credit Reporting Act, Equal Credit Opportunity Act) mandate detailed adverse action disclosures for loan rejections. Generative AI models alone cannot be trusted to make lending decisions due to hallucinations and non-deterministic behavior.

The Smart Credit Risk Platform solves this through a rigorous dual-layer architecture:
- **Local ML Engine**: Acts as the sole mathematical decision authority.
- **NVIDIA AI Layer**: Acts exclusively as an explainability and translation engine.

---

## 3. Major Engineering Highlights

### Full-Stack Architecture
- **Frontend**: Modern Single Page Application built with React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, and Recharts.
- **Backend**: High-performance asynchronous REST API built with Python 3.11+, FastAPI, Uvicorn, and Pydantic v2.
- **Database**: Relational database persistence using PostgreSQL 16 (with connection pooling) and SQLite3 fallback, managed with Alembic schema migrations.

### Cost-Optimized Machine Learning Engine
- **Algorithm**: Tuned Logistic Regression (`C=0.1`, balanced class weights) trained on historical German Credit data.
- **Metrics**: **ROC-AUC: 0.8095**, **PR-AUC: 0.6584**, **Brier Score: 0.1546**.
- **Calibrated Cutoff**: Decision threshold optimized to **0.35** using an empirical cost-loss matrix (misclassification of default penalized 5:1 vs. false rejection), capturing **76.7% of defaulters** and reducing expected loan loss by **37.6%**.

### Generative AI Explainability with Deterministic Fallback
- Integrates `meta/llama-3.2-11b-vision-instruct` via the NVIDIA API Catalog.
- Converts complex model coefficients and applicant parameters into plain-language underwriting narratives and protective factor summaries.
- Equipped with an automated fail-safe that engages a deterministic ruleset if external API calls encounter network timeouts or errors.

### Interactive What-If Risk Simulator
- Allows underwriting officers to evaluate loan restructuring scenarios in real time.
- Calculates probability deltas ($\Delta P$) and risk tier migrations across modified financial parameters.
- Operates strictly in memory to guarantee zero persistence or pollution of production database records.

### Automated Regulatory PDF Reporting
- Custom two-pass vector PDF generator built with ReportLab.
- Generates dynamic, multi-page audit reports with running headers, footers, confidentiality markings, and exact page numbering (`Page X of Y`).
- Fully sanitized to ensure zero credentials or internal system parameters are leaked in generated documents.

### Continuous Drift Monitoring & Governance
- **Data Drift**: Real-time Population Stability Index (PSI) calculation across all 20 applicant origination features.
- **Algorithmic Fairness**: Demographic parity analytics with sample size guardrails ($N \ge 20$) to prevent statistical distortion on small subgroups.
- **Integrity Certification**: Automated verification of model artifact SHA-256 checksums on startup and runtime health checks.

### Hardened Production Security & Administration
- **RBAC**: Three-tier role-based access control (`ADMIN`, `CREDIT_OFFICER`, `VIEWER`).
- **Audit Trails**: Complete chronological audit logging for all critical system actions.
- **Request Tracing**: Automated `X-Request-ID` correlation across all HTTP requests and structured error responses.
- **Admin Self-Protection**: Prevents accidental administrative self-demotion or self-deactivation.

---

## 4. Test Suite & Verification Results

| Suite | Component | Tests | Status |
| :--- | :--- | :---: | :---: |
| Backend Unit Tests | API, Auth, Admin, Analytics, Governance, Monitoring, Reports, Simulator, Hardening | 188 | **PASS** |
| Phase J E2E Integration | Full user journey, RBAC access matrix, determinism, failover | 14 | **PASS** |
| Core ML Pipeline | Preprocessing, predict_proba calibration, threshold verification | 5 | **PASS** |
| **TOTAL** | **Full System Test Suite** | **207** | **100% PASS** |
| **Frontend Build** | **TypeScript Type Checking & Vite Minification** | **0 Errors** | **PASS** |

---

## 5. Artifact Cryptographic Hashes

| Artifact | File Path | Verified SHA-256 Hash |
| :--- | :--- | :--- |
| Model Weights | `models/final_model.joblib` | `7FCC6EC2B5E481EEA9A6BE007CC7679E28F9ABACAE8D4DBDA19BA5C18EB3C768` |
| Preprocessor | `models/preprocessing_pipeline.joblib` | `8B0BB086C63FDB928E0D5840FB9B29B23A75F638665A86915B17A7E46984288A` |
| Threshold Config | `models/threshold_config.json` | `13FD9163C88B4109B5BFE479898F3D65E40137FABF3BF0A102F2CAA491F94EAC` |
| **Cutoff Threshold** | — | **0.35 (Cost-Optimized, Immutable)** |

---

## 6. Known Limitations & Responsible AI Boundaries

1. **Decision Support Only**: The platform is an underwriter decision support tool and is not intended to make autonomous credit decisions without human oversight.
2. **Dataset Domain Scope**: Model weights reflect the UCI German Credit dataset. Commercial deployment in specific lending sectors requires localized validation and recalibration.
3. **Maturity Lags**: Default outcomes require 12–36 months to materialize, meaning ground truth discrimination metrics are withheld until outcome data is available.
