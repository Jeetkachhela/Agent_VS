from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from ...db.session import get_db
from ...models import User, UserRole, SurveySubmission
from ..deps import get_current_active_user, check_role

router = APIRouter()

def get_last_7_days_trend(db, role_filter=None, user_id=None):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=6)
    
    # Query all within 7 days
    base_query = db.query(SurveySubmission).filter(
        SurveySubmission.timestamp >= start_date.replace(hour=0, minute=0, second=0)
    )
    if user_id:
        base_query = base_query.filter(SurveySubmission.agent_id == user_id)
        
    subs = base_query.all()
    
    # Bucket into days
    days = [(start_date + timedelta(days=i)).strftime('%a') for i in range(7)]
    counts = {day: 0 for day in days}
    
    for sub in subs:
        day_str = sub.timestamp.strftime('%a')
        if day_str in counts:
            counts[day_str] += 1
            
    return {"labels": days, "data": [counts[d] for d in days]}

@router.get("/superadmin")
def get_superadmin_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN]))
):
    total_admins = db.query(User).filter(User.role == UserRole.ADMIN_B2C).count()
    total_agents = db.query(User).filter(User.role == UserRole.AGENT).count()
    active_surveys = db.query(SurveySubmission).count()
    
    # Trend Chart
    trend = get_last_7_days_trend(db)
    
    # Distribution Chart (All users)
    active_all = db.query(User).filter(User.is_active == True).count()
    inactive_all = db.query(User).filter(User.is_active == False).count()
    
    # Specific Agent Status (For visuals)
    active_agents = db.query(User).filter(User.role == UserRole.AGENT, User.is_active == True).count()
    inactive_agents = db.query(User).filter(User.role == UserRole.AGENT, User.is_active == False).count()

    role_dist = [total_admins, total_agents]

    return {
        "total_admins": total_admins,
        "total_agents": total_agents,
        "active_surveys": active_surveys,
        "trend_labels": trend["labels"],
        "trend_data": trend["data"],
        "distribution_data": [active_all, inactive_all],
        "agent_status_data": [active_agents, inactive_agents],
        "role_distribution_data": role_dist
    }

@router.get("/admin")
def get_admin_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.ADMIN_B2C, UserRole.SUPER_ADMIN]))
):
    total_agents = db.query(User).filter(User.role == UserRole.AGENT).count()
    trend = get_last_7_days_trend(db)
    
    # Distribution Chart
    active_agents = db.query(User).filter(User.role == UserRole.AGENT, User.is_active == True).count()
    inactive_agents = db.query(User).filter(User.role == UserRole.AGENT, User.is_active == False).count()
    
    return {
        "total_agents": total_agents,
        "trend_labels": trend["labels"],
        "trend_data": trend["data"],
        "distribution_data": [active_agents, inactive_agents]
    }

@router.get("/agent")
def get_agent_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    survey_count = db.query(SurveySubmission).filter(SurveySubmission.agent_id == current_user.id).count()
    trend = get_last_7_days_trend(db, user_id=current_user.id)
    
    return {
        "survey_count": survey_count,
        "trend_labels": trend["labels"],
        "trend_data": trend["data"]
    }
