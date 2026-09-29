from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from backend.database.models import Assessment, Applicant

def get_dashboard_summary(db: Session) -> dict:
    # SQL aggregation query
    total = db.query(func.count(Assessment.id)).scalar() or 0
    
    if total == 0:
        return {
            'total_assessments': 0,
            'approved_count': 0,
            'good_credit_count': 0,
            'high_risk_count': 0,
            'bad_credit_count': 0,
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

    good_credit_count = db.query(func.count(Assessment.id)).filter(Assessment.prediction == 0).scalar() or 0
    bad_credit_count = db.query(func.count(Assessment.id)).filter(Assessment.prediction == 1).scalar() or 0
    high_risk_count = db.query(func.count(Assessment.id)).filter(Assessment.risk_category == 'HIGH RISK').scalar() or 0

    avg_prob = db.query(func.avg(Assessment.default_probability)).scalar() or 0.0
    
    # Joined aggregations for applicant metrics
    avg_credit = db.query(func.avg(Applicant.credit_amount)).join(Assessment, Assessment.applicant_id == Applicant.id).scalar() or 0.0
    avg_duration = db.query(func.avg(Applicant.duration_in_months)).join(Assessment, Assessment.applicant_id == Applicant.id).scalar() or 0.0

    today_str = date.today().isoformat()
    today_count = db.query(func.count(Assessment.id)).filter(func.date(Assessment.created_at) == today_str).scalar() or 0

    approval_rate = (good_credit_count / total) if total > 0 else 0.0
    bad_credit_rate = (bad_credit_count / total) if total > 0 else 0.0

    # Recent assessments query
    recent = db.query(Assessment).order_by(Assessment.created_at.desc()).limit(10).all()
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

def get_analytics_overview(db: Session) -> dict:
    total = db.query(func.count(Assessment.id)).scalar() or 0
    
    if total == 0:
        return {
            'risk_distribution': {'LOW RISK': 0, 'MODERATE RISK': 0, 'HIGH RISK': 0},
            'prediction_distribution': {'GOOD CREDIT': 0, 'BAD CREDIT': 0},
            'decision_distribution': {'GOOD CREDIT / APPROVED': 0, 'BAD CREDIT / REJECT': 0},
            'assessment_trend': [],
            'probability_histogram': [],
            'duration_vs_risk': [],
            'credit_amount_vs_risk': [],
            'checking_vs_risk': [],
            'savings_vs_risk': []
        }

    # SQL GROUP BY risk_category
    risk_counts = db.query(Assessment.risk_category, func.count(Assessment.id)).group_by(Assessment.risk_category).all()
    risk_dist = {'LOW RISK': 0, 'MODERATE RISK': 0, 'HIGH RISK': 0}
    for cat, count in risk_counts:
        risk_dist[cat] = count

    # SQL GROUP BY prediction
    pred_counts = db.query(Assessment.prediction, func.count(Assessment.id)).group_by(Assessment.prediction).all()
    pred_dist = {'GOOD CREDIT': 0, 'BAD CREDIT': 0}
    for p, count in pred_counts:
        label = 'GOOD CREDIT' if p == 0 else 'BAD CREDIT'
        pred_dist[label] = count

    # SQL GROUP BY decision
    dec_counts = db.query(Assessment.decision, func.count(Assessment.id)).group_by(Assessment.decision).all()
    dec_dist = {}
    for d, count in dec_counts:
        dec_dist[d] = count

    # Assessment Trend (group by date)
    trend_data = db.query(
        func.date(Assessment.created_at).label('date'),
        func.count(Assessment.id).label('count')
    ).group_by(func.date(Assessment.created_at)).order_by(func.date(Assessment.created_at)).all()
    assessment_trend = [{'date': str(t.date), 'count': t.count} for t in trend_data]

    # Probability Histogram via SQL case/counts
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
        cnt = db.query(func.count(Assessment.id)).filter(
            Assessment.default_probability >= low,
            Assessment.default_probability < high
        ).scalar() or 0
        prob_hist.append({'range': label, 'count': cnt})

    # Duration vs Risk
    dur_sql = db.query(
        case(
            (Applicant.duration_in_months <= 12, '4-12m'),
            (Applicant.duration_in_months <= 24, '13-24m'),
            (Applicant.duration_in_months <= 36, '25-36m'),
            else_='37+m'
        ).label('group'),
        func.avg(Assessment.default_probability).label('avg_prob')
    ).join(Assessment, Assessment.applicant_id == Applicant.id).group_by('group').all()
    duration_vs_risk = [{'group': r.group, 'avg_prob': round(float(r.avg_prob), 4)} for r in dur_sql]

    # Credit Amount vs Risk
    amt_sql = db.query(
        case(
            (Applicant.credit_amount <= 2000, '<2k DM'),
            (Applicant.credit_amount <= 5000, '2k-5k DM'),
            (Applicant.credit_amount <= 10000, '5k-10k DM'),
            else_='>10k DM'
        ).label('group'),
        func.avg(Assessment.default_probability).label('avg_prob')
    ).join(Assessment, Assessment.applicant_id == Applicant.id).group_by('group').all()
    credit_amount_vs_risk = [{'group': r.group, 'avg_prob': round(float(r.avg_prob), 4)} for r in amt_sql]

    # Checking vs Risk
    chk_sql = db.query(
        Applicant.status_checking_account.label('group'),
        func.avg(Assessment.default_probability).label('avg_prob')
    ).join(Assessment, Assessment.applicant_id == Applicant.id).group_by(Applicant.status_checking_account).all()
    checking_vs_risk = [{'group': r.group, 'avg_prob': round(float(r.avg_prob), 4)} for r in chk_sql]

    # Savings vs Risk
    svg_sql = db.query(
        Applicant.savings_account.label('group'),
        func.avg(Assessment.default_probability).label('avg_prob')
    ).join(Assessment, Assessment.applicant_id == Applicant.id).group_by(Applicant.savings_account).all()
    savings_vs_risk = [{'group': r.group, 'avg_prob': round(float(r.avg_prob), 4)} for r in svg_sql]

    return {
        'risk_distribution': risk_dist,
        'prediction_distribution': pred_dist,
        'decision_distribution': dec_dist,
        'assessment_trend': assessment_trend,
        'probability_histogram': prob_hist,
        'duration_vs_risk': duration_vs_risk,
        'credit_amount_vs_risk': credit_amount_vs_risk,
        'checking_vs_risk': checking_vs_risk,
        'savings_vs_risk': savings_vs_risk
    }
