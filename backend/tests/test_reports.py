import unittest
import io
import json
import sys
import os
from unittest.mock import patch, MagicMock
from pypdf import PdfReader

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.core.config import settings
from backend.database.database import engine, Base, SessionLocal
from backend.database.models import User, Applicant, Assessment
from backend.core.security import get_password_hash
from backend.services.nvidia_ai_service import NvidiaAIService, nvidia_ai_service
from backend.services.prediction_service import prediction_service
from backend.api.dependencies import login_rate_limiter, prediction_rate_limiter

client = TestClient(app)


class TestCreditAssessmentReports(unittest.TestCase):
    """
    Phase D — Automated Credit Assessment Report Test Suite.
    Verifies all 20 requirements:
    1. Authenticated user can generate authorized report.
    2. Unauthorized request is rejected.
    3. Missing assessment returns 404.
    4. PDF response has correct content type.
    5. PDF contains assessment ID.
    6. PDF contains model probability.
    7. PDF contains risk category.
    8. PDF contains threshold.
    9. PDF contains NVIDIA explanation.
    10. PDF contains AI provider.
    11. PDF contains disclaimer.
    12. PDF does not contain API key.
    13. PDF does not contain JWT.
    14. Report generation does not call model.predict_proba().
    15. Report generation does not call NVIDIA API.
    16. Simulation section appears when simulation data exists.
    17. Simulation section is omitted when no simulation exists.
    18. Existing prediction endpoint remains unchanged.
    19. Existing simulator endpoint remains unchanged.
    20. Existing authentication/RBAC remains unchanged.
    """

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        login_rate_limiter.client_records.clear()
        prediction_rate_limiter.client_records.clear()

        db = SessionLocal()
        db.query(Assessment).filter(Assessment.id == "test-assessment-uuid-9999").delete()
        db.query(User).filter(User.email.in_(["report_officer@bank.com", "report_viewer@bank.com"])).delete()
        db.commit()


        officer = User(
            email="report_officer@bank.com",
            password_hash=get_password_hash("Secret123!"),
            role="CREDIT_OFFICER",
            is_active=True
        )
        viewer = User(
            email="report_viewer@bank.com",
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
            json={"email": "report_officer@bank.com", "password": "Secret123!"}
        )
        cls.token_officer = login_res.json().get("access_token")
        cls.headers_officer = {"Authorization": f"Bearer {cls.token_officer}"}

        # Login viewer
        login_res_v = client.post(
            "/api/auth/login",
            json={"email": "report_viewer@bank.com", "password": "Secret123!"}
        )
        cls.token_viewer = login_res_v.json().get("access_token")
        cls.headers_viewer = {"Authorization": f"Bearer {cls.token_viewer}"}

        # Seed an assessment record in DB
        db = SessionLocal()
        applicant = Applicant(
            status_checking_account="A12",
            duration_in_months=24,
            credit_history="A32",
            purpose="A40",
            credit_amount=3500,
            savings_account="A61",
            present_employment_since="A73",
            installment_rate=3,
            personal_status_sex="A93",
            other_debtors_guarantors="A101",
            present_residence_since=2,
            property="A122",
            age_in_years=35,
            other_installment_plans="A143",
            housing="A152",
            existing_credits=1,
            job="A173",
            num_people_liable=1,
            telephone="A192",
            foreign_worker="A201"
        )
        db.add(applicant)
        db.flush()

        cls.test_assessment_id = "test-assessment-uuid-9999"
        assessment = Assessment(
            id=cls.test_assessment_id,
            applicant_id=applicant.id,
            default_probability=0.2752,
            prediction=0,
            risk_category="MODERATE RISK",
            decision="MANUAL REVIEW / REFER",
            threshold=0.35,
            model_name="Tuned Logistic Regression",
            model_version="1.0.0",
            ai_explanation="The model associated the applicant moderate duration with elevated default hazard, counterbalanced by property ownership.",
            ai_summary="Applicant presents moderate credit risk at 27.52% default probability.",
            ai_insights=json.dumps(["Verify secondary cash reserves", "Secure guarantor"]),
            ai_provider="NVIDIA AI",
            ai_model="meta/llama-3.2-11b-vision-instruct"
        )
        db.add(assessment)
        db.commit()
        cls.applicant_id = applicant.id
        db.close()

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        db.query(Assessment).filter(Assessment.id == cls.test_assessment_id).delete()
        db.query(Applicant).filter(Applicant.id == cls.applicant_id).delete()
        db.query(User).filter(User.email.in_(["report_officer@bank.com", "report_viewer@bank.com"])).delete()
        db.commit()
        db.close()

    def setUp(self):

        prediction_rate_limiter.client_records.clear()

    def _extract_pdf_text(self, pdf_bytes: bytes) -> str:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        return "\n".join([page.extract_text() for page in reader.pages])

    # 1. Authenticated user can generate authorized report
    def test_01_authenticated_user_can_generate_report(self):
        """1. Authenticated user successfully generates report."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(len(res.content) > 1000)

    # 2. Unauthorized request is rejected
    def test_02_unauthorized_request_rejected(self):
        """2. Request without Bearer token returns 401 Unauthorized."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}")
        self.assertEqual(res.status_code, 401)

    # 3. Missing assessment returns 404
    def test_03_missing_assessment_returns_404(self):
        """3. Non-existent assessment ID returns 404 Not Found."""
        res = client.get("/api/reports/assessment/non-existent-uuid-0000", headers=self.headers_officer)
        self.assertEqual(res.status_code, 404)

    # 4. PDF response has correct content type
    def test_04_pdf_response_content_type(self):
        """4. Verify response header Content-Type is application/pdf."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("content-type"), "application/pdf")
        self.assertIn("credit-risk-assessment-", res.headers.get("content-disposition", ""))

    # 5. PDF contains assessment ID
    def test_05_pdf_contains_assessment_id(self):
        """5. Extracted PDF text contains the assessment ID."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
        text = self._extract_pdf_text(res.content)
        self.assertIn(self.test_assessment_id, text)

    # 6. PDF contains model probability
    def test_06_pdf_contains_model_probability(self):
        """6. Extracted PDF text contains exact formatted model probability (27.52%)."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
        text = self._extract_pdf_text(res.content)
        self.assertIn("27.52%", text)

    # 7. PDF contains risk category
    def test_07_pdf_contains_risk_category(self):
        """7. Extracted PDF text contains exact risk category (MODERATE RISK)."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
        text = self._extract_pdf_text(res.content)
        self.assertIn("MODERATE RISK", text)

    # 8. PDF contains threshold
    def test_08_pdf_contains_threshold(self):
        """8. Extracted PDF text contains the 35% decision threshold."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
        text = self._extract_pdf_text(res.content)
        self.assertIn("35%", text)

    # 9. PDF contains NVIDIA explanation
    def test_09_pdf_contains_nvidia_explanation(self):
        """9. Extracted PDF text contains the stored NVIDIA explanation narrative."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
        text = self._extract_pdf_text(res.content)
        self.assertIn("moderate duration with elevated default hazard", text)

    # 10. PDF contains AI provider
    def test_10_pdf_contains_ai_provider(self):
        """10. Extracted PDF text explicitly identifies the AI provider (NVIDIA AI)."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
        text = self._extract_pdf_text(res.content)
        self.assertIn("NVIDIA AI", text)

    # 11. PDF contains disclaimer
    def test_11_pdf_contains_disclaimer(self):
        """11. Extracted PDF text contains the mandatory regulatory disclaimer."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
        text = self._extract_pdf_text(res.content)
        self.assertIn("not a guarantee of future repayment", text)
        self.assertIn("decision-support information", text)

    # 12. PDF does not contain API key
    def test_12_pdf_does_not_contain_api_key(self):
        """12. SECURITY: Generated PDF must never contain secret NVIDIA_API_KEY."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
        text = self._extract_pdf_text(res.content)
        if settings.NVIDIA_API_KEY and len(settings.NVIDIA_API_KEY) > 8:
            self.assertNotIn(settings.NVIDIA_API_KEY, text)
        self.assertNotIn("nvapi-", text)

    # 13. PDF does not contain JWT
    def test_13_pdf_does_not_contain_jwt(self):
        """13. SECURITY: Generated PDF must never contain authentication JWT tokens."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
        text = self._extract_pdf_text(res.content)
        self.assertNotIn(self.token_officer, text)
        self.assertNotIn(self.token_viewer, text)

    # 14. Report generation does not call model.predict_proba()
    def test_14_report_does_not_call_predict_proba(self):
        """14. CRITICAL: Report generation is strictly presentation and must NOT run ML inference."""
        with patch.object(prediction_service.model, "predict_proba") as mock_predict_proba:
            res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
            self.assertEqual(res.status_code, 200)
            mock_predict_proba.assert_not_called()

    # 15. Report generation does not call NVIDIA API
    def test_15_report_does_not_call_nvidia_api(self):
        """15. CRITICAL: Report generation must NOT call live NVIDIA AI endpoints."""
        with patch.object(NvidiaAIService, "_call_nvidia_api") as mock_ai_call:
            with patch.object(NvidiaAIService, "_call_nvidia_simulation_api") as mock_sim_call:
                res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
                self.assertEqual(res.status_code, 200)
                mock_ai_call.assert_not_called()
                mock_sim_call.assert_not_called()

    # 16. Simulation section appears when simulation data exists
    def test_16_simulation_section_appears_when_provided(self):
        """16. Simulation comparison appears in PDF when simulation data is provided."""
        sim_payload = {
            "success": True,
            "original": {
                "default_probability": 0.2752,
                "default_probability_pct": "27.52%",
                "predicted_class": 0,
                "prediction": 0,
                "decision_threshold": 0.35,
                "threshold": 0.35,
                "risk_category": "MODERATE RISK",
                "credit_decision": "MANUAL REVIEW / REFER",
                "decision": "MANUAL REVIEW / REFER",
                "risk_factors": [],
                "protective_factors": []
            },
            "simulated": {
                "default_probability": 0.1420,
                "default_probability_pct": "14.20%",
                "predicted_class": 0,
                "prediction": 0,
                "decision_threshold": 0.35,
                "threshold": 0.35,
                "risk_category": "LOW RISK",
                "credit_decision": "GOOD CREDIT / APPROVED",
                "decision": "GOOD CREDIT / APPROVED",
                "risk_factors": [],
                "protective_factors": []
            },
            "difference": {
                "probability_difference": -0.1332,
                "probability_points": -13.32,
                "direction": "lower"
            },
            "risk_changed": True,
            "original_risk": "MODERATE RISK",
            "simulated_risk": "LOW RISK",
            "changes_summary": [
                {
                    "field": "duration_in_months",
                    "field_label": "Loan Duration",
                    "original_value": 24,
                    "simulated_value": 12,
                    "display_original": "24 Months",
                    "display_simulated": "12 Months"
                }
            ],
            "ai_summary": "Simulated scenario achieved low risk classification.",
            "ai_explanation": "Reducing duration lowered risk exposure.",
            "ai_insights": ["Lower duration confirms risk improvement."],
            "ai_provider": "NVIDIA AI"
        }
        res = client.post(
            f"/api/reports/assessment/{self.test_assessment_id}",
            headers=self.headers_officer,
            json=sim_payload
        )
        self.assertEqual(res.status_code, 200)
        text = self._extract_pdf_text(res.content)
        self.assertIn("CREDIT RISK SIMULATION COMPARISON", text)
        self.assertIn("-13.32 percentage points", text)
        self.assertIn("14.20%", text)

    # 17. Simulation section is omitted when no simulation exists
    def test_17_simulation_section_omitted_when_absent(self):
        """17. When no simulation payload is supplied, simulation section is omitted."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_officer)
        self.assertEqual(res.status_code, 200)
        text = self._extract_pdf_text(res.content)
        self.assertNotIn("CREDIT RISK SIMULATION COMPARISON", text)

    # 18. Existing prediction endpoint remains unchanged
    def test_18_existing_prediction_endpoint_unchanged(self):
        """18. Verify POST /api/predictions still operates normally."""
        applicant_data = {
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
        with patch.object(NvidiaAIService, "_call_nvidia_api", return_value={
            "explanation": "Exp", "summary": "Sum", "insights": ["Ins"],
            "provider": "NVIDIA AI", "model": "m", "status": "SUCCESS", "generated_at": "2026-09-29T12:00:00"
        }):
            res = client.post("/api/predictions", headers=self.headers_officer, json={"applicant": applicant_data})
        self.assertEqual(res.status_code, 201)
        self.assertIn("prediction_id", res.json())

    # 19. Existing simulator endpoint remains unchanged
    def test_19_existing_simulator_endpoint_unchanged(self):
        """19. Verify POST /api/simulate still operates normally."""
        applicant_data = {
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
        payload = {
            "original_applicant": applicant_data,
            "simulated_applicant": applicant_data
        }
        with patch.object(NvidiaAIService, "_call_nvidia_simulation_api", return_value={
            "explanation": "Exp", "summary": "Sum", "insights": ["Ins"],
            "provider": "NVIDIA AI", "model": "m", "status": "SUCCESS", "generated_at": "2026-09-29T12:00:00"
        }):
            res = client.post("/api/simulate", headers=self.headers_officer, json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn("difference", res.json())

    # 20. Existing authentication/RBAC remains unchanged
    def test_20_existing_auth_and_rbac_unchanged(self):
        """20. VIEWER role is permitted to generate and read assessment reports."""
        res = client.get(f"/api/reports/assessment/{self.test_assessment_id}", headers=self.headers_viewer)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("content-type"), "application/pdf")


if __name__ == "__main__":
    unittest.main()
