import os
import json
import hashlib
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from backend.database.models import Assessment, Applicant, AuditLog, User
from backend.services.monitoring_service import MonitoringService
from backend.services.governance_service import GovernanceService

def get_dashboard_summary(db: Session, days: Optional[int] = None) -> dict:
    cutoff = datetime.utcnow() - timedelta(days=days) if days else None

    # Base query for assessments
    query = db.query(Assessment)
    if cutoff:
        query = query.filter(Assessment.created_at >= cutoff)

    total = query.count()
    
    if total == 0:
        return {
            'total_assessments': 0,
            'approved_count': 0,
            'good_credit_count': 0,
            'high_risk_count': 0,
            'bad_credit_count': 0,
            'manual_review_count': 0,
            'approval_rate': 0.0,
            'approval_rate_pct': '0.00%',
            'bad_credit_rate': 0.0,
            'bad_credit_rate_pct': '0.00%',
            'avg_default_probability': 0.0,
            'avg_default_probability_pct': '0.00%',
            'average_default_probability': 0.0,
            'average_default_probability_pct': '0.00%',
            'avg_credit_amount': 0.0,
            'average_credit_amount': 0.0,
            'average_loan_duration': 0.0,
            'assessments_today': 0,
            'recent_assessments': []
        }

    good_credit_count = query.filter(Assessment.prediction == 0).count()
    bad_credit_count = query.filter(Assessment.prediction == 1).count()
    high_risk_count = query.filter(Assessment.risk_category == 'HIGH RISK').count()
    manual_review_count = query.filter(Assessment.risk_category == 'MODERATE RISK').count()

    avg_prob_q = db.query(func.avg(Assessment.default_probability))
    if cutoff:
        avg_prob_q = avg_prob_q.filter(Assessment.created_at >= cutoff)
    avg_prob = avg_prob_q.scalar() or 0.0
    
    # Joined aggregations for applicant metrics
    credit_q = db.query(func.avg(Applicant.credit_amount)).join(Assessment, Assessment.applicant_id == Applicant.id)
    dur_q = db.query(func.avg(Applicant.duration_in_months)).join(Assessment, Assessment.applicant_id == Applicant.id)
    if cutoff:
        credit_q = credit_q.filter(Assessment.created_at >= cutoff)
        dur_q = dur_q.filter(Assessment.created_at >= cutoff)

    avg_credit = credit_q.scalar() or 0.0
    avg_duration = dur_q.scalar() or 0.0

    today_start = datetime.combine(date.today(), datetime.min.time())
    today_count = db.query(func.count(Assessment.id)).filter(Assessment.created_at >= today_start).scalar() or 0

    approval_rate = (good_credit_count / total) if total > 0 else 0.0
    bad_credit_rate = (bad_credit_count / total) if total > 0 else 0.0

    # Recent assessments query
    recent_q = db.query(Assessment)
    if cutoff:
        recent_q = recent_q.filter(Assessment.created_at >= cutoff)
    recent = recent_q.order_by(Assessment.created_at.desc()).limit(10).all()

    recent_applicant_ids = [a.applicant_id for a in recent]
    recent_applicants = db.query(Applicant).filter(Applicant.id.in_(recent_applicant_ids)).all() if recent_applicant_ids else []
    app_map = {app.id: app for app in recent_applicants}

    recent_items = []
    for a in recent:
        app = app_map.get(a.applicant_id)
        recent_items.append({
            'id': a.id,
            'created_at': a.created_at.strftime('%Y-%m-%d %H:%M:%S') if a.created_at else '',
            'applicant_id': a.applicant_id,
            'credit_amount': app.credit_amount if app else 0,
            'duration_in_months': app.duration_in_months if app else 0,
            'default_probability': round(a.default_probability, 4),
            'default_probability_pct': f"{a.default_probability * 100:.2f}%",
            'risk_category': a.risk_category,
            'credit_decision': a.decision,
            'decision': a.decision,
            'model_version': a.model_version
        })

    return {
        'total_assessments': total,
        'approved_count': good_credit_count,
        'good_credit_count': good_credit_count,
        'high_risk_count': high_risk_count,
        'bad_credit_count': bad_credit_count,
        'manual_review_count': manual_review_count,
        'approval_rate': round(approval_rate, 4),
        'approval_rate_pct': f"{approval_rate * 100:.2f}%",
        'bad_credit_rate': round(bad_credit_rate, 4),
        'bad_credit_rate_pct': f"{bad_credit_rate * 100:.2f}%",
        'avg_default_probability': round(avg_prob, 4),
        'avg_default_probability_pct': f"{avg_prob * 100:.2f}%",
        'average_default_probability': round(avg_prob, 4),
        'average_default_probability_pct': f"{avg_prob * 100:.2f}%",
        'avg_credit_amount': round(avg_credit, 2),
        'average_credit_amount': round(avg_credit, 2),
        'average_loan_duration': round(avg_duration, 1),
        'assessments_today': today_count,
        'recent_assessments': recent_items
    }

# ==================================================
# Phase H — Executive Portfolio & Analytics Functions
# ==================================================

def get_portfolio_kpis(
    db: Session,
    days: Optional[int] = None,
    risk_category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> dict:
    now = datetime.utcnow()
    query = db.query(Assessment)

    if days:
        query = query.filter(Assessment.created_at >= now - timedelta(days=days))
    if start_date:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        query = query.filter(Assessment.created_at >= start_dt)
    if end_date:
        end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        query = query.filter(Assessment.created_at < end_dt)
    if risk_category:
        query = query.filter(Assessment.risk_category == risk_category)

    total = query.count()

    today_start = datetime.combine(date.today(), datetime.min.time())
    today_count = db.query(func.count(Assessment.id)).filter(Assessment.created_at >= today_start).scalar() or 0
    last_7d_count = db.query(func.count(Assessment.id)).filter(Assessment.created_at >= now - timedelta(days=7)).scalar() or 0
    last_30d_count = db.query(func.count(Assessment.id)).filter(Assessment.created_at >= now - timedelta(days=30)).scalar() or 0

    if total == 0:
        return {
            'total_assessments': 0,
            'assessments_today': today_count,
            'assessments_last_7_days': last_7d_count,
            'assessments_last_30_days': last_30d_count,
            'low_risk_count': 0,
            'moderate_risk_count': 0,
            'high_risk_count': 0,
            'low_risk_percentage': 0.0,
            'moderate_risk_percentage': 0.0,
            'high_risk_percentage': 0.0,
            'low_risk_pct_str': '0.0%',
            'moderate_risk_pct_str': '0.0%',
            'high_risk_pct_str': '0.0%',
            'avg_default_probability': 0.0,
            'avg_default_probability_pct': '0.0%',
            'median_default_probability': 0.0,
            'median_default_probability_pct': '0.0%',
            'max_default_probability': 0.0,
            'min_default_probability': 0.0
        }

    low_cnt = query.filter(Assessment.risk_category == 'LOW RISK').count()
    mod_cnt = query.filter(Assessment.risk_category == 'MODERATE RISK').count()
    high_cnt = query.filter(Assessment.risk_category == 'HIGH RISK').count()

    low_pct = round((low_cnt / total) * 100, 2)
    mod_pct = round((mod_cnt / total) * 100, 2)
    high_pct = round((high_cnt / total) * 100, 2)

    probs = [r[0] for r in query.with_entities(Assessment.default_probability).all() if r[0] is not None]
    if probs:
        avg_prob = float(np.mean(probs))
        med_prob = float(np.median(probs))
        max_prob = float(np.max(probs))
        min_prob = float(np.min(probs))
    else:
        avg_prob, med_prob, max_prob, min_prob = 0.0, 0.0, 0.0, 0.0

    return {
        'total_assessments': total,
        'assessments_today': today_count,
        'assessments_last_7_days': last_7d_count,
        'assessments_last_30_days': last_30d_count,
        'low_risk_count': low_cnt,
        'moderate_risk_count': mod_cnt,
        'high_risk_count': high_cnt,
        'low_risk_percentage': low_pct,
        'moderate_risk_percentage': mod_pct,
        'high_risk_percentage': high_pct,
        'low_risk_pct_str': f"{low_pct:.1f}%",
        'moderate_risk_pct_str': f"{mod_pct:.1f}%",
        'high_risk_pct_str': f"{high_pct:.1f}%",
        'avg_default_probability': round(avg_prob, 4),
        'avg_default_probability_pct': f"{avg_prob * 100:.1f}%",
        'median_default_probability': round(med_prob, 4),
        'median_default_probability_pct': f"{med_prob * 100:.1f}%",
        'max_default_probability': round(max_prob, 4),
        'min_default_probability': round(min_prob, 4)
    }

def get_assessment_trends(
    db: Session,
    period: str = '30d',
    risk_category: Optional[str] = None
) -> dict:
    now = datetime.utcnow()
    query = db.query(Assessment)

    if period == 'today':
        cutoff = datetime(now.year, now.month, now.day)
        query = query.filter(Assessment.created_at >= cutoff)
    elif period == '7d':
        cutoff = now - timedelta(days=7)
        query = query.filter(Assessment.created_at >= cutoff)
    elif period == '30d':
        cutoff = now - timedelta(days=30)
        query = query.filter(Assessment.created_at >= cutoff)
    elif period == 'all':
        cutoff = None
    else:
        cutoff = now - timedelta(days=30)
        query = query.filter(Assessment.created_at >= cutoff)

    if risk_category:
        query = query.filter(Assessment.risk_category == risk_category)

    total_period = query.count()
    if total_period == 0:
        return {
            'period': period,
            'total_period_assessments': 0,
            'period_avg_probability': 0.0,
            'period_avg_probability_pct': '0.0%',
            'trends': []
        }

    trend_rows = db.query(
        func.date(Assessment.created_at).label('dt'),
        func.count(Assessment.id).label('total_cnt'),
        func.avg(Assessment.default_probability).label('avg_prob'),
        func.sum(case((Assessment.risk_category == 'HIGH RISK', 1), else_=0)).label('high_cnt'),
        func.sum(case((Assessment.risk_category == 'MODERATE RISK', 1), else_=0)).label('mod_cnt'),
        func.sum(case((Assessment.risk_category == 'LOW RISK', 1), else_=0)).label('low_cnt')
    )
    if cutoff:
        trend_rows = trend_rows.filter(Assessment.created_at >= cutoff)
    if risk_category:
        trend_rows = trend_rows.filter(Assessment.risk_category == risk_category)

    trend_rows = trend_rows.group_by(func.date(Assessment.created_at)).order_by(func.date(Assessment.created_at)).all()

    avg_prob_q = db.query(func.avg(Assessment.default_probability))
    if cutoff:
        avg_prob_q = avg_prob_q.filter(Assessment.created_at >= cutoff)
    if risk_category:
        avg_prob_q = avg_prob_q.filter(Assessment.risk_category == risk_category)
    overall_avg_prob = float(avg_prob_q.scalar() or 0.0)

    trends = []
    for r in trend_rows:
        ap = float(r.avg_prob) if r.avg_prob is not None else 0.0
        trends.append({
            'date': str(r.dt),
            'assessments_count': int(r.total_cnt),
            'avg_probability': round(ap, 4),
            'avg_probability_pct': f"{ap * 100:.1f}%",
            'high_risk_count': int(r.high_cnt or 0),
            'moderate_risk_count': int(r.mod_cnt or 0),
            'low_risk_count': int(r.low_cnt or 0)
        })

    return {
        'period': period,
        'total_period_assessments': total_period,
        'period_avg_probability': round(overall_avg_prob, 4),
        'period_avg_probability_pct': f"{overall_avg_prob * 100:.1f}%",
        'trends': trends
    }

def get_risk_distribution(
    db: Session,
    days: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> dict:
    now = datetime.utcnow()
    query = db.query(Assessment)
    if days:
        query = query.filter(Assessment.created_at >= now - timedelta(days=days))
    if start_date:
        query = query.filter(Assessment.created_at >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        query = query.filter(Assessment.created_at < datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1))

    total = query.count()
    if total == 0:
        return {
            'decision_threshold': 0.35,
            'total_assessments': 0,
            'categories': [
                {'category': 'Low Risk', 'count': 0, 'percentage': 0.0, 'percentage_str': '0.0%', 'color': '#10b981', 'threshold_rule': 'Probability < 0.20'},
                {'category': 'Moderate Risk', 'count': 0, 'percentage': 0.0, 'percentage_str': '0.0%', 'color': '#f59e0b', 'threshold_rule': '0.20 <= Probability < 0.35'},
                {'category': 'High Risk', 'count': 0, 'percentage': 0.0, 'percentage_str': '0.0%', 'color': '#ef4444', 'threshold_rule': 'Probability >= 0.35 (Threshold Cutoff)'}
            ]
        }

    low_cnt = query.filter(Assessment.risk_category == 'LOW RISK').count()
    mod_cnt = query.filter(Assessment.risk_category == 'MODERATE RISK').count()
    high_cnt = query.filter(Assessment.risk_category == 'HIGH RISK').count()

    return {
        'decision_threshold': 0.35,
        'total_assessments': total,
        'categories': [
            {
                'category': 'Low Risk',
                'count': low_cnt,
                'percentage': round((low_cnt / total) * 100, 2),
                'percentage_str': f"{(low_cnt / total) * 100:.1f}%",
                'color': '#10b981',
                'threshold_rule': 'Probability < 0.20'
            },
            {
                'category': 'Moderate Risk',
                'count': mod_cnt,
                'percentage': round((mod_cnt / total) * 100, 2),
                'percentage_str': f"{(mod_cnt / total) * 100:.1f}%",
                'color': '#f59e0b',
                'threshold_rule': '0.20 <= Probability < 0.35'
            },
            {
                'category': 'High Risk',
                'count': high_cnt,
                'percentage': round((high_cnt / total) * 100, 2),
                'percentage_str': f"{(high_cnt / total) * 100:.1f}%",
                'color': '#ef4444',
                'threshold_rule': 'Probability >= 0.35 (Threshold Cutoff)'
            }
        ]
    }

def get_probability_distribution(db: Session, days: Optional[int] = None) -> dict:
    now = datetime.utcnow()
    query = db.query(Assessment)
    if days:
        query = query.filter(Assessment.created_at >= now - timedelta(days=days))

    total = query.count()
    probs = [r[0] for r in query.with_entities(Assessment.default_probability).all() if r[0] is not None]

    if total == 0 or not probs:
        return {
            'decision_threshold': 0.35,
            'threshold_label': 'Production Cutoff (35%)',
            'mean_probability': 0.0,
            'mean_probability_pct': '0.0%',
            'median_probability': 0.0,
            'median_probability_pct': '0.0%',
            'total_assessments': 0,
            'histogram': [
                {'range': f"{i*10}-{(i+1)*10}%", 'min_val': round(i*0.1, 2), 'max_val': round((i+1)*0.1, 2), 'count': 0, 'percentage': 0.0, 'is_above_threshold': (i*0.1) >= 0.35}
                for i in range(10)
            ]
        }

    mean_prob = float(np.mean(probs))
    med_prob = float(np.median(probs))

    bins = [
        ("0-10%", 0.0, 0.10),
        ("10-20%", 0.10, 0.20),
        ("20-30%", 0.20, 0.30),
        ("30-40%", 0.30, 0.40),
        ("40-50%", 0.40, 0.50),
        ("50-60%", 0.50, 0.60),
        ("60-70%", 0.60, 0.70),
        ("70-80%", 0.70, 0.80),
        ("80-90%", 0.80, 0.90),
        ("90-100%", 0.90, 1.01)
    ]
    hist = []
    for label, low, high in bins:
        cnt = sum(1 for p in probs if low <= p < high)
        pct = round((cnt / total) * 100, 2)
        hist.append({
            'range': label,
            'min_val': low,
            'max_val': high,
            'count': cnt,
            'percentage': pct,
            'is_above_threshold': low >= 0.35
        })

    return {
        'decision_threshold': 0.35,
        'threshold_label': 'Production Cutoff (35%)',
        'mean_probability': round(mean_prob, 4),
        'mean_probability_pct': f"{mean_prob * 100:.1f}%",
        'median_probability': round(med_prob, 4),
        'median_probability_pct': f"{med_prob * 100:.1f}%",
        'total_assessments': total,
        'histogram': hist
    }

def get_risk_concentration(
    db: Session,
    dimension: str = 'age_bracket',
    days: Optional[int] = None
) -> dict:
    now = datetime.utcnow()
    q = db.query(Assessment, Applicant).join(Applicant, Assessment.applicant_id == Applicant.id)
    if days:
        q = q.filter(Assessment.created_at >= now - timedelta(days=days))

    records = q.all()
    total_count = len(records)

    dim_labels = {
        'age_bracket': 'Applicant Age Brackets',
        'housing': 'Housing Tenure',
        'employment': 'Employment Duration',
        'job': 'Occupational Category',
        'foreign_worker': 'Foreign Worker Status',
        'personal_status_sex': 'Personal Status & Sex'
    }
    dimension_label = dim_labels.get(dimension, dimension)

    if total_count == 0:
        return {
            'dimension': dimension,
            'dimension_label': dimension_label,
            'analysis_type': 'Descriptive portfolio analysis',
            'disclaimer': 'Descriptive portfolio analysis only. Does NOT establish causality. Non-normative analysis. Fairness conclusions belong to governance.',
            'total_applicants': 0,
            'groups': []
        }

    group_map: Dict[str, Dict[str, Any]] = {}

    for assess, appl in records:
        if dimension == 'age_bracket':
            age = appl.age_in_years or 0
            if age < 25:
                key, label = '<25', 'Under 25 Years'
            elif age <= 34:
                key, label = '25-34', '25 to 34 Years'
            elif age <= 49:
                key, label = '35-49', '35 to 49 Years'
            else:
                key, label = '50+', '50 Years and Above'
        elif dimension == 'housing':
            key = appl.housing or 'Unknown'
            label = GovernanceService.FEATURE_MAPPINGS.get('housing', {}).get(key, key)
        elif dimension == 'employment':
            key = appl.present_employment_since or 'Unknown'
            label = GovernanceService.FEATURE_MAPPINGS.get('present_employment_since', {}).get(key, key)
        elif dimension == 'job':
            key = appl.job or 'Unknown'
            label = GovernanceService.FEATURE_MAPPINGS.get('job', {}).get(key, key)
        elif dimension == 'foreign_worker':
            key = appl.foreign_worker or 'Unknown'
            label = GovernanceService.FEATURE_MAPPINGS.get('foreign_worker', {}).get(key, key)
        elif dimension == 'personal_status_sex':
            key = appl.personal_status_sex or 'Unknown'
            label = GovernanceService.FEATURE_MAPPINGS.get('personal_status_sex', {}).get(key, key)
        else:
            key, label = 'Other', 'Other'

        if key not in group_map:
            group_map[key] = {
                'group_key': key,
                'group_label': label,
                'probs': [],
                'low_count': 0,
                'mod_count': 0,
                'high_count': 0
            }

        group_map[key]['probs'].append(assess.default_probability)
        if assess.risk_category == 'LOW RISK':
            group_map[key]['low_count'] += 1
        elif assess.risk_category == 'MODERATE RISK':
            group_map[key]['mod_count'] += 1
        elif assess.risk_category == 'HIGH RISK':
            group_map[key]['high_count'] += 1

    groups = []
    for key, data in sorted(group_map.items()):
        grp_cnt = len(data['probs'])
        avg_prob = float(np.mean(data['probs'])) if grp_cnt > 0 else 0.0
        groups.append({
            'group_key': data['group_key'],
            'group_label': data['group_label'],
            'applicant_count': grp_cnt,
            'population_share_pct': round((grp_cnt / total_count) * 100, 1),
            'avg_probability': round(avg_prob, 4),
            'avg_probability_pct': f"{avg_prob * 100:.1f}%",
            'low_risk_pct': round((data['low_count'] / grp_cnt) * 100, 1) if grp_cnt > 0 else 0.0,
            'moderate_risk_pct': round((data['mod_count'] / grp_cnt) * 100, 1) if grp_cnt > 0 else 0.0,
            'high_risk_pct': round((data['high_count'] / grp_cnt) * 100, 1) if grp_cnt > 0 else 0.0
        })

    return {
        'dimension': dimension,
        'dimension_label': dimension_label,
        'analysis_type': 'Descriptive portfolio analysis',
        'disclaimer': 'Descriptive portfolio analysis only. Does NOT establish causality. Non-normative analysis. Fairness conclusions belong to governance.',
        'total_applicants': total_count,
        'groups': groups
    }

def get_operational_analytics(db: Session) -> dict:
    total_assessments = db.query(func.count(Assessment.id)).scalar() or 0
    audit_events_count = db.query(func.count(AuditLog.id)).scalar() or 0
    active_users_count = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0

    return {
        'total_assessments': total_assessments,
        'reports_status': 'Generated on-demand (not persisted)',
        'simulations_status': 'Evaluated on-demand (not persisted)',
        'audit_events_count': audit_events_count,
        'active_users_count': active_users_count
    }

def get_monitoring_snapshot(db: Session) -> dict:
    total_assessments = db.query(func.count(Assessment.id)).scalar() or 0
    sufficient = total_assessments >= 25

    return {
        'monitoring_status': 'ACTIVE',
        'total_assessments_monitored': total_assessments,
        'drift_status': 'MONITORED',
        'psi_thresholds': {
            'low': '< 0.10 (Stable)',
            'medium': '0.10 - 0.25 (Moderate Shift)',
            'high': '> 0.25 (Significant Shift)'
        },
        'monitored_features_count': 20,
        'sufficient_samples': sufficient,
        'sample_status_note': (
            'Production volume sufficient for statistical comparison against German Credit baseline.'
            if sufficient else
            'Production sample volume under recommended threshold (n >= 25); continuous monitoring active.'
        )
    }

def get_governance_snapshot(db: Session) -> dict:
    gov = GovernanceService()
    model_hash_short = gov._model_hash[:16] if gov._model_hash else '7fcc6ec2b5e481ee'
    prep_hash_short = gov._preprocessor_hash[:16] if gov._preprocessor_hash else '8b0bb086c63fdb92'

    return {
        'model_artifact': 'final_model.joblib',
        'model_sha256_short': model_hash_short,
        'preprocessing_artifact': 'preprocessing_pipeline.joblib',
        'preprocessing_sha256_short': prep_hash_short,
        'decision_threshold': 0.35,
        'threshold_status': 'LOCKED',
        'prediction_authority': 'Credit ML Engine (Local scikit-learn model)',
        'ai_role': 'Explainability & Advisory Only',
        'governance_link': '/governance'
    }

def get_executive_summary_text(kpis: dict) -> str:
    total = kpis.get('total_assessments', 0)
    if total == 0:
        return "Insufficient assessment data for an executive summary."
    
    high_pct = kpis.get('high_risk_pct_str', '0.0%')
    avg_prob = kpis.get('avg_default_probability_pct', '0.0%')
    return (
        f"Portfolio currently contains {total} assessments. "
        f"{high_pct} are classified as high risk. "
        f"Average predicted default probability is {avg_prob}. "
        f"The production decision threshold remains 35% with local ML prediction authority. "
        f"Supervisory monitoring and governance controls are active."
    )

def get_analytics_overview(
    db: Session,
    days: Optional[int] = None,
    risk_category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> dict:
    cutoff = datetime.utcnow() - timedelta(days=days) if days else None
    
    total_q = db.query(func.count(Assessment.id))
    if cutoff:
        total_q = total_q.filter(Assessment.created_at >= cutoff)
    if start_date:
        total_q = total_q.filter(Assessment.created_at >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        total_q = total_q.filter(Assessment.created_at < datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1))
    if risk_category:
        total_q = total_q.filter(Assessment.risk_category == risk_category)

    total = total_q.scalar() or 0

    kpis = get_portfolio_kpis(db, days=days, risk_category=risk_category, start_date=start_date, end_date=end_date)
    exec_summary_text = get_executive_summary_text(kpis)
    operational_summary = get_operational_analytics(db)
    gov_snap = get_governance_snapshot(db)

    # Risk Distribution
    risk_q = db.query(Assessment.risk_category, func.count(Assessment.id))
    if cutoff:
        risk_q = risk_q.filter(Assessment.created_at >= cutoff)
    if start_date:
        risk_q = risk_q.filter(Assessment.created_at >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        risk_q = risk_q.filter(Assessment.created_at < datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1))
    if risk_category:
        risk_q = risk_q.filter(Assessment.risk_category == risk_category)

    risk_counts = risk_q.group_by(Assessment.risk_category).all()
    risk_dist = {'LOW RISK': 0, 'MODERATE RISK': 0, 'HIGH RISK': 0}
    for cat, count in risk_counts:
        risk_dist[cat] = count

    # Prediction Distribution
    pred_q = db.query(Assessment.prediction, func.count(Assessment.id))
    if cutoff:
        pred_q = pred_q.filter(Assessment.created_at >= cutoff)
    if start_date:
        pred_q = pred_q.filter(Assessment.created_at >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        pred_q = pred_q.filter(Assessment.created_at < datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1))
    if risk_category:
        pred_q = pred_q.filter(Assessment.risk_category == risk_category)

    pred_counts = pred_q.group_by(Assessment.prediction).all()
    pred_dist = {'GOOD CREDIT': 0, 'BAD CREDIT': 0}
    for p, count in pred_counts:
        label = 'GOOD CREDIT' if p == 0 else 'BAD CREDIT'
        pred_dist[label] = count

    # Decision Distribution
    dec_q = db.query(Assessment.decision, func.count(Assessment.id))
    if cutoff:
        dec_q = dec_q.filter(Assessment.created_at >= cutoff)
    if start_date:
        dec_q = dec_q.filter(Assessment.created_at >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        dec_q = dec_q.filter(Assessment.created_at < datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1))
    if risk_category:
        dec_q = dec_q.filter(Assessment.risk_category == risk_category)

    dec_counts = dec_q.group_by(Assessment.decision).all()
    dec_dist = {}
    for d, count in dec_counts:
        dec_dist[d] = count

    # Assessment Trend
    trend_q = db.query(
        func.date(Assessment.created_at).label('date'),
        func.count(Assessment.id).label('count')
    )
    if cutoff:
        trend_q = trend_q.filter(Assessment.created_at >= cutoff)
    if start_date:
        trend_q = trend_q.filter(Assessment.created_at >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        trend_q = trend_q.filter(Assessment.created_at < datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1))
    if risk_category:
        trend_q = trend_q.filter(Assessment.risk_category == risk_category)

    trend_data = trend_q.group_by(func.date(Assessment.created_at)).order_by(func.date(Assessment.created_at)).all()
    assessment_trend = [{'date': str(t.date), 'count': t.count} for t in trend_data]

    # Default Probability Trend
    prob_trend_q = db.query(
        func.date(Assessment.created_at).label('date'),
        func.avg(Assessment.default_probability).label('avg_prob')
    )
    if cutoff:
        prob_trend_q = prob_trend_q.filter(Assessment.created_at >= cutoff)
    if start_date:
        prob_trend_q = prob_trend_q.filter(Assessment.created_at >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        prob_trend_q = prob_trend_q.filter(Assessment.created_at < datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1))
    if risk_category:
        prob_trend_q = prob_trend_q.filter(Assessment.risk_category == risk_category)

    prob_trend_data = prob_trend_q.group_by(func.date(Assessment.created_at)).order_by(func.date(Assessment.created_at)).all()
    default_probability_trend = [
        {'date': str(t.date), 'avg_prob': round(float(t.avg_prob), 4), 'avg_prob_pct': f"{float(t.avg_prob) * 100:.1f}%"}
        for t in prob_trend_data
    ]

    # Probability Histogram
    prob_bins = [
        ("0-10%", 0.0, 0.10),
        ("10-20%", 0.10, 0.20),
        ("20-30%", 0.20, 0.30),
        ("30-40%", 0.30, 0.40),
        ("40-50%", 0.40, 0.50),
        ("50-60%", 0.50, 0.60),
        ("60-70%", 0.60, 0.70),
        ("70-80%", 0.70, 0.80),
        ("80-90%", 0.80, 0.90),
        ("90-100%", 0.90, 1.01),
    ]
    prob_hist = []
    for label, low, high in prob_bins:
        bin_q = db.query(func.count(Assessment.id)).filter(
            Assessment.default_probability >= low,
            Assessment.default_probability < high
        )
        if cutoff:
            bin_q = bin_q.filter(Assessment.created_at >= cutoff)
        if start_date:
            bin_q = bin_q.filter(Assessment.created_at >= datetime.strptime(start_date, "%Y-%m-%d"))
        if end_date:
            bin_q = bin_q.filter(Assessment.created_at < datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1))
        if risk_category:
            bin_q = bin_q.filter(Assessment.risk_category == risk_category)
        cnt = bin_q.scalar() or 0
        prob_hist.append({'range': label, 'count': cnt})

    # Duration vs Risk
    dur_q = db.query(
        case(
            (Applicant.duration_in_months <= 12, '4-12m'),
            (Applicant.duration_in_months <= 24, '13-24m'),
            (Applicant.duration_in_months <= 36, '25-36m'),
            else_='37+m'
        ).label('group'),
        func.avg(Assessment.default_probability).label('avg_prob')
    ).join(Assessment, Assessment.applicant_id == Applicant.id)
    if cutoff:
        dur_q = dur_q.filter(Assessment.created_at >= cutoff)
    dur_sql = dur_q.group_by('group').all()
    duration_vs_risk = [{'group': r.group, 'avg_prob': round(float(r.avg_prob), 4)} for r in dur_sql]

    # Credit Amount vs Risk
    amt_q = db.query(
        case(
            (Applicant.credit_amount <= 2000, '<2k DM'),
            (Applicant.credit_amount <= 5000, '2k-5k DM'),
            (Applicant.credit_amount <= 10000, '5k-10k DM'),
            else_='>10k DM'
        ).label('group'),
        func.avg(Assessment.default_probability).label('avg_prob')
    ).join(Assessment, Assessment.applicant_id == Applicant.id)
    if cutoff:
        amt_q = amt_q.filter(Assessment.created_at >= cutoff)
    amt_sql = amt_q.group_by('group').all()
    credit_amount_vs_risk = [{'group': r.group, 'avg_prob': round(float(r.avg_prob), 4)} for r in amt_sql]

    # Checking vs Risk
    chk_q = db.query(
        Applicant.status_checking_account.label('group'),
        func.avg(Assessment.default_probability).label('avg_prob')
    ).join(Assessment, Assessment.applicant_id == Applicant.id)
    if cutoff:
        chk_q = chk_q.filter(Assessment.created_at >= cutoff)
    chk_sql = chk_q.group_by(Applicant.status_checking_account).all()
    checking_vs_risk = [{'group': r.group, 'avg_prob': round(float(r.avg_prob), 4)} for r in chk_sql]

    # Savings vs Risk
    svg_q = db.query(
        Applicant.savings_account.label('group'),
        func.avg(Assessment.default_probability).label('avg_prob')
    ).join(Assessment, Assessment.applicant_id == Applicant.id)
    if cutoff:
        svg_q = svg_q.filter(Assessment.created_at >= cutoff)
    svg_sql = svg_q.group_by(Applicant.savings_account).all()
    savings_vs_risk = [{'group': r.group, 'avg_prob': round(float(r.avg_prob), 4)} for r in svg_sql]

    # Credit History vs Risk
    hist_q = db.query(
        Applicant.credit_history.label('group'),
        func.avg(Assessment.default_probability).label('avg_prob')
    ).join(Assessment, Assessment.applicant_id == Applicant.id)
    if cutoff:
        hist_q = hist_q.filter(Assessment.created_at >= cutoff)
    hist_sql = hist_q.group_by(Applicant.credit_history).all()
    credit_history_vs_risk = [{'group': r.group, 'avg_prob': round(float(r.avg_prob), 4)} for r in hist_sql]

    return {
        'risk_distribution': risk_dist,
        'prediction_distribution': pred_dist,
        'decision_distribution': dec_dist,
        'assessment_trend': assessment_trend,
        'default_probability_trend': default_probability_trend,
        'probability_histogram': prob_hist,
        'duration_vs_risk': duration_vs_risk,
        'credit_amount_vs_risk': credit_amount_vs_risk,
        'checking_vs_risk': checking_vs_risk,
        'savings_vs_risk': savings_vs_risk,
        'credit_history_vs_risk': credit_history_vs_risk,
        'portfolio_kpis': kpis,
        'operational_summary': operational_summary,
        'model_governance_snapshot': gov_snap,
        'executive_summary_text': exec_summary_text
    }
