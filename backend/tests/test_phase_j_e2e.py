import hashlib
import json
import os
import unittest
import io
import uuid
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.main import app
from backend.database.database import SessionLocal
from backend.database.models import User, Applicant, Assessment, AuditLog
from backend.core.security import create_access_token, get_password_hash
from backend.services.prediction_service import prediction_service
from backend.services.nvidia_ai_service import NvidiaAIService

client = TestClient(app, raise_server_exceptions=False)

class TestPhaseJE2E(unittest.TestCase):
    """
    Phase J — Final End-to-End Validation, RBAC, Prediction Integrity & Demo Readiness.
    """

    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()

        # Ensure real users exist in DB for each role
        admin_user = cls.db.query(User).filter(User.role == "ADMIN", User.is_active == True).first()
        if not admin_user:
            admin_user = User(
                email="admin_j_test@bank.com",
                password_hash=get_password_hash("AdminPass123!"),
                role="ADMIN",
                is_active=True
            )
            cls.db.add(admin_user)
            cls.db.commit()
            cls.db.refresh(admin_user)

        officer_user = cls.db.query(User).filter(User.role == "CREDIT_OFFICER", User.is_active == True).first()
        if not officer_user:
            officer_user = User(
                email="officer_j_test@bank.com",
                password_hash=get_password_hash("OfficerPass123!"),
                role="CREDIT_OFFICER",
                is_active=True
            )
            cls.db.add(officer_user)
            cls.db.commit()
            cls.db.refresh(officer_user)

        viewer_user = cls.db.query(User).filter(User.role == "VIEWER", User.is_active == True).first()
        if not viewer_user:
            viewer_user = User(
                email="viewer_j_test@bank.com",
                password_hash=get_password_hash("ViewerPass123!"),
                role="VIEWER",
                is_active=True
            )
            cls.db.add(viewer_user)
            cls.db.commit()
            cls.db.refresh(viewer_user)

        cls.admin_user = admin_user
        cls.officer_user = officer_user
        cls.viewer_user = viewer_user

        cls.admin_token = create_access_token(user_id=admin_user.id, email=admin_user.email, role=admin_user.role)
        cls.officer_token = create_access_token(user_id=officer_user.id, email=officer_user.email, role=officer_user.role)
        cls.viewer_token = create_access_token(user_id=viewer_user.id, email=viewer_user.email, role=viewer_user.role)

        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}
        cls.officer_headers = {"Authorization": f"Bearer {cls.officer_token}"}
        cls.viewer_headers = {"Authorization": f"Bearer {cls.viewer_token}"}

        # Deterministic sample applicant
        cls.sample_applicant = {
            'status_checking_account': 'A14',
            'duration_in_months': 12,
            'credit_history': 'A32',
            'purpose': 'A40',
            'credit_amount': 1500,
            'savings_account': 'A65',
            'present_employment_since': 'A74',
            'installment_rate': 2,
            'personal_status_sex': 'A93',
            'other_debtors_guarantors': 'A101',
            'present_residence_since': 4,
            'property': 'A121',
            'age_in_years': 40,
            'other_installment_plans': 'A143',
            'housing': 'A152',
            'existing_credits': 1,
            'job': 'A173',
            'num_people_liable': 1,
            'telephone': 'A192',
            'foreign_worker': 'A201'
        }

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # -------------------------------------------------------------
    # 1. APPLICATION STARTUP & HEALTH CHECKS
    # -------------------------------------------------------------

    def test_e2e_health_liveness(self):
        """Verify root and api health liveness endpoints respond 200 OK."""
        res_root = client.get("/health")
        res_api = client.get("/api/health")
        self.assertEqual(res_root.status_code, 200)
        self.assertEqual(res_api.status_code, 200)
        self.assertEqual(res_root.json()["status"], "healthy")
        self.assertEqual(res_api.json()["status"], "healthy")

    def test_e2e_readiness_probe(self):
        """Verify root and api readiness endpoints confirm all dependencies loaded."""
        res_root = client.get("/ready")
        res_api = client.get("/api/ready")
        self.assertEqual(res_root.status_code, 200)
        self.assertEqual(res_api.status_code, 200)
        data = res_root.json()
        self.assertEqual(data["status"], "ready")
        self.assertEqual(data["threshold"], 0.35)
        self.assertTrue(data["checks"]["database"])
        self.assertTrue(data["checks"]["model"])
        self.assertTrue(data["checks"]["preprocessor"])
        self.assertTrue(data["checks"]["threshold"])

    # -------------------------------------------------------------
    # 2. USER AUTHENTICATION & REGISTRATION JOURNEY
    # -------------------------------------------------------------

    def test_e2e_auth_registration_and_login_flow(self):
        """Verify complete user registration and login token issuance."""
        test_email = f"e2e_user_{uuid.uuid4().hex[:8]}@bank.com"
        reg_payload = {
            "email": test_email,
            "password": "StrongPassword123!",
            "requested_role": "VIEWER"
        }
        res_reg = client.post("/api/auth/register", json=reg_payload)
        self.assertEqual(res_reg.status_code, 201)
        data_reg = res_reg.json()
        self.assertIn("access_token", data_reg)
        self.assertEqual(data_reg["user"]["role"], "VIEWER")

        # Login with newly created user
        login_payload = {
            "email": test_email,
            "password": "StrongPassword123!"
        }
        res_login = client.post("/api/auth/login", json=login_payload)
        self.assertEqual(res_login.status_code, 200)
        data_login = res_login.json()
        self.assertIn("access_token", data_login)
        self.assertEqual(data_login["user"]["email"], test_email)

    # -------------------------------------------------------------
    # 3. CREDIT ASSESSMENT & INFERENCE INTEGRITY
    # -------------------------------------------------------------

    def test_e2e_credit_assessment_lifecycle(self):
        """Verify prediction inference, database persistence, and audit logging."""
        count_before = self.db.query(Assessment).count()
        audit_before = self.db.query(AuditLog).count()

        payload = {"applicant": self.sample_applicant}
        res = client.post("/api/predictions", json=payload, headers=self.officer_headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()

        # Validate prediction response contracts
        self.assertIn("prediction_id", data)
        self.assertIn("default_probability", data)
        self.assertEqual(data["decision_threshold"], 0.35)
        self.assertIn("risk_category", data)
        self.assertIn("credit_decision", data)
        self.assertIn("ai_explanation", data)

        # Verify DB persistence
        count_after = self.db.query(Assessment).count()
        audit_after = self.db.query(AuditLog).count()
        self.assertEqual(count_after, count_before + 1)
        self.assertGreaterEqual(audit_after, audit_before + 1)

        # Verify stored record
        stored = self.db.query(Assessment).filter(Assessment.id == data["prediction_id"]).first()
        self.assertIsNotNone(stored)
        self.assertAlmostEqual(stored.threshold, 0.35, places=2)

    def test_e2e_prediction_determinism(self):
        """Verify identical inputs yield identical probabilities (strictly deterministic)."""
        res1 = prediction_service.predict(self.sample_applicant)
        res2 = prediction_service.predict(self.sample_applicant)
        self.assertEqual(res1["default_probability"], res2["default_probability"])
        self.assertEqual(res1["predicted_class"], res2["predicted_class"])
        self.assertEqual(res1["risk_category"], res2["risk_category"])

    # -------------------------------------------------------------
    # 4. NVIDIA AI EXPLAINABILITY & FALLBACK
    # -------------------------------------------------------------

    def test_e2e_ai_fallback_resilience(self):
        """Verify deterministic fallback handles NVIDIA failure without modifying ML outputs."""
        with patch.object(NvidiaAIService, "_call_nvidia_api", side_effect=Exception("API unreachable")):
            payload = {"applicant": self.sample_applicant}
            res = client.post("/api/predictions", json=payload, headers=self.officer_headers)
            self.assertEqual(res.status_code, 201)
            data = res.json()
            # The ML probability and risk category MUST remain completely intact
            self.assertAlmostEqual(data["default_probability"], 0.0286, places=2)
            self.assertEqual(data["risk_category"], "LOW RISK")
            # Explanation is provided via fallback
            self.assertIsNotNone(data["ai_explanation"])

    # -------------------------------------------------------------
    # 5. RISK SIMULATOR INTEGRITY
    # -------------------------------------------------------------

    def test_e2e_simulator_execution_and_non_persistence(self):
        """Verify simulator calculates probability delta without modifying production assessments."""
        count_before = self.db.query(Assessment).count()

        sim_payload = {
            "original_applicant": self.sample_applicant,
            "modifications": {
                "credit_amount": 9000,
                "duration_in_months": 48
            }
        }
        res = client.post("/api/simulate", json=sim_payload, headers=self.officer_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("original", data)
        self.assertIn("simulated", data)
        self.assertIn("difference", data)
        self.assertIn("risk_changed", data)

        # Simulation must NEVER overwrite or persist assessments
        count_after = self.db.query(Assessment).count()
        self.assertEqual(count_after, count_before)

    # -------------------------------------------------------------
    # 6. REPORT GENERATION & SECRET AUDIT
    # -------------------------------------------------------------

    def test_e2e_report_generation_and_no_secret_leaks(self):
        """Verify PDF report generation from existing assessment and ensure no secrets appear."""
        latest_assessment = self.db.query(Assessment).order_by(Assessment.created_at.desc()).first()
        self.assertIsNotNone(latest_assessment, "An assessment must exist to generate report")

        res = client.get(f"/api/reports/assessment/{latest_assessment.id}", headers=self.officer_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("content-type"), "application/pdf")
        
        pdf_bytes = res.content
        # PDF file signature
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))
        
        # Verify no secrets in PDF binary content
        self.assertNotIn(b"SECRET_KEY", pdf_bytes)
        self.assertNotIn(b"ADMIN123KEY", pdf_bytes)
        self.assertNotIn(b"OFFICER123KEY", pdf_bytes)
        self.assertNotIn(b"smart_credit_risk_secret_key", pdf_bytes)

    # -------------------------------------------------------------
    # 7. MONITORING & GOVERNANCE JOURNEYS
    # -------------------------------------------------------------

    def test_e2e_monitoring_endpoints(self):
        """Verify Phase E model monitoring overview and data drift endpoints."""
        res_overview = client.get("/api/monitoring/overview", headers=self.viewer_headers)
        self.assertEqual(res_overview.status_code, 200)
        data_overview = res_overview.json()
        self.assertIn("volume", data_overview)
        self.assertIn("risk_distribution", data_overview)

        res_drift = client.get("/api/monitoring/drift", headers=self.viewer_headers)
        self.assertEqual(res_drift.status_code, 200)
        data_drift = res_drift.json()
        self.assertIn("overall_drift_status", data_drift)

    def test_e2e_governance_endpoints(self):
        """Verify Phase F fairness & governance endpoints."""
        res_gov = client.get("/api/governance/overview", headers=self.viewer_headers)
        self.assertEqual(res_gov.status_code, 200)
        data_gov = res_gov.json()
        self.assertEqual(data_gov["threshold"], 0.35)
        self.assertIn("integrity_status", data_gov)

        res_groups = client.get("/api/governance/groups", headers=self.viewer_headers)
        self.assertEqual(res_groups.status_code, 200)

        res_limits = client.get("/api/governance/limitations", headers=self.viewer_headers)
        self.assertEqual(res_limits.status_code, 200)

    # -------------------------------------------------------------
    # 8. EXECUTIVE ANALYTICS JOURNEY
    # -------------------------------------------------------------

    def test_e2e_executive_analytics_suite(self):
        """Verify Phase H analytics suite queries stored data accurately."""
        res_trends = client.get("/api/analytics/trends?period=30d", headers=self.viewer_headers)
        self.assertEqual(res_trends.status_code, 200)

        res_dist = client.get("/api/analytics/risk-distribution?days=30", headers=self.viewer_headers)
        self.assertEqual(res_dist.status_code, 200)

        res_prob = client.get("/api/analytics/probability-distribution?days=30", headers=self.viewer_headers)
        self.assertEqual(res_prob.status_code, 200)

        res_conc = client.get("/api/analytics/concentration?dimension=age_bracket", headers=self.viewer_headers)
        self.assertEqual(res_conc.status_code, 200)

        res_snap_m = client.get("/api/analytics/monitoring", headers=self.viewer_headers)
        self.assertEqual(res_snap_m.status_code, 200)

        res_snap_g = client.get("/api/analytics/governance", headers=self.viewer_headers)
        self.assertEqual(res_snap_g.status_code, 200)

    # -------------------------------------------------------------
    # 9. ROLE-BY-ROLE RBAC ACCESS MATRIX VALIDATION
    # -------------------------------------------------------------

    def test_rbac_admin_only_endpoints(self):
        """Verify ADMIN can access admin control center while OFFICER and VIEWER receive 403."""
        admin_endpoints = [
            "/api/admin/overview",
            "/api/admin/users",
            "/api/admin/audit",
            "/api/admin/security",
            "/api/admin/model-status",
            "/api/admin/health",
            "/api/audit/logs",
            "/api/users"
        ]
        for ep in admin_endpoints:
            # 1. Unauthenticated -> 401
            res_unauth = client.get(ep)
            self.assertEqual(res_unauth.status_code, 401, f"Failed 401 on {ep}")

            # 2. VIEWER -> 403
            res_viewer = client.get(ep, headers=self.viewer_headers)
            self.assertEqual(res_viewer.status_code, 403, f"Failed 403 for VIEWER on {ep}")

            # 3. CREDIT_OFFICER -> 403
            res_officer = client.get(ep, headers=self.officer_headers)
            self.assertEqual(res_officer.status_code, 403, f"Failed 403 for CREDIT_OFFICER on {ep}")

            # 4. ADMIN -> 200
            res_admin = client.get(ep, headers=self.admin_headers)
            self.assertEqual(res_admin.status_code, 200, f"Failed 200 for ADMIN on {ep}")

    def test_rbac_assessment_creation_restrictions(self):
        """Verify only ADMIN and CREDIT_OFFICER can submit predictions; VIEWER receives 403."""
        payload = {"applicant": self.sample_applicant}

        # 1. Unauthenticated -> 401
        res_unauth = client.post("/api/predictions", json=payload)
        self.assertEqual(res_unauth.status_code, 401)

        # 2. VIEWER -> 403
        res_viewer = client.post("/api/predictions", json=payload, headers=self.viewer_headers)
        self.assertEqual(res_viewer.status_code, 403)

        # 3. CREDIT_OFFICER -> 201
        res_officer = client.post("/api/predictions", json=payload, headers=self.officer_headers)
        self.assertEqual(res_officer.status_code, 201)

        # 4. ADMIN -> 201
        res_admin = client.post("/api/predictions", json=payload, headers=self.admin_headers)
        self.assertEqual(res_admin.status_code, 201)

    # -------------------------------------------------------------
    # 10. ADMIN SELF-PROTECTION SAFETY CONTROLS
    # -------------------------------------------------------------

    def test_admin_self_protection_controls(self):
        """Verify an admin cannot demote or deactivate themselves."""
        # Attempt self-demotion via PATCH
        res_demote = client.patch(
            f"/api/admin/users/{self.admin_user.id}",
            json={"role": "VIEWER"},
            headers=self.admin_headers
        )
        self.assertEqual(res_demote.status_code, 400)
        self.assertIn("cannot demote or deactivate", res_demote.json()["detail"].lower())

        # Attempt self-deactivation via PATCH
        res_deact = client.patch(
            f"/api/admin/users/{self.admin_user.id}",
            json={"is_active": False},
            headers=self.admin_headers
        )
        self.assertEqual(res_deact.status_code, 400)
        self.assertIn("cannot demote or deactivate", res_deact.json()["detail"].lower())

if __name__ == "__main__":
    unittest.main()
