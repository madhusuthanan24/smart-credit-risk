import hashlib
import json
import os
import unittest
import uuid
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.main import app
from backend.core.config import Settings
from backend.services.prediction_service import prediction_service

client = TestClient(app, raise_server_exceptions=False)

class TestProductionReadiness(unittest.TestCase):
    """
    Phase I — Production Readiness, Reliability & Deployment Hardening Test Suite.
    """

    def setUp(self):
        # Authoritative SHA-256 Hashes
        self.expected_model_hash = "7fcc6ec2b5e481eea9a6be007cc7679e28f9abacae8d4dbda19ba5c18eb3c768"
        self.expected_preprocessor_hash = "8b0bb086c63fdb928e0d5840fb9b29b23a75f638665a86915b17a7e46984288a"
        self.expected_threshold_hash = "13fd9163c88b4109b5bfe479898f3d65e40137fabf3bf0a102f2caa491f94eac"

    def _calc_sha256(self, filepath: str) -> str:
        h = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(8192):
                h.update(chunk)
        return h.hexdigest().lower()

    # ---------------------------------------------------------
    # 1. ML ARTIFACT INTEGRITY & FROZEN THRESHOLD CHECKS
    # ---------------------------------------------------------

    def test_model_artifact_sha256_unaltered(self):
        """Verify final_model.joblib SHA-256 hash matches the authoritative baseline."""
        actual_hash = self._calc_sha256("models/final_model.joblib")
        self.assertEqual(actual_hash, self.expected_model_hash)

    def test_preprocessor_artifact_sha256_unaltered(self):
        """Verify preprocessing_pipeline.joblib SHA-256 hash matches authoritative baseline."""
        actual_hash = self._calc_sha256("models/preprocessing_pipeline.joblib")
        self.assertEqual(actual_hash, self.expected_preprocessor_hash)

    def test_threshold_config_sha256_unaltered(self):
        """Verify threshold_config.json SHA-256 hash matches authoritative baseline."""
        actual_hash = self._calc_sha256("models/threshold_config.json")
        self.assertEqual(actual_hash, self.expected_threshold_hash)

    def test_production_threshold_value_locked_at_0_35(self):
        """Verify the optimal decision threshold is strictly locked at 0.35."""
        self.assertEqual(prediction_service.threshold, 0.35)

    # ---------------------------------------------------------
    # 2. STARTUP & ENVIRONMENT CONFIGURATION VALIDATION
    # ---------------------------------------------------------

    def test_production_mode_rejects_default_insecure_secret(self):
        """Verify production mode rejects default placeholder secret keys."""
        with self.assertRaises(ValueError) as ctx:
            cfg = Settings(
                ENVIRONMENT="production",
                SECRET_KEY="smart_credit_risk_secret_key_change_in_production"
            )
            cfg.validate_production_configuration()
        self.assertIn("CRITICAL SECURITY CONFIGURATION ERROR", str(ctx.exception))

    def test_production_mode_rejects_short_secret(self):
        """Verify production mode rejects secret keys under 32 characters."""
        with self.assertRaises(ValueError) as ctx:
            cfg = Settings(
                ENVIRONMENT="production",
                SECRET_KEY="short_key_under_32_chars"
            )
            cfg.validate_production_configuration()
        self.assertIn("at least 32 characters", str(ctx.exception))

    def test_production_mode_rejects_wildcard_cors(self):
        """Verify production mode rejects wildcard '*' CORS origin."""
        with self.assertRaises(ValueError) as ctx:
            cfg = Settings(
                ENVIRONMENT="production",
                SECRET_KEY="a_very_secure_and_long_production_key_1234567890",
                FRONTEND_URL="*"
            )
            cfg.validate_production_configuration()
        self.assertIn("Wildcard '*' CORS origin is not permitted in production", str(ctx.exception))

    def test_production_mode_accepts_strong_secret_and_explicit_origins(self):
        """Verify valid production settings pass validation cleanly."""
        cfg = Settings(
            ENVIRONMENT="production",
            SECRET_KEY="super_secure_production_secret_key_that_exceeds_32_chars_now",
            FRONTEND_URL="https://credit.example.com,https://admin.example.com"
        )
        # Should not raise
        cfg.validate_production_configuration()
        self.assertTrue(cfg.is_production)
        self.assertFalse(cfg.is_development)
        self.assertEqual(len(cfg.allowed_origins), 2)

    def test_environment_helper_properties(self):
        """Verify is_production, is_development, and is_testing properties."""
        dev_cfg = Settings(ENVIRONMENT="development")
        self.assertTrue(dev_cfg.is_development)
        self.assertFalse(dev_cfg.is_production)

        test_cfg = Settings(ENVIRONMENT="test")
        self.assertTrue(test_cfg.is_testing)

    # ---------------------------------------------------------
    # 3. ROOT & API HEALTH ENDPOINTS
    # ---------------------------------------------------------

    def test_root_health_endpoint(self):
        """Verify GET /health returns 200 OK and healthy status."""
        res = client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["database"])
        self.assertTrue(data["model_loaded"])
        self.assertEqual(data["threshold"], 0.35)

    def test_api_health_endpoint(self):
        """Verify GET /api/health maintains backward compatibility."""
        res = client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["api"])
        self.assertTrue(data["database"])
        self.assertTrue(data["model_loaded"])
        self.assertTrue(data["preprocessing_loaded"])
        self.assertTrue(data["threshold_loaded"])
        self.assertEqual(data["threshold"], 0.35)

    # ---------------------------------------------------------
    # 4. READINESS PROBE ENDPOINTS (NO predict_proba DURING PROBE)
    # ---------------------------------------------------------

    def test_root_readiness_probe_success(self):
        """Verify GET /ready returns 200 OK with all readiness checks passing."""
        with patch.object(prediction_service.model, "predict_proba", wraps=prediction_service.model.predict_proba) as mock_predict:
            res = client.get("/ready")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["status"], "ready")
            self.assertEqual(data["database"], "connected")
            self.assertEqual(data["model"], "loaded")
            self.assertEqual(data["preprocessor"], "loaded")
            self.assertEqual(data["threshold_config"], "loaded")
            self.assertEqual(data["threshold"], 0.35)
            self.assertTrue(data["checks"]["database"])
            self.assertTrue(data["checks"]["model"])
            self.assertTrue(data["checks"]["preprocessor"])
            self.assertTrue(data["checks"]["threshold"])
            # CRITICAL RULE: Model inference must NOT be run during readiness checks
            mock_predict.assert_not_called()

    def test_api_readiness_probe_success(self):
        """Verify GET /api/ready also responds with readiness payload."""
        res = client.get("/api/ready")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ready")

    def test_readiness_probe_fails_when_db_down(self):
        """Verify readiness probe returns 503 if database connectivity fails."""
        with patch("backend.api.routes.health.text", side_effect=Exception("Database connection timeout")):
            res = client.get("/ready")
            self.assertEqual(res.status_code, 503)
            data = res.json()
            self.assertEqual(data["status"], "not_ready")
            self.assertEqual(data["database"], "disconnected")
            self.assertFalse(data["checks"]["database"])

    # ---------------------------------------------------------
    # 5. REQUEST CORRELATION ID (X-Request-ID)
    # ---------------------------------------------------------

    def test_request_id_generated_when_missing(self):
        """Verify X-Request-ID is generated and attached to response when not supplied."""
        res = client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertIn("x-request-id", res.headers)
        req_id = res.headers["x-request-id"]
        # Verify valid UUID format
        parsed_uuid = uuid.UUID(req_id)
        self.assertEqual(str(parsed_uuid), req_id)

    def test_request_id_propagated_when_provided(self):
        """Verify client-supplied X-Request-ID is echoed back in the response headers."""
        custom_id = "trace-client-id-abc-12345"
        res = client.get("/health", headers={"X-Request-ID": custom_id})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("x-request-id"), custom_id)

    # ---------------------------------------------------------
    # 6. SECURITY HEADERS
    # ---------------------------------------------------------

    def test_security_headers_present_on_responses(self):
        """Verify production security headers are set on all responses."""
        res = client.get("/")
        self.assertEqual(res.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(res.headers.get("x-frame-options"), "DENY")
        self.assertEqual(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin")
        self.assertEqual(res.headers.get("x-xss-protection"), "1; mode=block")

    # ---------------------------------------------------------
    # 7. STRUCTURED ERROR HANDLING (NO TRACE LEAKAGE)
    # ---------------------------------------------------------

    def test_404_structured_error_response(self):
        """Verify 404 returns structured JSON with error_code and request_id."""
        res = client.get("/api/non-existent-endpoint-xyz")
        self.assertEqual(res.status_code, 404)
        data = res.json()
        self.assertIn("detail", data)
        self.assertEqual(data["error_code"], "HTTP_404")
        self.assertIn("request_id", data)

    def test_422_structured_validation_error_response(self):
        """Verify 422 returns structured validation errors with error_code."""
        res = client.post("/api/auth/register", json={"email": "not-an-email-at-all"})
        self.assertEqual(res.status_code, 422)
        data = res.json()
        self.assertEqual(data["error_code"], "VALIDATION_ERROR")
        self.assertIn("detail", data)
        self.assertIn("errors", data)
        self.assertIn("request_id", data)

    def test_500_structured_error_response_no_trace_leakage(self):
        """Verify 500 error hides Python tracebacks and credentials."""
        with patch("backend.main.check_health", side_effect=RuntimeError("Secret DB password leaked")):
            res = client.get("/health")
            self.assertEqual(res.status_code, 500)
            data = res.json()
            self.assertEqual(data["error_code"], "INTERNAL_SERVER_ERROR")
            self.assertEqual(data["detail"], "An internal server error occurred while processing the request.")
            self.assertIn("request_id", data)
            # Ensure raw exception message is NOT leaked in detail
            self.assertNotIn("Secret DB password leaked", data["detail"])

if __name__ == "__main__":
    unittest.main()
