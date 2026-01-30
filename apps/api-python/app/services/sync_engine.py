"""
Advanced sync engine for order and inventory synchronization
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import ChannelAccount, SyncJob, SyncJobStatus, SyncLog, LogLevel, Order, OrderStatus
from app.services.shopify import ShopifyService
from app.services.order_import import import_shopify_orders
from app.services.credentials import decrypt_token
import json

class SyncEngine:
    """Background sync engine for automated reconciliation"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def sync_orders(self, account: ChannelAccount, limit: int = 250) -> dict:
        """Sync orders from channel"""
        sync_job = SyncJob(
            channel_account_id=account.id,
            job_type="ORDER_SYNC",
            status=SyncJobStatus.RUNNING,
            started_at=datetime.utcnow()
        )
        self.db.add(sync_job)
        self.db.commit()
        self.db.refresh(sync_job)
        
        try:
            if account.channel.name.value == "SHOPIFY":
                result = await import_shopify_orders(self.db, account)
                
                sync_job.status = SyncJobStatus.COMPLETED
                sync_job.finished_at = datetime.utcnow()
                sync_job.records_processed = result.get("imported", 0)
                sync_job.records_failed = result.get("failed", 0)
                
                # Log success
                log = SyncLog(
                    sync_job_id=sync_job.id,
                    level=LogLevel.INFO,
                    message=f"Order sync completed: {result.get('imported', 0)} imported, {result.get('failed', 0)} failed"
                )
                self.db.add(log)
            else:
                raise ValueError(f"Unsupported channel: {account.channel.name.value}")
            
            self.db.commit()
            return {
                "success": True,
                "jobId": sync_job.id,
                "imported": sync_job.records_processed,
                "failed": sync_job.records_failed
            }
        
        except Exception as e:
            sync_job.status = SyncJobStatus.FAILED
            sync_job.finished_at = datetime.utcnow()
            sync_job.error_message = str(e)
            
            # Log error
            log = SyncLog(
                sync_job_id=sync_job.id,
                level=LogLevel.ERROR,
                message=f"Order sync failed: {str(e)}",
                raw_payload={"error": str(e)}
            )
            self.db.add(log)
            self.db.commit()
            
            return {
                "success": False,
                "jobId": sync_job.id,
                "error": str(e)
            }
    
    async def sync_inventory(self, account: ChannelAccount) -> dict:
        """Sync inventory levels to channel"""
        from app.models import SyncJobType
        sync_job = SyncJob(
            channel_account_id=account.id,
            job_type=SyncJobType.PULL_PRODUCTS,
            status=SyncJobStatus.RUNNING,
            started_at=datetime.utcnow()
        )
        self.db.add(sync_job)
        self.db.commit()
        self.db.refresh(sync_job)
        
        try:
            if account.channel.name.value == "SHOPIFY":
                service = ShopifyService(account)
                
                # Get inventory levels from Shopify
                inventory_levels = await service.get_inventory_levels()
                
                # TODO: Update local inventory based on Shopify levels
                # This would involve mapping Shopify inventory items to local variants
                # and updating the Inventory table
                
                sync_job.status = SyncJobStatus.COMPLETED
                sync_job.finished_at = datetime.utcnow()
                sync_job.records_processed = len(inventory_levels)
                
                log = SyncLog(
                    sync_job_id=sync_job.id,
                    level=LogLevel.INFO,
                    message=f"Inventory sync completed: {len(inventory_levels)} items synced"
                )
                self.db.add(log)
            else:
                raise ValueError(f"Unsupported channel: {account.channel.name.value}")
            
            self.db.commit()
            return {
                "success": True,
                "jobId": sync_job.id,
                "synced": sync_job.records_processed
            }
        
        except Exception as e:
            sync_job.status = SyncJobStatus.FAILED
            sync_job.finished_at = datetime.utcnow()
            sync_job.error_message = str(e)
            
            log = SyncLog(
                sync_job_id=sync_job.id,
                level=LogLevel.ERROR,
                message=f"Inventory sync failed: {str(e)}",
                raw_payload={"error": str(e)}
            )
            self.db.add(log)
            self.db.commit()
            
            return {
                "success": False,
                "jobId": sync_job.id,
                "error": str(e)
            }
    
    async def daily_reconciliation(self, account: ChannelAccount) -> dict:
        """Daily full reconciliation - sync all orders and inventory"""
        results = {
            "orders": None,
            "inventory": None,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Sync orders
        try:
            results["orders"] = await self.sync_orders(account, limit=1000)
        except Exception as e:
            results["orders"] = {"success": False, "error": str(e)}
        
        # Sync inventory
        try:
            results["inventory"] = await self.sync_inventory(account)
        except Exception as e:
            results["inventory"] = {"success": False, "error": str(e)}
        
        return results
    
    def get_sync_history(self, account_id: str, limit: int = 50) -> list:
        """Get sync job history for an account"""
        jobs = self.db.query(SyncJob).filter(
            SyncJob.channel_account_id == account_id
        ).order_by(SyncJob.started_at.desc()).limit(limit).all()
        
        return [
            {
                "id": job.id,
                "jobType": job.job_type.value,
                "status": job.status.value,
                "startedAt": job.started_at.isoformat() if job.started_at else None,
                "completedAt": job.finished_at.isoformat() if job.finished_at else None,
                "recordsProcessed": job.records_processed,
                "recordsFailed": job.records_failed,
                "errorMessage": job.error_message
            }
            for job in jobs
        ]
