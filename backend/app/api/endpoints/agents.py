from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from pymongo.database import Database
from typing import List
from ...db.session import get_db
from ...schemas import UserOut, UserCreate, UserUpdate, UserRole
from ...core.security import get_password_hash
from ..deps import get_current_active_user, check_role
from bson import ObjectId
from datetime import datetime
import pandas as pd
import io

router = APIRouter()

@router.post("/", response_model=UserOut)
def create_agent(
    *,
    db: Database = Depends(get_db),
    agent_in: UserCreate,
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
) -> UserOut:
    user = db.users.find_one({"email": agent_in.email})
    if user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    new_user = {
        "email": agent_in.email,
        "hashed_password": get_password_hash(agent_in.password),
        "name": agent_in.name,
        "role": agent_in.role.value,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    result = db.users.insert_one(new_user)
    new_user["id"] = str(result.inserted_id)
    return UserOut(**new_user)

@router.get("/", response_model=List[UserOut])
def read_agents(
    db: Database = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
) -> List[UserOut]:
    query = {}
    if current_user.role == UserRole.SUPER_ADMIN:
        query = {"role": {"$ne": UserRole.SUPER_ADMIN.value}}
    else:
        query = {"role": UserRole.AGENT.value}
        
    agents_cursor = db.users.find(query).skip(skip).limit(limit)
    agents = []
    for agent in agents_cursor:
        agent["id"] = str(agent.pop("_id"))
        agents.append(UserOut(**agent))
    return agents

@router.delete("/{agent_id}", response_model=UserOut)
def delete_agent(
    agent_id: str,
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
) -> UserOut:
    try:
        obj_id = ObjectId(agent_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    agent = db.users.find_one({"_id": obj_id, "role": UserRole.AGENT.value})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    db.users.delete_one({"_id": obj_id})
    agent["id"] = str(agent.pop("_id"))
    return UserOut(**agent)

@router.patch("/{agent_id}/status", response_model=UserOut)
def toggle_status(
    agent_id: str,
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
) -> UserOut:
    try:
        obj_id = ObjectId(agent_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    agent = db.users.find_one({"_id": obj_id})
    if not agent:
        raise HTTPException(status_code=404, detail="User not found")
        
    if str(agent["_id"]) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot toggle your own status")
        
    if current_user.role == UserRole.ADMIN_B2C and agent["role"] != UserRole.AGENT.value:
        raise HTTPException(status_code=403, detail="Not authorized to toggle this role")
        
    new_status = not agent.get("is_active", True)
    db.users.update_one({"_id": obj_id}, {"$set": {"is_active": new_status}})
    agent["is_active"] = new_status
    agent["id"] = str(agent.pop("_id"))
    return UserOut(**agent)

@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_agents(
    file: UploadFile = File(...),
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
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
                
            existing = db.users.find_one({"email": email})
            if existing:
                skipped_count += 1
                continue
                
            new_user = {
                "email": email,
                "name": name,
                "hashed_password": get_password_hash(password),
                "role": valid_role.value,
                "is_active": True,
                "created_at": datetime.utcnow()
            }
            db.users.insert_one(new_user)
            success_count += 1
            
        return {"success": True, "message": f"Successfully imported {success_count} agents. Skipped {skipped_count} existing accounts."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@router.get("/export")
def export_agents(
    format: str = "csv",
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    agents = db.users.find()
    data = []
    for agent in agents:
        data.append({
            "ID": str(agent["_id"]),
            "Name": agent.get("name"),
            "Email": agent.get("email"),
            "Role": agent.get("role"),
            "Status": "Active" if agent.get("is_active", True) else "Inactive",
            "Created At": agent.get("created_at").strftime("%Y-%m-%d %H:%M:%S") if "created_at" in agent and agent["created_at"] else ""
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
