import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import httpx

from backend.core.config import settings

logger = logging.getLogger("nvidia_ai_service")


class NvidiaAIService:
    """
    NVIDIA AI Explainability & Risk Insights Service.
    
    Acts purely downstream from the authoritative Scikit-Learn ML engine.
    Produces:
    - Detailed decision explanation
    - Executive underwriting summary
    - Actionable risk mitigation insights
    
    Guarantees zero interruption to credit scoring via robust deterministic fallback.
    """

    def __init__(self):
        self.api_key = settings.NVIDIA_API_KEY
        self.model = settings.NVIDIA_MODEL
        self.base_url = settings.NVIDIA_API_BASE_URL.rstrip("/")
        self.timeout = settings.NVIDIA_TIMEOUT_SECONDS

    def generate_explanation(
        self,
        applicant_data: Dict[str, Any],
        ml_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate explainability narrative, summary, and insights.
        If the NVIDIA API is unconfigured, unreachable, or errors, 
        smoothly falls back to deterministic rule-based explainability.
        """
        # Check current settings key
        api_key = settings.NVIDIA_API_KEY
        
        if not api_key or api_key.strip() == "" or api_key.startswith("nvapi-your-key"):
            logger.info("NVIDIA_API_KEY not configured. Using deterministic regulatory fallback.")
            return self._generate_fallback(applicant_data, ml_result, reason="API Key Not Configured")

        try:
            return self._call_nvidia_api(applicant_data, ml_result, api_key)
        except Exception as e:
            logger.warning(f"NVIDIA AI generation encountered an issue: {str(e)}. Falling back to deterministic engine.")
            return self._generate_fallback(applicant_data, ml_result, reason=f"Inference Fallback ({type(e).__name__})")

    def _call_nvidia_api(
        self,
        applicant_data: Dict[str, Any],
        ml_result: Dict[str, Any],
        api_key: str
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        system_prompt = (
            "You are an explainability assistant for a credit-risk prediction platform.\n\n"
            "The numerical credit-risk prediction has already been calculated by an authoritative local machine-learning model.\n\n"
            "The supplied probability, threshold, and risk category are final model outputs.\n\n"
            "Do not recalculate, modify, override, or contradict these values.\n\n"
            "Your task is to explain the supplied model result clearly and conservatively.\n\n"
            "Do not claim that a feature causes default unless causal evidence exists.\n\n"
            "Use language such as:\n"
            "'The model associated this factor with higher predicted risk.'\n\n"
            "Do not invent applicant information.\n\n"
            "Do not invent model metrics.\n\n"
            "Do not invent regulatory requirements.\n\n"
            "Do not make autonomous lending decisions.\n\n"
            "Clearly distinguish model association from causation.\n\n"
            "Provide concise, professional and understandable explanations.\n\n"
            "You MUST respond ONLY with a valid JSON object matching this schema exactly with no extra markdown formatting:\n"
            "{\n"
            '  "summary": "Concise executive credit underwriting summary",\n'
            '  "explanation": "Detailed explanation of why the model reached this result, distinguishing association from causation",\n'
            '  "insights": ["Risk mitigation insight 1", "Risk mitigation insight 2", "Risk mitigation insight 3"]\n'
            "}"
        )

        prob_display = ml_result.get('default_probability_pct') or f"{ml_result.get('default_probability', 0)*100:.2f}%"
        risk_cat = ml_result.get('risk_category', 'UNKNOWN')
        decision = ml_result.get('credit_decision', 'UNKNOWN')
        threshold = ml_result.get('decision_threshold', 0.35)
        risk_str = ', '.join(ml_result.get('risk_factors', [])) or 'None'
        prot_str = ', '.join(ml_result.get('protective_factors', [])) or 'None'

        user_prompt = (
            f"=== AUTHORITATIVE ML ENGINE OUTPUT ===\n"
            f"- Default Probability: {prob_display}\n"
            f"- Risk Category: {risk_cat}\n"
            f"- Credit Decision: {decision}\n"
            f"- Decision Threshold: {threshold}\n"
            f"- Key Risk Drivers Identified: {risk_str}\n"
            f"- Key Protective Factors Identified: {prot_str}\n\n"
            f"=== APPLICANT FINANCIAL & DEMOGRAPHIC PROFILE ===\n"
            f"- Credit Amount: {applicant_data.get('credit_amount')} DM\n"
            f"- Loan Duration: {applicant_data.get('duration_in_months')} months\n"
            f"- Checking Account Code: {applicant_data.get('status_checking_account')}\n"
            f"- Credit Repayment History Code: {applicant_data.get('credit_history')}\n"
            f"- Savings Account Code: {applicant_data.get('savings_account')}\n"
            f"- Employment Tenure Code: {applicant_data.get('present_employment_since')}\n"
            f"- Installment Rate: {applicant_data.get('installment_rate')}% of disposable income\n"
            f"- Housing Status: {applicant_data.get('housing')}\n"
            f"- Existing Credits: {applicant_data.get('existing_credits')}\n"
            f"- Age: {applicant_data.get('age_in_years')} years\n"
            f"- Purpose: {applicant_data.get('purpose')}\n\n"
            f"Please synthesize the regulatory explanation, executive summary, and 3 actionable insights in strict JSON format."
        )

        payload = {
            "model": settings.NVIDIA_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 600,
            "top_p": 0.95
        }

        with httpx.Client(timeout=settings.NVIDIA_TIMEOUT_SECONDS) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        raw_content = data["choices"][0]["message"]["content"].strip()

        # Clean markdown code fences if present (e.g. ```json ... ```)
        cleaned_content = raw_content
        if cleaned_content.startswith("```"):
            lines = cleaned_content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned_content = "\n".join(lines).strip()

        parsed = json.loads(cleaned_content)
        
        explanation = str(parsed.get("explanation", "")).strip()
        summary = str(parsed.get("summary", "")).strip()
        insights = parsed.get("insights", [])
        if isinstance(insights, str):
            insights = [insights]
        elif not isinstance(insights, list):
            insights = [str(insights)]

        if not explanation or not summary:
            raise ValueError("Incomplete JSON received from NVIDIA endpoint.")

        return {
            "explanation": explanation,
            "summary": summary,
            "insights": [str(i).strip() for i in insights if str(i).strip()],
            "provider": "NVIDIA AI",
            "model": settings.NVIDIA_MODEL,
            "status": "SUCCESS",
            "generated_at": datetime.utcnow().isoformat()
        }

    def _generate_fallback(
        self,
        applicant_data: Dict[str, Any],
        ml_result: Dict[str, Any],
        reason: str = "Deterministic Fallback"
    ) -> Dict[str, Any]:
        """
        Rule-based deterministic fallback ensuring explainability is never empty,
        even during network partitions, latency spikes, or missing external credentials.
        """
        decision = ml_result.get("credit_decision", "REVIEW")
        prob_pct = ml_result.get("default_probability_pct", f"{ml_result.get('default_probability', 0)*100:.2f}%")
        risk_category = ml_result.get("risk_category", "MODERATE RISK")
        threshold = ml_result.get("decision_threshold", 0.35)
        amount = applicant_data.get("credit_amount", 0)
        duration = applicant_data.get("duration_in_months", 0)
        risk_factors = ml_result.get("risk_factors", [])
        protective_factors = ml_result.get("protective_factors", [])

        if decision == "APPROVED":
            summary = (
                f"Applicant demonstrates strong creditworthiness with a default probability of {prob_pct}, "
                f"comfortably below the bank's maximum risk tolerance threshold of {threshold*100:.1f}%. "
                f"Credit facility of {amount} DM over {duration} months is recommended for approval."
            )
            explanation = (
                f"The predictive model classified this application as {risk_category} (Default Probability: {prob_pct} "
                f"vs Threshold: {threshold*100:.1f}%). Positive underwriting factors including "
                f"{', '.join(protective_factors[:2]) if protective_factors else 'stable financial indicators'} "
                f"significantly mitigate default exposure over the requested {duration}-month tenure."
            )
            insights = [
                f"Maintain standard repayment tracking with automated direct debit to preserve pristine profile.",
                f"Applicant qualifies for tier-1 preferential interest rates and pre-approved renewals upon 6 months timely repayment.",
                f"Facility debt burden is well-balanced relative to reported income reserves and duration."
            ]
        elif decision == "REJECTED":
            summary = (
                f"Application exceeds bank credit tolerance guidelines with an elevated default probability of {prob_pct}, "
                f"substantially above the {threshold*100:.1f}% cutoff threshold. Credit application is recommended for adverse action."
            )
            explanation = (
                f"The Scikit-Learn risk engine classified this facility as {risk_category} (Default Probability: {prob_pct} "
                f"vs Threshold: {threshold*100:.1f}%). Primary risk drivers include "
                f"{', '.join(risk_factors[:3]) if risk_factors else 'insufficient liquidity buffer and extended repayment exposure'}. "
                f"These conditions present excessive portfolio default hazard."
            )
            insights = [
                f"Restructure facility request: Reducing credit amount ({amount} DM) or lowering duration ({duration} mos) may lower default risk.",
                f"Provide credit-enhancing collateral, a qualified solvent co-signer (A102), or institutional guarantor.",
                f"Address adverse checking/savings liquidity status to demonstrate sustained positive cash balances prior to re-application."
            ]
        else: # MANUAL REVIEW or MODERATE RISK
            summary = (
                f"Application falls within the border zone with a default probability of {prob_pct} "
                f"relative to the {threshold*100:.1f}% approval threshold. Comprehensive underwriter review recommended."
            )
            explanation = (
                f"The assessment generated a {risk_category} classification at {prob_pct} default risk. "
                f"Countervailing credit factors were detected: "
                f"{', '.join(risk_factors[:2]) if risk_factors else 'elevated debt ratio'} vs "
                f"{', '.join(protective_factors[:2]) if protective_factors else 'tenured employment'}. "
                f"Underwriting judgment is required."
            )
            insights = [
                f"Verify secondary sources of income, recent bank statements, and tax clearances before commitment.",
                f"Consider approving with a conditional reduction in principal or mandatory debt protection insurance.",
                f"Perform debt-service coverage ratio stress test under simulated income disruption."
            ]

        return {
            "explanation": explanation,
            "summary": summary,
            "insights": insights,
            "provider": "Deterministic Fallback",
            "model": "regulatory-ruleset-v1",
            "status": "FALLBACK",
            "generated_at": datetime.utcnow().isoformat()
        }

    def generate_simulation_explanation(
        self,
        original_applicant: Dict[str, Any],
        original_ml: Dict[str, Any],
        simulated_applicant: Dict[str, Any],
        simulated_ml: Dict[str, Any],
        changes_summary: List[Dict[str, Any]],
        diff: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate explainability narrative, summary, and insights for a simulated applicant profile.
        Strictly downstream from the ML model; never recalculates probability or risk category.
        If NVIDIA is unavailable or errors, falls back to deterministic rule-based explainability.
        """
        api_key = settings.NVIDIA_API_KEY
        if not api_key or api_key.strip() == "" or api_key.startswith("nvapi-your-key"):
            logger.info("NVIDIA_API_KEY not configured. Using deterministic simulation fallback.")
            return self._generate_simulation_fallback(
                original_applicant, original_ml, simulated_applicant, simulated_ml, changes_summary, diff, reason="API Key Not Configured"
            )

        try:
            return self._call_nvidia_simulation_api(
                original_applicant, original_ml, simulated_applicant, simulated_ml, changes_summary, diff, api_key
            )
        except Exception as e:
            logger.warning(f"NVIDIA simulation AI generation encountered an issue: {str(e)}. Falling back to deterministic engine.")
            return self._generate_simulation_fallback(
                original_applicant, original_ml, simulated_applicant, simulated_ml, changes_summary, diff, reason=f"Inference Fallback ({type(e).__name__})"
            )

    def _call_nvidia_simulation_api(
        self,
        original_applicant: Dict[str, Any],
        original_ml: Dict[str, Any],
        simulated_applicant: Dict[str, Any],
        simulated_ml: Dict[str, Any],
        changes_summary: List[Dict[str, Any]],
        diff: Dict[str, Any],
        api_key: str
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        system_prompt = (
            "You are an explainability assistant for a credit-risk prediction platform simulator.\n\n"
            "The original and simulated probabilities and risk categories were calculated by an authoritative local machine-learning model.\n\n"
            "Do not recalculate, modify, override, or contradict them.\n\n"
            "Explain the difference using only the supplied values.\n\n"
            "Avoid causal claims. Do NOT claim that reducing loan amount will prevent default.\n\n"
            "Use language such as:\n"
            "'The simulated profile produced a lower predicted default probability when the loan amount was reduced.'\n"
            "'The model associated this factor with...'\n"
            "rather than:\n"
            "'this factor causes...'\n\n"
            "Do not invent applicant information.\n\n"
            "Do not invent model metrics.\n\n"
            "Do not make autonomous lending decisions.\n\n"
            "You MUST respond ONLY with a valid JSON object matching this schema exactly with no extra markdown formatting:\n"
            "{\n"
            '  "summary": "Executive summary of the scenario comparison",\n'
            '  "explanation": "Detailed explanation of why the model output changed in response to the modified inputs",\n'
            '  "insights": ["Simulation risk insight 1", "Simulation risk insight 2", "Simulation risk insight 3"]\n'
            "}"
        )

        changes_text = "\n".join([
            f"- {c['field_label']} ({c['field']}): {c['display_original']} -> {c['display_simulated']}"
            for c in changes_summary
        ]) if changes_summary else "No input fields were modified."

        orig_prob_pct = original_ml.get('default_probability_pct', f"{original_ml.get('default_probability', 0)*100:.2f}%")
        sim_prob_pct = simulated_ml.get('default_probability_pct', f"{simulated_ml.get('default_probability', 0)*100:.2f}%")
        points_diff = diff.get('probability_points', 0.0)
        direction = diff.get('direction', 'unchanged')

        user_prompt = (
            f"=== ORIGINAL AUTHORITATIVE MODEL RESULT ===\n"
            f"- Default Probability: {orig_prob_pct}\n"
            f"- Risk Category: {original_ml.get('risk_category')}\n"
            f"- Credit Decision: {original_ml.get('credit_decision')}\n"
            f"- Decision Threshold: {original_ml.get('decision_threshold', 0.35)}\n\n"
            f"=== SIMULATED AUTHORITATIVE MODEL RESULT ===\n"
            f"- Default Probability: {sim_prob_pct}\n"
            f"- Risk Category: {simulated_ml.get('risk_category')}\n"
            f"- Credit Decision: {simulated_ml.get('credit_decision')}\n"
            f"- Probability Change: {points_diff:+.2f} percentage points ({direction})\n\n"
            f"=== MODIFIED INPUT PARAMETERS ===\n"
            f"{changes_text}\n\n"
            f"Please synthesize the simulation comparison summary, model response explanation, and 2-3 risk insights in strict JSON format."
        )

        payload = {
            "model": settings.NVIDIA_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 600,
            "top_p": 0.95
        }

        with httpx.Client(timeout=settings.NVIDIA_TIMEOUT_SECONDS) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        raw_content = data["choices"][0]["message"]["content"].strip()

        cleaned_content = raw_content
        if cleaned_content.startswith("```"):
            lines = cleaned_content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned_content = "\n".join(lines).strip()

        parsed = json.loads(cleaned_content)
        
        explanation = str(parsed.get("explanation", "")).strip()
        summary = str(parsed.get("summary", "")).strip()
        insights = parsed.get("insights", [])
        if isinstance(insights, str):
            insights = [insights]
        elif not isinstance(insights, list):
            insights = [str(insights)]

        if not explanation or not summary:
            raise ValueError("Incomplete JSON received from NVIDIA endpoint.")

        return {
            "explanation": explanation,
            "summary": summary,
            "insights": [str(i).strip() for i in insights if str(i).strip()],
            "provider": "NVIDIA AI",
            "model": settings.NVIDIA_MODEL,
            "status": "SUCCESS",
            "generated_at": datetime.utcnow().isoformat()
        }

    def _generate_simulation_fallback(
        self,
        original_applicant: Dict[str, Any],
        original_ml: Dict[str, Any],
        simulated_applicant: Dict[str, Any],
        simulated_ml: Dict[str, Any],
        changes_summary: List[Dict[str, Any]],
        diff: Dict[str, Any],
        reason: str = "Deterministic Fallback"
    ) -> Dict[str, Any]:
        orig_prob_pct = original_ml.get('default_probability_pct', f"{original_ml.get('default_probability', 0)*100:.2f}%")
        sim_prob_pct = simulated_ml.get('default_probability_pct', f"{simulated_ml.get('default_probability', 0)*100:.2f}%")
        orig_risk = original_ml.get('risk_category', 'UNKNOWN')
        sim_risk = simulated_ml.get('risk_category', 'UNKNOWN')
        points_diff = diff.get('probability_points', 0.0)
        direction = diff.get('direction', 'unchanged')

        modified_labels = [c['field_label'] for c in changes_summary]
        param_desc = ", ".join(modified_labels[:3]) if modified_labels else "applicant parameters"

        if direction == "lower":
            summary = (
                f"The simulated profile produced a lower predicted default probability of {sim_prob_pct} "
                f"(a reduction of {abs(points_diff):.2f} percentage points compared to baseline {orig_prob_pct}). "
                f"Risk classification moved from {orig_risk} to {sim_risk}."
            )
            explanation = (
                f"The model associated the adjustments in {param_desc} with lower predicted credit risk. "
                f"In the simulated scenario, modified financial metrics aligned closer with historical low-default profiles, "
                f"reducing expected default risk relative to the 0.35 decision cutoff."
            )
            insights = [
                f"Adjusting {param_desc} reflects a more conservative credit profile under the trained model.",
                f"Confirm whether simulated adjustments (such as loan tenure or collateral) can be formalized in the actual loan agreement.",
                f"Verify borrower financial documentation to ensure simulated reserves reflect verifiable liquidity."
            ]
        elif direction == "higher":
            summary = (
                f"The simulated profile produced an increased predicted default probability of {sim_prob_pct} "
                f"(an increase of {abs(points_diff):.2f} percentage points over baseline {orig_prob_pct}). "
                f"Risk classification changed from {orig_risk} to {sim_risk}."
            )
            explanation = (
                f"The model associated the adjustments in {param_desc} with higher predicted risk exposure. "
                f"Extended tenure, higher principal balance, or lower reserves elevated the calculated probability of default."
            )
            insights = [
                f"The model responds sensitively to modifications in {param_desc}.",
                f"Consider structuring compensating factors, such as higher down-payment or guarantor backing.",
                f"Evaluate debt-to-income sensitivity before expanding credit boundaries."
            ]
        else:
            summary = (
                f"The simulated profile resulted in an unchanged predicted default probability of {sim_prob_pct} ({sim_risk})."
            )
            explanation = (
                f"The modifications to {param_desc} had negligible net impact on the logistic scoring weights of the calibrated model."
            )
            insights = [
                f"Modifications did not cross significant feature boundaries in the trained preprocessor.",
                f"To affect model predictions, explore adjustments to primary risk drivers such as checking liquidity or duration."
            ]

        return {
            "explanation": explanation,
            "summary": summary,
            "insights": insights,
            "provider": "Deterministic Fallback",
            "model": "regulatory-ruleset-v1",
            "status": "FALLBACK",
            "generated_at": datetime.utcnow().isoformat()
        }

    # ==================================================
    # Phase H: Executive Decision Intelligence Summary
    # ==================================================

    def generate_executive_summary(
        self,
        analytics_summary: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Produce a concise executive portfolio narrative summarizing deterministic analytics.
        Strictly advisory and descriptive. Does not perform scoring or credit decisions.
        """
        api_key = settings.NVIDIA_API_KEY
        if not api_key or api_key.strip() == "" or api_key.startswith("nvapi-your-key"):
            return self._generate_executive_fallback(analytics_summary, reason="Deterministic Mode")
        
        try:
            return self._call_nvidia_executive_api(analytics_summary, api_key)
        except Exception as e:
            logger.warning(f"NVIDIA executive summary generation issue: {str(e)}. Using fallback.")
            return self._generate_executive_fallback(analytics_summary, reason=f"Inference Fallback ({type(e).__name__})")

    def _call_nvidia_executive_api(
        self,
        analytics_summary: Dict[str, Any],
        api_key: str
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        system_prompt = (
            "You are an executive risk advisor for a commercial credit risk management platform. "
            "Your role is STRICTLY ADVISORY. You summarize already calculated, deterministic portfolio analytics. "
            "You MUST NOT calculate risk scores, modify probabilities, alter thresholds, classify applicants, "
            "or make lending decisions. "
            "Respond ONLY with valid JSON having the exact keys: 'portfolio_summary' (string), "
            "'notable_observations' (array of strings), 'operational_recommendations' (array of strings)."
        )

        user_prompt = (
            f"Here are the deterministic credit risk portfolio analytics:\n"
            f"Total Assessments: {analytics_summary.get('total_assessments', 0)}\n"
            f"Risk Distribution: Low Risk: {analytics_summary.get('low_risk_pct_str', '0%')}, "
            f"Moderate Risk: {analytics_summary.get('moderate_risk_pct_str', '0%')}, "
            f"High Risk: {analytics_summary.get('high_risk_pct_str', '0%')}\n"
            f"Average Default Probability: {analytics_summary.get('avg_default_probability_pct', '0%')}\n"
            f"Median Default Probability: {analytics_summary.get('median_default_probability_pct', '0%')}\n"
            f"Decision Threshold: 0.35 (35% cutoff)\n"
            f"Model Authority: Local Tuned Logistic Regression ML Engine\n"
            f"Monitoring Status: Active\n\n"
            f"Generate a professional, concise executive summary in JSON format with keys: "
            f"'portfolio_summary', 'notable_observations', and 'operational_recommendations'."
        )

        payload = {
            "model": settings.NVIDIA_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 500,
            "top_p": 0.95
        }

        with httpx.Client(timeout=settings.NVIDIA_TIMEOUT_SECONDS) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        raw_content = data["choices"][0]["message"]["content"].strip()
        cleaned_content = raw_content
        if cleaned_content.startswith("```"):
            lines = cleaned_content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned_content = "\n".join(lines).strip()

        parsed = json.loads(cleaned_content)
        summary = str(parsed.get("portfolio_summary", "")).strip()
        observations = parsed.get("notable_observations", [])
        recommendations = parsed.get("operational_recommendations", [])

        if not summary:
            raise ValueError("Empty executive summary received from NVIDIA endpoint.")

        return {
            "portfolio_summary": summary,
            "notable_observations": [str(o).strip() for o in observations if str(o).strip()],
            "operational_recommendations": [str(r).strip() for r in recommendations if str(r).strip()],
            "ai_provider": "NVIDIA AI",
            "ai_model": settings.NVIDIA_MODEL,
            "generated_at": datetime.utcnow().isoformat()
        }

    def _generate_executive_fallback(
        self,
        analytics_summary: Dict[str, Any],
        reason: str = ""
    ) -> Dict[str, Any]:
        total = analytics_summary.get("total_assessments", 0)
        avg_prob = analytics_summary.get("avg_default_probability_pct", "0.0%")
        high_pct = analytics_summary.get("high_risk_pct_str", "0.0%")
        low_pct = analytics_summary.get("low_risk_pct_str", "0.0%")
        mod_pct = analytics_summary.get("moderate_risk_pct_str", "0.0%")

        if total == 0:
            return {
                "portfolio_summary": "Insufficient assessment data recorded to generate an executive portfolio summary.",
                "notable_observations": [
                    "No credit evaluations are recorded in the current active reporting window.",
                    "Production decision threshold is locked at 0.35 (35%).",
                    "Continuous model monitoring and data drift systems stand ready."
                ],
                "operational_recommendations": [
                    "Submit initial credit assessment applications to activate live risk telemetry.",
                    "Verify connectivity of underwriting integration endpoints."
                ],
                "ai_provider": "Deterministic Governance Engine (Fallback)",
                "ai_model": "rule-based-executive-analyst",
                "generated_at": datetime.utcnow().isoformat()
            }

        return {
            "portfolio_summary": (
                f"The evaluated credit portfolio comprises {total} assessments with an average default probability "
                f"of {avg_prob}. High-risk exposure represents {high_pct} of current volume under the locked 0.35 cutoff threshold."
            ),
            "notable_observations": [
                f"Portfolio distribution is segmented into {low_pct} low-risk, {mod_pct} moderate-risk, and {high_pct} high-risk accounts.",
                "Model governance and data drift tracking are active against the 1,000 reference German Credit dataset.",
                "Decisions are governed strictly by the local ML inference engine with locked 0.35 cutoff."
            ],
            "operational_recommendations": [
                "Prioritize senior credit officer review for applications falling in the 0.20–0.35 moderate-risk buffer.",
                "Maintain supervisory validation across demographic proxy dimensions to preserve portfolio stability.",
                "Review ongoing PSI stability metrics for any potential shifts in applicant characteristics."
            ],
            "ai_provider": "Deterministic Governance Engine (Fallback)",
            "ai_model": "rule-based-executive-analyst",
            "generated_at": datetime.utcnow().isoformat()
        }


nvidia_ai_service = NvidiaAIService()


