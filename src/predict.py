import os
import json
import joblib
import pandas as pd
import numpy as np

def predict_credit_risk(applicant_data, pipeline_path='models/preprocessing_pipeline.joblib', model_path='models/final_model.joblib', threshold_path='models/threshold_config.json'):
    """
    Production-ready prediction function.
    Accepts single applicant dictionary or pandas DataFrame of applicants.
    Returns calibrated default probability, binary prediction, risk category, and credit decision.
    """
    if not os.path.exists(pipeline_path):
        raise FileNotFoundError(f"Preprocessing pipeline not found at {pipeline_path}")
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Final model not found at {model_path}")
        
    preprocessor = joblib.load(pipeline_path)
    model = joblib.load(model_path)
    
    threshold = 0.35
    if os.path.exists(threshold_path):
        with open(threshold_path, 'r') as f:
            t_cfg = json.load(f)
            threshold = t_cfg.get('optimal_threshold', 0.35)
            
    if isinstance(applicant_data, dict):
        df_input = pd.DataFrame([applicant_data])
    elif isinstance(applicant_data, pd.DataFrame):
        df_input = applicant_data.copy()
    else:
        raise ValueError("applicant_data must be a dict or a pandas DataFrame")
        
    X_prep = preprocessor.transform(df_input)
    prob_default = model.predict_proba(X_prep)[:, 1]
    
    results = []
    for p in prob_default:
        if p < 0.20:
            risk_tier = 'Low Risk'
            decision = 'Approve'
        elif p < threshold:
            risk_tier = 'Medium Risk'
            decision = 'Manual Review / Refer'
        else:
            risk_tier = 'High Risk'
            decision = 'Reject'
            
        results.append({
            'default_probability': round(float(p), 4),
            'default_probability_pct': f"{p * 100:.2f}%",
            'predicted_class': int(p >= threshold),
            'decision_threshold': threshold,
            'credit_decision': decision,
            'risk_category': risk_tier
        })
        
    return results if len(results) > 1 else results[0]

if __name__ == '__main__':
    sample_applicant = {
        'status_checking_account': 'A11',
        'duration_in_months': 36,
        'credit_history': 'A32',
        'purpose': 'A40',
        'credit_amount': 4000,
        'savings_account': 'A61',
        'present_employment_since': 'A72',
        'installment_rate': 4,
        'personal_status_sex': 'A93',
        'other_debtors_guarantors': 'A101',
        'present_residence_since': 2,
        'property': 'A121',
        'age_in_years': 28,
        'other_installment_plans': 'A143',
        'housing': 'A151',
        'existing_credits': 1,
        'job': 'A173',
        'num_people_liable': 1,
        'telephone': 'A191',
        'foreign_worker': 'A201'
    }
    res = predict_credit_risk(sample_applicant)
    print("=== Sample Single Applicant Prediction ===")
    print(json.dumps(res, indent=2))
