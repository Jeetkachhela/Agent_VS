from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from ...db.session import get_db
from ...models import User, UserRole
from ...schemas import UserOut, UserCreate, UserUpdate
from ...core.security import get_password_hash
from ..deps import get_current_active_user, check_role
import pandas as pd
import io

router = APIRouter()

@router.post("/", response_model=UserOut)
def create_agent(
    *,
    db: Session = Depends(get_db),
    agent_in: UserCreate,
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
) -> UserOut:
    user = db.query(User).filter(User.email == agent_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    new_user = User(
        email=agent_in.email,
        hashed_password=get_password_hash(agent_in.password),
        name=agent_in.name,
        role=agent_in.role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/", response_model=List[UserOut])
def read_agents(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
) -> List[UserOut]:
    if current_user.role == UserRole.SUPER_ADMIN:
        agents = db.query(User).filter(User.role != UserRole.SUPER_ADMIN).offset(skip).limit(limit).all()
    else:
        agents = db.query(User).filter(User.role == UserRole.AGENT).offset(skip).limit(limit).all()
    return agents

@router.delete("/{agent_id}", response_model=UserOut)
def delete_agent(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
) -> UserOut:
    agent = db.query(User).filter(User.id == agent_id, User.role == UserRole.AGENT).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()
    return agent

@router.patch("/{agent_id}/status", response_model=UserOut)
def toggle_status(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
) -> UserOut:
    agent = db.query(User).filter(User.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Prevent admins from disabling themselves
    if agent.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot toggle your own status")
        
    # B2C Admins can only toggle AGENTs
    if current_user.role == UserRole.ADMIN_B2C and agent.role != UserRole.AGENT:
        raise HTTPException(status_code=403, detail="Not authorized to toggle this role")
        
    agent.is_active = not agent.is_active
    db.commit()
    db.refresh(agent)
    return agent

@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_agents(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    contents = await file.read()
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Only .csv and .xlsx files are supported")
            
        success_count = 0
        skipped_count = 0
        
        for index, row in df.iterrows():
            email = str(row.get('Email', row.get('email', ''))).strip()
            name = str(row.get('Name', row.get('name', ''))).strip()
            password = str(row.get('Password', row.get('password', '123456'))).strip()
            role = str(row.get('Role', row.get('role', 'AGENT'))).strip().upper()
            
            if not email or email.lower() == 'nan':
                continue
                
            try:
                valid_role = UserRole(role)
            except ValueError:
                valid_role = UserRole.AGENT
                
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                skipped_count += 1
                continue
                
            new_user = User(
                email=email,
                name=name,
                hashed_password=get_password_hash(password),
                role=valid_role,
                is_active=True
            )
            db.add(new_user)
            success_count += 1
            
        db.commit()
        return {"success": True, "message": f"Successfully imported {success_count} agents. Skipped {skipped_count} existing accounts."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@router.get("/export")
def export_agents(
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    agents = db.query(User).all()
    data = []
    for agent in agents:
        data.append({
            "ID": agent.id,
            "Name": agent.name,
            "Email": agent.email,
            "Role": agent.role.value,
            "Status": "Active" if agent.is_active else "Inactive",
            "Created At": agent.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
        
    df = pd.DataFrame(data)
    stream = io.BytesIO()
    
    if format == "csv":
        df.to_csv(stream, index=False)
        media_type = "text/csv"
        filename = "agents_export.csv"
    else:
        df.to_excel(stream, index=False, engine='openpyxl')
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = "agents_export.xlsx"
        
    stream.seek(0)
    return StreamingResponse(
        stream,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
