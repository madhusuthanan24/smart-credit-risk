import os
import unittest
import pandas as pd
import numpy as np
from src.predict import predict_credit_risk

class TestCreditRiskPrediction(unittest.TestCase):

    def setUp(self):
        self.valid_applicant_uci = {
            'status_checking_account': 'A14',
            'duration_in_months': 12,
            'credit_history': 'A32',
            'purpose': 'A40',
            'credit_amount': 1500,
            'savings_account': 'A65',
            'present_employment_since': 'A74',
            'installment_rate': 2,
            'personal_status_sex': 'A93',
            'other_debtors_guarantors': 'A101',
            'present_residence_since': 4,
            'property': 'A121',
            'age_in_years': 40,
            'other_installment_plans': 'A143',
            'housing': 'A152',
            'existing_credits': 1,
            'job': 'A173',
            'num_people_liable': 1,
            'telephone': 'A192',
            'foreign_worker': 'A201'
        }
        
        self.high_risk_applicant_uci = {
            'status_checking_account': 'A11',
            'duration_in_months': 48,
            'credit_history': 'A30',
            'purpose': 'A46',
            'credit_amount': 8000,
            'savings_account': 'A61',
            'present_employment_since': 'A72',
            'installment_rate': 4,
            'personal_status_sex': 'A92',
            'other_debtors_guarantors': 'A101',
            'present_residence_since': 2,
            'property': 'A124',
            'age_in_years': 22,
            'other_installment_plans': 'A141',
            'housing': 'A151',
            'existing_credits': 2,
            'job': 'A172',
            'num_people_liable': 1,
            'telephone': 'A191',
            'foreign_worker': 'A201'
        }

    def test_single_applicant_prediction_keys(self):
        res = predict_credit_risk(self.valid_applicant_uci)
        self.assertIsInstance(res, dict)
        self.assertIn('default_probability', res)
        self.assertIn('default_probability_pct', res)
        self.assertIn('predicted_class', res)
        self.assertIn('decision_threshold', res)
        self.assertIn('credit_decision', res)
        self.assertIn('risk_category', res)

    def test_probability_range(self):
        res = predict_credit_risk(self.valid_applicant_uci)
        prob = res['default_probability']
        self.assertGreaterEqual(prob, 0.0)
        self.assertLessEqual(prob, 1.0)

    def test_threshold_decision_logic(self):
        res_low = predict_credit_risk(self.valid_applicant_uci)
        self.assertEqual(res_low['decision_threshold'], 0.35)
        
        res_high = predict_credit_risk(self.high_risk_applicant_uci)
        self.assertGreater(res_high['default_probability'], 0.35)
        self.assertEqual(res_high['predicted_class'], 1)
        self.assertEqual(res_high['risk_category'], 'High Risk')

    def test_batch_prediction_dataframe(self):
        df_batch = pd.DataFrame([self.valid_applicant_uci, self.high_risk_applicant_uci])
        res_list = predict_credit_risk(df_batch)
        self.assertIsInstance(res_list, list)
        self.assertEqual(len(res_list), 2)

    def test_invalid_input_type(self):
        with self.assertRaises(ValueError):
            predict_credit_risk("invalid_string_input")

if __name__ == '__main__':
    unittest.main()
