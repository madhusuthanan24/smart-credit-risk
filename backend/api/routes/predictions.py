from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from backend.database.database import get_db
from backend.database.models import Applicant, Assessment, AuditLog, User
from backend.schemas.schemas import PredictionRequest, PredictionResponse, AssessmentSummaryItem
from backend.services.prediction_service import prediction_service
from backend.api.dependencies import get_current_user, require_role, limit_prediction_attempts

router = APIRouter()

@router.post("/predictions", response_model=PredictionResponse, status_code=status.HTTP_201_CREATED, summary="Create new credit assessment", dependencies=[Depends(limit_prediction_attempts)])
def create_prediction(
    request: PredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER"]))
):
    app_data = request.applicant.model_dump()
    
    # 1. Real ML Inference
    try:
        result = prediction_service.predict(app_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Prediction calculation failed: {str(e)}"
        )
    
    # 2. Transactional Database Persistence
    try:
        applicant = Applicant(**app_data)
        db.add(applicant)
        db.flush()

        assessment = Assessment(
            applicant_id=applicant.id,
            default_probability=result['default_probability'],
            prediction=result['predicted_class'],
            risk_category=result['risk_category'],
            decision=result['credit_decision'],
            threshold=result['decision_threshold'],
            model_name=result['model_name'],
            model_version=result['model_version']
        )
        db.add(assessment)
        db.flush()

        audit = AuditLog(
            assessment_id=assessment.id,
            action="PREDICTION_CREATED",
            model_version=result['model_version'],
            threshold=result['decision_threshold'],
            status="SUCCESS",
            details=f"User {current_user.email} ({current_user.role}) created assessment. Probability: {result['default_probability_pct']}, Decision: {result['credit_decision']}"
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failed: {str(e)}"
        )

    return {
        "success": True,
        "prediction_id": assessment.id,
        "applicant_id": applicant.id,
        "default_probability": result['default_probability'],
        "default_probability_pct": result['default_probability_pct'],
        "predicted_class": result['predicted_class'],
        "prediction": result['predicted_class'],
        "decision_threshold": result['decision_threshold'],
        "threshold": result['decision_threshold'],
        "risk_category": result['risk_category'],
        "credit_decision": result['credit_decision'],
        "decision": result['credit_decision'],
        "model_name": result['model_name'],
        "model_version": result['model_version'],
        "created_at": assessment.created_at.strftime('%Y-%m-%d %H:%M:%S') if assessment.created_at else datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
        "risk_factors": result.get('risk_factors', []),
        "protective_factors": result.get('protective_factors', []),
        "disclaimer": result.get('disclaimer', '')
    }

@router.get("/predictions", response_model=List[AssessmentSummaryItem], summary="List historical credit assessments")
def list_predictions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    risk_category: Optional[str] = Query(None, description="Filter by risk category"),
    prediction: Optional[int] = Query(None, description="Filter by prediction (0 or 1)"),
    date_from: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Assessment)

    if risk_category:
        query = query.filter(Assessment.risk_category == risk_category)
    if prediction is not None:
        query = query.filter(Assessment.prediction == prediction)
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(Assessment.created_at >= dt_from)
        except ValueError:
            pass
    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d")
            query = query.filter(Assessment.created_at <= dt_to)
        except ValueError:
            pass

    offset = (page - 1) * page_size
    assessments = query.order_by(Assessment.created_at.desc()).offset(offset).limit(page_size).all()

    applicant_ids = [a.applicant_id for a in assessments]
    applicants = db.query(Applicant).filter(Applicant.id.in_(applicant_ids)).all() if applicant_ids else []
    app_map = {app.id: app for app in applicants}

    results = []
    for a in assessments:
        app = app_map.get(a.applicant_id)
        results.append({
            "id": a.id,
            "created_at": a.created_at.strftime('%Y-%m-%d %H:%M:%S') if a.created_at else '',
            "applicant_id": a.applicant_id,
            "credit_amount": app.credit_amount if app else 0,
            "duration_in_months": app.duration_in_months if app else 0,
            "default_probability": round(a.default_probability, 4),
            "default_probability_pct": f"{a.default_probability * 100:.2f}%",
            "risk_category": a.risk_category,
            "credit_decision": a.decision,
            "decision": a.decision,
            "model_version": a.model_version
        })
    return results

@router.get("/predictions/{prediction_id}", summary="Get prediction details by ID")
def get_prediction_detail(
    prediction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assessment = db.query(Assessment).filter(Assessment.id == prediction_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Prediction not found")
        
    applicant = db.query(Applicant).filter(Applicant.id == assessment.applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant record not found")
    
    app_dict = {
        col.name: getattr(applicant, col.name) for col in applicant.__table__.columns if col.name not in ['id', 'created_at']
    }
    
    try:
        result = prediction_service.predict(app_dict)
        risk_factors = result.get('risk_factors', [])
        protective_factors = result.get('protective_factors', [])
        disclaimer = result.get('disclaimer', '')
    except Exception:
        risk_factors = []
        protective_factors = []
        disclaimer = ""

    return {
        "success": True,
        "prediction_id": assessment.id,
        "applicant_id": applicant.id,
        "created_at": assessment.created_at.strftime('%Y-%m-%d %H:%M:%S') if assessment.created_at else '',
        "default_probability": round(assessment.default_probability, 4),
        "default_probability_pct": f"{assessment.default_probability * 100:.2f}%",
        "predicted_class": assessment.prediction,
        "prediction": assessment.prediction,
        "decision_threshold": assessment.threshold,
        "threshold": assessment.threshold,
        "risk_category": assessment.risk_category,
        "credit_decision": assessment.decision,
        "decision": assessment.decision,
        "model_name": assessment.model_name,
        "model_version": assessment.model_version,
        "applicant_features": app_dict,
        "risk_factors": risk_factors,
        "protective_factors": protective_factors,
        "disclaimer": disclaimer
    }
