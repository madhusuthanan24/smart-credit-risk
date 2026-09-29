# German Credit Dataset (Raw)

## 1. Dataset Name
- **Name:** Statlog (German Credit Data)
- **Donor:** Prof. Dr. Hans Hofmann, Institut für Statistik und Ökonometrie, Universität Hamburg

## 2. Original Source & URL
- **Repository:** UCI Machine Learning Repository
- **Source URL:** [https://archive.ics.uci.edu/ml/machine-learning-databases/statlog/german/german.data](https://archive.ics.uci.edu/ml/machine-learning-databases/statlog/german/german.data)
- **Documentation URL:** [https://archive.ics.uci.edu/ml/machine-learning-databases/statlog/german/german.doc](https://archive.ics.uci.edu/ml/machine-learning-databases/statlog/german/german.doc)

## 3. Dataset Dimensions
- **Number of Observations (Rows):** `1,000`
- **Number of Original Features:** `20` (7 numerical, 13 categorical)
- **Total Columns (including target):** `21`

## 4. Target Variable Description
- **Column Name:** `credit_risk` (Attribute 21)
- **Original Encoding in Raw Data:**
  - `1`: **Good Credit Risk** (Paid back duly / Non-default) — 700 instances (70%)
  - `2`: **Bad Credit Risk** (Default / Delay in payment) — 300 instances (30%)
- **Asymmetric Cost Matrix:**
  - Misclassifying a bad credit applicant as good (False Negative) has a financial loss weight of **5**, whereas turning down a good applicant (False Positive) has a weight of **1**.

## 5. Original Attributes
1. `status_checking_account` (Categorical: A11–A14)
2. `duration_in_months` (Numerical)
3. `credit_history` (Categorical: A30–A34)
4. `purpose` (Categorical: A40–A410)
5. `credit_amount` (Numerical: in Deutsche Mark)
6. `savings_account` (Categorical: A61–A65)
7. `present_employment_since` (Categorical: A71–A75)
8. `installment_rate` (Numerical: % of disposable income)
9. `personal_status_sex` (Categorical: A91–A95)
10. `other_debtors_guarantors` (Categorical: A101–A103)
11. `present_residence_since` (Numerical)
12. `property` (Categorical: A121–A124)
13. `age_in_years` (Numerical)
14. `other_installment_plans` (Categorical: A141–A143)
15. `housing` (Categorical: A151–A153)
16. `existing_credits` (Numerical)
17. `job` (Categorical: A171–A174)
18. `num_people_liable` (Numerical)
19. `telephone` (Categorical: A191–A192)
20. `foreign_worker` (Categorical: A201–A202)
21. `credit_risk` (Target: 1 = Good, 2 = Bad)

## 6. Conversions Performed
- The original raw file `german.data` was retrieved verbatim from the UCI repository as whitespace-separated plain text.
- To facilitate structured parsing in Pandas and downstream modeling workflows, `german.data` was converted to `german_credit.csv` using comma delimiters and standard column headers derived directly from `german.doc`.
- **Zero values, rows, or categories were altered, removed, or imputed.** The underlying data values match `german.data` bit-for-bit.
