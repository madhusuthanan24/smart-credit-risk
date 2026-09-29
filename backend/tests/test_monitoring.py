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
from backend.services.monitoring_service import monitoring_service

client = TestClient(app)


class TestModelMonitoringAndDrift(unittest.TestCase):
    """
    Phase E — Model Monitoring & Data Drift Detection Test Suite.
    Verifies all 20 required monitoring test cases:
    1. test_01_monitoring_overview_auth_required
    2. test_02_monitoring_overview_rbac_allowed
    3. test_03_monitoring_volume_counts
    4. test_04_monitoring_risk_distribution
    5. test_05_monitoring_probability_stats
    6. test_06_monitoring_probability_histogram
    7. test_07_monitoring_threshold_metrics
    8. test_08_monitoring_drift_auth_required
    9. test_09_monitoring_drift_insufficient_data
    10. test_10_monitoring_drift_numerical_psi
    11. test_11_monitoring_drift_categorical_psi
    12. test_12_monitoring_drift_classification_levels
    13. test_13_monitoring_drift_overall_status
    14. test_14_monitoring_performance_auth_required
    15. test_15_monitoring_baseline_metrics
    16. test_16_monitoring_production_performance_unavailability
    17. test_17_monitoring_distinction_drift_vs_performance
    18. test_18_monitoring_does_not_modify_model
    19. test_19_monitoring_zero_predict_proba_calls
    20. test_20_monitoring_works_without_nvidia
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
        # Clean up any leftover test users
        emails = ["mon_admin@bank.com", "mon_officer@bank.com", "mon_viewer@bank.com"]
        db.query(User).filter(User.email.in_(emails)).delete()
        db.commit()

        # Create test users with distinct roles
        admin = User(
            email="mon_admin@bank.com",
            password_hash=get_password_hash("Secret123!"),
            role="ADMIN",
            is_active=True
        )
        officer = User(
            email="mon_officer@bank.com",
            password_hash=get_password_hash("Secret123!"),
            role="CREDIT_OFFICER",
            is_active=True
        )
        viewer = User(
            email="mon_viewer@bank.com",
            password_hash=get_password_hash("Secret123!"),
            role="VIEWER",
            is_active=True
        )
        db.add_all([admin, officer, viewer])
        db.commit()

        cls.test_user_ids = [admin.id, officer.id, viewer.id]

        # Login users to get tokens
        res_admin = client.post("/api/auth/login", json={"email": "mon_admin@bank.com", "password": "Secret123!"})
        cls.headers_admin = {"Authorization": f"Bearer {res_admin.json()['access_token']}"}

        res_officer = client.post("/api/auth/login", json={"email": "mon_officer@bank.com", "password": "Secret123!"})
        cls.headers_officer = {"Authorization": f"Bearer {res_officer.json()['access_token']}"}

        res_viewer = client.post("/api/auth/login", json={"email": "mon_viewer@bank.com", "password": "Secret123!"})
        cls.headers_viewer = {"Authorization": f"Bearer {res_viewer.json()['access_token']}"}

        # Seed sample applicants and assessments for deterministic testing
        # 10 applicants with varied default probabilities
        sample_probs = [0.08, 0.15, 0.22, 0.28, 0.33, 0.38, 0.45, 0.55, 0.68, 0.82]
        now = datetime.utcnow()

        for idx, p in enumerate(sample_probs):
            app_rec = Applicant(
                status_checking_account="A11" if idx % 2 == 0 else "A14",
                duration_in_months=12 + (idx * 3),
                credit_history="A32" if idx % 2 == 0 else "A34",
                purpose="A40" if idx % 2 == 0 else "A43",
                credit_amount=1500 + (idx * 500),
                savings_account="A61" if idx % 2 == 0 else "A65",
                present_employment_since="A73" if idx % 2 == 0 else "A75",
                installment_rate=2 if idx % 2 == 0 else 4,
                personal_status_sex="A93",
                other_debtors_guarantors="A101",
                present_residence_since=2,
                property="A121",
                age_in_years=25 + (idx * 4),
                other_installment_plans="A143",
                housing="A152",
                existing_credits=1,
                job="A173",
                num_people_liable=1,
                telephone="A192",
                foreign_worker="A201",
                created_at=now - timedelta(days=idx)
            )
            db.add(app_rec)
            db.flush()
            cls.test_applicant_ids.append(app_rec.id)

            if p < 0.20:
                cat = "LOW RISK"
                dec = "GOOD CREDIT / APPROVED"
                pred = 0
            elif p < 0.35:
                cat = "MODERATE RISK"
                dec = "MANUAL REVIEW / REFER"
                pred = 0
            else:
                cat = "HIGH RISK"
                dec = "BAD CREDIT / REJECT"
                pred = 1

            asmt = Assessment(
                applicant_id=app_rec.id,
                default_probability=p,
                prediction=pred,
                risk_category=cat,
                decision=dec,
                threshold=0.35,
                model_name="Tuned Logistic Regression",
                model_version="1.0.0",
                created_at=now - timedelta(days=idx)
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

    # 1. Auth required on overview
    def test_01_monitoring_overview_auth_required(self):
        res = client.get("/api/monitoring/overview")
        self.assertEqual(res.status_code, 401)

    # 2. RBAC allowed on overview for ADMIN, CREDIT_OFFICER, VIEWER
    def test_02_monitoring_overview_rbac_allowed(self):
        res_admin = client.get("/api/monitoring/overview", headers=self.headers_admin)
        self.assertEqual(res_admin.status_code, 200)

        res_officer = client.get("/api/monitoring/overview", headers=self.headers_officer)
        self.assertEqual(res_officer.status_code, 200)

        res_viewer = client.get("/api/monitoring/overview", headers=self.headers_viewer)
        self.assertEqual(res_viewer.status_code, 200)

    # 3. Prediction volume counts
    def test_03_monitoring_volume_counts(self):
        res = client.get("/api/monitoring/overview", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        vol = data.get("volume", {})
        self.assertIn("today", vol)
        self.assertIn("last_7_days", vol)
        self.assertIn("last_30_days", vol)
        self.assertIn("all_time", vol)
        self.assertGreaterEqual(vol["all_time"], 10)
        self.assertGreaterEqual(vol["last_30_days"], 10)
        self.assertGreaterEqual(vol["last_7_days"], 1)

    # 4. Risk category distribution
    def test_04_monitoring_risk_distribution(self):
        res = client.get("/api/monitoring/overview", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        rd = data.get("risk_distribution", {})
        self.assertIn("low_risk", rd)
        self.assertIn("moderate_risk", rd)
        self.assertIn("high_risk", rd)
        self.assertIn("total", rd)
        self.assertGreaterEqual(rd["total"], 10)
        self.assertGreaterEqual(rd["low_risk"]["count"], 2)
        self.assertGreaterEqual(rd["moderate_risk"]["count"], 3)
        self.assertGreaterEqual(rd["high_risk"]["count"], 5)
        # Check percentage formatting
        self.assertTrue(rd["low_risk"]["percentage_formatted"].endswith("%"))

    # 5. Probability metrics (mean, median, min, max)
    def test_05_monitoring_probability_stats(self):
        res = client.get("/api/monitoring/overview", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        stats = data.get("probability_metrics", {})
        self.assertIn("mean", stats)
        self.assertIn("median", stats)
        self.assertIn("min", stats)
        self.assertIn("max", stats)
        self.assertGreaterEqual(stats["min"], 0.0)
        self.assertLessEqual(stats["max"], 1.0)
        self.assertGreater(stats["max"], stats["min"])

    # 6. 10-Bucket probability histogram
    def test_06_monitoring_probability_histogram(self):
        res = client.get("/api/monitoring/overview", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        hist = data.get("probability_histogram", [])
        self.assertEqual(len(hist), 10)
        bins = [b["bin"] for b in hist]
        self.assertEqual(bins[0], "0-10%")
        self.assertEqual(bins[9], "90-100%")
        total_hist_count = sum(b["count"] for b in hist)
        self.assertEqual(total_hist_count, data["risk_distribution"]["total"])

    # 7. Threshold metrics (0.35, below vs at/above)
    def test_07_monitoring_threshold_metrics(self):
        res = client.get("/api/monitoring/overview", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        tm = data.get("threshold_metrics", {})
        self.assertEqual(tm["threshold"], 0.35)
        total = data["risk_distribution"]["total"]
        self.assertEqual(tm["below_threshold_count"] + tm["at_or_above_threshold_count"], total)
        self.assertAlmostEqual(tm["below_threshold_pct"] + tm["at_or_above_threshold_pct"], 100.0, delta=1.0)

    # 8. Drift endpoint auth required
    def test_08_monitoring_drift_auth_required(self):
        res = client.get("/api/monitoring/drift")
        self.assertEqual(res.status_code, 401)

    # 9. Insufficient data guardrail (< 5 samples)
    def test_09_monitoring_drift_insufficient_data(self):
        db = SessionLocal()
        with patch.object(db, "query") as mock_query:
            # Simulate a query returning only 2 applicants
            mock_query.return_value.all.return_value = [Applicant(), Applicant()]
            res = monitoring_service.calculate_data_drift(db)
            self.assertEqual(res["status"], "INSUFFICIENT_DATA")
            self.assertEqual(res["overall_drift_status"], "INSUFFICIENT_DATA")
            self.assertIn("minimum 5 required", res["message"])
        db.close()

    # 10. Drift numerical feature PSI calculation
    def test_10_monitoring_drift_numerical_psi(self):
        res = client.get("/api/monitoring/drift", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "SUCCESS")
        num_features = [f for f in data["features"] if f["feature_type"] == "numerical"]
        self.assertEqual(len(num_features), 7)
        for nf in num_features:
            self.assertIsNotNone(nf["psi"])
            self.assertGreaterEqual(nf["psi"], 0.0)
            self.assertIn(nf["drift_level"], ["LOW", "MEDIUM", "HIGH"])

    # 11. Drift categorical feature PSI calculation
    def test_11_monitoring_drift_categorical_psi(self):
        res = client.get("/api/monitoring/drift", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        cat_features = [f for f in data["features"] if f["feature_type"] == "categorical"]
        self.assertEqual(len(cat_features), 13)
        for cf in cat_features:
            self.assertIsNotNone(cf["psi"])
            self.assertGreaterEqual(cf["psi"], 0.0)
            self.assertIn(cf["drift_level"], ["LOW", "MEDIUM", "HIGH"])

    # 12. Classification levels: <0.10 LOW, 0.10-0.25 MEDIUM, >0.25 HIGH
    def test_12_monitoring_drift_classification_levels(self):
        res = client.get("/api/monitoring/drift", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        for f in data["features"]:
            psi = f["psi"]
            level = f["drift_level"]
            if psi < 0.10:
                self.assertEqual(level, "LOW")
            elif psi <= 0.25:
                self.assertEqual(level, "MEDIUM")
            else:
                self.assertEqual(level, "HIGH")

    # 13. Overall drift status synthesis
    def test_13_monitoring_drift_overall_status(self):
        res = client.get("/api/monitoring/drift", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        overall = data["overall_drift_status"]
        high_cnt = data["high_drift_count"]
        med_cnt = data["medium_drift_count"]

        if high_cnt > 0:
            self.assertEqual(overall, "SIGNIFICANT_DRIFT")
        elif med_cnt > 0:
            self.assertEqual(overall, "MODERATE_DRIFT")
        else:
            self.assertEqual(overall, "STABLE")

    # 14. Performance endpoint auth required
    def test_14_monitoring_performance_auth_required(self):
        res = client.get("/api/monitoring/performance")
        self.assertEqual(res.status_code, 401)

    # 15. Baseline model validation metrics
    def test_15_monitoring_baseline_metrics(self):
        res = client.get("/api/monitoring/performance", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        base = data.get("baseline_metrics", {})
        self.assertAlmostEqual(base["roc_auc"], 0.8095, places=3)
        self.assertAlmostEqual(base["pr_auc"], 0.6584, places=3)
        self.assertAlmostEqual(base["recall"], 0.7667, places=3)
        self.assertAlmostEqual(base["brier_score"], 0.1546, places=3)
        self.assertEqual(base["threshold"], 0.35)
        self.assertIn("Baseline Model Metrics", base["label"])

    # 16. Production performance unavailability notice
    def test_16_monitoring_production_performance_unavailability(self):
        res = client.get("/api/monitoring/performance", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        prod = data.get("production_performance", {})
        self.assertFalse(prod["outcome_data_available"])
        self.assertEqual(prod["status"], "OUTCOME_DATA_UNAVAILABLE")
        self.assertIn("Outcome data not yet available", prod["message"])

    # 17. Distinction between data drift and model performance degradation
    def test_17_monitoring_distinction_drift_vs_performance(self):
        res = client.get("/api/monitoring/performance", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        health = data.get("model_health", {})
        self.assertIn("data_drift_status", health)
        self.assertIn("performance_degradation_detected", health)
        self.assertIn("explanation", health)
        self.assertIn("Data drift reflects shifts in applicant input distributions", health["explanation"])
        self.assertIn("Model performance degradation reflects prediction accuracy decay", health["explanation"])

    # 18. Model artifacts are NOT modified during monitoring
    def test_18_monitoring_does_not_modify_model(self):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        model_path = os.path.join(project_root, "models", "final_model.joblib")
        preprocessor_path = os.path.join(project_root, "models", "preprocessing_pipeline.joblib")
        thresh_path = os.path.join(project_root, "models", "threshold_config.json")

        def get_hash(p):
            with open(p, "rb") as f:
                return hashlib.sha256(f.read()).hexdigest()

        hash_model_before = get_hash(model_path)
        hash_prep_before = get_hash(preprocessor_path)
        hash_thresh_before = get_hash(thresh_path)

        # Call all monitoring endpoints
        client.get("/api/monitoring/overview", headers=self.headers_officer)
        client.get("/api/monitoring/drift", headers=self.headers_officer)
        client.get("/api/monitoring/performance", headers=self.headers_officer)

        self.assertEqual(get_hash(model_path), hash_model_before)
        self.assertEqual(get_hash(preprocessor_path), hash_prep_before)
        self.assertEqual(get_hash(thresh_path), hash_thresh_before)

    # 19. Zero predict_proba calls during monitoring
    def test_19_monitoring_zero_predict_proba_calls(self):
        from backend.services.prediction_service import prediction_service

        with patch.object(prediction_service.model, "predict_proba") as mock_predict_proba:
            client.get("/api/monitoring/overview", headers=self.headers_officer)
            client.get("/api/monitoring/drift", headers=self.headers_officer)
            client.get("/api/monitoring/performance", headers=self.headers_officer)
            mock_predict_proba.assert_not_called()

    # 20. Works without NVIDIA API key
    def test_20_monitoring_works_without_nvidia(self):
        with patch.dict(os.environ, {"NVIDIA_API_KEY": ""}):
            res_ov = client.get("/api/monitoring/overview", headers=self.headers_officer)
            self.assertEqual(res_ov.status_code, 200)

            res_drift = client.get("/api/monitoring/drift", headers=self.headers_officer)
            self.assertEqual(res_drift.status_code, 200)

            res_perf = client.get("/api/monitoring/performance", headers=self.headers_officer)
            self.assertEqual(res_perf.status_code, 200)


if __name__ == "__main__":
    unittest.main()
