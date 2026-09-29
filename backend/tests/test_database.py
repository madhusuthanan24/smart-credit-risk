import unittest
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from backend.database.database import engine, SessionLocal, Base
from backend.database.models import User, Applicant, Assessment, AuditLog
from backend.core.security import get_password_hash
from backend.main import app

client = TestClient(app)

class TestDatabaseAndAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        
        # Ensure test admin user exists
        user = db.query(User).filter(User.email == "db_admin@bank.com").first()
        if not user:
            user = User(email="db_admin@bank.com", password_hash=get_password_hash("Secret123!"), role="ADMIN", is_active=True)
            db.add(user)
            db.commit()
        db.close()

        # Login to obtain token
        login_res = client.post("/api/auth/login", json={"email": "db_admin@bank.com", "password": "Secret123!"})
        token = login_res.json().get("access_token")
        cls.headers = {"Authorization": f"Bearer {token}"}

    def setUp(self):
        self.db: Session = SessionLocal()

    def tearDown(self):
        self.db.close()

    # 1. Database connection
    def test_01_database_connection(self):
        result = self.db.execute(Base.metadata.tables['users'].select()).fetchall()
        self.assertIsInstance(result, list)

    # 2. Applicant creation
    def test_02_applicant_creation(self):
        applicant = Applicant(
            status_checking_account="A14",
            duration_in_months=12,
            credit_history="A32",
            purpose="A40",
            credit_amount=1500,
            savings_account="A64",
            present_employment_since="A75",
            installment_rate=2,
            personal_status_sex="A93",
            other_debtors_guarantors="A101",
            present_residence_since=4,
            property="A121",
            age_in_years=35,
            other_installment_plans="A143",
            housing="A152",
            existing_credits=1,
            job="A173",
            num_people_liable=1,
            telephone="A192",
            foreign_worker="A201"
        )
        self.db.add(applicant)
        self.db.commit()
        self.assertIsNotNone(applicant.id)
        
        fetched = self.db.query(Applicant).filter(Applicant.id == applicant.id).first()
        self.assertEqual(fetched.credit_amount, 1500)

    # 3. Assessment creation
    def test_03_assessment_creation(self):
        applicant = self.db.query(Applicant).first()
        assessment = Assessment(
            applicant_id=applicant.id,
            default_probability=0.125,
            prediction=0,
            risk_category="LOW RISK",
            decision="GOOD CREDIT / APPROVED",
            threshold=0.35,
            model_name="Tuned Logistic Regression",
            model_version="1.0.0"
        )
        self.db.add(assessment)
        self.db.commit()
        self.assertIsNotNone(assessment.id)

    # 4. Prediction persistence via API
    def test_04_prediction_persistence_api(self):
        payload = {
            "applicant": {
                "status_checking_account": "A14",
                "duration_in_months": 24,
                "credit_history": "A32",
                "purpose": "A40",
                "credit_amount": 3000,
                "savings_account": "A61",
                "present_employment_since": "A73",
                "installment_rate": 3,
                "personal_status_sex": "A93",
                "other_debtors_guarantors": "A101",
                "present_residence_since": 2,
                "property": "A121",
                "age_in_years": 30,
                "other_installment_plans": "A143",
                "housing": "A152",
                "existing_credits": 1,
                "job": "A173",
                "num_people_liable": 1,
                "telephone": "A192",
                "foreign_worker": "A201"
            }
        }
        res = client.post("/api/predictions", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("prediction_id", data)

        assessment = self.db.query(Assessment).filter(Assessment.id == data["prediction_id"]).first()
        self.assertIsNotNone(assessment)

    # 5. Prediction history API
    def test_05_prediction_history_api(self):
        res = client.get("/api/predictions?page=1&page_size=10", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)

    # 6. Single prediction retrieval API
    def test_06_single_prediction_retrieval(self):
        assessment = self.db.query(Assessment).first()
        res = client.get(f"/api/predictions/{assessment.id}", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["prediction_id"], assessment.id)
        self.assertIn("applicant_features", data)

    # 7. Dashboard summary API
    def test_07_dashboard_summary_api(self):
        res = client.get("/api/dashboard/summary", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_assessments", data)
        self.assertGreaterEqual(data["total_assessments"], 1)

    # 8. Analytics API
    def test_08_analytics_api(self):
        res = client.get("/api/analytics/overview", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("risk_distribution", data)

    # 9. Audit log API
    def test_09_audit_log_api(self):
        res = client.get("/api/audit/logs?page=1&page_size=10", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)

    # 10. Pagination parameters
    def test_10_pagination_parameters(self):
        res = client.get("/api/predictions?page=1&page_size=1", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertLessEqual(len(data), 1)

    # 11. Invalid prediction ID
    def test_11_invalid_prediction_id(self):
        res = client.get("/api/predictions/invalid-uuid-99999", headers=self.headers)
        self.assertEqual(res.status_code, 404)

    # 12. Transaction rollback test
    def test_12_transaction_rollback(self):
        initial_count = self.db.query(Assessment).count()
        try:
            with self.db.begin_nested():
                applicant = Applicant(
                    status_checking_account="A14",
                    duration_in_months=12,
                    credit_history="A32",
                    purpose="A40",
                    credit_amount=1000,
                    savings_account="A61",
                    present_employment_since="A73",
                    installment_rate=1,
                    personal_status_sex="A93",
                    other_debtors_guarantors="A101",
                    present_residence_since=1,
                    property="A121",
                    age_in_years=25,
                    other_installment_plans="A143",
                    housing="A152",
                    existing_credits=1,
                    job="A173",
                    num_people_liable=1,
                    telephone="A192",
                    foreign_worker="A201"
                )
                self.db.add(applicant)
                assessment = Assessment(
                    applicant_id=applicant.id,
                    default_probability=None,
                    prediction=0,
                    risk_category="LOW RISK",
                    decision="APPROVED",
                    threshold=0.35,
                    model_name="Test"
                )
                self.db.add(assessment)
        except Exception:
            self.db.rollback()

        final_count = self.db.query(Assessment).count()
        self.assertEqual(initial_count, final_count)

if __name__ == "__main__":
    unittest.main()
