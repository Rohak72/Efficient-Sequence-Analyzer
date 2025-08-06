import os
import uuid
import boto3

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, Form, UploadFile, HTTPException, File, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.routers.auth import get_current_active_user
from app.database import get_db
from app import models
from dotenv import load_dotenv

load_dotenv() 

aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
bucket_name = os.getenv("S3_BUCKET_NAME")

s3_client = boto3.client('s3', 
                         aws_access_key_id=aws_access_key_id, 
                         aws_secret_access_key=aws_secret_access_key, 
                         region_name="us-east-2")

router = APIRouter(prefix="/files")

def retrieval_by_id(file_id: int, db: Session = Depends(get_db), 
                    current_user: models.User = Depends(get_current_active_user)):
    db_file = db.query(models.FastaFile).filter(models.FastaFile.id == file_id).first()

    # Security Check #1: Does the file even exist in our records?
    if not db_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found!")
    
    # Security Check #2: Does this file belong to the user trying to download it?
    if db_file.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                            detail="Access denied -- you do not own this file!")
    
    return db_file

# CREATE

@router.post("/upload")
def create_upload_file(file: UploadFile = File(..., description="User's FASTA Query"),
                       type: models.FileType = Form(...),
                       db: Session = Depends(get_db),
                       current_user: models.User = Depends(get_current_active_user)):
    if not file.filename.lower().endswith(('.fasta', '.fa', '.fna', '.faa')):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid file extension -- only FASTA formats allowed.")

    unique_id = uuid.uuid4()
    s3_key = f"users/{current_user.id}/{type.value}/{unique_id}_{file.filename}"
    
    try:
        s3_client.upload_fileobj(file.file, bucket_name, s3_key)
    except ClientError as e:
        print(f"Failed to upload to S3: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload file.")
    
    db_file = models.FastaFile(filename=file.filename, s3_key=s3_key, owner_id=current_user.id, type=type.value)
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    return db_file

# READ

@router.get("/")
def read_file_list(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    return db.query(models.FastaFile).filter(models.FastaFile.owner_id == current_user.id).all()

@router.get("/{file_id}/read")
def read_file_contents(file_id: int, db: Session = Depends(get_db), 
                       current_user: models.User = Depends(get_current_active_user)):
    db_file = retrieval_by_id(file_id, db, current_user)
    
    try:
        s3_object = s3_client.get_object(Bucket=bucket_name, Key=db_file.s3_key)
        content = s3_object["Body"].read().decode('utf-8')
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on storage.")
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to read file from storage.")
    
    return models.FastaUpdate(content=content)

@router.get("/{file_id}/download")
def read_download_file(file_id: int, db: Session = Depends(get_db), 
                       current_user: models.User = Depends(get_current_active_user)):
    db_file = retrieval_by_id(file_id, db, current_user)
    
    try:
        content_disposition = f'attachment; filename="{db_file.filename}"'
        # Generate a pre-signed URL for temporary, secure access
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': db_file.s3_key, 'ResponseContentDisposition': content_disposition},
            ExpiresIn=3600,  # URL expires in 1 hour
        )
        # Redirect the user's browser to the pre-signed URL to start the download
        return RedirectResponse(url=url)
    except ClientError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate download link.")
    
# UPDATE

@router.put("/{file_id}/edit")
def update_file_contents(file_id: int, new_contents: models.FastaUpdate, db: Session = Depends(get_db), 
                         current_user: models.User = Depends(get_current_active_user)):
    db_file = retrieval_by_id(file_id, db, current_user)
    
    try:
        s3_client.put_object(
            Bucket=bucket_name, 
            Key=db_file.s3_key, 
            Body=new_contents.content.encode('utf-8'))
    except ClientError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update file in storage: {e}.")
    
    db.commit()
    db.refresh(db_file)

    return db_file

# DELETE

@router.delete("/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_file = retrieval_by_id(file_id, db, current_user)

    try:
        s3_client.delete_object(Bucket=bucket_name, Key=db_file.s3_key)
    except ClientError as e:
        print(f"Could not delete file from S3. Error: {e}. Proceeding with DB record deletion.")
    
    db.delete(db_file)
    db.commit()

    return
    