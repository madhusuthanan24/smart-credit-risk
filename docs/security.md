# Security Architecture & Controls Guide — Smart Credit Risk System

## 1. Executive Summary
This document details the security posture, authentication protocols, authorization models, data protection mechanisms, and governance controls implemented across the Smart Credit Risk Prediction System.

---

## 2. Authentication Protocol (JWT)
- **Token Type**: JSON Web Tokens (JWT) signed with HMAC-SHA256 (`HS256`).
- **Secret Key**: Configured via `SECRET_KEY` environment variable. Never hard-coded.
- **Token Expiration**: Configurable duration (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 60 minutes).
- **Token Claims**: Contains `sub` (User ID), `email`, `role`, `iat` (Issued At), `exp` (Expiration).
- **Transport**: Transmitted via HTTP `Authorization: Bearer <token>` header.

---

## 3. Password Hashing & Credentials Storage
- **Algorithm**: `CryptContext` with `bcrypt` salted hashing.
- **Salt Generation**: Automatically generated per-password salt.
- **Fallback Verification**: PBKDF2-HMAC-SHA256 fallback for compatibility.
- **API Protection**: Password hashes are stripped from all API Pydantic responses (`UserResponse`) and never returned to clients.

---

## 4. Role-Focused Portals & Setup Protection
- **Portal Authorization Check**: When logging in via `/api/auth/login`, an optional `portal` parameter specifies the intended portal (`ADMIN`, `CREDIT_OFFICER`, `STAFF`, `VIEWER`). The server validates that the authenticated account's assigned role matches the portal, returning **HTTP 403 Forbidden** if mismatched.
- **Staff Provisioning Keys**: Public registration automatically assigns the safe `VIEWER` role. Elevated accounts (`ADMIN`, `CREDIT_OFFICER`) require valid setup invite codes (`ADMIN_INVITE_CODE` or `CREDIT_OFFICER_INVITE_CODE`) configured via backend environment variables.
- **Staff Gateway Discovery**: A 5-tap gesture on the application logo enables discovery of the internal staff gateway without exposing admin login routes on public landing views.

---

## 5. Role-Based Access Control (RBAC) Matrix

| Endpoint | Method | ADMIN | CREDIT_OFFICER | VIEWER | Unauthenticated |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `/api/auth/register` | `POST` | ✅ | ✅ | ✅ | ✅ (Creates VIEWER) |
| `/api/auth/login` | `POST` | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/me` | `GET` | ✅ | ✅ | ✅ | ❌ 401 |
| `/api/predictions` | `GET` | ✅ | ✅ | ✅ | ❌ 401 |
| `/api/predictions/{id}` | `GET` | ✅ | ✅ | ✅ | ❌ 401 |
| `/api/predictions` | `POST` | ✅ | ✅ | ❌ 403 | ❌ 401 |
| `/api/dashboard/summary` | `GET` | ✅ | ✅ | ✅ | ❌ 401 |
| `/api/analytics/overview` | `GET` | ✅ | ✅ | ❌ 403 | ❌ 401 |
| `/api/audit/logs` | `GET` | ✅ | ❌ 403 | ❌ 403 | ❌ 401 |
| `/api/users` | `GET/POST/PATCH` | ✅ | ❌ 403 | ❌ 403 | ❌ 401 |
| `/api/health` | `GET` | ✅ | ✅ | ✅ | ✅ |

---

## 6. Network & HTTP Security Hardening

### CORS Protection
- Cross-Origin Resource Sharing (CORS) is restricted to configured frontend origins (`FRONTEND_URL`, e.g. `http://localhost:5173`, `http://localhost:3000`).
- Wildcards (`allow_origins=["*"]`) are disabled when authentication credentials are enabled.

### Security Response Headers
- `X-Content-Type-Options: nosniff` (Prevents MIME sniffing)
- `X-Frame-Options: DENY` (Mitigates clickjacking attacks)
- `Referrer-Policy: strict-origin-when-cross-origin` (Restricts referrer information leakage)

---

## 7. Input Validation & Error Handling
- **Pydantic Validation**: All request bodies (`ApplicantSchema`, `UserRegister`, `UserLogin`) validate types, numerical boundaries (`credit_amount` 250–20000, `duration_in_months` 4–72), and categorical value codes.
- **Sanitized Errors**: Production exception handlers obscure Python tracebacks and raw database query errors, returning clean JSON status responses (`401`, `403`, `404`, `422`, `429`, `500`).

---

## 8. Audit Event Logging
All critical security and underwriting events are saved to the `audit_logs` database table:
- `LOGIN_SUCCESS`: Successful user authentication
- `LOGIN_FAILURE`: Invalid credential attempt
- `LOGOUT`: Session termination
- `USER_CREATED`: New user registration
- `PREDICTION_CREATED`: Underwriting assessment execution
- `USER_UPDATED`: User role/active state modification

---

## 9. Governance & Regulatory Disclaimer
> **IMPORTANT GOVERNANCE NOTICE**:
> This system is an educational and research statistical prediction engine based on historical credit origination data. It is not an automated legally binding lending decision system. Real-world lending operations require compliance with applicable banking regulations (e.g., Fair Credit Reporting Act, Equal Credit Opportunity Act), demographic fairness auditing, and mandatory human underwriter review prior to final decisioning.
