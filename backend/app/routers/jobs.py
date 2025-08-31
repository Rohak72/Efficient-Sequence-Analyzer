from fastapi import APIRouter, UploadFile, Depends, File, Form
from app.routers.auth import get_active_user
from app.models.auth_tools import User
from app.scripts.aws_tools import *
import uuid

router = APIRouter(prefix="/jobs")

@router.post("/submit")
async def submit_alignment_job(input_fasta: UploadFile = File(...), target_fasta: UploadFile = File(...), 
                               direction: str = Form("BOTH"), current_user: User = Depends(get_active_user)):
    job_id = str(uuid.uuid4())
    user_id = current_user.id if current_user else None
    input_key = f"tmp/{job_id}/input.fasta"
    target_key = f"tmp/{job_id}/target.fasta"

    await upload_to_s3(input_fasta, input_key)
    await upload_to_s3(target_fasta, target_key)

    enqueue_job(job_id, input_key, target_key, direction, user_id)

    return {'job_id': job_id, 'status': 'PENDING'}

@router.get("/status/{job_id}")
def poll_alignment_status(job_id: str):
    job_data = get_job_status(job_id)
    if not job_data:
        return {'status': 'UNKNOWN'}
    
    return {'job_id': job_id, **job_data}