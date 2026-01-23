"""
Sync routes for background synchronization
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ChannelAccount, User
from app.auth import get_current_user
from app.services.sync_engine import SyncEngine

router = APIRouter()

@router.post("/orders/{account_id}")
async def sync_orders(
    account_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trigger order sync for a channel account"""
    account = db.query(ChannelAccount).filter(
        ChannelAccount.id == account_id,
        ChannelAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    sync_engine = SyncEngine(db)
    
    # Run sync in background
    async def run_sync():
        await sync_engine.sync_orders(account)
    
    background_tasks.add_task(run_sync)
    
    return {
        "message": "Order sync started",
        "accountId": account_id
    }

@router.post("/inventory/{account_id}")
async def sync_inventory(
    account_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trigger inventory sync for a channel account"""
    account = db.query(ChannelAccount).filter(
        ChannelAccount.id == account_id,
        ChannelAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    sync_engine = SyncEngine(db)
    
    # Run sync in background
    async def run_sync():
        await sync_engine.sync_inventory(account)
    
    background_tasks.add_task(run_sync)
    
    return {
        "message": "Inventory sync started",
        "accountId": account_id
    }

@router.post("/reconcile/{account_id}")
async def daily_reconciliation(
    account_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trigger daily full reconciliation"""
    account = db.query(ChannelAccount).filter(
        ChannelAccount.id == account_id,
        ChannelAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    sync_engine = SyncEngine(db)
    
    # Run reconciliation in background
    async def run_reconciliation():
        await sync_engine.daily_reconciliation(account)
    
    background_tasks.add_task(run_reconciliation)
    
    return {
        "message": "Daily reconciliation started",
        "accountId": account_id
    }

@router.get("/history/{account_id}")
async def get_sync_history(
    account_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get sync history for a channel account"""
    account = db.query(ChannelAccount).filter(
        ChannelAccount.id == account_id,
        ChannelAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    sync_engine = SyncEngine(db)
    history = sync_engine.get_sync_history(account_id, limit)
    
    return {
        "accountId": account_id,
        "history": history
    }
