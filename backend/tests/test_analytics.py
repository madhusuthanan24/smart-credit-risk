import unittest
import json
import hashlib
import sys
import os
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.core.config import settings
from backend.database.database import engine, Base, SessionLocal
from backend.database.models import User, Applicant, Assessment, AuditLog
from backend.core.security import get_password_hash
from backend.api.dependencies import login_rate_limiter, prediction_rate_limiter

client = TestClient(app)


class TestExecutiveDecisionIntelligenceAndAnalytics(unittest.TestCase):
    """
    Phase H — Executive Decision Intelligence & Analytics Test Suite.
    Verifies all 22 required analytics, governance, security, and integrity test cases.
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
        cls.admin_email = "exec_admin@bank.com"
        cls.officer_email = "exec_officer@bank.com"
        cls.viewer_email = "exec_viewer@bank.com"
        cls.password = "AnalyticsSecret123!"

        existing = db.query(User).filter(User.email.in_([cls.admin_email, cls.officer_email, cls.viewer_email])).all()
        for u in existing:
            db.delete(u)
        db.commit()

        u_admin = User(email=cls.admin_email, password_hash=get_password_hash(cls.password), role="ADMIN", is_active=True)
        u_officer = User(email=cls.officer_email, password_hash=get_password_hash(cls.password), role="CREDIT_OFFICER", is_active=True)
        u_viewer = User(email=cls.viewer_email, password_hash=get_password_hash(cls.password), role="VIEWER", is_active=True)

        db.add_all([u_admin, u_officer, u_viewer])
        db.commit()

        cls.test_user_ids.extend([u_admin.id, u_officer.id, u_viewer.id])

        # Login tokens
        res_adm = client.post("/api/auth/login", json={"email": cls.admin_email, "password": cls.password})
        cls.admin_token = res_adm.json().get("access_token")
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        res_off = client.post("/api/auth/login", json={"email": cls.officer_email, "password": cls.password})
        cls.officer_token = res_off.json().get("access_token")
        cls.officer_headers = {"Authorization": f"Bearer {cls.officer_token}"}

        res_view = client.post("/api/auth/login", json={"email": cls.viewer_email, "password": cls.password})
        cls.viewer_token = res_view.json().get("access_token")
        cls.viewer_headers = {"Authorization": f"Bearer {cls.viewer_token}"}

        # Seed diverse assessments and applicants across various dimensions
        now = datetime.utcnow()
        sample_data = [
            # Low Risk
            {"age": 30, "housing": "A152", "emp": "A74", "job": "A173", "fw": "A201", "sex": "A93", "prob": 0.12, "pred": 0, "risk": "LOW RISK", "dec": "GOOD CREDIT / APPROVED", "days_ago": 1},
            {"age": 45, "housing": "A152", "emp": "A75", "job": "A174", "fw": "A202", "sex": "A92", "prob": 0.08, "pred": 0, "risk": "LOW RISK", "dec": "GOOD CREDIT / APPROVED", "days_ago": 3},
            # Moderate Risk
            {"age": 22, "housing": "A151", "emp": "A72", "job": "A172", "fw": "A201", "sex": "A91", "prob": 0.28, "pred": 0, "risk": "MODERATE RISK", "dec": "MANUAL REVIEW REQUIRED", "days_ago": 5},
            {"age": 35, "housing": "A151", "emp": "A73", "job": "A173", "fw": "A201", "sex": "A94", "prob": 0.32, "pred": 0, "risk": "MODERATE RISK", "dec": "MANUAL REVIEW REQUIRED", "days_ago": 10},
            # High Risk
            {"age": 55, "housing": "A153", "emp": "A71", "job": "A171", "fw": "A201", "sex": "A95", "prob": 0.65, "pred": 1, "risk": "HIGH RISK", "dec": "BAD CREDIT / REJECT", "days_ago": 15},
            {"age": 28, "housing": "A151", "emp": "A72", "job": "A173", "fw": "A202", "sex": "A93", "prob": 0.78, "pred": 1, "risk": "HIGH RISK", "dec": "BAD CREDIT / REJECT", "days_ago": 0},
        ]

        for item in sample_data:
            created_dt = now - timedelta(days=item["days_ago"])
            appl = Applicant(
                duration_in_months=24,
                credit_amount=3500,
                installment_rate=3,
                present_residence_since=2,
                age_in_years=item["age"],
                existing_credits=1,
                num_people_liable=1,
                status_checking_account="A12",
                credit_history="A32",
                purpose="A40",
                savings_account="A61",
                present_employment_since=item["emp"],
                personal_status_sex=item["sex"],
                other_debtors_guarantors="A101",
                property="A121",
                other_installment_plans="A143",
                housing=item["housing"],
                job=item["job"],
                telephone="A192",
                foreign_worker=item["fw"],
                created_at=created_dt
            )
            db.add(appl)
            db.flush()
            cls.test_applicant_ids.append(appl.id)

            assess = Assessment(
                applicant_id=appl.id,
                default_probability=item["prob"],
                prediction=item["pred"],
                risk_category=item["risk"],
                decision=item["dec"],
                threshold=0.35,
                model_name="Tuned Logistic Regression",
                model_version="1.0.0",
                created_at=created_dt
            )
            db.add(assess)
            db.flush()
            cls.test_assessment_ids.append(assess.id)

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

    # 1. Authentication required
    def test_01_authentication_required(self):
        endpoints = [
            "/api/analytics/overview",
            "/api/analytics/trends",
            "/api/analytics/risk-distribution",
            "/api/analytics/probability-distribution",
            "/api/analytics/concentration",
            "/api/analytics/monitoring",
            "/api/analytics/governance",
            "/api/analytics/ai-summary"
        ]
        for ep in endpoints:
            if ep.endswith("ai-summary"):
                res = client.post(ep, json={})
            else:
                res = client.get(ep)
            self.assertEqual(res.status_code, 401, f"Endpoint {ep} should require authentication")

    # 2. RBAC works across ADMIN, CREDIT_OFFICER, and VIEWER
    def test_02_rbac_authorized_roles(self):
        for role_headers, label in [
            (self.admin_headers, "ADMIN"),
            (self.officer_headers, "CREDIT_OFFICER"),
            (self.viewer_headers, "VIEWER")
        ]:
            res = client.get("/api/analytics/overview", headers=role_headers)
            self.assertEqual(res.status_code, 200, f"Role {label} should have access to analytics overview")

    # 3. Overview calculations (KPIs, rates, totals)
    def test_03_overview_kpi_calculations(self):
        res = client.get("/api/analytics/overview", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Check backward-compatible keys
        self.assertIn("risk_distribution", data)
        self.assertIn("probability_histogram", data)
        self.assertIn("default_probability_trend", data)

        # Check Phase H keys
        self.assertIn("portfolio_kpis", data)
        self.assertIn("operational_summary", data)
        self.assertIn("model_governance_snapshot", data)
        self.assertIn("executive_summary_text", data)

        kpis = data["portfolio_kpis"]
        self.assertGreaterEqual(kpis["total_assessments"], 6)
        self.assertGreaterEqual(kpis["low_risk_count"], 2)
        self.assertGreaterEqual(kpis["moderate_risk_count"], 2)
        self.assertGreaterEqual(kpis["high_risk_count"], 2)
        self.assertGreater(kpis["avg_default_probability"], 0.0)
        self.assertGreater(kpis["median_default_probability"], 0.0)
        self.assertIn("%", kpis["avg_default_probability_pct"])

    # 4. Risk distribution calculations
    def test_04_risk_distribution_endpoint(self):
        res = client.get("/api/analytics/risk-distribution", headers=self.officer_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["decision_threshold"], 0.35)
        self.assertGreaterEqual(data["total_assessments"], 6)
        categories = {c["category"]: c for c in data["categories"]}
        self.assertIn("Low Risk", categories)
        self.assertIn("Moderate Risk", categories)
        self.assertIn("High Risk", categories)
        self.assertEqual(categories["High Risk"]["threshold_rule"], "Probability >= 0.35 (Threshold Cutoff)")

    # 5. Trend calculations across periods
    def test_05_assessment_trends_endpoint(self):
        for period in ["today", "7d", "30d", "all"]:
            res = client.get(f"/api/analytics/trends?period={period}", headers=self.admin_headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["period"], period)
            self.assertIn("trends", data)
            self.assertIsInstance(data["trends"], list)

    # 6. Probability histogram (10 bins, 35% threshold)
    def test_06_probability_distribution_histogram(self):
        res = client.get("/api/analytics/probability-distribution", headers=self.viewer_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["decision_threshold"], 0.35)
        self.assertEqual(len(data["histogram"]), 10)
        # Verify bins cover 0 to 100%
        self.assertEqual(data["histogram"][0]["range"], "0-10%")
        self.assertEqual(data["histogram"][-1]["range"], "90-100%")

    # 7. Date filtering
    def test_07_date_filtering(self):
        today = datetime.utcnow().strftime("%Y-%m-%d")
        past_week = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
        res = client.get(f"/api/analytics/overview?start_date={past_week}&end_date={today}", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data["portfolio_kpis"]["total_assessments"], 1)

    # 8. Risk category filtering
    def test_08_risk_category_filtering(self):
        res = client.get("/api/analytics/overview?risk_category=HIGH%20RISK", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["portfolio_kpis"]["low_risk_count"], 0)
        self.assertEqual(data["portfolio_kpis"]["moderate_risk_count"], 0)
        self.assertGreaterEqual(data["portfolio_kpis"]["high_risk_count"], 2)

    # 9. Attribute filtering and concentration
    def test_09_risk_concentration_dimensions(self):
        for dim in ["age_bracket", "housing", "employment", "job", "foreign_worker", "personal_status_sex"]:
            res = client.get(f"/api/analytics/concentration?dimension={dim}", headers=self.officer_headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["dimension"], dim)
            self.assertGreaterEqual(data["total_applicants"], 6)
            self.assertGreaterEqual(len(data["groups"]), 1)
            group = data["groups"][0]
            self.assertIn("group_key", group)
            self.assertIn("applicant_count", group)
            self.assertIn("avg_probability", group)
            self.assertIn("high_risk_pct", group)

    # 10. Risk concentration descriptive disclaimer
    def test_10_risk_concentration_disclaimer(self):
        res = client.get("/api/analytics/concentration?dimension=housing", headers=self.viewer_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["analysis_type"], "Descriptive portfolio analysis")
        self.assertIn("causality", data["disclaimer"].lower())
        self.assertIn("governance", data["disclaimer"].lower())

    # 11. Operational analytics
    def test_11_operational_analytics(self):
        res = client.get("/api/analytics/overview", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        op = res.json()["operational_summary"]
        self.assertGreaterEqual(op["total_assessments"], 6)
        self.assertEqual(op["reports_status"], "Generated on-demand (not persisted)")
        self.assertEqual(op["simulations_status"], "Evaluated on-demand (not persisted)")
        self.assertGreaterEqual(op["active_users_count"], 1)

    # 12. Monitoring snapshot
    def test_12_monitoring_snapshot(self):
        res = client.get("/api/analytics/monitoring", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["monitoring_status"], "ACTIVE")
        self.assertEqual(data["drift_status"], "MONITORED")
        self.assertEqual(data["monitored_features_count"], 20)
        self.assertIn("low", data["psi_thresholds"])
        self.assertIn("high", data["psi_thresholds"])

    # 13. Governance snapshot
    def test_13_governance_snapshot(self):
        res = client.get("/api/analytics/governance", headers=self.viewer_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["decision_threshold"], 0.35)
        self.assertEqual(data["threshold_status"], "LOCKED")
        self.assertIn("Local", data["prediction_authority"])
        self.assertEqual(data["governance_link"], "/governance")

    # 14. Empty database handling (clean zero states)
    def test_14_empty_database_handling(self):
        # Query for a future date where 0 records exist
        future_start = (datetime.utcnow() + timedelta(days=100)).strftime("%Y-%m-%d")
        future_end = (datetime.utcnow() + timedelta(days=105)).strftime("%Y-%m-%d")
        res = client.get(f"/api/analytics/overview?start_date={future_start}&end_date={future_end}", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["portfolio_kpis"]["total_assessments"], 0)
        self.assertEqual(data["portfolio_kpis"]["avg_default_probability"], 0.0)
        self.assertIn("Insufficient", data["executive_summary_text"])

    # 15. Invalid filter handling
    def test_15_invalid_filter_handling(self):
        # Invalid period
        r1 = client.get("/api/analytics/trends?period=invalid_period", headers=self.admin_headers)
        self.assertEqual(r1.status_code, 400)

        # Invalid risk category
        r2 = client.get("/api/analytics/overview?risk_category=CRITICAL_RISK", headers=self.admin_headers)
        self.assertEqual(r2.status_code, 400)

        # Invalid date format
        r3 = client.get("/api/analytics/overview?start_date=2026/09/29", headers=self.admin_headers)
        self.assertEqual(r3.status_code, 400)

        # Invalid date range (start > end)
        r4 = client.get("/api/analytics/overview?start_date=2026-09-30&end_date=2026-09-01", headers=self.admin_headers)
        self.assertEqual(r4.status_code, 400)

        # Invalid concentration dimension
        r5 = client.get("/api/analytics/concentration?dimension=blood_type", headers=self.admin_headers)
        self.assertEqual(r5.status_code, 400)

    # 16. Verify no predict_proba() calls during analytics
    @patch("sklearn.linear_model.LogisticRegression.predict_proba")
    def test_16_no_predict_proba_calls(self, mock_predict_proba):
        client.get("/api/analytics/overview", headers=self.admin_headers)
        client.get("/api/analytics/trends", headers=self.admin_headers)
        client.get("/api/analytics/risk-distribution", headers=self.admin_headers)
        client.get("/api/analytics/probability-distribution", headers=self.admin_headers)
        client.get("/api/analytics/concentration", headers=self.admin_headers)
        client.get("/api/analytics/monitoring", headers=self.admin_headers)
        client.get("/api/analytics/governance", headers=self.admin_headers)

        self.assertEqual(mock_predict_proba.call_count, 0, "Analytics must use stored records; predict_proba must NOT be invoked.")

    # 17. ML artifacts checksums unchanged
    def test_17_ml_artifacts_checksums_unchanged(self):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        expected_hashes = {
            "models/final_model.joblib": "7fcc6ec2b5e481eea9a6be007cc7679e28f9abacae8d4dbda19ba5c18eb3c768",
            "models/preprocessing_pipeline.joblib": "8b0bb086c63fdb928e0d5840fb9b29b23a75f638665a86915b17a7e46984288a",
            "models/threshold_config.json": "13fd9163c88b4109b5bfe479898f3d65e40137fabf3bf0a102f2caa491f94eac"
        }

        for rel_path, expected_hash in expected_hashes.items():
            full_path = os.path.join(project_root, rel_path)
            self.assertTrue(os.path.exists(full_path), f"File {rel_path} must exist")
            with open(full_path, "rb") as f:
                actual_hash = hashlib.sha256(f.read()).hexdigest().lower()
            self.assertEqual(actual_hash, expected_hash, f"Hash mismatch for {rel_path}")

    # 18. Threshold remains 0.35
    def test_18_threshold_remains_0_35(self):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        thresh_path = os.path.join(project_root, "models", "threshold_config.json")
        with open(thresh_path, "r") as f:
            cfg = json.load(f)
        threshold_val = cfg.get("optimal_threshold", cfg.get("threshold"))
        self.assertEqual(threshold_val, 0.35)

    # 19. NVIDIA AI summary fallback active without real API calls
    @patch.object(settings, "NVIDIA_API_KEY", "")
    def test_19_optional_ai_summary_fallback(self):
        res = client.post("/api/analytics/ai-summary", json={"period": "30d"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("portfolio_summary", data)
        self.assertIn("notable_observations", data)
        self.assertIn("operational_recommendations", data)
        self.assertIsInstance(data["notable_observations"], list)

    # 20. No secret leakage
    def test_20_no_secret_leakage(self):
        res = client.get("/api/analytics/overview", headers=self.admin_headers)
        content = res.text
        self.assertNotIn("password", content.lower())
        self.assertNotIn("secret", content.lower())
        self.assertNotIn("nvapi-", content)

    # 21. Existing prediction API and monitoring API unaffected
    def test_21_existing_prediction_and_admin_apis_unaffected(self):
        # Health check
        res_hl = client.get("/api/health")
        self.assertEqual(res_hl.status_code, 200)

        # Monitoring overview
        res_mon = client.get("/api/monitoring/overview", headers=self.admin_headers)
        self.assertEqual(res_mon.status_code, 200)

        # Governance overview
        res_gov = client.get("/api/governance/overview", headers=self.admin_headers)
        self.assertEqual(res_gov.status_code, 200)

    # 22. AI summary with mock
    @patch("backend.services.nvidia_ai_service.NvidiaAIService._call_nvidia_executive_api")
    def test_22_ai_summary_mocked_success(self, mock_call):
        mock_call.return_value = {
            "portfolio_summary": "Mocked NVIDIA portfolio overview.",
            "notable_observations": ["Observation 1", "Observation 2"],
            "operational_recommendations": ["Recommendation 1"],
            "ai_provider": "NVIDIA AI",
            "ai_model": "meta/llama-3.1-70b-instruct",
            "generated_at": datetime.utcnow().isoformat()
        }
        res = client.post("/api/analytics/ai-summary", json={"period": "30d"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("portfolio_summary", data)


if __name__ == "__main__":
    unittest.main()
