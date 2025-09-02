from fastapi import APIRouter, UploadFile, Depends, File, Form, Query
from fastapi.responses import JSONResponse
from app.routers.auth import get_optional_user
from app.models.auth_tools import User
from app.scripts.aws_tools import *
from typing import Optional
import uuid

router = APIRouter(prefix="/jobs")

@router.post("/submit")
async def submit_alignment_job(input_fasta: UploadFile = File(...), target_fasta: UploadFile = File(...), 
                               direction: str = Form("BOTH"), current_user: Optional[User] = Depends(get_optional_user)):
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

@router.get("/retrieveResult")
def extract_result_file_from_s3_key(key: str = Query(...)):
    try:
        file_stream = download_from_s3(key)
        json_content = json.load(file_stream)
        return JSONResponse(content=json_content)
    except:
        print(f"Failed to process S3 key: {key}")
        return JSONResponse(content={"error": "File not found or invalid!"}, status_code=404)
