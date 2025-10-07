from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, status
from fastapi.responses import JSONResponse
from typing import Optional, List
import hashlib
import json
import boto3
from botocore.exceptions import ClientError
import os
from datetime import datetime
import io
from database import get_db
from sqlalchemy.orm import Session
from models import User, Upload
from auth import get_current_user
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION', 'us-east-1')
)

BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'absolute-uploads')

def calculate_md5(file_content: bytes) -> str:
    """Calculate MD5 hash of file content"""
    md5_hash = hashlib.md5()
    md5_hash.update(file_content)
    return md5_hash.hexdigest()

def check_duplicate(db: Session, md5_hash: str, user_id: int) -> bool:
    """Check if file with same MD5 already exists for this user"""
    existing_upload = db.query(Upload).filter(
        Upload.md5_hash == md5_hash,
        Upload.user_id == user_id
    ).first()
    return existing_upload is not None

def upload_to_s3(file_content: bytes, key: str, content_type: str = 'application/octet-stream') -> bool:
    """Upload file to S3"""
    try:
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=file_content,
            ContentType=content_type
        )
        return True
    except ClientError as e:
        print(f"Error uploading to S3: {e}")
        return False

@router.post("/upload")
async def upload_files(
    category: str = Form(...),
    metadata: str = Form(...),
    emlFile: Optional[UploadFile] = File(None),
    pdfFile: Optional[UploadFile] = File(None),
    txtFile: Optional[UploadFile] = File(None),
    textContent: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Handle file uploads with MD5 duplicate detection and S3 storage"""
    
    # Check if user has upload_user role
    if current_user.role not in ['upload_user', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to upload files"
        )
    
    try:
        metadata_dict = json.loads(metadata)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid metadata format"
        )
    
    uploaded_files = []
    file_hashes = {}
    
    # Process files based on category
    if category == '.eml':
        if not emlFile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="EML file is required for this category"
            )
        
        # Read and process EML file
        eml_content = await emlFile.read()
        eml_hash = calculate_md5(eml_content)
        
        # Check for duplicate
        if check_duplicate(db, eml_hash, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate file detected: EML file with hash {eml_hash} already exists"
            )
        
        file_hashes['eml'] = eml_hash
        
        # Upload to S3
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        s3_key = f"uploads/{current_user.id}/{timestamp}_{eml_hash[:8]}/{emlFile.filename}"
        
        if not upload_to_s3(eml_content, s3_key, 'message/rfc822'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload EML file to storage"
            )
        
        uploaded_files.append({
            'filename': emlFile.filename,
            'type': 'eml',
            's3_key': s3_key,
            'md5_hash': eml_hash
        })
    
    elif category == '.eml + pdf':
        if not emlFile or not pdfFile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both EML and PDF files are required for this category"
            )
        
        # Process EML file
        eml_content = await emlFile.read()
        eml_hash = calculate_md5(eml_content)
        
        # Process PDF file
        pdf_content = await pdfFile.read()
        pdf_hash = calculate_md5(pdf_content)
        
        # Check for duplicates
        if check_duplicate(db, eml_hash, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate file detected: EML file with hash {eml_hash} already exists"
            )
        
        if check_duplicate(db, pdf_hash, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate file detected: PDF file with hash {pdf_hash} already exists"
            )
        
        file_hashes['eml'] = eml_hash
        file_hashes['pdf'] = pdf_hash
        
        # Upload to S3
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        base_path = f"uploads/{current_user.id}/{timestamp}_{eml_hash[:8]}"
        
        eml_s3_key = f"{base_path}/{emlFile.filename}"
        pdf_s3_key = f"{base_path}/{pdfFile.filename}"
        
        if not upload_to_s3(eml_content, eml_s3_key, 'message/rfc822'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload EML file to storage"
            )
        
        if not upload_to_s3(pdf_content, pdf_s3_key, 'application/pdf'):
            # Cleanup EML if PDF fails
            try:
                s3_client.delete_object(Bucket=BUCKET_NAME, Key=eml_s3_key)
            except:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload PDF file to storage"
            )
        
        uploaded_files.extend([
            {
                'filename': emlFile.filename,
                'type': 'eml',
                's3_key': eml_s3_key,
                'md5_hash': eml_hash
            },
            {
                'filename': pdfFile.filename,
                'type': 'pdf',
                's3_key': pdf_s3_key,
                'md5_hash': pdf_hash
            }
        ])
    
    elif category == '.txt':
        txt_content = None
        txt_filename = None
        
        if txtFile:
            txt_content = await txtFile.read()
            txt_filename = txtFile.filename
        elif textContent:
            txt_content = textContent.encode('utf-8')
            txt_filename = f"text_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.txt"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either TXT file or text content is required for this category"
            )
        
        txt_hash = calculate_md5(txt_content)
        
        # Check for duplicate
        if check_duplicate(db, txt_hash, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate content detected: Text with hash {txt_hash} already exists"
            )
        
        file_hashes['txt'] = txt_hash
        
        # Upload to S3
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        s3_key = f"uploads/{current_user.id}/{timestamp}_{txt_hash[:8]}/{txt_filename}"
        
        if not upload_to_s3(txt_content, s3_key, 'text/plain'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload text file to storage"
            )
        
        uploaded_files.append({
            'filename': txt_filename,
            'type': 'txt',
            's3_key': s3_key,
            'md5_hash': txt_hash
        })
    
    # Save upload records to database
    for file_info in uploaded_files:
        upload_record = Upload(
            user_id=current_user.id,
            filename=file_info['filename'],
            file_type=file_info['type'],
            category=category,
            s3_key=file_info['s3_key'],
            md5_hash=file_info['md5_hash'],
            metadata=json.dumps(metadata_dict),
            upload_date=datetime.utcnow()
        )
        db.add(upload_record)
    
    db.commit()
    
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "message": "Files uploaded successfully",
            "uploaded_files": uploaded_files,
            "category": category,
            "metadata": metadata_dict
        }
    )

@router.get("/uploads")
async def get_user_uploads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all uploads for the current user"""
    uploads = db.query(Upload).filter(Upload.user_id == current_user.id).all()
    
    return {
        "uploads": [
            {
                "id": upload.id,
                "filename": upload.filename,
                "file_type": upload.file_type,
                "category": upload.category,
                "md5_hash": upload.md5_hash,
                "metadata": json.loads(upload.metadata) if upload.metadata else {},
                "upload_date": upload.upload_date.isoformat() if upload.upload_date else None
            }
            for upload in uploads
        ]
    }