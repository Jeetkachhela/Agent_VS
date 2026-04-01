from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from ...db.session import get_db
from ...models import User, AgentLocation, UserRole
from ..deps import get_current_active_user, check_role

router = APIRouter()

@router.post("/update")
def update_location(
    lat: float,
    lng: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Only agents can update their location
    if current_user.role != UserRole.AGENT:
         raise HTTPException(status_code=403, detail="Only agents can update location")
    
    new_location = AgentLocation(
        agent_id=current_user.id,
        lat=lat,
        lng=lng,
        timestamp=datetime.utcnow()
    )
    db.add(new_location)
    db.commit()
    return {"status": "success"}

@router.get("/active")
def get_active_agents(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    # Get last known location for each agent within the last 24 hours
    since_last_period = datetime.utcnow() - timedelta(hours=24)
    
    # Subquery for most recent location per agent
    from sqlalchemy import func
    subquery = db.query(
        AgentLocation.agent_id,
        func.max(AgentLocation.timestamp).label('max_ts')
    ).filter(AgentLocation.timestamp >= since_last_period).group_by(AgentLocation.agent_id).subquery()

    active_locations = db.query(AgentLocation, User.name)\
        .join(subquery, (AgentLocation.agent_id == subquery.c.agent_id) & (AgentLocation.timestamp == subquery.c.max_ts))\
        .join(User, User.id == AgentLocation.agent_id)\
        .filter(User.is_active == True)\
        .all()

    return [
        {
            "agent_id": loc.agent_id,
            "agent_name": name,
            "lat": loc.lat,
            "lng": loc.lng,
            "timestamp": loc.timestamp
        }
        for loc, name in active_locations
    ]

@router.get("/history/{agent_id}")
def get_agent_history(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    # Enforce history filtering per user status constraints
    agent = db.query(User).filter(User.id == agent_id, User.is_active == True).first()
    if not agent:
        return []
        
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    history = db.query(AgentLocation)\
        .filter(AgentLocation.agent_id == agent_id, AgentLocation.timestamp >= today)\
        .order_by(AgentLocation.timestamp.asc())\
        .all()
    return history
