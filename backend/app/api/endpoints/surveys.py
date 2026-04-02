from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pymongo.database import Database
from typing import List, Optional
import os
import uuid
import pandas as pd
import io
from ...db.session import get_db
from ...schemas import SurveyQuestionOut, SurveyQuestionBase, UserOut, UserRole
from ..deps import get_current_active_user, check_role
from bson import ObjectId
from datetime import datetime, timezone
import json
import re
import gridfs

router = APIRouter()

# --- Question Management (Admins) ---
@router.post("/questions", response_model=SurveyQuestionOut)
def create_question(
    *,
    db: Database = Depends(get_db),
    question_in: SurveyQuestionBase,
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
) -> SurveyQuestionOut:
    new_question = {
        "text": question_in.text,
        "type": question_in.type,
        "phase": question_in.phase,
        "options": question_in.options,
        "created_at": datetime.now(timezone.utc)
    }
    result = db.survey_questions.insert_one(new_question)
    new_question["id"] = str(result.inserted_id)
    return SurveyQuestionOut(**new_question)

@router.get("/questions", response_model=List[SurveyQuestionOut])
def read_questions(
    db: Database = Depends(get_db),
    phase: Optional[str] = None,
    current_user: UserOut = Depends(get_current_active_user)
) -> List[SurveyQuestionOut]:
    query = {}
    if phase:
        query["phase"] = phase
    questions_cursor = db.survey_questions.find(query)
    questions = []
    for q in questions_cursor:
        q["id"] = str(q.pop("_id"))
        questions.append(SurveyQuestionOut(**q))
    return questions

@router.delete("/questions/{question_id}")
def delete_question(
    question_id: str,
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    try:
        obj_id = ObjectId(question_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    question = db.survey_questions.find_one({"_id": obj_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    # Efficient check: use MongoDB query instead of loading all submissions
    ref_count = db.survey_submissions.count_documents({f"responses.{question_id}": {"$exists": True}})
    if ref_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete question because it is referenced by existing survey submissions.")
        
    db.survey_questions.delete_one({"_id": obj_id})
    return {"status": "success"}

# --- Submissions (Agents) ---
@router.post("/submit")
async def submit_survey(
    client_name: str = Form(...),
    client_contact: str = Form(...),
    responses: str = Form(...), # JSON string
    images: List[UploadFile] = File(default=[]),
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(get_current_active_user)
):
    if not re.match(r"^\d{10}$", client_contact):
        raise HTTPException(status_code=400, detail="Contact must be exactly 10 digits")
    
    # Save images to MongoDB GridFS (works on ephemeral filesystems like Render)
    fs = gridfs.GridFS(db)
    saved_images = []
    for image in images:
        file_content = await image.read()
        file_ext = os.path.splitext(image.filename)[1] if image.filename else ".jpg"
        file_name = f"{uuid.uuid4()}{file_ext}"
        file_id = fs.put(file_content, filename=file_name, content_type=image.content_type or "image/jpeg")
        saved_images.append({"file_id": str(file_id), "filename": file_name})
    
    new_submission = {
        "agent_id": str(current_user.id),
        "client_name": client_name,
        "client_contact": client_contact,
        "responses": json.loads(responses),
        "image_paths": saved_images,
        "timestamp": datetime.now(timezone.utc)
    }
    result = db.survey_submissions.insert_one(new_submission)
    
    # Broadcast Notification to all Admins (user_id=None)
    new_notification = {
        "user_id": None,
        "message": f"Agent {current_user.name} submitted a survey for {client_name}.",
        "is_read": False,
        "created_at": datetime.now(timezone.utc)
    }
    db.notifications.insert_one(new_notification)
    
    return {"status": "success", "submission_id": str(result.inserted_id)}

# Serve images from GridFS
@router.get("/images/{file_id}")
def get_image(
    file_id: str,
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(get_current_active_user)
):
    fs = gridfs.GridFS(db)
    try:
        obj_id = ObjectId(file_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    if not fs.exists(obj_id):
        raise HTTPException(status_code=404, detail="Image not found")
    
    grid_out = fs.get(obj_id)
    return StreamingResponse(
        grid_out,
        media_type=grid_out.content_type or "image/jpeg",
        headers={"Content-Disposition": f"inline; filename={grid_out.filename}"}
    )

@router.get("/submissions")
def get_all_submissions(
    db: Database = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    submissions = list(db.survey_submissions.find().skip(skip).limit(limit))
    for sub in submissions:
        sub["id"] = str(sub.pop("_id"))
    return submissions

@router.get("/export")
def export_data(
    format: str = 'csv',
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    submissions = list(db.survey_submissions.find().limit(10000))  # Cap at 10k to prevent OOM
    
    if not submissions:
        raise HTTPException(status_code=404, detail="No data available for export")
        
    # Build dictionary map of agent IDs to names for O(1) lookups
    users = {str(u["_id"]): u.get("name", "Unknown") for u in db.users.find({}, {"name": 1})}
    
    data = []
    for s in submissions:
        data_row = {
            "Agent": users.get(s.get("agent_id"), "Unknown Agent"),
            "Client": s.get("client_name"),
            "Contact": s.get("client_contact"),
            "Timestamp": s.get("timestamp").strftime("%Y-%m-%d %H:%M:%S") if isinstance(s.get("timestamp"), datetime) else ""
        }
        # Flatten responses JSON
        responses = s.get("responses", {})
        if responses:
            for q_id, val in responses.items():
                data_row[f"Q_{q_id}"] = val
        data.append(data_row)
    
    df = pd.DataFrame(data)
    
    if format == 'excel':
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=survey_export.xlsx"}
        )
    else:
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return StreamingResponse(
            io.BytesIO(stream.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=survey_export.csv"}
        )

@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_surveys(
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
        warnings = []
        
        for index, row in df.iterrows():
            agent_name = str(row.get('Agent', '')).strip()
            client_name = str(row.get('Client', '')).strip()
            client_contact = str(row.get('Contact', '')).strip()
            
            if not agent_name or agent_name.lower() == 'nan':
                warnings.append(f"Row {index + 2}: Missing Agent name.")
                continue
                
            agent = db.users.find_one({"name": agent_name})
            if not agent:
                warnings.append(f"Row {index + 2}: Agent '{agent_name}' does not match any active database account.")
                continue
                
            responses = {}
            for col in df.columns:
                col_str = str(col)
                if col_str.startswith('Q_'):
                    q_id = col_str.split('Q_')[1]
                    val = str(row.get(col, '')).strip()
                    if val and val.lower() != 'nan':
                        responses[q_id] = val
                    
            timestamp_raw = row.get('Timestamp', None)
            if pd.notna(timestamp_raw):
                try: 
                    timestamp = pd.to_datetime(timestamp_raw).to_pydatetime()
                except Exception: 
                    timestamp = datetime.now(timezone.utc)
            else:
                timestamp = datetime.now(timezone.utc)
                
            db.survey_submissions.insert_one({
                "agent_id": str(agent["_id"]),
                "client_name": client_name,
                "client_contact": client_contact,
                "responses": responses,
                "timestamp": timestamp,
                "image_paths": []
            })
            success_count += 1
            
        status_type = "success" if success_count > 0 else "error"
        if len(warnings) > 0 and success_count > 0:
            status_type = "partial"
            
        return {
            "success": success_count > 0,
            "type": status_type,
            "message": f"Imported {success_count} submissions.",
            "warnings": warnings[:10]  # Limit to top 10 warnings
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")
