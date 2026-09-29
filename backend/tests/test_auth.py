import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.database.database import engine, SessionLocal, Base
from backend.database.models import User, AuditLog
from backend.core.security import get_password_hash, verify_password
from backend.main import app

client = TestClient(app)

class TestAuthAndSecurity(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()

        # Seed initial test users for each role
        cls.admin_email = "admin_test@bank.com"
        cls.officer_email = "officer_test@bank.com"
        cls.viewer_email = "viewer_test@bank.com"
        cls.password = "Secret123!"

        cls.db.query(User).filter(User.email.in_([cls.admin_email, cls.officer_email, cls.viewer_email])).delete()
        cls.db.commit()

        admin = User(email=cls.admin_email, password_hash=get_password_hash(cls.password), role="ADMIN", is_active=True)
        officer = User(email=cls.officer_email, password_hash=get_password_hash(cls.password), role="CREDIT_OFFICER", is_active=True)
        viewer = User(email=cls.viewer_email, password_hash=get_password_hash(cls.password), role="VIEWER", is_active=True)

        cls.db.add_all([admin, officer, viewer])
        cls.db.commit()

        # Login to obtain tokens
        res_admin = client.post("/api/auth/login", json={"email": cls.admin_email, "password": cls.password})
        cls.admin_token = res_admin.json().get("access_token")

        res_officer = client.post("/api/auth/login", json={"email": cls.officer_email, "password": cls.password})
        cls.officer_token = res_officer.json().get("access_token")

        res_viewer = client.post("/api/auth/login", json={"email": cls.viewer_email, "password": cls.password})
        cls.viewer_token = res_viewer.json().get("access_token")

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # 1. Register user (defaults to VIEWER)
    def test_01_register_user(self):
        email = "new_user_reg@bank.com"
        self.db.query(User).filter(User.email == email).delete()
        self.db.commit()
        res = client.post("/api/auth/register", json={"email": email, "password": "Password123"})
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["role"], "VIEWER")

    # 2. Duplicate email error
    def test_02_duplicate_email(self):
        res = client.post("/api/auth/register", json={"email": self.admin_email, "password": "Password123"})
        self.assertEqual(res.status_code, 400)

    # 3. Login success
    def test_03_login_success(self):
        res = client.post("/api/auth/login", json={"email": self.officer_email, "password": self.password})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["role"], "CREDIT_OFFICER")

    # 4. Wrong password
    def test_04_wrong_password(self):
        res = client.post("/api/auth/login", json={"email": self.officer_email, "password": "WrongPassword!"})
        self.assertEqual(res.status_code, 401)

    # 5. Invalid token
    def test_05_invalid_token(self):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_fake_token_123"})
        self.assertEqual(res.status_code, 401)

    # 6. Missing token
    def test_06_missing_token(self):
        res = client.get("/api/auth/me")
        self.assertEqual(res.status_code, 401)

    # 7. GET /api/auth/me
    def test_07_get_me(self):
        res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["email"], self.admin_email)
        self.assertEqual(data["role"], "ADMIN")

    # 8. Viewer access to prediction history (200 OK)
    def test_08_viewer_access_history(self):
        res = client.get("/api/predictions", headers={"Authorization": f"Bearer {self.viewer_token}"})
        self.assertEqual(res.status_code, 200)

    # 9. Credit Officer access to prediction creation (201 Created)
    def test_09_officer_create_prediction(self):
        payload = {
            "applicant": {
                "status_checking_account": "A14",
                "duration_in_months": 12,
                "credit_history": "A32",
                "purpose": "A40",
                "credit_amount": 2000,
                "savings_account": "A64",
                "present_employment_since": "A75",
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
        }
        res = client.post("/api/predictions", json=payload, headers={"Authorization": f"Bearer {self.officer_token}"})
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.json()["success"])

    # 10. Unauthorized prediction attempt by Viewer (403 Forbidden)
    def test_10_viewer_prediction_forbidden(self):
        payload = {
            "applicant": {
                "status_checking_account": "A14",
                "duration_in_months": 12,
                "credit_history": "A32",
                "purpose": "A40",
                "credit_amount": 2000,
                "savings_account": "A64",
                "present_employment_since": "A75",
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
        }
        res = client.post("/api/predictions", json=payload, headers={"Authorization": f"Bearer {self.viewer_token}"})
        self.assertEqual(res.status_code, 403)

    # 11. Admin access to audit logs (200 OK)
    def test_11_admin_access_audit_logs(self):
        res = client.get("/api/audit/logs", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res.status_code, 200)

    # 12. Non-admin access to audit logs (403 Forbidden)
    def test_12_non_admin_audit_logs_forbidden(self):
        res = client.get("/api/audit/logs", headers={"Authorization": f"Bearer {self.officer_token}"})
        self.assertEqual(res.status_code, 403)

    # 13. Password is hashed in DB (not plaintext)
    def test_13_password_is_hashed(self):
        db_user = self.db.query(User).filter(User.email == self.admin_email).first()
        self.assertNotEqual(db_user.password_hash, self.password)
        self.assertTrue(verify_password(self.password, db_user.password_hash))

    # 14. Password hash is not returned in User API response
    def test_14_password_hash_not_returned(self):
        res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {self.admin_token}"})
        data = res.json()
        self.assertNotIn("password", data)
        self.assertNotIn("password_hash", data)

    # 15. User management endpoints (ADMIN only)
    def test_15_user_management(self):
        # Admin can list users
        res = client.get("/api/users", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res.status_code, 200)

        # Officer cannot list users (403)
        res_off = client.get("/api/users", headers={"Authorization": f"Bearer {self.officer_token}"})
        self.assertEqual(res_off.status_code, 403)

    # 16. Audit security events created
    def test_16_audit_security_events(self):
        logs = self.db.query(AuditLog).filter(AuditLog.action.in_(["LOGIN_SUCCESS", "PREDICTION_CREATED", "USER_CREATED"])).all()
        self.assertGreaterEqual(len(logs), 1)

    # 17. Security headers present in responses
    def test_17_security_headers(self):
        res = client.get("/api/health")
        self.assertEqual(res.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(res.headers.get("X-Frame-Options"), "DENY")

    # 18. Portal mismatch returns 403 Forbidden
    def test_18_portal_mismatch_forbidden(self):
        # Viewer attempts login via ADMIN portal
        res = client.post("/api/auth/login", json={"email": self.viewer_email, "password": self.password, "portal": "ADMIN"})
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["detail"], "This account is not authorized for this portal.")

        # Officer attempts login via ADMIN portal
        res_off = client.post("/api/auth/login", json={"email": self.officer_email, "password": self.password, "portal": "ADMIN"})
        self.assertEqual(res_off.status_code, 403)

        # Admin logs into ADMIN portal successfully
        res_adm = client.post("/api/auth/login", json={"email": self.admin_email, "password": self.password, "portal": "ADMIN"})
        self.assertEqual(res_adm.status_code, 200)

    # 19. Staff registration with invite codes
    def test_19_staff_registration_with_invite_codes(self):
        # Fail with wrong invite code
        res_fail = client.post("/api/auth/register", json={
            "email": "bad_invite_admin@bank.com",
            "password": "Password123",
            "requested_role": "ADMIN",
            "invite_code": "WRONG_KEY"
        })
        self.assertEqual(res_fail.status_code, 403)

        # Success with correct ADMIN invite code
        email_admin = "new_admin_reg@bank.com"
        self.db.query(User).filter(User.email == email_admin).delete()
        self.db.commit()

        res_pass = client.post("/api/auth/register", json={
            "email": email_admin,
            "password": "Password123",
            "requested_role": "ADMIN",
            "invite_code": "ADMIN123KEY"
        })
        self.assertEqual(res_pass.status_code, 201)
        self.assertEqual(res_pass.json()["user"]["role"], "ADMIN")

if __name__ == "__main__":
    unittest.main()
