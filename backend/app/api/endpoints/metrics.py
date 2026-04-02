from fastapi import APIRouter, Depends
from pymongo.database import Database
from datetime import datetime, timedelta, timezone
from ...db.session import get_db
from ...schemas import UserOut, UserRole
from ..deps import get_current_active_user, check_role

router = APIRouter()

def get_last_7_days_trend(db: Database, role_filter=None, user_id=None):
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=6)
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    query = {"timestamp": {"$gte": start_date}}
    if user_id:
        query["agent_id"] = str(user_id)
        
    subs = db.survey_submissions.find(query)
    
    days = [(start_date + timedelta(days=i)).strftime('%a') for i in range(7)]
    counts = {day: 0 for day in days}
    
    for sub in subs:
        if "timestamp" in sub and isinstance(sub["timestamp"], datetime):
            day_str = sub["timestamp"].strftime('%a')
            if day_str in counts:
                counts[day_str] += 1
            
    return {"labels": days, "data": [counts[d] for d in days]}

@router.get("/superadmin")
def get_superadmin_metrics(
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))  # Need this so backend doesn't break if routing is weird
):
    total_admins = db.users.count_documents({"role": UserRole.ADMIN_B2C.value})
    total_agents = db.users.count_documents({"role": UserRole.AGENT.value})
    active_surveys = db.survey_submissions.count_documents({})
    
    trend = get_last_7_days_trend(db)
    
    active_all = db.users.count_documents({"is_active": True})
    inactive_all = db.users.count_documents({"is_active": False})
    
    active_agents = db.users.count_documents({"role": UserRole.AGENT.value, "is_active": True})
    inactive_agents = db.users.count_documents({"role": UserRole.AGENT.value, "is_active": False})

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
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(check_role([UserRole.ADMIN_B2C, UserRole.SUPER_ADMIN]))
):
    total_agents = db.users.count_documents({"role": UserRole.AGENT.value})
    trend = get_last_7_days_trend(db)
    
    active_agents = db.users.count_documents({"role": UserRole.AGENT.value, "is_active": True})
    inactive_agents = db.users.count_documents({"role": UserRole.AGENT.value, "is_active": False})
    
    return {
        "total_agents": total_agents,
        "trend_labels": trend["labels"],
        "trend_data": trend["data"],
        "distribution_data": [active_agents, inactive_agents]
    }

@router.get("/agent")
def get_agent_metrics(
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(get_current_active_user)
):
    survey_count = db.survey_submissions.count_documents({"agent_id": str(current_user.id)})
    trend = get_last_7_days_trend(db, user_id=str(current_user.id))
    
    return {
        "survey_count": survey_count,
        "trend_labels": trend["labels"],
        "trend_data": trend["data"]
    }
