from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import uuid
import pandas as pd
from fastapi.responses import StreamingResponse
import io
from ...db.session import get_db
from ...models import User, UserRole, SurveyQuestion, SurveySubmission, Notification
from ...schemas import SurveyQuestionOut, SurveyQuestionBase
from ..deps import get_current_active_user, check_role

router = APIRouter()

UPLOAD_DIR = "app/uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# --- Question Management (Admins) ---
@router.post("/questions", response_model=SurveyQuestionOut)
def create_question(
    *,
    db: Session = Depends(get_db),
    question_in: SurveyQuestionBase,
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
) -> SurveyQuestionOut:
    new_question = SurveyQuestion(
        text=question_in.text,
        type=question_in.type,
        phase=question_in.phase,
        options=question_in.options
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    return new_question

@router.get("/questions", response_model=List[SurveyQuestionOut])
def read_questions(
    db: Session = Depends(get_db),
    phase: Optional[str] = None
) -> List[SurveyQuestionOut]:
    query = db.query(SurveyQuestion)
    if phase:
        query = query.filter(SurveyQuestion.phase == phase)
    return query.all()

@router.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    question = db.query(SurveyQuestion).filter(SurveyQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    submissions = db.query(SurveySubmission).all()
    for sub in submissions:
        if sub.responses and str(question_id) in sub.responses:
            raise HTTPException(status_code=400, detail="Cannot delete question because it is referenced by existing survey submissions.")
            
    db.delete(question)
    db.commit()
    return {"status": "success"}

# --- Submissions (Agents) ---
@router.post("/submit")
async def submit_survey(
    client_name: str = Form(...),
    client_contact: str = Form(...),
    responses: str = Form(...), # JSON string
    images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Validation for contact
    import re
    if not re.match(r"^\d{10}$", client_contact):
        raise HTTPException(status_code=400, detail="Contact must be exactly 10 digits")
    # Save images
    saved_images = []
    for image in images:
        file_ext = os.path.splitext(image.filename)[1]
        file_name = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        saved_images.append(file_name)
    
    import json
    new_submission = SurveySubmission(
        agent_id=current_user.id,
        client_name=client_name,
        client_contact=client_contact,
        responses=json.loads(responses),
        image_paths=saved_images
    )
    db.add(new_submission)
    
    # Broadcast Notification to all Admins (user_id=None)
    new_notification = Notification(
        user_id=None,
        message=f"Agent {current_user.name} submitted a survey for {client_name}.",
        is_read=False
    )
    db.add(new_notification)
    
    db.commit()
    db.refresh(new_submission)
    return {"status": "success", "submission_id": new_submission.id}

@router.get("/submissions")
def get_all_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    return db.query(SurveySubmission).all()

@router.get("/export")
def export_data(
    format: str = 'csv',
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_B2C]))
):
    submissions = db.query(SurveySubmission, User.name)\
        .join(User, User.id == SurveySubmission.agent_id).all()
    
    if not submissions:
        raise HTTPException(status_code=404, detail="No data available for export")
    
    data = []
    for s, name in submissions:
        data_row = {
            "Agent": name,
            "Client": s.client_name,
            "Contact": s.client_contact,
            "Timestamp": s.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }
        # Flatten responses JSON
        if s.responses:
            import json
            for q_id, val in s.responses.items():
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
        warnings = []
        
        from datetime import datetime
        
        for index, row in df.iterrows():
            agent_name = str(row.get('Agent', '')).strip()
            client_name = str(row.get('Client', '')).strip()
            client_contact = str(row.get('Contact', '')).strip()
            
            if not agent_name or agent_name.lower() == 'nan':
                warnings.append(f"Row {index + 2}: Missing Agent name.")
                continue
                
            agent = db.query(User).filter(User.name == agent_name).first()
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
                except: 
                    timestamp = datetime.utcnow()
            else:
                timestamp = datetime.utcnow()
                
            db.add(SurveySubmission(
                agent_id=agent.id,
                client_name=client_name,
                client_contact=client_contact,
                responses=responses,
                timestamp=timestamp,
                image_paths=[]
            ))
            success_count += 1
            
        db.commit()
        
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
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")
