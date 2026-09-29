import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from backend.core.config import settings

class PredictionService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PredictionService, cls).__new__(cls)
            cls._instance._load_models()
        return cls._instance

    def _load_models(self):
        if not os.path.exists(settings.PREPROCESSOR_PATH) or not os.path.exists(settings.MODEL_PATH):
            raise FileNotFoundError(f"ML artifacts missing in {settings.PREPROCESSOR_PATH} or {settings.MODEL_PATH}")
            
        self.preprocessor = joblib.load(settings.PREPROCESSOR_PATH)
        self.model = joblib.load(settings.MODEL_PATH)
        
        self.threshold = 0.35
        if os.path.exists(settings.THRESHOLD_PATH):
            with open(settings.THRESHOLD_PATH, 'r') as f:
                t_cfg = json.load(f)
                self.threshold = t_cfg.get('optimal_threshold', 0.35)
                
        self.metadata = {}
        if os.path.exists(settings.METADATA_PATH):
            with open(settings.METADATA_PATH, 'r') as f:
                self.metadata = json.load(f)

    def predict(self, applicant_dict: dict) -> dict:
        """
        Real ML Inference using existing pipeline and trained model.
        """
        df_input = pd.DataFrame([applicant_dict])
        X_prep = self.preprocessor.transform(df_input)
        
        prob_default = float(self.model.predict_proba(X_prep)[:, 1][0])
        predicted_class = 1 if prob_default >= self.threshold else 0
        
        if prob_default < 0.20:
            risk_category = "LOW RISK"
            credit_decision = "GOOD CREDIT / APPROVED"
        elif prob_default < self.threshold:
            risk_category = "MODERATE RISK"
            credit_decision = "MANUAL REVIEW / REFER"
        else:
            risk_category = "HIGH RISK"
            credit_decision = "BAD CREDIT / REJECT"

        risk_factors = []
        protective_factors = []

        if applicant_dict.get('status_checking_account') == 'A11':
            risk_factors.append("Checking Account in Deficit (< 0 DM): Associated with higher predicted default risk.")
        elif applicant_dict.get('status_checking_account') == 'A14':
            protective_factors.append("No Checking Account: Associated with lower predicted default risk.")

        if applicant_dict.get('duration_in_months', 0) > 24:
            risk_factors.append(f"Long Loan Horizon ({applicant_dict['duration_in_months']} Months): Extended repayment duration increases cumulative risk exposure.")
        else:
            protective_factors.append(f"Short/Moderate Loan Horizon ({applicant_dict['duration_in_months']} Months): Shorter repayment terms limit risk exposure.")

        if applicant_dict.get('savings_account') == 'A61':
            risk_factors.append("Low Liquid Savings (< 100 DM): Leaves limited monthly buffer against income shocks.")
        elif applicant_dict.get('savings_account') in ['A64', 'A65']:
            protective_factors.append("Substantial/Conservative Savings Reserves: Higher savings reserves lower default risk.")

        if applicant_dict.get('credit_amount', 0) > 4000:
            risk_factors.append(f"High Principal Amount ({applicant_dict['credit_amount']:,} DM): Higher principal balance increases debt service burden.")

        if applicant_dict.get('installment_rate', 0) >= 3:
            risk_factors.append(f"High Debt Service Ratio (Tier {applicant_dict['installment_rate']}): High installment burden relative to disposable income.")

        if applicant_dict.get('housing') == 'A152':
            protective_factors.append("Homeowner: Property ownership indicates asset stability and collateral backing.")

        return {
            'default_probability': round(prob_default, 4),
            'default_probability_pct': f"{prob_default * 100:.2f}%",
            'predicted_class': predicted_class,
            'decision_threshold': self.threshold,
            'risk_category': risk_category,
            'credit_decision': credit_decision,
            'model_name': 'Tuned Logistic Regression',
            'model_version': '1.0.0',
            'risk_factors': risk_factors,
            'protective_factors': protective_factors,
            'disclaimer': 'This is a statistical prediction based on historical data and is not a guarantee of default. Educational/research project — requires appropriate legal, regulatory, fairness, and human-review controls before real-world lending use.'
        }

prediction_service = PredictionService()
