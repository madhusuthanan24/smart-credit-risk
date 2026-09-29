import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, precision_recall_curve, auc, brier_score_loss,
    confusion_matrix
)

def evaluate_model(model_path='models/final_model.joblib', processed_dir='data/processed', threshold=0.35):
    model = joblib.load(model_path)
    X_test = pd.read_csv(os.path.join(processed_dir, 'X_test.csv'))
    y_test = pd.read_csv(os.path.join(processed_dir, 'y_test.csv')).values.ravel()
    
    y_proba = model.predict_proba(X_test)[:, 1]
    y_pred = (y_proba >= threshold).astype(int)
    
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_proba)
    
    p_prec, p_rec, _ = precision_recall_curve(y_test, y_proba)
    pr_auc = auc(p_rec, p_prec)
    brier = brier_score_loss(y_test, y_proba)
    
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    
    metrics = {
        'accuracy': round(acc, 4),
        'precision': round(prec, 4),
        'recall': round(rec, 4),
        'f1_score': round(f1, 4),
        'roc_auc': round(roc_auc, 4),
        'pr_auc': round(pr_auc, 4),
        'brier_score': round(brier, 4),
        'threshold': threshold,
        'true_positives_bad_caught': int(tp),
        'false_positives_good_rejected': int(fp),
        'false_negatives_bad_approved': int(fn),
        'true_negatives_good_approved': int(tn)
    }
    
    print("=== Evaluation Results ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
        
    return metrics

if __name__ == '__main__':
    evaluate_model()
