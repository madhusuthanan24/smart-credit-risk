import unittest
import json
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.core.config import settings
from backend.database.database import engine, Base, SessionLocal
from backend.database.models import User, Applicant, Assessment, AuditLog
from backend.core.security import get_password_hash
from backend.api.dependencies import login_rate_limiter, prediction_rate_limiter

client = TestClient(app)

SAMPLE_APPLICANT = {
    "status_checking_account": "A14",
    "duration_in_months": 12,
    "credit_history": "A32",
    "purpose": "A40",
    "credit_amount": 1500,
    "savings_account": "A65",
    "present_employment_since": "A73",
    "installment_rate": 2,
    "personal_status_sex": "A93",
    "other_debtors_guarantors": "A101",
    "present_residence_since": 2,
    "property": "A121",
    "age_in_years": 35,
    "other_installment_plans": "A143",
    "housing": "A152",
    "existing_credits": 1,
    "job": "A173",
    "num_people_liable": 1,
    "telephone": "A192",
    "foreign_worker": "A201"
}


class TestRoleBasedAccessControlMatrix(unittest.TestCase):
    """
    Dedicated comprehensive test suite verifying RBAC behaviors across all three roles:
    ADMIN, CREDIT_OFFICER, and VIEWER.
    """

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        login_rate_limiter.client_records.clear()
        prediction_rate_limiter.client_records.clear()

        db = SessionLocal()
        # Clean up existing test users
        test_emails = [
            "rbac_admin_1@bank.com",
            "rbac_admin_2@bank.com",
            "rbac_officer@bank.com",
            "rbac_viewer@bank.com",
            "rbac_disabled@bank.com"
        ]
        db.query(User).filter(User.email.in_(test_emails)).delete(synchronize_session=False)
        db.commit()

        # Seed roles
        cls.admin1 = User(email="rbac_admin_1@bank.com", password_hash=get_password_hash("AdminPass123!"), role="ADMIN", is_active=True)
        cls.admin2 = User(email="rbac_admin_2@bank.com", password_hash=get_password_hash("AdminPass123!"), role="ADMIN", is_active=True)
        cls.officer = User(email="rbac_officer@bank.com", password_hash=get_password_hash("OfficerPass123!"), role="CREDIT_OFFICER", is_active=True)
        cls.viewer = User(email="rbac_viewer@bank.com", password_hash=get_password_hash("ViewerPass123!"), role="VIEWER", is_active=True)
        cls.disabled = User(email="rbac_disabled@bank.com", password_hash=get_password_hash("DisabledPass123!"), role="VIEWER", is_active=False)

        db.add_all([cls.admin1, cls.admin2, cls.officer, cls.viewer, cls.disabled])
        db.commit()

        for u in [cls.admin1, cls.admin2, cls.officer, cls.viewer, cls.disabled]:
            db.refresh(u)

        cls.admin1_id = cls.admin1.id
        cls.admin2_id = cls.admin2.id
        cls.officer_id = cls.officer.id
        cls.viewer_id = cls.viewer.id
        cls.disabled_id = cls.disabled.id
        db.close()

        # Login and obtain tokens
        cls.admin_token = cls._login("rbac_admin_1@bank.com", "AdminPass123!")
        cls.admin2_token = cls._login("rbac_admin_2@bank.com", "AdminPass123!")
        cls.officer_token = cls._login("rbac_officer@bank.com", "OfficerPass123!")
        cls.viewer_token = cls._login("rbac_viewer@bank.com", "ViewerPass123!")

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        test_emails = [
            "rbac_admin_1@bank.com",
            "rbac_admin_2@bank.com",
            "rbac_officer@bank.com",
            "rbac_viewer@bank.com",
            "rbac_disabled@bank.com"
        ]
        db.query(User).filter(User.email.in_(test_emails)).delete(synchronize_session=False)
        db.commit()
        db.close()

    @classmethod
    def _login(cls, email, password):
        res = client.post("/api/auth/login", json={"email": email, "password": password})
        if res.status_code == 200:
            return res.json()["access_token"]
        return None

    def _auth_header(self, token):
        return {"Authorization": f"Bearer {token}"}

    # =========================================================================
    # 1. ADMIN ROLE VERIFICATIONS
    # =========================================================================
    def test_01_admin_full_administrative_endpoints_access(self):
        """ADMIN can access all administrative telemetry and health endpoints."""
        headers = self._auth_header(self.admin_token)

        res_ov = client.get("/api/admin/overview", headers=headers)
        self.assertEqual(res_ov.status_code, 200)
        data = res_ov.json()
        self.assertIn("total_users", data)
        self.assertIn("active_users", data)

        res_users = client.get("/api/admin/users", headers=headers)
        self.assertEqual(res_users.status_code, 200)

        res_audit = client.get("/api/admin/audit", headers=headers)
        self.assertEqual(res_audit.status_code, 200)

        res_sec = client.get("/api/admin/security", headers=headers)
        self.assertEqual(res_sec.status_code, 200)

        res_health = client.get("/api/admin/health", headers=headers)
        self.assertEqual(res_health.status_code, 200)

        res_status = client.get("/api/admin/model-status", headers=headers)
        self.assertEqual(res_status.status_code, 200)

    def test_02_admin_user_filtering_and_search(self):
        """ADMIN can search and filter users on /api/users and /api/admin/users."""
        headers = self._auth_header(self.admin_token)

        res = client.get("/api/users?search=officer&role=CREDIT_OFFICER", headers=headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertTrue(all(u["role"] == "CREDIT_OFFICER" for u in items))

    def test_03_admin_can_create_assessments_and_simulations(self):
        """ADMIN can create live assessments and run what-if simulations."""
        headers = self._auth_header(self.admin_token)

        res_pred = client.post("/api/predictions", json={"applicant": SAMPLE_APPLICANT}, headers=headers)
        self.assertEqual(res_pred.status_code, 201)
        data = res_pred.json()
        self.assertIn("default_probability", data)
        self.assertIn("risk_category", data)

        res_sim = client.post("/api/simulate", json={"original_applicant": SAMPLE_APPLICANT, "modifications": {"credit_amount": 5000}}, headers=headers)
        self.assertEqual(res_sim.status_code, 200)

    def test_04_admin_self_demotion_prevention(self):
        """ADMIN cannot demote or deactivate their own account."""
        headers = self._auth_header(self.admin_token)

        # Attempt self-demotion on /api/admin/users/{id}
        res1 = client.patch(f"/api/admin/users/{self.admin1_id}", json={"role": "VIEWER"}, headers=headers)
        self.assertEqual(res1.status_code, 400)
        self.assertIn("cannot demote or deactivate", res1.json()["detail"].lower())

        # Attempt self-deactivation on /api/users/{id}
        res2 = client.patch(f"/api/users/{self.admin1_id}", json={"is_active": False}, headers=headers)
        self.assertEqual(res2.status_code, 400)
        self.assertIn("cannot demote or deactivate", res2.json()["detail"].lower())

    def test_05_last_active_admin_protection(self):
        """System prevents demoting or disabling the last active admin."""
        # Use admin2 to attempt demoting admin1, then demote admin2
        headers2 = self._auth_header(self.admin2_token)

        # First demote admin1 via admin2 -> Should succeed because admin2 is still active
        res1 = client.patch(f"/api/admin/users/{self.admin1_id}", json={"role": "CREDIT_OFFICER"}, headers=headers2)
        self.assertEqual(res1.status_code, 200)

        # Now admin2 is the sole active ADMIN. Attempting to demote or disable admin2 must fail!
        res2 = client.patch(f"/api/admin/users/{self.admin2_id}", json={"role": "CREDIT_OFFICER"}, headers=headers2)
        self.assertEqual(res2.status_code, 400)

        # Restore admin1 to ADMIN
        res_restore = client.patch(f"/api/admin/users/{self.admin1_id}", json={"role": "ADMIN"}, headers=headers2)
        self.assertEqual(res_restore.status_code, 200)

    # =========================================================================
    # 2. CREDIT OFFICER ROLE VERIFICATIONS
    # =========================================================================
    def test_06_officer_can_create_assessments_and_download_pdf(self):
        """CREDIT_OFFICER can originate assessments, view results, and download PDFs."""
        headers = self._auth_header(self.officer_token)

        res_pred = client.post("/api/predictions", json={"applicant": SAMPLE_APPLICANT}, headers=headers)
        self.assertEqual(res_pred.status_code, 201)
        pred_data = res_pred.json()
        pred_id = pred_data.get("prediction_id") or pred_data.get("id")

        # Download report
        if pred_id:
            res_pdf = client.get(f"/api/reports/assessment/{pred_id}", headers=headers)
            self.assertEqual(res_pdf.status_code, 200)
            self.assertEqual(res_pdf.headers.get("content-type"), "application/pdf")

    def test_07_officer_can_access_operational_analytics_and_simulator(self):
        """CREDIT_OFFICER can access simulator, analytics, monitoring, governance, and dashboard."""
        headers = self._auth_header(self.officer_token)

        res_sim = client.post("/api/simulate", json={"original_applicant": SAMPLE_APPLICANT, "modifications": {"duration_in_months": 36}}, headers=headers)
        self.assertEqual(res_sim.status_code, 200)

        res_dash = client.get("/api/dashboard/summary", headers=headers)
        self.assertEqual(res_dash.status_code, 200)

        res_ana = client.get("/api/analytics/overview", headers=headers)
        self.assertEqual(res_ana.status_code, 200)

        res_mon = client.get("/api/monitoring/overview", headers=headers)
        self.assertEqual(res_mon.status_code, 200)

        res_gov = client.get("/api/governance/overview", headers=headers)
        self.assertEqual(res_gov.status_code, 200)

    def test_08_officer_cannot_access_any_admin_endpoints(self):
        """CREDIT_OFFICER receives HTTP 403 Forbidden on all administrative endpoints."""
        headers = self._auth_header(self.officer_token)

        forbidden_endpoints = [
            ("GET", "/api/admin/overview"),
            ("GET", "/api/admin/users"),
            ("POST", "/api/admin/users"),
            ("PATCH", f"/api/admin/users/{self.viewer_id}"),
            ("GET", "/api/admin/audit"),
            ("GET", "/api/admin/security"),
            ("GET", "/api/admin/health"),
            ("GET", "/api/admin/model-status"),
            ("GET", "/api/users"),
            ("POST", "/api/users"),
            ("PATCH", f"/api/users/{self.viewer_id}")
        ]

        for method, endpoint in forbidden_endpoints:
            if method == "GET":
                res = client.get(endpoint, headers=headers)
            elif method == "POST":
                res = client.post(endpoint, json={"email": "hacker@bank.com", "password": "pass", "role": "ADMIN"}, headers=headers)
            elif method == "PATCH":
                res = client.patch(endpoint, json={"role": "ADMIN"}, headers=headers)
            self.assertEqual(res.status_code, 403, f"Expected 403 Forbidden for {method} {endpoint}, got {res.status_code}")

    # =========================================================================
    # 3. VIEWER ROLE VERIFICATIONS
    # =========================================================================
    def test_09_viewer_can_view_analytics_and_run_safe_simulations(self):
        """VIEWER can view analytics, monitoring, governance, and run in-memory simulator."""
        headers = self._auth_header(self.viewer_token)

        res_dash = client.get("/api/dashboard/summary", headers=headers)
        self.assertEqual(res_dash.status_code, 200)

        res_ana = client.get("/api/analytics/overview", headers=headers)
        self.assertEqual(res_ana.status_code, 200)

        res_mon = client.get("/api/monitoring/overview", headers=headers)
        self.assertEqual(res_mon.status_code, 200)

        res_gov = client.get("/api/governance/overview", headers=headers)
        self.assertEqual(res_gov.status_code, 200)

        res_history = client.get("/api/predictions", headers=headers)
        self.assertEqual(res_history.status_code, 200)

        # In-memory simulator is safe for viewers
        res_sim = client.post("/api/simulate", json={"original_applicant": SAMPLE_APPLICANT, "modifications": {"credit_amount": 3000}}, headers=headers)
        self.assertEqual(res_sim.status_code, 200)

    def test_10_viewer_cannot_create_production_assessments(self):
        """VIEWER receives HTTP 403 Forbidden when attempting to create assessments."""
        headers = self._auth_header(self.viewer_token)

        res = client.post("/api/predictions", json={"applicant": SAMPLE_APPLICANT}, headers=headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn("lacks required permissions", res.json()["detail"].lower())

    def test_11_viewer_cannot_access_any_admin_endpoints(self):
        """VIEWER receives HTTP 403 Forbidden on all administrative endpoints."""
        headers = self._auth_header(self.viewer_token)

        forbidden_endpoints = [
            ("GET", "/api/admin/overview"),
            ("GET", "/api/admin/users"),
            ("POST", "/api/admin/users"),
            ("GET", "/api/admin/audit"),
            ("GET", "/api/admin/security"),
            ("GET", "/api/admin/health"),
            ("GET", "/api/users"),
            ("POST", "/api/users")
        ]

        for method, endpoint in forbidden_endpoints:
            if method == "GET":
                res = client.get(endpoint, headers=headers)
            elif method == "POST":
                res = client.post(endpoint, json={"email": "viewer_hack@bank.com", "password": "pass"}, headers=headers)
            self.assertEqual(res.status_code, 403, f"Expected 403 Forbidden for {method} {endpoint}, got {res.status_code}")

    # =========================================================================
    # 4. DEACTIVATED USER & AUDIT TRAIL VERIFICATIONS
    # =========================================================================
    def test_12_deactivated_account_is_blocked(self):
        """Deactivated account cannot log in and receives 403 on protected endpoints."""
        # Attempt login
        res_login = client.post("/api/auth/login", json={"email": "rbac_disabled@bank.com", "password": "DisabledPass123!"})
        self.assertEqual(res_login.status_code, 403)
        self.assertIn("disabled", res_login.json()["detail"].lower())

    def test_13_audit_trail_records_role_modifications(self):
        """Role changes are committed to the immutable AuditLog table."""
        headers = self._auth_header(self.admin_token)

        res = client.patch(f"/api/users/{self.viewer_id}", json={"role": "CREDIT_OFFICER"}, headers=headers)
        self.assertEqual(res.status_code, 200)

        # Check audit table
        db = SessionLocal()
        audit = db.query(AuditLog).filter(AuditLog.details.like(f"%{self.viewer.email}%")).order_by(AuditLog.timestamp.desc()).first()
        self.assertIsNotNone(audit)
        self.assertIn(audit.action, ["ADMIN_ROLE_CHANGED", "USER_UPDATED"])
        db.close()


if __name__ == "__main__":
    unittest.main()
