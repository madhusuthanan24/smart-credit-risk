# Model Card — Smart Credit Risk Prediction Engine

## 1. Model Purpose
The Smart Credit Risk Scoring Engine estimates the probability of default for retail loan applicants. It provides underwriters with transparent default risk probabilities, risk tier classifications (`Low Risk`, `Medium Risk`, `High Risk`), and explainable rejection/approval drivers via SHAP values and logistic regression feature coefficients.

---

## 2. Dataset
- **Name**: German Credit Risk Dataset (UCI Machine Learning Repository).
- **Domain**: Retail consumer banking and credit origination.
- **Geographic Context**: Germany (Historical).

---

## 3. Dataset Size
- **Total Observations**: `1,000` applicants.
- **Training Set Size**: `800` applicants (80%).
- **Test Set Size**: `200` applicants (20%).
- **Features**: `20` predictor variables (`7` numerical, `13` categorical).

---

## 4. Target Definition
- **Target Variable**: `credit_risk` / `target`.
- **Class 0 (Good Credit / Non-Default)**: `700` applicants (70.00% of portfolio).
- **Class 1 (Bad Credit / Default)**: `300` applicants (30.00% of portfolio).

---

## 5. Features
- **Numerical Features (7)**: `duration_in_months`, `credit_amount`, `installment_rate`, `present_residence_since`, `age_in_years`, `existing_credits`, `num_people_liable`.
- **Categorical Features (13)**: `status_checking_account`, `credit_history`, `purpose`, `savings_account`, `present_employment_since`, `personal_status_sex`, `other_debtors_guarantors`, `property`, `other_installment_plans`, `housing`, `job`, `telephone`, `foreign_worker`.

---

## 6. Preprocessing
- **Missing Values**: 0 missing values.
- **Duplicates**: 0 duplicate rows.
- **Categorical Encoding**: `OneHotEncoder(handle_unknown='ignore', sparse_output=False)` producing 61 transformed features.
- **Numerical Scaling**: `StandardScaler()` fit strictly on `X_train`.
- **Leakage Prevention**: All transformations fit exclusively on `X_train`.

---

## 7. Models Evaluated
1. **Logistic Regression** (Standard & Class-Weighted)
2. **Decision Tree Classifier**
3. **Random Forest Classifier** (Standard & Class-Weighted)
4. **Gradient Boosting Classifier**
5. **XGBoost Classifier**

---

## 8. Final Model
- **Selected Champion Model**: **Tuned Logistic Regression** ($C = 0.1$, $max\_iter = 1000$).
- **Selection Rationale**: Achieves top test ROC-AUC (0.8095) and PR-AUC (0.6584), lowest Brier score calibration loss (0.1546), 100% stability across 10 random seeds, and full linear log-odds transparency for Adverse Action notices.

---

## 9. Performance Metrics (Test Set, N = 200)
| Metric | Baseline (0.50 Cutoff) | Calibrated Production (0.35 Cutoff) |
| :--- | :---: | :---: |
| **Accuracy** | 79.00% | 77.50% |
| **Precision (Bad)** | 71.43% | 59.74% |
| **Recall (Bad Credit Capture)** | 50.00% | **76.67%** |
| **F1-Score** | 0.5882 | **0.6715** |
| **ROC-AUC** | **0.8095** | **0.8095** |
| **PR-AUC** | **0.6584** | **0.6584** |
| **Brier Score** | 0.1546 | 0.1546 |
| **Financial Cost Index ($5 \cdot FN + FP$)** | 162 | **101** (37.6% Risk Loss Reduction) |

---

## 10. Decision Threshold
- **Selected Threshold**: `0.35`.
- **Justification**: Shifting decision cutoff from standard 0.50 to 0.35 captures 76.67% of default applicants (46 out of 60 defaults in test set) vs 50.00% at 0.50 threshold, reducing expected financial loss by 37.6%.

---

## 11. Intended Use
- Educational benchmarking and baseline credit scoring.
- Underwriting decision assistance and automated risk stratification (`Low Risk`, `Medium Risk`, `High Risk`).
- Explaining adverse credit decisions (rejections) via SHAP and coefficient log-odds.

---

## 12. Out-of-Scope Use
- Direct uncalibrated deployment in real-world retail lending without local population re-estimation.
- Automated instant rejection without underwriting human review capability.

---

## 13. Limitations
- **Sample Size**: Capped at 1,000 historical records.
- **Underwriting Selection Bias**: Dataset contains only approved historical applicants; rejected applicants are unobserved.
- **Coarse Categoricals**: Features use anonymized categorical codes (`A11`, `A12`, `A34`).

---

## 14. Fairness Considerations
- Demographic attributes (`personal_status_sex`, `foreign_worker`, `age_in_years`) are excluded from production feature sets to comply with anti-discrimination mandates.
- Subgroups with $N < 25$ are flagged with sample size warnings.

---

## 15. Historical Dataset Limitations
The dataset originates from 1970s West Germany. Macroeconomic, inflation, interest rate, and cultural differences prevent direct transferability to contemporary credit environments (e.g. Indian retail credit).

---

## 16. Monitoring Recommendations
- Monitor Population Stability Index (PSI) monthly for checking account status and duration distributions.
- Track Characteristic Stability Index (CSI) and default rate drift quarterly.

---

## 17. Re-Training Considerations
- Re-fit preprocessing pipeline and coefficients whenever macro default rates drift by $> 5\%$.
- Recalibrate decision thresholds annually based on updated financial loss matrices.
