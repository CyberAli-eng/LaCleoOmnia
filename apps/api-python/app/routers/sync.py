"""
Sync jobs and logs routes
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import SyncJob, SyncLog, User, SyncJobStatus, SyncJobType, LogLevel
from app.auth import get_current_user

router = APIRouter()

@router.get("/jobs")
async def list_sync_jobs(
    status: Optional[str] = Query(None),
    job_type: Optional[str] = Query(None, alias="jobType"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List sync jobs"""
    query = db.query(SyncJob)
    
    if status:
        query = query.filter(SyncJob.status == status)
    
    if job_type:
        query = query.filter(SyncJob.job_type == job_type)
    
    jobs = query.order_by(SyncJob.created_at.desc()).limit(100).all()
    
    result = []
    for job in jobs:
        log_count = db.query(SyncLog).filter(SyncLog.sync_job_id == job.id).count()
        result.append({
            "id": job.id,
            "channelAccountId": job.channel_account_id,
            "jobType": job.job_type.value,
            "status": job.status.value,
            "startedAt": job.started_at.isoformat() if job.started_at else None,
            "finishedAt": job.finished_at.isoformat() if job.finished_at else None,
            "createdAt": job.created_at.isoformat() if job.created_at else None,
            "logCount": log_count
        })
    
    return {"jobs": result}

@router.get("/logs")
async def list_sync_logs(
    job_id: Optional[str] = Query(None, alias="jobId"),
    level: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List sync logs"""
    query = db.query(SyncLog)
    
    if job_id:
        query = query.filter(SyncLog.sync_job_id == job_id)
    
    if level:
        query = query.filter(SyncLog.level == level)
    
    logs = query.order_by(SyncLog.created_at.desc()).limit(500).all()
    
    return {
        "logs": [
            {
                "id": log.id,
                "syncJobId": log.sync_job_id,
                "level": log.level.value,
                "message": log.message,
                "rawPayload": log.raw_payload,
                "createdAt": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ]
    }
