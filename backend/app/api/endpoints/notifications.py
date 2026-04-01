from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ...db.session import get_db
from ...models import User, UserRole, Notification
from ..deps import get_current_active_user, check_role

router = APIRouter()

@router.get("/")
def get_unread_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    # Fetch all unread broadcast notifications or notifications specific to this user
    notifs = db.query(Notification).filter(
        Notification.is_read == False,
        (Notification.user_id == current_user.id) | (Notification.user_id == None)
    ).order_by(Notification.created_at.desc()).limit(20).all()
    
    return [{"id": n.id, "message": n.message, "created_at": n.created_at} for n in notifs]

@router.post("/{notif_id}/read")
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    return {"status": "success"}
