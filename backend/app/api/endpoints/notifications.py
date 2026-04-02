from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database
from typing import List
from ...db.session import get_db
from ...schemas import UserOut, UserRole
from ..deps import get_current_active_user, check_role
from bson import ObjectId

router = APIRouter()

@router.get("/")
def get_unread_notifications(
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    # Fetch all unread broadcast notifications or notifications specific to this user
    query = {
        "is_read": False,
        "$or": [{"user_id": str(current_user.id)}, {"user_id": None}]
    }
    
    notifs = db.notifications.find(query).sort("created_at", -1).limit(20)
    
    return [{"id": str(n["_id"]), "message": n.get("message"), "created_at": n.get("created_at")} for n in notifs]

@router.post("/{notif_id}/read")
def mark_read(
    notif_id: str,
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    try:
        obj_id = ObjectId(notif_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    result = db.notifications.update_one({"_id": obj_id}, {"$set": {"is_read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"status": "success"}
