import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.database.models import Assessment, Applicant, User
from backend.schemas.schemas import SimulationResponse
from backend.services.report_service import report_service
from backend.api.dependencies import require_role

router = APIRouter()


def _generate_report_response(
    assessment_id: str,
    db: Session,
    simulation_data: Optional[Dict[str, Any]] = None
) -> Response:
    # 1. Fetch existing stored assessment
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID '{assessment_id}' not found."
        )

    # 2. Fetch associated stored applicant record
    applicant = db.query(Applicant).filter(Applicant.id == assessment.applicant_id).first()
    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Associated applicant record for assessment '{assessment_id}' not found."
        )

    # 3. Extract stored assessment data (NO recalculation, NO predict_proba, NO new NVIDIA calls)
    assessment_dict = {
        "id": assessment.id,
        "applicant_id": assessment.applicant_id,
        "created_at": assessment.created_at,
        "default_probability": assessment.default_probability,
        "prediction": assessment.prediction,
        "risk_category": assessment.risk_category,
        "decision": assessment.decision,
        "threshold": assessment.threshold,
        "model_name": assessment.model_name,
        "model_version": assessment.model_version,
        "ai_explanation": assessment.ai_explanation,
        "ai_summary": assessment.ai_summary,
        "ai_insights": assessment.ai_insights,
        "ai_provider": assessment.ai_provider,
        "ai_model": assessment.ai_model,
        "ai_generated_at": assessment.ai_generated_at
    }

    applicant_dict = {
        col.name: getattr(applicant, col.name)
        for col in applicant.__table__.columns
        if col.name not in ['id', 'created_at']
    }

    # 4. Generate PDF using pure presentation ReportService
    try:
        pdf_bytes = report_service.generate_pdf(
            assessment_data=assessment_dict,
            applicant_data=applicant_dict,
            simulation_data=simulation_data
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report rendering failed: {str(e)}"
        )

    filename = f"credit-risk-assessment-{assessment.id}.pdf"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": "application/pdf"
    }

    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


@router.get(
    "/reports/assessment/{assessment_id}",
    summary="Download automated credit assessment PDF report",
    response_description="Binary PDF stream of verified assessment report"
)
def get_assessment_report(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    """
    Generate and stream an official Credit Risk Assessment PDF report
    from stored assessment and applicant records.
    Strictly read-only; never recalculates ML scores or calls external AI.
    """
    return _generate_report_response(assessment_id, db, simulation_data=None)


@router.post(
    "/reports/assessment/{assessment_id}",
    summary="Download credit assessment PDF report with attached simulation data",
    response_description="Binary PDF stream of verified assessment report with scenario comparison"
)
def post_assessment_report_with_simulation(
    assessment_id: str,
    simulation_payload: Optional[SimulationResponse] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    """
    Generate assessment report optionally incorporating a what-if simulation comparison.
    """
    sim_dict = simulation_payload.model_dump() if simulation_payload else None
    return _generate_report_response(assessment_id, db, simulation_data=sim_dict)


# Architectural route alias for compatibility
@router.get(
    "/assessments/{assessment_id}/report",
    summary="Alias for download assessment PDF report",
    include_in_schema=False
)
def get_assessment_report_alias(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
):
    return _generate_report_response(assessment_id, db, simulation_data=None)
