import unittest
import json
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.database.database import engine, Base, SessionLocal
from backend.database.models import User
from backend.core.security import get_password_hash

client = TestClient(app)

class TestBackendAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        
        # Ensure test officer user exists
        officer = db.query(User).filter(User.email == "api_officer@bank.com").first()
        if not officer:
            officer = User(email="api_officer@bank.com", password_hash=get_password_hash("Secret123!"), role="ADMIN", is_active=True)
            db.add(officer)
            db.commit()
        db.close()

        # Login to obtain token
        login_res = client.post("/api/auth/login", json={"email": "api_officer@bank.com", "password": "Secret123!"})
        token = login_res.json().get("access_token")
        cls.headers = {"Authorization": f"Bearer {token}"}

        # Create a sample prediction to populate database
        payload = {
            "applicant": {
                "status_checking_account": "A14",
                "duration_in_months": 12,
                "credit_history": "A32",
                "purpose": "A40",
                "credit_amount": 1200,
                "savings_account": "A64",
                "present_employment_since": "A75",
                "installment_rate": 2,
                "personal_status_sex": "A93",
                "other_debtors_guarantors": "A101",
                "present_residence_since": 4,
                "property": "A121",
                "age_in_years": 45,
                "other_installment_plans": "A143",
                "housing": "A152",
                "existing_credits": 1,
                "job": "A173",
                "num_people_liable": 1,
                "telephone": "A192",
                "foreign_worker": "A201"
            }
        }
        from unittest.mock import patch
        from backend.services.nvidia_ai_service import nvidia_ai_service

        with patch.object(
            nvidia_ai_service,
            "_call_nvidia_api",
            return_value={
                "explanation": "Test explanation rationale.",
                "summary": "Test underwriting summary.",
                "insights": ["Test insight 1", "Test insight 2"],
                "provider": "NVIDIA AI",
                "model": "meta/llama-3.2-11b-vision-instruct",
                "status": "SUCCESS",
                "generated_at": "2026-09-29T12:00:00"
            }
        ):
            cls.init_response = client.post("/api/predictions", json=payload, headers=cls.headers)

    def test_health_endpoint(self):
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("status", data)
        self.assertIn("database", data)
        self.assertTrue(data["api"])
        self.assertTrue(data["model_loaded"])
        self.assertTrue(data["preprocessing_loaded"])
        self.assertTrue(data["threshold_loaded"])
        self.assertTrue(data["authentication"])

    def test_model_info_endpoint(self):
        response = client.get("/api/model/info", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["model_name"], "LogisticRegression")
        self.assertEqual(data["decision_threshold"], 0.35)
        self.assertEqual(data["test_roc_auc"], 0.8095)

    def test_prediction_creation(self):
        self.assertEqual(self.init_response.status_code, 201)
        data = self.init_response.json()
        self.assertIn("prediction_id", data)
        self.assertLess(data["default_probability"], 0.35)
        self.assertEqual(data["predicted_class"], 0)
        self.assertEqual(data["risk_category"], "LOW RISK")
        self.assertEqual(data["credit_decision"], "GOOD CREDIT / APPROVED")

    def test_dashboard_summary(self):
        response = client.get("/api/dashboard/summary", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_assessments", data)
        self.assertIn("manual_review_count", data)
        self.assertGreaterEqual(data["total_assessments"], 1)

    def test_dashboard_summary_with_days(self):
        for d in [7, 30, 90]:
            response = client.get(f"/api/dashboard/summary?days={d}", headers=self.headers)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("total_assessments", data)
            self.assertIn("manual_review_count", data)

    def test_analytics_overview(self):
        response = client.get("/api/analytics/overview", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("risk_distribution", data)
        self.assertIn("probability_histogram", data)
        self.assertIn("default_probability_trend", data)
        self.assertIn("credit_history_vs_risk", data)

    def test_analytics_overview_with_days(self):
        response = client.get("/api/analytics/overview?days=30", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("risk_distribution", data)
        self.assertIn("default_probability_trend", data)
        self.assertIn("credit_history_vs_risk", data)

    def test_audit_logs(self):
        response = client.get("/api/audit/logs", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)

if __name__ == "__main__":
    unittest.main()
