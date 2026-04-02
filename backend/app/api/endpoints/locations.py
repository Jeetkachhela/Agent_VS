from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from typing import List
from datetime import datetime, timedelta
from ...db.session import get_db
from ...schemas import UserOut, UserRole
from ..deps import get_current_active_user, check_role
from bson import ObjectId

router = APIRouter()

@router.post("/update")
def update_location(
    lat: float,
    lng: float,
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(get_current_active_user)
):
    # Only agents can update their location
    if current_user.role != UserRole.AGENT.value:
         raise HTTPException(status_code=403, detail="Only agents can update location")
    
    new_location = {
        "agent_id": str(current_user.id),
        "lat": lat,
        "lng": lng,
        "timestamp": datetime.utcnow()
    }
    db.agent_locations.insert_one(new_location)
    return {"status": "success"}

@router.get("/active")
def get_active_agents(
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    # Get last known location for each agent within the last 24 hours
    since_last_period = datetime.utcnow() - timedelta(hours=24)
    
    active_users = {str(u["_id"]): u.get("name") for u in db.users.find({"is_active": True})}
    
    pipeline = [
        {"$match": {"timestamp": {"$gte": since_last_period}}},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": "$agent_id",
            "lat": {"$first": "$lat"},
            "lng": {"$first": "$lng"},
            "timestamp": {"$first": "$timestamp"}
        }}
    ]
    latest_locations = db.agent_locations.aggregate(pipeline)
    
    result = []
    for loc in latest_locations:
        agent_id = loc["_id"]
        if agent_id in active_users:
            result.append({
                "agent_id": agent_id,
                "agent_name": active_users[agent_id],
                "lat": loc["lat"],
                "lng": loc["lng"],
                "timestamp": loc["timestamp"]
            })

    return result

@router.get("/history/{agent_id}")
def get_agent_history(
    agent_id: str,
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    # Enforce history filtering per user status constraints
    try:
        obj_id = ObjectId(agent_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    agent = db.users.find_one({"_id": obj_id, "is_active": True})
    if not agent:
        return []
        
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    history = db.agent_locations.find(
        {"agent_id": agent_id, "timestamp": {"$gte": today}}
    ).sort("timestamp", 1)
    
    return [
        {
            "id": str(h["_id"]),
            "agent_id": h["agent_id"],
            "lat": h["lat"],
            "lng": h["lng"],
            "timestamp": h["timestamp"]
        } for h in history
    ]
