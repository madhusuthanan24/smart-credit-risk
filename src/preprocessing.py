import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

NUMERICAL_COLS = [
    'duration_in_months', 'credit_amount', 'installment_rate',
    'present_residence_since', 'age_in_years', 'existing_credits', 'num_people_liable'
]

CATEGORICAL_COLS = [
    'status_checking_account', 'credit_history', 'purpose', 'savings_account',
    'present_employment_since', 'personal_status_sex', 'other_debtors_guarantors',
    'property', 'other_installment_plans', 'housing', 'job', 'telephone', 'foreign_worker'
]

def load_and_map_data(raw_data_path):
    df = pd.read_csv(raw_data_path)
    target_map = {1: 0, 2: 1}
    df['target'] = df['credit_risk'].map(target_map)
    return df

def build_preprocessing_pipeline():
    numeric_transformer = Pipeline(steps=[
        ('scaler', StandardScaler())
    ])
    categorical_transformer = Pipeline(steps=[
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, NUMERICAL_COLS),
            ('cat', categorical_transformer, CATEGORICAL_COLS)
        ],
        remainder='drop'
    )
    return preprocessor

def run_preprocessing_pipeline(raw_data_path='data/raw/german_credit.csv', output_dir='data/processed', model_dir='models'):
    df = load_and_map_data(raw_data_path)
    
    X = df[NUMERICAL_COLS + CATEGORICAL_COLS].copy()
    y = df['target'].copy()
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )
    
    preprocessor = build_preprocessing_pipeline()
    preprocessor.fit(X_train)
    
    feature_names_out = list(preprocessor.get_feature_names_out())
    
    X_train_prep = preprocessor.transform(X_train)
    X_test_prep = preprocessor.transform(X_test)
    
    X_train_df = pd.DataFrame(X_train_prep, columns=feature_names_out)
    X_test_df = pd.DataFrame(X_test_prep, columns=feature_names_out)
    
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(model_dir, exist_ok=True)
    
    joblib.dump(preprocessor, os.path.join(model_dir, 'preprocessing_pipeline.joblib'))
    
    X_train_df.to_csv(os.path.join(output_dir, 'X_train.csv'), index=False)
    X_test_df.to_csv(os.path.join(output_dir, 'X_test.csv'), index=False)
    y_train.to_csv(os.path.join(output_dir, 'y_train.csv'), index=False)
    y_test.to_csv(os.path.join(output_dir, 'y_test.csv'), index=False)
    
    metadata = {
        'numerical_cols': NUMERICAL_COLS,
        'categorical_cols': CATEGORICAL_COLS,
        'transformed_feature_names': feature_names_out,
        'num_features_raw': len(NUMERICAL_COLS) + len(CATEGORICAL_COLS),
        'num_features_transformed': len(feature_names_out),
        'train_samples': len(X_train),
        'test_samples': len(X_test)
    }
    with open(os.path.join(model_dir, 'feature_metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"Preprocessing completed. Transformed features: {len(feature_names_out)}")
    return X_train_df, X_test_df, y_train, y_test, preprocessor

if __name__ == '__main__':
    run_preprocessing_pipeline()
