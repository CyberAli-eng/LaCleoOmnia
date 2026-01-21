"""
Worker job management routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import SyncJob, User, ChannelAccount
from app.auth import get_current_user

router = APIRouter()

@router.get("")
async def list_worker_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all worker jobs for the current user"""
    # Use SyncJob as worker jobs - filter by user through channel_account
    user_account_ids = [acc.id for acc in db.query(ChannelAccount).filter(
        ChannelAccount.user_id == current_user.id
    ).all()]
    
    if not user_account_ids:
        return []
    
    jobs = db.query(SyncJob).filter(
        SyncJob.channel_account_id.in_(user_account_ids)
    ).all()
    
    return [
        {
            "id": job.id,
            "type": job.job_type.value if job.job_type else "UNKNOWN",
            "status": job.status.value if job.status else "PENDING",
            "attempts": 0,  # TODO: Add attempts field to SyncJob
            "lastError": None,  # TODO: Add error field to SyncJob
            "createdAt": job.created_at.isoformat() if job.created_at else None,
            "updatedAt": job.finished_at.isoformat() if job.finished_at else None,
        }
        for job in jobs
    ]

@router.post("/{job_id}/{action}")
async def control_worker_job(
    job_id: str,
    action: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Control worker job (retry, cancel, etc.)"""
    # Get user's channel accounts
    user_account_ids = [acc.id for acc in db.query(ChannelAccount).filter(
        ChannelAccount.user_id == current_user.id
    ).all()]
    
    if not user_account_ids:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )
    
    job = db.query(SyncJob).filter(
        SyncJob.id == job_id,
        SyncJob.channel_account_id.in_(user_account_ids)
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )
    
    if action == "retry":
        # Reset job status to pending
        from app.models import SyncJobStatus
        job.status = SyncJobStatus.PENDING
        db.commit()
        return {"message": "Job queued for retry"}
    elif action == "cancel":
        from app.models import SyncJobStatus
        job.status = SyncJobStatus.CANCELLED
        db.commit()
        return {"message": "Job cancelled"}
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown action: {action}"
        )
