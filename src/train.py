import os
import json
import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from xgboost import XGBClassifier

def train_production_model(processed_dir='data/processed', model_dir='models'):
    X_train = pd.read_csv(os.path.join(processed_dir, 'X_train.csv'))
    y_train = pd.read_csv(os.path.join(processed_dir, 'y_train.csv')).values.ravel()
    
    # Selected production champion model based on evaluation and stability audit
    final_model = LogisticRegression(C=0.1, random_state=42, max_iter=1000)
    final_model.fit(X_train, y_train)
    
    os.makedirs(model_dir, exist_ok=True)
    joblib.dump(final_model, os.path.join(model_dir, 'final_model.joblib'))
    
    metadata = {
        'model_name': 'Tuned Logistic Regression',
        'hyperparameters': {'C': 0.1, 'max_iter': 1000, 'random_state': 42},
        'status': 'trained'
    }
    with open(os.path.join(model_dir, 'final_model_metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)
        
    print("Final model trained and exported to models/final_model.joblib")
    return final_model

if __name__ == '__main__':
    train_production_model()
