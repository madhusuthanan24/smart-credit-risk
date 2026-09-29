import sys
import os
import uuid
import logging

# Ensure project root is in Python sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.database.database import engine, Base, get_db
from backend.api.routes import health, model, predictions, dashboard, analytics, audit, auth, users, simulate, reports, monitoring, governance, admin
from backend.api.routes.health import check_health, check_readiness

logger = logging.getLogger("smart_credit_risk")

# Create database tables automatically on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Parse configured frontend origins for secure CORS
origins = settings.allowed_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# Request Correlation ID Middleware
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Standard HTTP Exception Handler
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": f"HTTP_{exc.status_code}",
            "request_id": request_id,
        },
        headers=getattr(exc, "headers", None) or {},
    )

# Request Validation Error Handler (422)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Request validation error.",
            "error_code": "VALIDATION_ERROR",
            "errors": exc.errors(),
            "request_id": request_id,
        },
    )

# Global Unexpected Exception Handler (500, Structured JSON, zero credential/trace leaks)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.error(f"Unhandled exception [request_id={request_id}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "An internal server error occurred while processing the request.",
            "detail": "An internal server error occurred while processing the request.",
            "error_code": "INTERNAL_SERVER_ERROR",
            "request_id": request_id,
            "details": str(exc) if settings.is_development else None,
        }
    )

# Root liveness and readiness probes for container orchestrators (Kubernetes / Docker)
@app.get("/health", tags=["Health"], summary="Root liveness check")
def root_health(response: Response, db: Session = Depends(get_db)):
    return check_health(response=response, db=db)

@app.get("/ready", tags=["Health"], summary="Root readiness probe")
def root_readiness(response: Response, db: Session = Depends(get_db)):
    return check_readiness(response=response, db=db)

# Include API Routers
app.include_router(health.router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(model.router, prefix=settings.API_V1_STR, tags=["Model"])
app.include_router(predictions.router, prefix=settings.API_V1_STR, tags=["Predictions"])
app.include_router(simulate.router, prefix=settings.API_V1_STR, tags=["Simulator"])
app.include_router(reports.router, prefix=settings.API_V1_STR, tags=["Reports"])
app.include_router(dashboard.router, prefix=settings.API_V1_STR, tags=["Dashboard"])
app.include_router(analytics.router, prefix=settings.API_V1_STR, tags=["Analytics"])
app.include_router(audit.router, prefix=settings.API_V1_STR, tags=["Audit"])
app.include_router(auth.router, prefix=settings.API_V1_STR, tags=["Authentication"])
app.include_router(users.router, prefix=settings.API_V1_STR, tags=["User Management"])
app.include_router(monitoring.router, prefix=settings.API_V1_STR, tags=["Monitoring"])
app.include_router(governance.router, prefix=settings.API_V1_STR, tags=["Governance"])
app.include_router(admin.router, prefix=settings.API_V1_STR, tags=["Admin"])

@app.get("/")
def root():
    return {
        "message": "Welcome to Smart Credit Risk Prediction REST API",
        "docs": "/docs",
        "health": "/health",
        "ready": "/ready",
        "api_health": f"{settings.API_V1_STR}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

