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
from backend.database.models import User, Applicant, Assessment
from backend.core.security import get_password_hash
from backend.api.dependencies import login_rate_limiter, prediction_rate_limiter
from backend.services.governance_service import governance_service

client = TestClient(app)


class TestFairnessAndModelGovernance(unittest.TestCase):
    """
    Phase F — Fairness & Model Governance Test Suite.
    Verifies all 20 required governance test points:
    1. test_01_governance_auth_required
    2. test_02_governance_rbac_permissions
    3. test_03_governance_overview_structure
    4. test_04_available_feature_detection
    5. test_05_group_population_counts
    6. test_06_group_average_probability
    7. test_07_group_risk_distribution
    8. test_08_small_sample_guardrail
    9. test_09_missing_outcome_data_handling
    10. test_10_descriptive_disparity_calculation
    11. test_11_no_fabricated_protected_attributes
    12. test_12_no_fabricated_outcome_labels
    13. test_13_governance_zero_predict_proba_calls
    14. test_14_governance_does_not_modify_model_artifacts
    15. test_15_governance_does_not_modify_threshold
    16. test_16_governance_works_without_nvidia
    17. test_17_ai_governance_boundary_documentation
    18. test_18_existing_predictions_api_unchanged
    19. test_19_existing_simulator_api_unchanged
    20. test_20_existing_monitoring_api_unchanged
    """

    test_user_ids = []
    test_applicant_ids = []
    test_assessment_ids = []

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        login_rate_limiter.client_records.clear()
        prediction_rate_limiter.client_records.clear()

        db = SessionLocal()
        emails = ["gov_admin@bank.com", "gov_officer@bank.com", "gov_viewer@bank.com"]
        db.query(User).filter(User.email.in_(emails)).delete()
        db.commit()

        admin = User(
            email="gov_admin@bank.com",
            password_hash=get_password_hash("Secret123!"),
            role="ADMIN",
            is_active=True
        )
        officer = User(
            email="gov_officer@bank.com",
            password_hash=get_password_hash("Secret123!"),
            role="CREDIT_OFFICER",
            is_active=True
        )
        viewer = User(
            email="gov_viewer@bank.com",
            password_hash=get_password_hash("Secret123!"),
            role="VIEWER",
            is_active=True
        )
        db.add_all([admin, officer, viewer])
        db.commit()

        cls.test_user_ids = [admin.id, officer.id, viewer.id]

        res_admin = client.post("/api/auth/login", json={"email": "gov_admin@bank.com", "password": "Secret123!"})
        cls.headers_admin = {"Authorization": f"Bearer {res_admin.json()['access_token']}"}

        res_officer = client.post("/api/auth/login", json={"email": "gov_officer@bank.com", "password": "Secret123!"})
        cls.headers_officer = {"Authorization": f"Bearer {res_officer.json()['access_token']}"}

        res_viewer = client.post("/api/auth/login", json={"email": "gov_viewer@bank.com", "password": "Secret123!"})
        cls.headers_viewer = {"Authorization": f"Bearer {res_viewer.json()['access_token']}"}

        # Seed applicants for governance testing:
        # 22 applicants in age 26-35 (so n=22 >= 20, sufficient)
        # 3 applicants in age 18-25 (so n=3 < 20, guarded)
        now = datetime.utcnow()

        # Seed 22 applicants in age bracket 26-35
        for i in range(22):
            prob = 0.15 if i % 3 == 0 else (0.28 if i % 3 == 1 else 0.45)
            pred = 1 if prob >= 0.35 else 0
            cat = "LOW RISK" if prob < 0.20 else ("MODERATE RISK" if prob < 0.35 else "HIGH RISK")
            dec = "BAD CREDIT / REJECT" if pred == 1 else ("GOOD CREDIT / APPROVED" if cat == "LOW RISK" else "MANUAL REVIEW / REFER")

            app_rec = Applicant(
                status_checking_account="A14" if i % 2 == 0 else "A11",
                duration_in_months=12 + (i % 5) * 6,
                credit_history="A32",
                purpose="A40",
                credit_amount=2000 + i * 100,
                savings_account="A61",
                present_employment_since="A73",
                installment_rate=2,
                personal_status_sex="A93" if i % 2 == 0 else "A92",
                other_debtors_guarantors="A101",
                present_residence_since=2,
                property="A121",
                age_in_years=28 + (i % 6),  # All between 28 and 33 (in 26-35 group)
                other_installment_plans="A143",
                housing="A152" if i % 2 == 0 else "A151",
                existing_credits=1,
                job="A173",
                num_people_liable=1,
                telephone="A192",
                foreign_worker="A201",
                created_at=now - timedelta(days=i)
            )
            db.add(app_rec)
            db.flush()
            cls.test_applicant_ids.append(app_rec.id)

            asmt = Assessment(
                applicant_id=app_rec.id,
                default_probability=prob,
                prediction=pred,
                risk_category=cat,
                decision=dec,
                threshold=0.35,
                model_name="Tuned Logistic Regression",
                model_version="1.0.0",
                created_at=now - timedelta(days=i)
            )
            db.add(asmt)
            db.flush()
            cls.test_assessment_ids.append(asmt.id)

        # Seed 3 applicants in age bracket 18-25
        for i in range(3):
            prob = 0.32
            pred = 0
            cat = "MODERATE RISK"
            dec = "MANUAL REVIEW / REFER"

            app_rec = Applicant(
                status_checking_account="A11",
                duration_in_months=18,
                credit_history="A34",
                purpose="A43",
                credit_amount=1500,
                savings_account="A61",
                present_employment_since="A72",
                installment_rate=3,
                personal_status_sex="A92",
                other_debtors_guarantors="A101",
                present_residence_since=1,
                property="A122",
                age_in_years=22,  # in 18-25 group
                other_installment_plans="A143",
                housing="A151",
                existing_credits=1,
                job="A172",
                num_people_liable=1,
                telephone="A191",
                foreign_worker="A201",
                created_at=now - timedelta(days=i)
            )
            db.add(app_rec)
            db.flush()
            cls.test_applicant_ids.append(app_rec.id)

            asmt = Assessment(
                applicant_id=app_rec.id,
                default_probability=prob,
                prediction=pred,
                risk_category=cat,
                decision=dec,
                threshold=0.35,
                model_name="Tuned Logistic Regression",
                model_version="1.0.0",
                created_at=now - timedelta(days=i)
            )
            db.add(asmt)
            db.flush()
            cls.test_assessment_ids.append(asmt.id)

        db.commit()
        db.close()

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        if cls.test_assessment_ids:
            db.query(Assessment).filter(Assessment.id.in_(cls.test_assessment_ids)).delete(synchronize_session=False)
        if cls.test_applicant_ids:
            db.query(Applicant).filter(Applicant.id.in_(cls.test_applicant_ids)).delete(synchronize_session=False)
        if cls.test_user_ids:
            db.query(User).filter(User.id.in_(cls.test_user_ids)).delete(synchronize_session=False)
        db.commit()
        db.close()

    # 1. Auth required on governance endpoints
    def test_01_governance_auth_required(self):
        res_ov = client.get("/api/governance/overview")
        self.assertEqual(res_ov.status_code, 401)

        res_grp = client.get("/api/governance/groups")
        self.assertEqual(res_grp.status_code, 401)

        res_lim = client.get("/api/governance/limitations")
        self.assertEqual(res_lim.status_code, 401)

        res_ai = client.get("/api/governance/ai")
        self.assertEqual(res_ai.status_code, 401)

    # 2. RBAC permissions (ADMIN, CREDIT_OFFICER, VIEWER allowed)
    def test_02_governance_rbac_permissions(self):
        for headers in [self.headers_admin, self.headers_officer, self.headers_viewer]:
            res = client.get("/api/governance/overview", headers=headers)
            self.assertEqual(res.status_code, 200)

            res_grp = client.get("/api/governance/groups", headers=headers)
            self.assertEqual(res_grp.status_code, 200)

    # 3. Governance overview structure & verified controls
    def test_03_governance_overview_structure(self):
        res = client.get("/api/governance/overview", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["model_name"], "Tuned Logistic Regression")
        self.assertEqual(data["model_type"], "LogisticRegression")
        self.assertEqual(data["model_version"], "1.0.0")
        self.assertEqual(data["threshold"], 0.35)
        self.assertEqual(data["reference_samples"], 1000)
        self.assertGreaterEqual(data["production_assessments_count"], 25)
        self.assertEqual(data["integrity_status"], "VERIFIED_UNCHANGED")
        self.assertEqual(data["ai_provider"], "NVIDIA AI")

        checklist = data.get("checklist", [])
        self.assertGreaterEqual(len(checklist), 8)
        for item in checklist:
            self.assertEqual(item["status"], "VERIFIED")
            self.assertIn("control", item)
            self.assertIn("details", item)

    # 4. Available feature detection
    def test_04_available_feature_detection(self):
        supported_features = ["age_in_years", "personal_status_sex", "foreign_worker", "housing", "present_employment_since", "job"]
        for feat in supported_features:
            res = client.get(f"/api/governance/groups?feature={feat}", headers=self.headers_officer)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["feature_name"], feat)
            self.assertGreater(len(data["groups"]), 0)

        # Fallback for unsupported feature
        res_fallback = client.get("/api/governance/groups?feature=unsupported_var", headers=self.headers_officer)
        self.assertEqual(res_fallback.status_code, 200)
        self.assertEqual(res_fallback.json()["feature_name"], "age_in_years")

    # 5. Group population counts sum up to total records
    def test_05_group_population_counts(self):
        res = client.get("/api/governance/groups?feature=age_in_years", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        groups = data["groups"]
        total_sample = sum(g["sample_count"] for g in groups)
        self.assertEqual(total_sample, data["total_samples"])

    # 6. Group average probability calculation
    def test_06_group_average_probability(self):
        res = client.get("/api/governance/groups?feature=age_in_years", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        for g in data["groups"]:
            if g["sample_count"] > 0:
                self.assertGreaterEqual(g["average_predicted_probability"], 0.0)
                self.assertLessEqual(g["average_predicted_probability"], 1.0)
                self.assertGreaterEqual(g["median_predicted_probability"], 0.0)
                self.assertLessEqual(g["median_predicted_probability"], 1.0)

    # 7. Group risk distribution (low, moderate, high counts and rates)
    def test_07_group_risk_distribution(self):
        res = client.get("/api/governance/groups?feature=age_in_years", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        for g in data["groups"]:
            n = g["sample_count"]
            if n > 0:
                risk_sum = g["low_risk_count"] + g["moderate_risk_count"] + g["high_risk_count"]
                self.assertEqual(risk_sum, n)
                rate_sum = g["low_risk_rate"] + g["moderate_risk_rate"] + g["high_risk_rate"]
                self.assertAlmostEqual(rate_sum, 1.0, delta=0.01)

    # 8. Small sample guardrail (n < 20 triggers INSUFFICIENT_SAMPLE)
    def test_08_small_sample_guardrail(self):
        res = client.get("/api/governance/groups?feature=age_in_years&min_sample_size=20", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        groups_by_key = {g["group_key"]: g for g in data["groups"]}

        # Group 18-25 has only 3 samples -> should trigger guardrail
        g_young = groups_by_key.get("18-25")
        self.assertIsNotNone(g_young)
        self.assertFalse(g_young["has_sufficient_sample"])
        self.assertEqual(g_young["sample_status"], "INSUFFICIENT_SAMPLE")
        self.assertIn("Small sample size", g_young["warning"])
        self.assertIsNone(g_young["disparate_impact_ratio"])

        # Group 26-35 has 22 samples -> should pass guardrail
        g_adult = groups_by_key.get("26-35")
        self.assertIsNotNone(g_adult)
        self.assertTrue(g_adult["has_sufficient_sample"])
        self.assertEqual(g_adult["sample_status"], "SUFFICIENT")
        self.assertIsNone(g_adult["warning"])

    # 9. Missing outcome-data handling
    def test_09_missing_outcome_data_handling(self):
        res = client.get("/api/governance/limitations", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertFalse(data["production_outcomes_available"])
        self.assertEqual(data["production_outcome_status"], "OUTCOME_DATA_UNAVAILABLE")
        self.assertIn("Outcome data not yet available", data["outcome_message"])
        self.assertIn("Production repayment/default outcomes are currently unavailable", data["outcome_message"])

    # 10. Descriptive disparity calculation (with min_sample_size adjustment)
    def test_10_descriptive_disparity_calculation(self):
        # With min_sample_size=2, both 18-25 (n=3) and 26-35 (n=22) are sufficient
        res = client.get("/api/governance/groups?feature=age_in_years&min_sample_size=2", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        obs = data["observed_differences"]

        self.assertEqual(obs["status"], "DESCRIPTIVE_MONITORING")
        self.assertIsNotNone(obs["benchmark_group"])
        self.assertIn("max_probability_difference", obs)
        self.assertIn("interpretation_note", obs)
        # Ensure it does not state "FAIR" or "UNFAIR"
        self.assertNotIn("MODEL IS FAIR", json.dumps(data))
        self.assertNotIn("MODEL IS UNFAIR", json.dumps(data))

    # 11. No fabricated protected attributes
    def test_11_no_fabricated_protected_attributes(self):
        res = client.get("/api/governance/limitations", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        unavailable = " ".join(data["unavailable_protected_attributes"]).lower()

        self.assertIn("race", unavailable)
        self.assertIn("religion", unavailable)
        self.assertIn("sexual orientation", unavailable)
        self.assertIn("disability", unavailable)
        self.assertIn("standalone gender", unavailable)

    # 12. No fabricated outcome labels
    def test_12_no_fabricated_outcome_labels(self):
        res = client.get("/api/governance/overview", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        # Verify no outcome-based metrics (like production accuracy or precision) are claimed
        data = res.json()
        self.assertNotIn("production_accuracy", data)
        self.assertNotIn("production_equalized_odds", data)

    # 13. Governance does not call predict_proba()
    def test_13_governance_zero_predict_proba_calls(self):
        from backend.services.prediction_service import prediction_service

        with patch.object(prediction_service.model, "predict_proba") as mock_predict_proba:
            client.get("/api/governance/overview", headers=self.headers_officer)
            client.get("/api/governance/groups", headers=self.headers_officer)
            client.get("/api/governance/limitations", headers=self.headers_officer)
            client.get("/api/governance/ai", headers=self.headers_officer)
            mock_predict_proba.assert_not_called()

    # 14. Governance does not modify model artifacts
    def test_14_governance_does_not_modify_model_artifacts(self):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        model_path = os.path.join(project_root, "models", "final_model.joblib")
        prep_path = os.path.join(project_root, "models", "preprocessing_pipeline.joblib")
        thresh_path = os.path.join(project_root, "models", "threshold_config.json")

        def get_hash(p):
            with open(p, "rb") as f:
                return hashlib.sha256(f.read()).hexdigest()

        h_model = get_hash(model_path)
        h_prep = get_hash(prep_path)
        h_thresh = get_hash(thresh_path)

        client.get("/api/governance/overview", headers=self.headers_officer)
        client.get("/api/governance/groups?feature=personal_status_sex", headers=self.headers_officer)
        client.get("/api/governance/limitations", headers=self.headers_officer)

        self.assertEqual(get_hash(model_path), h_model)
        self.assertEqual(get_hash(prep_path), h_prep)
        self.assertEqual(get_hash(thresh_path), h_thresh)

    # 15. Governance does not modify threshold (remains 0.35)
    def test_15_governance_does_not_modify_threshold(self):
        res = client.get("/api/governance/overview", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["threshold"], 0.35)

    # 16. Governance works without NVIDIA API key
    def test_16_governance_works_without_nvidia(self):
        with patch.dict(os.environ, {"NVIDIA_API_KEY": ""}):
            res_ov = client.get("/api/governance/overview", headers=self.headers_officer)
            self.assertEqual(res_ov.status_code, 200)

            res_grp = client.get("/api/governance/groups", headers=self.headers_officer)
            self.assertEqual(res_grp.status_code, 200)

            res_lim = client.get("/api/governance/limitations", headers=self.headers_officer)
            self.assertEqual(res_lim.status_code, 200)

            res_ai = client.get("/api/governance/ai", headers=self.headers_officer)
            self.assertEqual(res_ai.status_code, 200)

    # 17. AI governance boundary documentation
    def test_17_ai_governance_boundary_documentation(self):
        res = client.get("/api/governance/ai", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["ai_provider"], "NVIDIA AI")
        self.assertIn("Explainability", data["ai_role"])
        self.assertIn("Local Tuned Logistic Regression", data["prediction_authority"])
        self.assertGreaterEqual(len(data["boundaries"]), 5)
        self.assertIn("safety_notice", data)

    # 18. Existing predictions API unchanged
    def test_18_existing_predictions_api_unchanged(self):
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
        self.assertIn("default_probability", data)
        self.assertEqual(data["decision_threshold"], 0.35)

    # 19. Existing simulator API unchanged
    def test_19_existing_simulator_api_unchanged(self):
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
        res = client.post(
            "/api/simulate",
            json={"original_applicant": applicant_payload, "modifications": {"credit_amount": 5000}},
            headers=self.headers_officer
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("difference", data)

    # 20. Existing monitoring API unchanged
    def test_20_existing_monitoring_api_unchanged(self):
        res_ov = client.get("/api/monitoring/overview", headers=self.headers_officer)
        self.assertEqual(res_ov.status_code, 200)

        res_drift = client.get("/api/monitoring/drift", headers=self.headers_officer)
        self.assertEqual(res_drift.status_code, 200)

        res_perf = client.get("/api/monitoring/performance", headers=self.headers_officer)
        self.assertEqual(res_perf.status_code, 200)


if __name__ == "__main__":
    unittest.main()
