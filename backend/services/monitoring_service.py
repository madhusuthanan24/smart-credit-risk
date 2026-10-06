import os
import json
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database.models import Assessment, Applicant

class MonitoringService:
    _instance = None
    _reference_df = None
    _features_meta = None
    _model_meta = None
    _threshold = 0.35

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MonitoringService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        
        # Load reference data
        ref_path = os.path.join(project_root, "data", "raw", "german_credit.csv")
        if os.path.exists(ref_path):
            self._reference_df = pd.read_csv(ref_path)
        else:
            self._reference_df = None

        # Load feature metadata
        feat_meta_path = os.path.join(project_root, "models", "feature_metadata.json")
        if os.path.exists(feat_meta_path):
            with open(feat_meta_path, "r") as f:
                self._features_meta = json.load(f)
        else:
            self._features_meta = {
                "numerical_cols": [
                    "duration_in_months", "credit_amount", "installment_rate",
                    "present_residence_since", "age_in_years", "existing_credits", "num_people_liable"
                ],
                "categorical_cols": [
                    "status_checking_account", "credit_history", "purpose", "savings_account",
                    "present_employment_since", "personal_status_sex", "other_debtors_guarantors",
                    "property", "other_installment_plans", "housing", "job", "telephone", "foreign_worker"
                ]
            }

        # Load model metadata
        model_meta_path = os.path.join(project_root, "models", "final_model_metadata.json")
        if os.path.exists(model_meta_path):
            with open(model_meta_path, "r") as f:
                self._model_meta = json.load(f)
        else:
            self._model_meta = {
                "test_roc_auc": 0.8095,
                "test_pr_auc": 0.6584,
                "test_recall_at_optimal_threshold": 0.7667,
                "test_f1_at_optimal_threshold": 0.6715,
                "decision_threshold": 0.35
            }

        # Load threshold config
        thresh_path = os.path.join(project_root, "models", "threshold_config.json")
        if os.path.exists(thresh_path):
            with open(thresh_path, "r") as f:
                t_cfg = json.load(f)
                self._threshold = t_cfg.get("optimal_threshold", 0.35)
        else:
            self._threshold = self._model_meta.get("decision_threshold", 0.35)

    def get_monitoring_overview(self, db: Session, days: Optional[int] = None) -> dict:
        now = datetime.utcnow()
        today_start = datetime.combine(date.today(), datetime.min.time())

        # Volume Metrics across key timeframes
        total_all_time = db.query(func.count(Assessment.id)).scalar() or 0
        today_count = db.query(func.count(Assessment.id)).filter(Assessment.created_at >= today_start).scalar() or 0
        last_7_days_count = db.query(func.count(Assessment.id)).filter(Assessment.created_at >= now - timedelta(days=7)).scalar() or 0
        last_30_days_count = db.query(func.count(Assessment.id)).filter(Assessment.created_at >= now - timedelta(days=30)).scalar() or 0

        volume_metrics = {
            "today": today_count,
            "last_7_days": last_7_days_count,
            "last_30_days": last_30_days_count,
            "all_time": total_all_time
        }

        # Filtered assessments query for distributions
        query = db.query(Assessment)
        if days:
            query = query.filter(Assessment.created_at >= now - timedelta(days=days))

        assessments = query.all()
        total_filtered = len(assessments)

        # Risk distribution
        if total_filtered == 0:
            risk_distribution = {
                "low_risk": {"count": 0, "percentage": 0.0, "percentage_formatted": "0.00%"},
                "moderate_risk": {"count": 0, "percentage": 0.0, "percentage_formatted": "0.00%"},
                "high_risk": {"count": 0, "percentage": 0.0, "percentage_formatted": "0.00%"},
                "total": 0
            }
            prob_stats = {
                "mean": 0.0,
                "median": 0.0,
                "min": 0.0,
                "max": 0.0
            }
            histogram = [
                {"bin": f"{i*10}-{(i+1)*10}%", "min": round(i*0.1, 2), "max": round((i+1)*0.1, 2), "count": 0, "percentage": 0.0}
                for i in range(10)
            ]
            threshold_metrics = {
                "threshold": self._threshold,
                "below_threshold_count": 0,
                "below_threshold_pct": 0.0,
                "at_or_above_threshold_count": 0,
                "at_or_above_threshold_pct": 0.0
            }
        else:
            low_count = sum(1 for a in assessments if a.risk_category == "LOW RISK")
            mod_count = sum(1 for a in assessments if a.risk_category in ("MODERATE RISK", "MEDIUM RISK"))
            high_count = sum(1 for a in assessments if a.risk_category == "HIGH RISK")

            risk_distribution = {
                "low_risk": {
                    "count": low_count,
                    "percentage": round((low_count / total_filtered) * 100, 2),
                    "percentage_formatted": f"{(low_count / total_filtered) * 100:.2f}%"
                },
                "moderate_risk": {
                    "count": mod_count,
                    "percentage": round((mod_count / total_filtered) * 100, 2),
                    "percentage_formatted": f"{(mod_count / total_filtered) * 100:.2f}%"
                },
                "high_risk": {
                    "count": high_count,
                    "percentage": round((high_count / total_filtered) * 100, 2),
                    "percentage_formatted": f"{(high_count / total_filtered) * 100:.2f}%"
                },
                "total": total_filtered
            }

            # Probability Metrics
            probs = [float(a.default_probability) for a in assessments]
            prob_stats = {
                "mean": round(float(np.mean(probs)), 4),
                "median": round(float(np.median(probs)), 4),
                "min": round(float(np.min(probs)), 4),
                "max": round(float(np.max(probs)), 4)
            }

            # 10-Bucket Histogram (0-10%, 10-20%, ..., 90-100%)
            histogram = []
            for i in range(10):
                b_min = round(i * 0.1, 2)
                b_max = round((i + 1) * 0.1, 2)
                if i == 9:
                    b_count = sum(1 for p in probs if b_min <= p <= b_max)
                else:
                    b_count = sum(1 for p in probs if b_min <= p < b_max)
                b_pct = round((b_count / total_filtered) * 100, 2)
                histogram.append({
                    "bin": f"{i*10}-{(i+1)*10}%",
                    "min": b_min,
                    "max": b_max,
                    "count": b_count,
                    "percentage": b_pct
                })

            # Threshold Metrics
            below_count = sum(1 for p in probs if p < self._threshold)
            above_count = sum(1 for p in probs if p >= self._threshold)
            threshold_metrics = {
                "threshold": self._threshold,
                "below_threshold_count": below_count,
                "below_threshold_pct": round((below_count / total_filtered) * 100, 2),
                "at_or_above_threshold_count": above_count,
                "at_or_above_threshold_pct": round((above_count / total_filtered) * 100, 2)
            }

        return {
            "volume": volume_metrics,
            "risk_distribution": risk_distribution,
            "probability_metrics": prob_stats,
            "probability_histogram": histogram,
            "threshold_metrics": threshold_metrics,
            "model_info": {
                "model_name": "Tuned Logistic Regression",
                "model_version": "1.0.0",
                "status": "HEALTHY",
                "last_monitored": now.isoformat()
            },
            "time_filter_days": days
        }

    def _calculate_numerical_psi(self, ref_series: pd.Series, prod_series: pd.Series, bins: int = 10, epsilon: float = 1e-4) -> float:
        unique_vals = np.sort(ref_series.unique())
        if len(unique_vals) <= 5:
            all_vals = np.union1d(unique_vals, prod_series.unique())
            ref_counts = ref_series.value_counts(normalize=True).to_dict()
            prod_counts = prod_series.value_counts(normalize=True).to_dict()
            ref_props = np.array([ref_counts.get(v, 0.0) for v in all_vals], dtype=float)
            prod_props = np.array([prod_counts.get(v, 0.0) for v in all_vals], dtype=float)
        else:
            quantiles = np.linspace(0, 1, bins + 1)
            bin_edges = np.unique(np.percentile(ref_series, quantiles * 100))
            if len(bin_edges) < 2:
                bin_edges = np.array([ref_series.min() - 1e-3, ref_series.max() + 1e-3])
            else:
                bin_edges[0] = -np.inf
                bin_edges[-1] = np.inf

            ref_binned = pd.cut(ref_series, bins=bin_edges, include_lowest=True)
            prod_binned = pd.cut(prod_series, bins=bin_edges, include_lowest=True)

            ref_props = ref_binned.value_counts(normalize=True, sort=False).values.astype(float)
            prod_props = prod_binned.value_counts(normalize=True, sort=False).values.astype(float)

        # Apply epsilon smoothing to prevent log(0) or div-by-zero
        ref_props = np.where(ref_props <= 0, epsilon, ref_props)
        prod_props = np.where(prod_props <= 0, epsilon, prod_props)
        ref_props /= ref_props.sum()
        prod_props /= prod_props.sum()

        psi_val = np.sum((prod_props - ref_props) * np.log(prod_props / ref_props))
        return float(max(0.0, psi_val))

    def _calculate_categorical_psi(self, ref_series: pd.Series, prod_series: pd.Series, epsilon: float = 1e-4) -> float:
        all_categories = sorted(list(set(ref_series.dropna().unique()).union(set(prod_series.dropna().unique()))))
        if not all_categories:
            return 0.0

        ref_counts = ref_series.value_counts(normalize=True).to_dict()
        prod_counts = prod_series.value_counts(normalize=True).to_dict()

        ref_props = np.array([ref_counts.get(c, 0.0) for c in all_categories], dtype=float)
        prod_props = np.array([prod_counts.get(c, 0.0) for c in all_categories], dtype=float)

        # Apply epsilon smoothing
        ref_props = np.where(ref_props <= 0, epsilon, ref_props)
        prod_props = np.where(prod_props <= 0, epsilon, prod_props)
        ref_props /= ref_props.sum()
        prod_props /= prod_props.sum()

        psi_val = np.sum((prod_props - ref_props) * np.log(prod_props / ref_props))
        return float(max(0.0, psi_val))

    def calculate_data_drift(self, db: Session, days: Optional[int] = None) -> dict:
        now = datetime.utcnow()
        ref_df = self._reference_df
        ref_count = len(ref_df) if ref_df is not None else 1000

        # Query applicant production data
        query = db.query(Applicant)
        if days:
            query = query.filter(Applicant.created_at >= now - timedelta(days=days))

        applicants = query.all()
        prod_count = len(applicants)

        numerical_cols = self._features_meta.get("numerical_cols", [])
        categorical_cols = self._features_meta.get("categorical_cols", [])
        total_features = len(numerical_cols) + len(categorical_cols)

        # Guardrail: Insufficient production data (< 5 samples)
        if prod_count < 5 or ref_df is None:
            return {
                "status": "INSUFFICIENT_DATA",
                "overall_drift_status": "INSUFFICIENT_DATA",
                "reference_dataset": "German Credit Dataset (1,000 samples)",
                "reference_count": ref_count,
                "production_count": prod_count,
                "time_filter_days": days,
                "total_features_monitored": total_features,
                "drifted_features_count": 0,
                "high_drift_count": 0,
                "medium_drift_count": 0,
                "low_drift_count": 0,
                "features": [],
                "message": f"Insufficient production data for drift calculation ({prod_count} samples found, minimum 5 required)."
            }

        # Build production DataFrame
        prod_records = []
        for app in applicants:
            row = {}
            for col in numerical_cols + categorical_cols:
                row[col] = getattr(app, col, None)
            prod_records.append(row)
        prod_df = pd.DataFrame(prod_records)

        feature_drift_results = []
        high_drift = 0
        medium_drift = 0
        low_drift = 0

        # Numerical Features PSI
        for col in numerical_cols:
            if col in ref_df.columns and col in prod_df.columns:
                psi = self._calculate_numerical_psi(ref_df[col].dropna(), prod_df[col].dropna())
                psi_rounded = round(psi, 4)

                if psi < 0.10:
                    drift_level = "LOW"
                    msg = "Feature distribution is stable (PSI < 0.10)."
                    low_drift += 1
                elif psi <= 0.25:
                    drift_level = "MEDIUM"
                    msg = "Moderate population shift detected (0.10 <= PSI <= 0.25). Monitoring recommended."
                    medium_drift += 1
                else:
                    drift_level = "HIGH"
                    msg = "Significant population shift detected (PSI > 0.25). Investigation recommended."
                    high_drift += 1

                feature_drift_results.append({
                    "feature_name": col,
                    "feature_type": "numerical",
                    "psi": psi_rounded,
                    "drift_level": drift_level,
                    "status": "ANALYZED",
                    "message": msg
                })

        # Categorical Features PSI
        for col in categorical_cols:
            if col in ref_df.columns and col in prod_df.columns:
                psi = self._calculate_categorical_psi(ref_df[col].dropna().astype(str), prod_df[col].dropna().astype(str))
                psi_rounded = round(psi, 4)

                if psi < 0.10:
                    drift_level = "LOW"
                    msg = "Category frequencies are stable (PSI < 0.10)."
                    low_drift += 1
                elif psi <= 0.25:
                    drift_level = "MEDIUM"
                    msg = "Moderate category distribution shift detected (0.10 <= PSI <= 0.25)."
                    medium_drift += 1
                else:
                    drift_level = "HIGH"
                    msg = "Significant category distribution shift detected (PSI > 0.25)."
                    high_drift += 1

                feature_drift_results.append({
                    "feature_name": col,
                    "feature_type": "categorical",
                    "psi": psi_rounded,
                    "drift_level": drift_level,
                    "status": "ANALYZED",
                    "message": msg
                })

        drifted_count = high_drift + medium_drift

        if high_drift > 0:
            overall_status = "SIGNIFICANT_DRIFT"
            summary_msg = f"Significant data drift detected in {high_drift} feature(s). Model input distribution requires review."
        elif medium_drift > 0:
            overall_status = "MODERATE_DRIFT"
            summary_msg = f"Moderate data drift detected in {medium_drift} feature(s). Continued monitoring recommended."
        else:
            overall_status = "STABLE"
            summary_msg = "All monitored features exhibit stable distributions compared to reference baseline."

        return {
            "status": "SUCCESS",
            "overall_drift_status": overall_status,
            "reference_dataset": "German Credit Dataset (1,000 samples)",
            "reference_count": ref_count,
            "production_count": prod_count,
            "time_filter_days": days,
            "total_features_monitored": len(feature_drift_results),
            "drifted_features_count": drifted_count,
            "high_drift_count": high_drift,
            "medium_drift_count": medium_drift,
            "low_drift_count": low_drift,
            "features": feature_drift_results,
            "message": summary_msg
        }

    def get_model_performance(self, db: Session) -> dict:
        # Check drift status to include in model health
        drift_summary = self.calculate_data_drift(db)
        data_drift_status = drift_summary.get("overall_drift_status", "STABLE")

        baseline_metrics = {
            "dataset": "German Credit Test Set (Holdout 200 samples)",
            "roc_auc": round(float(self._model_meta.get("test_roc_auc", 0.8095)), 4),
            "pr_auc": round(float(self._model_meta.get("test_pr_auc", 0.6584)), 4),
            "recall": round(float(self._model_meta.get("test_recall_at_optimal_threshold", 0.7667)), 4),
            "f1_score": round(float(self._model_meta.get("test_f1_at_optimal_threshold", 0.6715)), 4),
            "brier_score": 0.1546,
            "threshold": self._threshold,
            "label": "Baseline Model Metrics (Validation Reference)"
        }

        production_performance = {
            "outcome_data_available": False,
            "status": "OUTCOME_DATA_UNAVAILABLE",
            "message": "Outcome data not yet available. Production ROC-AUC, PR-AUC, and default tracking require realized loan default labels which mature over time.",
            "evaluated_samples": 0,
            "production_roc_auc": None,
            "production_pr_auc": None
        }

        model_health = {
            "status": "HEALTHY",
            "model_name": "Tuned Logistic Regression",
            "model_version": "1.0.0",
            "threshold": self._threshold,
            "data_drift_status": data_drift_status,
            "performance_degradation_detected": False,
            "explanation": "Data drift reflects shifts in applicant input distributions (observable at origination). Model performance degradation reflects prediction accuracy decay (observable only after loan default/repayment maturation)."
        }

        return {
            "baseline_metrics": baseline_metrics,
            "production_performance": production_performance,
            "model_health": model_health
        }

monitoring_service = MonitoringService()
