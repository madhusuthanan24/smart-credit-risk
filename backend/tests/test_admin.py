import unittest
import json
import hashlib
import sys
import os
from datetime import datetime, timedelta
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.core.config import settings
from backend.database.database import engine, Base, SessionLocal
from backend.database.models import User, Applicant, Assessment, AuditLog
from backend.core.security import get_password_hash
from backend.api.dependencies import login_rate_limiter, prediction_rate_limiter

client = TestClient(app)


class TestAdvancedAdminAndAuditCenter(unittest.TestCase):
    """
    Phase G — Advanced Admin & Audit Center Test Suite.
    Verifies all 20 required administrative and audit test cases:
    1. test_01_admin_can_access_overview
    2. test_02_non_admin_cannot_access_overview
    3. test_03_admin_can_list_users
    4. test_04_user_search_and_active_filter
    5. test_05_user_role_filtering
    6. test_06_user_pagination
    7. test_07_audit_log_retrieval
    8. test_08_audit_event_filtering
    9. test_09_audit_date_filtering
    10. test_10_security_metrics_accurate
    11. test_11_model_status_endpoint
    12. test_12_nvidia_status_does_not_expose_secrets
    13. test_13_health_diagnostic_endpoint
    14. test_14_unauthorized_requests_rejected
    15. test_15_invalid_query_parameters_rejected
    16. test_16_sensitive_fields_never_returned
    17. test_17_existing_audit_events_intact
    18. test_18_existing_prediction_behavior_unchanged
    19. test_19_admin_user_creation_and_audit
    20. test_20_admin_user_update_and_last_admin_guard
    """

    test_user_ids = []
    test_audit_ids = []
    test_applicant_ids = []
    test_assessment_ids = []

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        login_rate_limiter.client_records.clear()
        prediction_rate_limiter.client_records.clear()

        db = SessionLocal()
        emails = ["adm_root@bank.com", "adm_officer@bank.com", "adm_viewer@bank.com", "adm_second@bank.com"]
        db.query(User).filter(User.email.in_(emails)).delete()
        db.commit()

        admin = User(
            email="adm_root@bank.com",
            password_hash=get_password_hash("Secret123!"),
            role="ADMIN",
            is_active=True
        )
        second_admin = User(
            email="adm_second@bank.com",
            password_hash=get_password_hash("Secret123!"),
            role="ADMIN",
            is_active=True
        )
        officer = User(
            email="adm_officer@bank.com",
            password_hash=get_password_hash("Secret123!"),
            role="CREDIT_OFFICER",
            is_active=True
        )
        viewer = User(
            email="adm_viewer@bank.com",
            password_hash=get_password_hash("Secret123!"),
            role="VIEWER",
            is_active=True
        )
        db.add_all([admin, second_admin, officer, viewer])
        db.commit()

        cls.test_user_ids = [admin.id, second_admin.id, officer.id, viewer.id]
        cls.admin_id = admin.id
        cls.second_admin_id = second_admin.id
        cls.officer_id = officer.id

        # Login users to get tokens
        res_admin = client.post("/api/auth/login", json={"email": "adm_root@bank.com", "password": "Secret123!"})
        cls.headers_admin = {"Authorization": f"Bearer {res_admin.json()['access_token']}"}

        res_officer = client.post("/api/auth/login", json={"email": "adm_officer@bank.com", "password": "Secret123!"})
        cls.headers_officer = {"Authorization": f"Bearer {res_officer.json()['access_token']}"}

        res_viewer = client.post("/api/auth/login", json={"email": "adm_viewer@bank.com", "password": "Secret123!"})
        cls.headers_viewer = {"Authorization": f"Bearer {res_viewer.json()['access_token']}"}

        # Seed deterministic audit logs
        now = datetime.utcnow()
        log1 = AuditLog(action="LOGIN_SUCCESS", status="SUCCESS", threshold=0.35, details="User adm_root@bank.com logged in", timestamp=now - timedelta(hours=2))
        log2 = AuditLog(action="LOGIN_FAILURE", status="FAILURE", threshold=0.35, details="Failed login attempt for unknown@bank.com", timestamp=now - timedelta(hours=1))
        log3 = AuditLog(action="USER_CREATED", status="SUCCESS", threshold=0.35, details="Admin created staff account", timestamp=now - timedelta(minutes=30))
        db.add_all([log1, log2, log3])
        db.commit()
        cls.test_audit_ids = [log1.id, log2.id, log3.id]

        db.close()

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        if cls.test_assessment_ids:
            db.query(Assessment).filter(Assessment.id.in_(cls.test_assessment_ids)).delete(synchronize_session=False)
        if cls.test_applicant_ids:
            db.query(Applicant).filter(Applicant.id.in_(cls.test_applicant_ids)).delete(synchronize_session=False)
        if cls.test_audit_ids:
            db.query(AuditLog).filter(AuditLog.id.in_(cls.test_audit_ids)).delete(synchronize_session=False)
        if cls.test_user_ids:
            db.query(User).filter(User.id.in_(cls.test_user_ids)).delete(synchronize_session=False)
        db.commit()
        db.close()

    # 1. Admin can access admin overview
    def test_01_admin_can_access_overview(self):
        res = client.get("/api/admin/overview", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_users", data)
        self.assertIn("active_users", data)
        self.assertIn("admin_users", data)
        self.assertIn("total_assessments", data)
        self.assertIn("total_audit_events", data)
        self.assertIn("successful_logins", data)
        self.assertIn("failed_logins", data)
        self.assertEqual(data["reports_generated"], "Generated on-demand (not persisted)")
        self.assertEqual(data["simulations_performed"], "Evaluated on-demand (not persisted)")

    # 2. Non-admin (CREDIT_OFFICER, VIEWER) cannot access admin overview (403 Forbidden)
    def test_02_non_admin_cannot_access_overview(self):
        res_off = client.get("/api/admin/overview", headers=self.headers_officer)
        self.assertEqual(res_off.status_code, 403)

        res_view = client.get("/api/admin/overview", headers=self.headers_viewer)
        self.assertEqual(res_view.status_code, 403)

    # 3. Admin can list users
    def test_03_admin_can_list_users(self):
        res = client.get("/api/admin/users", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total", data)
        self.assertIn("items", data)
        self.assertGreaterEqual(data["total"], 4)
        emails = [u["email"] for u in data["items"]]
        self.assertIn("adm_root@bank.com", emails)

    # 4. User search and active filter
    def test_04_user_search_and_active_filter(self):
        res = client.get("/api/admin/users?search=adm_root&is_active=true", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["email"], "adm_root@bank.com")
        self.assertTrue(data["items"][0]["is_active"])

    # 5. User role filtering
    def test_05_user_role_filtering(self):
        res_admin = client.get("/api/admin/users?role=ADMIN", headers=self.headers_admin)
        self.assertEqual(res_admin.status_code, 200)
        data = res_admin.json()
        for u in data["items"]:
            self.assertEqual(u["role"], "ADMIN")

        res_off = client.get("/api/admin/users?role=CREDIT_OFFICER", headers=self.headers_admin)
        self.assertEqual(res_off.status_code, 200)
        for u in res_off.json()["items"]:
            self.assertEqual(u["role"], "CREDIT_OFFICER")

    # 6. User pagination
    def test_06_user_pagination(self):
        res = client.get("/api/admin/users?page=1&page_size=2", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["page_size"], 2)
        self.assertEqual(len(data["items"]), 2)
        self.assertGreater(data["total_pages"], 1)

    # 7. Audit log retrieval
    def test_07_audit_log_retrieval(self):
        res = client.get("/api/admin/audit", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total", data)
        self.assertIn("items", data)
        self.assertGreaterEqual(data["total"], 3)
        actions = [l["action"] for l in data["items"]]
        self.assertTrue(any("LOGIN" in a for a in actions))

    # 8. Audit event filtering
    def test_08_audit_event_filtering(self):
        res = client.get("/api/admin/audit?action=LOGIN_FAILURE", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data["total"], 1)
        for l in data["items"]:
            self.assertEqual(l["action"], "LOGIN_FAILURE")

    # 9. Audit date filtering
    def test_09_audit_date_filtering(self):
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        res = client.get(f"/api/admin/audit?start_date={today_str}&end_date={today_str}", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data["total"], 1)

    # 10. Security metrics accurate
    def test_10_security_metrics_accurate(self):
        res = client.get("/api/admin/security", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data["login_success_count"], 1)
        self.assertGreaterEqual(data["login_failure_count"], 1)
        self.assertEqual(data["login_rate_limit"], "10 requests/minute per IP")
        self.assertEqual(data["prediction_rate_limit"], "30 requests/minute per IP")
        self.assertIn("not persisted", data["rate_limit_persistence_note"])

    # 11. Model status endpoint (read-only, threshold 0.35)
    def test_11_model_status_endpoint(self):
        res = client.get("/api/admin/model-status", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["model_name"], "Tuned Logistic Regression")
        self.assertEqual(data["threshold"], 0.35)
        self.assertEqual(data["threshold_status"], "Calibrated (0.35) — Read-Only")
        self.assertEqual(data["model_artifact_integrity"], "Verified / Unchanged")
        self.assertIn("strictly with the local ML pipeline", data["prediction_authority"])
        self.assertIn("READ-ONLY", data["administrative_controls"])

    # 12. NVIDIA status does not expose secrets
    def test_12_nvidia_status_does_not_expose_secrets(self):
        res = client.get("/api/admin/health", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        text_resp = res.text
        self.assertNotIn("nvapi-", text_resp)
        self.assertNotIn("Bearer", text_resp)
        self.assertNotIn("API_KEY", text_resp)
        nv_comp = res.json()["components"]["nvidia_ai"]
        self.assertIn("status", nv_comp)
        self.assertIn("details", nv_comp)

    # 13. Health diagnostic endpoint
    def test_13_health_diagnostic_endpoint(self):
        res = client.get("/api/admin/health", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn(data["overall_status"], ["HEALTHY", "DEGRADED"])
        comps = data["components"]
        self.assertEqual(comps["api"]["status"], "HEALTHY")
        self.assertEqual(comps["database"]["status"], "HEALTHY")
        self.assertEqual(comps["ml_model"]["status"], "HEALTHY")
        self.assertEqual(comps["threshold_config"]["status"], "HEALTHY")

    # 14. Unauthorized requests rejected
    def test_14_unauthorized_requests_rejected(self):
        endpoints = [
            "/api/admin/overview",
            "/api/admin/users",
            "/api/admin/audit",
            "/api/admin/security",
            "/api/admin/model-status",
            "/api/admin/health"
        ]
        for ep in endpoints:
            res = client.get(ep)
            self.assertEqual(res.status_code, 401)

    # 15. Invalid query parameters rejected
    def test_15_invalid_query_parameters_rejected(self):
        # Invalid page (0 or negative)
        res_page = client.get("/api/admin/users?page=0", headers=self.headers_admin)
        self.assertIn(res_page.status_code, [400, 422])

        # Invalid date format
        res_date = client.get("/api/admin/audit?start_date=invalid-date", headers=self.headers_admin)
        self.assertIn(res_date.status_code, [400, 422])

    # 16. Sensitive fields never returned in API responses
    def test_16_sensitive_fields_never_returned(self):
        res_users = client.get("/api/admin/users", headers=self.headers_admin)
        text_users = res_users.text.lower()
        self.assertNotIn("password_hash", text_users)
        self.assertNotIn("argon2", text_users)
        self.assertNotIn("secret", text_users)

        res_ov = client.get("/api/admin/overview", headers=self.headers_admin)
        text_ov = res_ov.text.lower()
        self.assertNotIn("password_hash", text_ov)
        self.assertNotIn("jwt_secret", text_ov)

    # 17. Existing audit events remain intact
    def test_17_existing_audit_events_intact(self):
        res = client.get("/api/admin/audit", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        items = res.json()["items"]
        for it in items:
            self.assertIn("id", it)
            self.assertIn("action", it)
            self.assertIn("status", it)
            self.assertIn("timestamp", it)

    # 18. Existing prediction behavior is unchanged
    def test_18_existing_prediction_behavior_unchanged(self):
        applicant_payload = {
            "status_checking_account": "A14",
            "duration_in_months": 12,
            "credit_history": "A32",
            "purpose": "A40",
            "credit_amount": 2500,
            "savings_account": "A61",
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
        res = client.post("/api/predictions", json={"applicant": applicant_payload}, headers=self.headers_officer)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["decision_threshold"], 0.35)
        self.assertIn("risk_category", data)

    # 19. Admin user creation works and records audit event
    def test_19_admin_user_creation_and_audit(self):
        new_email = "created_by_admin@bank.com"
        # Clean up if exists
        db = SessionLocal()
        db.query(User).filter(User.email == new_email).delete()
        db.commit()
        db.close()

        res = client.post(
            "/api/admin/users",
            json={"email": new_email, "password": "StrongPassword123!", "role": "CREDIT_OFFICER"},
            headers=self.headers_admin
        )
        self.assertEqual(res.status_code, 201)
        created_user = res.json()
        self.assertEqual(created_user["email"], new_email)
        self.assertEqual(created_user["role"], "CREDIT_OFFICER")
        self.test_user_ids.append(created_user["id"])

        # Verify audit log was created
        res_audit = client.get("/api/admin/audit?action=ADMIN_USER_CREATED", headers=self.headers_admin)
        self.assertEqual(res_audit.status_code, 200)
        logs = res_audit.json()["items"]
        self.assertTrue(any(new_email in l["details"] for l in logs))

    # 20. Admin user update works with last active admin guard
    def test_20_admin_user_update_and_last_admin_guard(self):
        # Successfully update role of officer
        res_update = client.patch(
            f"/api/admin/users/{self.officer_id}",
            json={"role": "VIEWER", "is_active": True},
            headers=self.headers_admin
        )
        self.assertEqual(res_update.status_code, 200)
        self.assertEqual(res_update.json()["role"], "VIEWER")

        # Demote second admin so only root admin is left
        client.patch(
            f"/api/admin/users/{self.second_admin_id}",
            json={"role": "VIEWER", "is_active": True},
            headers=self.headers_admin
        )

        # Attempt to disable or demote the last remaining admin (root admin) -> Must be blocked!
        res_demote_last = client.patch(
            f"/api/admin/users/{self.admin_id}",
            json={"role": "VIEWER"},
            headers=self.headers_admin
        )
        self.assertEqual(res_demote_last.status_code, 400)
        self.assertTrue(
            "cannot demote or deactivate their own account" in res_demote_last.json()["detail"].lower() or
            "cannot disable or demote the last remaining" in res_demote_last.json()["detail"].lower()
        )


if __name__ == "__main__":
    unittest.main()
