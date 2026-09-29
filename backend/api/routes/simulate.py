import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError

from backend.schemas.schemas import (
    ApplicantSchema,
    SimulationRequest,
    SimulationResponse,
    SimulationResultItem,
    SimulationDifference,
    FieldChangeSummary
)
from backend.services.prediction_service import prediction_service
from backend.services.nvidia_ai_service import nvidia_ai_service
from backend.api.dependencies import require_role, limit_prediction_attempts
from backend.database.models import User

router = APIRouter()

FIELD_LABELS: Dict[str, str] = {
    "status_checking_account": "Checking Account Status",
    "duration_in_months": "Loan Duration",
    "credit_history": "Credit History",
    "purpose": "Loan Purpose",
    "credit_amount": "Credit Amount",
    "savings_account": "Savings Account Balance",
    "present_employment_since": "Employment Duration",
    "installment_rate": "Installment Rate (% of Income)",
    "personal_status_sex": "Personal Status & Gender",
    "other_debtors_guarantors": "Other Debtors / Guarantors",
    "present_residence_since": "Residence Duration",
    "property": "Property / Collateral",
    "age_in_years": "Applicant Age",
    "other_installment_plans": "Other Installment Plans",
    "housing": "Housing Status",
    "existing_credits": "Existing Credits at Bank",
    "job": "Job / Qualification",
    "num_people_liable": "Number of Dependents",
    "telephone": "Telephone Registered",
    "foreign_worker": "Foreign Worker Status"
}

CODE_DISPLAYS: Dict[str, str] = {
    "A11": "< 0 DM (Deficit)",
    "A12": "0 - 200 DM",
    "A13": ">= 200 DM / Salary",
    "A14": "No Checking Account",
    "A30": "No Credits / Paid Duly",
    "A31": "All Paid Duly at this Bank",
    "A32": "Existing Paid Duly",
    "A33": "Past Payment Delay",
    "A34": "Critical Account / Other Credits",
    "A40": "Car (New)",
    "A41": "Car (Used)",
    "A42": "Furniture/Equipment",
    "A43": "Radio/Television",
    "A44": "Domestic Appliances",
    "A45": "Repairs",
    "A46": "Education",
    "A48": "Vacation",
    "A49": "Retraining",
    "A410": "Business",
    "A61": "< 100 DM (Low)",
    "A62": "100 - 500 DM",
    "A63": "500 - 1000 DM",
    "A64": ">= 1000 DM (High)",
    "A65": "Unknown / None",
    "A71": "Unemployed",
    "A72": "< 1 Year",
    "A73": "1 - 4 Years",
    "A74": "4 - 7 Years",
    "A75": ">= 7 Years",
    "A91": "Male: Divorced/Separated",
    "A92": "Female: Divorced/Separated/Married",
    "A93": "Male: Single",
    "A94": "Male: Married/Widowed",
    "A101": "None",
    "A102": "Co-Applicant",
    "A103": "Guarantor",
    "A121": "Real Estate / Land",
    "A122": "Building Society / Life Insurance",
    "A123": "Car or Other Assets",
    "A124": "Unknown / No Property",
    "A141": "Bank",
    "A142": "Stores / Retail",
    "A143": "None",
    "A151": "Rent",
    "A152": "Own Home",
    "A153": "For Free / Employer Provided",
    "A171": "Unemployed / Unskilled Non-resident",
    "A172": "Unskilled Resident",
    "A173": "Skilled Employee / Official",
    "A174": "Management / Self-Employed",
    "A191": "None / Unregistered",
    "A192": "Yes, Registered",
    "A201": "Yes",
    "A202": "No"
}

def format_field_value(field: str, value: Any) -> str:
    if field == "credit_amount":
        return f"{int(value):,} DM"
    elif field == "duration_in_months":
        return f"{int(value)} Months"
    elif field == "age_in_years":
        return f"{int(value)} Years"
    elif field == "installment_rate":
        return f"{int(value)}% of income"
    elif field == "present_residence_since":
        return f"{int(value)} Years"
    elif field == "existing_credits":
        return f"{int(value)} Credit(s)"
    elif field == "num_people_liable":
        return f"{int(value)} Dependent(s)"
    elif str(value) in CODE_DISPLAYS:
        return f"{value} ({CODE_DISPLAYS[str(value)]})"
    return str(value)


@router.post(
    "/simulate",
    response_model=SimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Run what-if credit risk simulation",
    dependencies=[Depends(limit_prediction_attempts)]
)
def simulate_credit_risk(
    request: SimulationRequest,
    current_user: User = Depends(require_role(["ADMIN", "CREDIT_OFFICER", "VIEWER"]))
) -> SimulationResponse:
    """
    Explore how hypothetical adjustments to borrower financial metrics impact ML credit scoring.
    Uses the exact same production inference pipeline (models/final_model.joblib, 0.35 threshold).
    Does NOT modify the trained model, threshold, or write persistent assessment records.
    """
    original_data = request.original_applicant.model_dump()

    # Determine simulated data
    if request.simulated_applicant is not None:
        simulated_data = request.simulated_applicant.model_dump()
    elif request.modifications is not None:
        # Validate modifications against allowed applicant fields
        allowed_fields = set(ApplicantSchema.model_fields.keys())
        unknown_fields = [k for k in request.modifications.keys() if k not in allowed_fields]
        if unknown_fields:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unknown applicant field(s) in modifications: {', '.join(unknown_fields)}"
            )

        simulated_data = dict(original_data)
        simulated_data.update(request.modifications)

        # Validate through ApplicantSchema to verify types, ranges (ge, le)
        try:
            validated_simulated = ApplicantSchema(**simulated_data)
            simulated_data = validated_simulated.model_dump()
        except ValidationError as ve:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Validation failed for simulated parameters: {ve.errors()}"
            )
    else:
        # No modification provided, simulated is identical to original
        simulated_data = dict(original_data)

    # 1. Authoritative ML Prediction for ORIGINAL profile
    try:
        orig_ml = prediction_service.predict(original_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Original profile prediction failed: {str(e)}"
        )

    # 2. Authoritative ML Prediction for SIMULATED profile (exact same pipeline)
    try:
        sim_ml = prediction_service.predict(simulated_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Simulated profile prediction failed: {str(e)}"
        )

    # 3. Compute Probability & Percentage-point difference
    prob_orig = orig_ml['default_probability']
    prob_sim = sim_ml['default_probability']
    prob_diff = round(prob_sim - prob_orig, 4)
    prob_points = round((prob_sim - prob_orig) * 100, 2)

    if prob_diff < -0.0001:
        direction = "lower"
    elif prob_diff > 0.0001:
        direction = "higher"
    else:
        direction = "unchanged"

    risk_changed = (orig_ml['risk_category'] != sim_ml['risk_category'])

    # 4. Synthesize Changed Fields Summary
    changes_summary: List[FieldChangeSummary] = []
    for field in ApplicantSchema.model_fields.keys():
        orig_val = original_data.get(field)
        sim_val = simulated_data.get(field)
        if orig_val != sim_val:
            changes_summary.append(
                FieldChangeSummary(
                    field=field,
                    field_label=FIELD_LABELS.get(field, field),
                    original_value=orig_val,
                    simulated_value=sim_val,
                    display_original=format_field_value(field, orig_val),
                    display_simulated=format_field_value(field, sim_val)
                )
            )

    diff_payload = {
        "probability_difference": prob_diff,
        "probability_points": prob_points,
        "direction": direction
    }

    # 5. NVIDIA AI Explainability Layer (Downstream, non-authoritative)
    ai_result = nvidia_ai_service.generate_simulation_explanation(
        original_applicant=original_data,
        original_ml=orig_ml,
        simulated_applicant=simulated_data,
        simulated_ml=sim_ml,
        changes_summary=[c.model_dump() for c in changes_summary],
        diff=diff_payload
    )

    return SimulationResponse(
        success=True,
        original=SimulationResultItem(
            default_probability=orig_ml['default_probability'],
            default_probability_pct=orig_ml['default_probability_pct'],
            predicted_class=orig_ml['predicted_class'],
            prediction=orig_ml['predicted_class'],
            decision_threshold=orig_ml['decision_threshold'],
            threshold=orig_ml['decision_threshold'],
            risk_category=orig_ml['risk_category'],
            credit_decision=orig_ml['credit_decision'],
            decision=orig_ml['credit_decision'],
            risk_factors=orig_ml.get('risk_factors', []),
            protective_factors=orig_ml.get('protective_factors', [])
        ),
        simulated=SimulationResultItem(
            default_probability=sim_ml['default_probability'],
            default_probability_pct=sim_ml['default_probability_pct'],
            predicted_class=sim_ml['predicted_class'],
            prediction=sim_ml['predicted_class'],
            decision_threshold=sim_ml['decision_threshold'],
            threshold=sim_ml['decision_threshold'],
            risk_category=sim_ml['risk_category'],
            credit_decision=sim_ml['credit_decision'],
            decision=sim_ml['credit_decision'],
            risk_factors=sim_ml.get('risk_factors', []),
            protective_factors=sim_ml.get('protective_factors', [])
        ),
        difference=SimulationDifference(
            probability_difference=prob_diff,
            probability_points=prob_points,
            direction=direction
        ),
        risk_changed=risk_changed,
        original_risk=orig_ml['risk_category'],
        simulated_risk=sim_ml['risk_category'],
        changes_summary=changes_summary,
        ai_explanation=ai_result.get("explanation"),
        ai_summary=ai_result.get("summary"),
        ai_insights=ai_result.get("insights", []),
        ai_provider=ai_result.get("provider"),
        ai_model=ai_result.get("model"),
        ai_generated_at=ai_result.get("generated_at")
    )
