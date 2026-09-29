import unittest
import json
import sys
import os
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.core.config import settings
from backend.database.database import engine, Base, SessionLocal
from backend.database.models import User
from backend.core.security import get_password_hash
from backend.services.nvidia_ai_service import NvidiaAIService, nvidia_ai_service
from backend.services.prediction_service import prediction_service
from backend.api.dependencies import login_rate_limiter, prediction_rate_limiter

client = TestClient(app)


class TestCreditRiskSimulator(unittest.TestCase):
    """
    Phase C — Credit Risk Simulator Test Suite.
    Verifies the 15 required test points:
    1. Original prediction is calculated correctly.
    2. Simulated prediction is calculated correctly.
    3. Both use the same ML pipeline.
    4. Probability difference is correct.
    5. Percentage-point difference is correct.
    6. Risk category comparison is correct.
    7. Risk-change flag works.
    8. Invalid input is rejected.
    9. Unknown fields are rejected.
    10. NVIDIA failure does not break simulation.
    11. NVIDIA cannot modify simulation probability.
    12. NVIDIA cannot modify risk category.
    13. Threshold remains 0.35.
    14. Existing /api/predictions remains unchanged.
    15. Authentication/RBAC continues working.
    """

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        login_rate_limiter.client_records.clear()
        prediction_rate_limiter.client_records.clear()

        db = SessionLocal()
        db.query(User).filter(User.email.in_(["sim_officer@bank.com", "sim_viewer@bank.com"])).delete()
        db.commit()

        officer = User(
            email="sim_officer@bank.com",
            password_hash=get_password_hash("Secret123!"),
            role="CREDIT_OFFICER",
            is_active=True
        )
        viewer = User(
            email="sim_viewer@bank.com",
            password_hash=get_password_hash("Secret123!"),
            role="VIEWER",
            is_active=True
        )
        db.add_all([officer, viewer])
        db.commit()
        db.close()

        # Login officer
        login_res = client.post(
            "/api/auth/login",
            json={"email": "sim_officer@bank.com", "password": "Secret123!"}
        )
        token_officer = login_res.json().get("access_token")
        cls.headers_officer = {"Authorization": f"Bearer {token_officer}"}

        # Login viewer
        login_res_v = client.post(
            "/api/auth/login",
            json={"email": "sim_viewer@bank.com", "password": "Secret123!"}
        )
        token_viewer = login_res_v.json().get("access_token")
        cls.headers_viewer = {"Authorization": f"Bearer {token_viewer}"}

        # Baseline profiles
        cls.high_risk_profile = {
            "status_checking_account": "A11",
            "duration_in_months": 48,
            "credit_history": "A30",
            "purpose": "A46",
            "credit_amount": 8000,
            "savings_account": "A61",
            "present_employment_since": "A72",
            "installment_rate": 4,
            "personal_status_sex": "A92",
            "other_debtors_guarantors": "A101",
            "present_residence_since": 2,
            "property": "A124",
            "age_in_years": 22,
            "other_installment_plans": "A141",
            "housing": "A151",
            "existing_credits": 2,
            "job": "A172",
            "num_people_liable": 1,
            "telephone": "A191",
            "foreign_worker": "A201"
        }

        cls.improved_profile = {
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

    def setUp(self):
        prediction_rate_limiter.client_records.clear()

    # 1. Original prediction is calculated correctly
    def test_01_original_prediction_calculated_correctly(self):
        """1. Verify original prediction matches prediction_service exactly."""
        expected = prediction_service.predict(self.high_risk_profile)
        payload = {
            "original_applicant": self.high_risk_profile,
            "simulated_applicant": self.improved_profile
        }
        with patch.object(NvidiaAIService, "_call_nvidia_simulation_api") as mock_ai:
            mock_ai.return_value = {
                "explanation": "Simulated test explanation.",
                "summary": "Simulated test summary.",
                "insights": ["Insight 1"],
                "provider": "NVIDIA AI",
                "model": "meta/llama-3.2-11b-vision-instruct",
                "status": "SUCCESS",
                "generated_at": "2026-09-29T12:00:00"
            }
            res = client.post("/api/simulate", headers=self.headers_officer, json=payload)

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["original"]["default_probability"], expected["default_probability"])
        self.assertEqual(data["original"]["risk_category"], expected["risk_category"])
        self.assertEqual(data["original"]["predicted_class"], expected["predicted_class"])
        self.assertEqual(data["original"]["decision_threshold"], 0.35)

    # 2. Simulated prediction is calculated correctly
    def test_02_simulated_prediction_calculated_correctly(self):
        """2. Verify simulated prediction matches prediction_service for modified profile."""
        expected_sim = prediction_service.predict(self.improved_profile)
        payload = {
            "original_applicant": self.high_risk_profile,
            "simulated_applicant": self.improved_profile
        }
        with patch.object(NvidiaAIService, "_call_nvidia_simulation_api") as mock_ai:
            mock_ai.return_value = {
                "explanation": "Test explanation.",
                "summary": "Test summary.",
                "insights": ["Insight 1"],
                "provider": "NVIDIA AI",
                "model": "meta/llama-3.2-11b-vision-instruct",
                "status": "SUCCESS",
                "generated_at": "2026-09-29T12:00:00"
            }
            res = client.post("/api/simulate", headers=self.headers_officer, json=payload)

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["simulated"]["default_probability"], expected_sim["default_probability"])
        self.assertEqual(data["simulated"]["risk_category"], expected_sim["risk_category"])
        self.assertEqual(data["simulated"]["predicted_class"], expected_sim["predicted_class"])

    # 3. Both use the same ML pipeline
    def test_03_same_ml_pipeline_used(self):
        """3. Confirm simulator invokes prediction_service for both original and simulated."""
        with patch.object(prediction_service, "predict", wraps=prediction_service.predict) as spy_predict:
            payload = {
                "original_applicant": self.high_risk_profile,
                "simulated_applicant": self.improved_profile
            }
            with patch.object(NvidiaAIService, "_call_nvidia_simulation_api", return_value={
                "explanation": "Exp", "summary": "Sum", "insights": ["Ins"],
                "provider": "NVIDIA AI", "model": "m", "status": "SUCCESS", "generated_at": "2026-09-29T12:00:00"
            }):
                res = client.post("/api/simulate", headers=self.headers_officer, json=payload)
            self.assertEqual(res.status_code, 200)
            self.assertEqual(spy_predict.call_count, 2)

    # 4. Probability difference is correct
    def test_04_probability_difference_correct(self):
        """4. Verify probability_difference == simulated_probability - original_probability."""
        orig_ml = prediction_service.predict(self.high_risk_profile)
        sim_ml = prediction_service.predict(self.improved_profile)
        expected_diff = round(sim_ml["default_probability"] - orig_ml["default_probability"], 4)

        payload = {
            "original_applicant": self.high_risk_profile,
            "simulated_applicant": self.improved_profile
        }
        with patch.object(NvidiaAIService, "_call_nvidia_simulation_api", return_value={
            "explanation": "Exp", "summary": "Sum", "insights": ["Ins"],
            "provider": "NVIDIA AI", "model": "m", "status": "SUCCESS", "generated_at": "2026-09-29T12:00:00"
        }):
            res = client.post("/api/simulate", headers=self.headers_officer, json=payload)

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertAlmostEqual(data["difference"]["probability_difference"], expected_diff, places=4)

    # 5. Percentage-point difference is correct
    def test_05_percentage_point_difference_correct(self):
        """5. Verify probability_points == (simulated_prob - orig_prob) * 100."""
        orig_ml = prediction_service.predict(self.high_risk_profile)
        sim_ml = prediction_service.predict(self.improved_profile)
        expected_points = round((sim_ml["default_probability"] - orig_ml["default_probability"]) * 100, 2)

        payload = {
            "original_applicant": self.high_risk_profile,
            "simulated_applicant": self.improved_profile
        }
        with patch.object(NvidiaAIService, "_call_nvidia_simulation_api", return_value={
            "explanation": "Exp", "summary": "Sum", "insights": ["Ins"],
            "provider": "NVIDIA AI", "model": "m", "status": "SUCCESS", "generated_at": "2026-09-29T12:00:00"
        }):
            res = client.post("/api/simulate", headers=self.headers_officer, json=payload)

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertAlmostEqual(data["difference"]["probability_points"], expected_points, places=2)
        self.assertEqual(data["difference"]["direction"], "lower")

    # 6. Risk category comparison is correct
    def test_06_risk_category_comparison_correct(self):
        """6. Verify original_risk and simulated_risk fields match."""
        payload = {
            "original_applicant": self.high_risk_profile,
            "simulated_applicant": self.improved_profile
        }
        with patch.object(NvidiaAIService, "_call_nvidia_simulation_api", return_value={
            "explanation": "Exp", "summary": "Sum", "insights": ["Ins"],
            "provider": "NVIDIA AI", "model": "m", "status": "SUCCESS", "generated_at": "2026-09-29T12:00:00"
        }):
            res = client.post("/api/simulate", headers=self.headers_officer, json=payload)

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["original_risk"], data["original"]["risk_category"])
        self.assertEqual(data["simulated_risk"], data["simulated"]["risk_category"])

    # 7. Risk-change flag works
    def test_07_risk_change_flag_works(self):
        """7. Verify risk_changed is True when categories differ, and False when identical."""
        # Case A: Categories differ
        payload_changed = {
            "original_applicant": self.high_risk_profile,
            "simulated_applicant": self.improved_profile
        }
        with patch.object(NvidiaAIService, "_call_nvidia_simulation_api", return_value={
            "explanation": "Exp", "summary": "Sum", "insights": ["Ins"],
            "provider": "NVIDIA AI", "model": "m", "status": "SUCCESS", "generated_at": "2026-09-29T12:00:00"
        }):
            res_changed = client.post("/api/simulate", headers=self.headers_officer, json=payload_changed)
        self.assertEqual(res_changed.status_code, 200)
        self.assertTrue(res_changed.json()["risk_changed"])

        # Case B: Identical profile
        payload_same = {
            "original_applicant": self.improved_profile,
            "simulated_applicant": self.improved_profile
        }
        with patch.object(NvidiaAIService, "_call_nvidia_simulation_api", return_value={
            "explanation": "Exp", "summary": "Sum", "insights": ["Ins"],
            "provider": "NVIDIA AI", "model": "m", "status": "SUCCESS", "generated_at": "2026-09-29T12:00:00"
        }):
            res_same = client.post("/api/simulate", headers=self.headers_officer, json=payload_same)
        self.assertEqual(res_same.status_code, 200)
        self.assertFalse(res_same.json()["risk_changed"])

    # 8. Invalid input is rejected
    def test_08_invalid_input_rejected(self):
        """8. Verify input with out-of-bound numerical value is rejected with 422."""
        bad_profile = dict(self.high_risk_profile)
        bad_profile["duration_in_months"] = 120  # Max is 72

        payload = {
            "original_applicant": self.high_risk_profile,
            "simulated_applicant": bad_profile
        }
        res = client.post("/api/simulate", headers=self.headers_officer, json=payload)
        self.assertEqual(res.status_code, 422)

    # 9. Unknown fields are rejected
    def test_09_unknown_fields_rejected(self):
        """9. Verify unexpected model feature injection is rejected with 422."""
        payload = {
            "original_applicant": self.high_risk_profile,
            "modifications": {
                "fabricated_feature": "malicious_injection"
            }
        }
        res = client.post("/api/simulate", headers=self.headers_officer, json=payload)
        self.assertEqual(res.status_code, 422)

    # 10. NVIDIA failure does not break simulation
    def test_10_nvidia_failure_does_not_break_simulation(self):
        """10. Verify simulation succeeds with deterministic fallback when NVIDIA fails."""
        payload = {
            "original_applicant": self.high_risk_profile,
            "simulated_applicant": self.improved_profile
        }
        with patch.object(NvidiaAIService, "_call_nvidia_simulation_api", side_effect=Exception("Read timed out")):
            res = client.post("/api/simulate", headers=self.headers_officer, json=payload)

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["ai_provider"], "Deterministic Fallback")
        self.assertIsNotNone(data["ai_explanation"])
        self.assertIsNotNone(data["ai_summary"])
        self.assertGreater(len(data["ai_insights"]), 0)

    # 11. NVIDIA cannot modify simulation probability
    def test_11_nvidia_cannot_modify_simulation_probability(self):
        """11. CRITICAL: NVIDIA layer must never alter or mutate simulation probability."""
        sim_ml = prediction_service.predict(self.improved_profile)
        expected_prob = sim_ml["default_probability"]

        payload = {
            "original_applicant": self.high_risk_profile,
            "simulated_applicant": self.improved_profile
        }
        with patch.object(NvidiaAIService, "_call_nvidia_simulation_api", return_value={
            "explanation": "AI suggests 0.99 probability",
            "summary": "AI summary",
            "insights": ["Ins"],
            "provider": "NVIDIA AI",
            "model": "m",
            "status": "SUCCESS",
            "generated_at": "2026-09-29T12:00:00"
        }):
            res = client.post("/api/simulate", headers=self.headers_officer, json=payload)

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["simulated"]["default_probability"], expected_prob)

    # 12. NVIDIA cannot modify risk category
    def test_12_nvidia_cannot_modify_risk_category(self):
        """12. CRITICAL: NVIDIA layer must never alter or mutate simulated risk category."""
        sim_ml = prediction_service.predict(self.improved_profile)
        expected_risk = sim_ml["risk_category"]

        payload = {
            "original_applicant": self.high_risk_profile,
            "simulated_applicant": self.improved_profile
        }
        with patch.object(NvidiaAIService, "_call_nvidia_simulation_api", return_value={
            "explanation": "AI override",
            "summary": "AI summary",
            "insights": ["Ins"],
            "provider": "NVIDIA AI",
            "model": "m",
            "status": "SUCCESS",
            "generated_at": "2026-09-29T12:00:00"
        }):
            res = client.post("/api/simulate", headers=self.headers_officer, json=payload)

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["simulated_risk"], expected_risk)
        self.assertEqual(data["simulated"]["risk_category"], expected_risk)

    # 13. Threshold remains 0.35
    def test_13_threshold_remains_0_35(self):
        """13. Decision threshold must remain strictly 0.35 on all outputs."""
        payload = {
            "original_applicant": self.high_risk_profile,
            "simulated_applicant": self.improved_profile
        }
        with patch.object(NvidiaAIService, "_call_nvidia_simulation_api", return_value={
            "explanation": "Exp", "summary": "Sum", "insights": ["Ins"],
            "provider": "NVIDIA AI", "model": "m", "status": "SUCCESS", "generated_at": "2026-09-29T12:00:00"
        }):
            res = client.post("/api/simulate", headers=self.headers_officer, json=payload)

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["original"]["decision_threshold"], 0.35)
        self.assertEqual(data["simulated"]["decision_threshold"], 0.35)

    # 14. Existing /api/predictions remains unchanged
    def test_14_existing_predictions_api_remains_unchanged(self):
        """14. Verify standard /api/predictions endpoint continues to operate correctly."""
        with patch.object(NvidiaAIService, "_call_nvidia_api", return_value={
            "explanation": "Standard pred explanation",
            "summary": "Standard pred summary",
            "insights": ["Standard insight"],
            "provider": "NVIDIA AI",
            "model": "meta/llama-3.2-11b-vision-instruct",
            "status": "SUCCESS",
            "generated_at": "2026-09-29T12:00:00"
        }):
            res = client.post(
                "/api/predictions",
                headers=self.headers_officer,
                json={"applicant": self.improved_profile}
            )

        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("prediction_id", data)
        self.assertEqual(data["decision_threshold"], 0.35)

    # 15. Authentication/RBAC continues working
    def test_15_auth_and_rbac(self):
        """15. Simulation requires valid JWT authentication and allows authorized roles."""
        payload = {
            "original_applicant": self.high_risk_profile,
            "simulated_applicant": self.improved_profile
        }

        # Case A: Unauthenticated request is rejected with 401
        res_no_auth = client.post("/api/simulate", json=payload)
        self.assertEqual(res_no_auth.status_code, 401)

        # Case B: VIEWER role is permitted to run exploratory simulation
        with patch.object(NvidiaAIService, "_call_nvidia_simulation_api", return_value={
            "explanation": "Viewer simulation", "summary": "Viewer summary", "insights": ["Viewer insight"],
            "provider": "NVIDIA AI", "model": "m", "status": "SUCCESS", "generated_at": "2026-09-29T12:00:00"
        }):
            res_viewer = client.post("/api/simulate", headers=self.headers_viewer, json=payload)
        self.assertEqual(res_viewer.status_code, 200)


if __name__ == "__main__":
    unittest.main()
