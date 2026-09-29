import os
import json
import joblib
import pandas as pd
import numpy as np
import streamlit as st

# Set Streamlit Page Configuration
st.set_page_config(
    page_title="Smart Credit Risk Prediction System",
    page_icon="💳",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS styling for visual polish
st.markdown("""
<style>
    .main-header {
        font-size: 2.2rem;
        font-weight: 700;
        color: #1E293B;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 1.1rem;
        color: #64748B;
        margin-bottom: 2rem;
    }
    .card-low {
        background-color: #F0FDF4;
        border-left: 6px solid #16A34A;
        padding: 1.2rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    }
    .card-med {
        background-color: #FEFCE8;
        border-left: 6px solid #CA8A04;
        padding: 1.2rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    }
    .card-high {
        background-color: #FEF2F2;
        border-left: 6px solid #DC2626;
        padding: 1.2rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    }
    .stat-label {
        font-size: 0.85rem;
        color: #64748B;
        text-transform: uppercase;
        font-weight: 600;
    }
    .stat-val {
        font-size: 1.8rem;
        font-weight: 700;
    }
</style>
""", unsafe_allow_html=True)

# Safe Loader for Preprocessing Pipeline, Final Model, and Threshold Configuration
@st.cache_resource
def load_model_artifacts():
    pipeline_path = 'models/preprocessing_pipeline.joblib'
    model_path = 'models/final_model.joblib'
    threshold_path = 'models/threshold_config.json'
    metadata_path = 'models/final_model_metadata.json'
    
    if not os.path.exists(pipeline_path):
        st.error(f"Error: Missing preprocessing pipeline at `{pipeline_path}`. Please run preprocessing first.")
        st.stop()
    if not os.path.exists(model_path):
        st.error(f"Error: Missing final model artifact at `{model_path}`. Please train the model first.")
        st.stop()
        
    try:
        preprocessor = joblib.load(pipeline_path)
        model = joblib.load(model_path)
    except Exception as e:
        st.error(f"Error loading model artifacts: {str(e)}")
        st.stop()
        
    threshold = 0.35
    if os.path.exists(threshold_path):
        try:
            with open(threshold_path, 'r') as f:
                t_cfg = json.load(f)
                threshold = t_cfg.get('optimal_threshold', 0.35)
        except Exception:
            threshold = 0.35
            
    metadata = {}
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
        except Exception:
            metadata = {}
            
    return preprocessor, model, threshold, metadata

preprocessor, model, default_threshold, model_meta = load_model_artifacts()

# Define Human-Readable UI Option Mappings to UCI Raw Codes
CHECKING_MAP = {
    "Below 0 DM (Account in Deficit)": "A11",
    "0 to 200 DM (Low Balance)": "A12",
    ">= 200 DM / Salary Account (Substantial Balance)": "A13",
    "No Checking Account": "A14"
}

SAVINGS_MAP = {
    "Below 100 DM (Low Savings)": "A61",
    "100 to 500 DM": "A62",
    "500 to 1000 DM": "A63",
    ">= 1000 DM (High Savings)": "A64",
    "Unknown / No Savings Account": "A65"
}

HISTORY_MAP = {
    "Critical account / Other existing credits elsewhere": "A34",
    "Delay in paying back in past": "A33",
    "Existing credits paid back duly till now": "A32",
    "All credits at this bank paid back duly": "A31",
    "No credits taken / All paid back duly": "A30"
}

EMPLOYMENT_MAP = {
    "Unemployed": "A71",
    "< 1 year": "A72",
    "1 to 4 years": "A73",
    "4 to 7 years": "A74",
    ">= 7 years": "A75"
}

PURPOSE_MAP = {
    "Car (New)": "A40",
    "Car (Used)": "A41",
    "Furniture / Equipment": "A42",
    "Radio / Television": "A43",
    "Domestic Appliances": "A44",
    "Repairs": "A45",
    "Education": "A46",
    "Vacation": "A48",
    "Retraining": "A49",
    "Business": "A410"
}

HOUSING_MAP = {
    "Rent": "A151",
    "Own Home": "A152",
    "For Free / Provided by Employer": "A153"
}

PROPERTY_MAP = {
    "Real Estate / Land": "A121",
    "Building Society Savings / Life Insurance": "A122",
    "Car or Other Assets": "A123",
    "Unknown / No Property": "A124"
}

GUARANTOR_MAP = {
    "None": "A101",
    "Co-applicant": "A102",
    "Guarantor": "A103"
}

INSTALLMENT_PLANS_MAP = {
    "Bank": "A141",
    "Stores / Retail": "A142",
    "None": "A143"
}

JOB_MAP = {
    "Unemployed / Unskilled Non-resident": "A171",
    "Unskilled Resident": "A172",
    "Skilled Employee / Official": "A173",
    "Management / Self-employed / Highly Qualified": "A174"
}

SEX_STATUS_MAP = {
    "Male: Single": "A93",
    "Female: Divorced / Separated / Married": "A92",
    "Male: Married / Widowed": "A94",
    "Male: Divorced / Separated": "A91"
}

TELEPHONE_MAP = {
    "Yes, Registered Under Customer Name": "A192",
    "None / Unregistered": "A191"
}

FOREIGN_MAP = {
    "Yes": "A201",
    "No": "A202"
}

# ==========================================
# SIDEBAR NAVIGATION & MODEL PERFORMANCE
# ==========================================
with st.sidebar:
    st.image("https://img.icons8.com/isometric/100/bank-cards.png", width=70)
    st.title("Smart Credit Risk")
    st.caption("Retail Credit Risk Scoring Engine")
    
    st.divider()
    
    st.subheader("Model Performance")
    st.markdown("**Champion Algorithm**: Tuned Logistic Regression ($C=0.1$)")
    st.markdown(f"**ROC-AUC**: `{model_meta.get('test_roc_auc', 0.8095):.4f}`")
    st.markdown(f"**PR-AUC**: `{model_meta.get('test_pr_auc', 0.6584):.4f}`")
    st.markdown(f"**Configured Cutoff Threshold**: `{default_threshold:.2f}` ({default_threshold*100:.0f}%)")
    st.markdown("**Cross-Validation Stability**: 10 Seeds (Mean ROC-AUC: `0.7799`, Std: `0.0036`)")
    
    st.divider()
    
    st.subheader("⚙️ Decision Threshold Setting")
    applied_threshold = st.slider(
        "Decision Cutoff Threshold",
        min_value=0.10,
        max_value=0.70,
        value=float(default_threshold),
        step=0.05,
        help="Configured threshold loaded from models/threshold_config.json. Default probability >= threshold yields BAD CREDIT / HIGH RISK prediction."
    )
    
    st.divider()
    
    st.caption("ℹ️ **Educational Project Disclaimer**: This is a statistical prediction based on historical data and is not a guarantee of default. Educational/research project — requires appropriate legal, regulatory, fairness, and human-review controls before real-world lending use.")

# ==========================================
# MAIN CONTENT HEADER
# ==========================================
st.markdown('<div class="main-header">Smart Credit Risk Prediction System</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">Evaluate applicant credit default probability, stratify risk categories, and review underwriting explanations.</div>', unsafe_allow_html=True)

# ==========================================
# INPUT FORM SECTIONS
# ==========================================
with st.form("credit_risk_form"):
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Applicant Information")
        age = st.number_input("Age in Years", min_value=18, max_value=90, value=35, step=1)
        sex_status_sel = st.selectbox("Personal Status & Gender/Marital", list(SEX_STATUS_MAP.keys()), index=0)
        foreign_sel = st.selectbox("Foreign Worker Status", list(FOREIGN_MAP.keys()), index=0)
        telephone_sel = st.selectbox("Telephone Registration", list(TELEPHONE_MAP.keys()), index=0)
        
        st.subheader("Credit History")
        history_sel = st.selectbox("Repayment History", list(HISTORY_MAP.keys()), index=2)
        employment_sel = st.selectbox("Present Employment Tenure", list(EMPLOYMENT_MAP.keys()), index=2)
        job_sel = st.selectbox("Job Qualification Tier", list(JOB_MAP.keys()), index=2)
        guarantor_sel = st.selectbox("Co-signers / Guarantors", list(GUARANTOR_MAP.keys()), index=0)

    with col2:
        st.subheader("Financial Information")
        checking_sel = st.selectbox("Checking Account Status", list(CHECKING_MAP.keys()), index=3)
        savings_sel = st.selectbox("Savings Account Balance", list(SAVINGS_MAP.keys()), index=0)
        housing_sel = st.selectbox("Housing Status", list(HOUSING_MAP.keys()), index=1)
        property_sel = st.selectbox("Property & Assets", list(PROPERTY_MAP.keys()), index=0)
        plans_sel = st.selectbox("Other External Installment Plans", list(INSTALLMENT_PLANS_MAP.keys()), index=2)

        st.subheader("Loan Information")
        credit_amount = st.number_input("Credit Amount Requested (DM)", min_value=250, max_value=20000, value=2500, step=250)
        duration_months = st.number_input("Loan Duration (Months)", min_value=4, max_value=72, value=24, step=2)
        installment_rate = st.slider("Installment Burden (% of Disposable Income)", min_value=1, max_value=4, value=3, step=1)
        purpose_sel = st.selectbox("Loan Purpose", list(PURPOSE_MAP.keys()), index=0)
        residence_since = st.slider("Present Residence Tenure (Years)", min_value=1, max_value=4, value=2, step=1)
        existing_credits = st.slider("Existing Credits at this Bank", min_value=1, max_value=4, value=1, step=1)
        num_liable = st.slider("Dependents Count", min_value=1, max_value=2, value=1, step=1)

    st.markdown("<br>", unsafe_allow_html=True)
    submit_button = st.form_submit_button("Predict Credit Risk", use_container_width=True)

# ==========================================
# PREDICTION EXECUTION & DISPLAY
# ==========================================
if submit_button or 'has_predicted' in st.session_state:
    st.session_state['has_predicted'] = True
    
    # Construct raw applicant dictionary matching model schema
    raw_input_data = {
        'status_checking_account': CHECKING_MAP[checking_sel],
        'duration_in_months': int(duration_months),
        'credit_history': HISTORY_MAP[history_sel],
        'purpose': PURPOSE_MAP[purpose_sel],
        'credit_amount': int(credit_amount),
        'savings_account': SAVINGS_MAP[savings_sel],
        'present_employment_since': EMPLOYMENT_MAP[employment_sel],
        'installment_rate': int(installment_rate),
        'personal_status_sex': SEX_STATUS_MAP[sex_status_sel],
        'other_debtors_guarantors': GUARANTOR_MAP[guarantor_sel],
        'present_residence_since': int(residence_since),
        'property': PROPERTY_MAP[property_sel],
        'age_in_years': int(age),
        'other_installment_plans': INSTALLMENT_PLANS_MAP[plans_sel],
        'housing': HOUSING_MAP[housing_sel],
        'existing_credits': int(existing_credits),
        'job': JOB_MAP[job_sel],
        'num_people_liable': int(num_liable),
        'telephone': TELEPHONE_MAP[telephone_sel],
        'foreign_worker': FOREIGN_MAP[foreign_sel]
    }
    
    try:
        df_input = pd.DataFrame([raw_input_data])
        X_prep = preprocessor.transform(df_input)
        
        # Real Model Inference (Not hard-coded)
        prob_default = float(model.predict_proba(X_prep)[:, 1][0])
        pred_class = 1 if prob_default >= applied_threshold else 0
        
        if prob_default < 0.20:
            risk_tier = "LOW RISK"
            decision_label = "GOOD CREDIT / APPROVED"
            card_class = "card-low"
        elif prob_default < applied_threshold:
            risk_tier = "MODERATE RISK"
            decision_label = "MANUAL REVIEW / REFER"
            card_class = "card-med"
        else:
            risk_tier = "HIGH RISK"
            decision_label = "BAD CREDIT / REJECT"
            card_class = "card-high"
            
    except Exception as e:
        st.error(f"Prediction Error: {str(e)}")
        st.stop()

    st.divider()
    st.subheader("Prediction Result")
    
    res_col1, res_col2, res_col3, res_col4 = st.columns(4)
    
    with res_col1:
        st.markdown(f'<div class="{card_class}"><div class="stat-label">Risk Category</div><div class="stat-val">{risk_tier}</div></div>', unsafe_allow_html=True)
    with res_col2:
        st.markdown(f'<div class="{card_class}"><div class="stat-label">Predicted Default Probability</div><div class="stat-val">{prob_default*100:.1f}%</div></div>', unsafe_allow_html=True)
    with res_col3:
        st.markdown(f'<div class="{card_class}"><div class="stat-label">Decision Threshold</div><div class="stat-val">{applied_threshold*100:.0f}%</div></div>', unsafe_allow_html=True)
    with res_col4:
        st.markdown(f'<div class="{card_class}"><div class="stat-label">Model Decision</div><div class="stat-val" style="font-size: 1.3rem;">{decision_label}</div></div>', unsafe_allow_html=True)

    # Risk Explanation Section
    st.subheader("Risk Explanation")
    st.caption("Key applicant characteristics associated with predicted default probability in historical data:")
    
    risk_factors = []
    protective_factors = []
    
    if raw_input_data['status_checking_account'] == 'A11':
        risk_factors.append("⚠️ **Checking Account in Deficit (< 0 DM)**: Associated with higher predicted credit risk.")
    elif raw_input_data['status_checking_account'] == 'A14':
        protective_factors.append("✅ **No Checking Account**: Associated with lower predicted risk in this dataset.")
        
    if raw_input_data['duration_in_months'] > 24:
        risk_factors.append(f"⚠️ **Long Loan Horizon ({duration_months} Months)**: Longer repayment terms extend exposure time.")
    else:
        protective_factors.append(f"✅ **Short/Moderate Loan Term ({duration_months} Months)**: Shorter horizons limit exposure time.")
        
    if raw_input_data['savings_account'] == 'A61':
        risk_factors.append("⚠️ **Low Liquid Savings (< 100 DM)**: Leaves limited buffer against unexpected financial shocks.")
    elif raw_input_data['savings_account'] in ['A64', 'A65']:
        protective_factors.append("✅ **Substantial/Stable Savings**: High or conservative savings reserves associated with lower predicted risk.")
        
    if raw_input_data['credit_amount'] > 4000:
        risk_factors.append(f"⚠️ **High Principal Amount ({credit_amount:,} DM)**: Higher principal balance increases debt burden.")
        
    if raw_input_data['installment_rate'] >= 3:
        risk_factors.append(f"⚠️ **High Debt Service Ratio (Tier {installment_rate})**: High installment burden relative to disposable income.")
        
    if raw_input_data['housing'] == 'A152':
        protective_factors.append("✅ **Homeowner**: Property ownership associated with asset stability and collateral backing.")

    exp_col1, exp_col2 = st.columns(2)
    with exp_col1:
        st.markdown("##### ⚠️ Risk Increasing Factors")
        if risk_factors:
            for rf in risk_factors:
                st.markdown(f"- {rf}")
        else:
            st.markdown("- *No major high-risk indicators triggered.*")
            
    with exp_col2:
        st.markdown("##### ✅ Risk Reducing / Protective Factors")
        if protective_factors:
            for pf in protective_factors:
                st.markdown(f"- {pf}")
        else:
            st.markdown("- *No major protective factors identified.*")

    # Applicant Summary Section
    st.subheader("Applicant Summary")
    with st.expander("📄 View Submitted Applicant Summary Profile", expanded=True):
        st.json(raw_input_data)

# Disclaimer Section
st.divider()
st.subheader("Disclaimer")
st.warning(
    "This is a statistical prediction based on historical data and is not a guarantee of default.\n\n"
    "Educational/research project — requires appropriate legal, regulatory, fairness, and human-review controls before real-world lending use."
)
