"""
Webhook management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ChannelAccount, User
from app.auth import get_current_user
from app.services.shopify import ShopifyService
from app.services.credentials import decrypt_token
from app.config import settings
import json

router = APIRouter()

@router.post("/register/{integration_id}")
async def register_webhooks(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Re-register webhooks for an integration"""
    account = db.query(ChannelAccount).filter(
        ChannelAccount.id == integration_id,
        ChannelAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=404,
            detail="Integration not found"
        )
    
    try:
        decrypted_creds = decrypt_token(account.access_token or "")
        creds = json.loads(decrypted_creds) if isinstance(decrypted_creds, str) else decrypted_creds
        
        if account.channel.name.value == "SHOPIFY":
            service = ShopifyService()
            shop_domain = creds.get("shopDomain", "")
            access_token = creds.get("accessToken", "")
            app_secret = creds.get("appSecret", "")
            
            # Register webhooks
            webhook_base_url = settings.WEBHOOK_BASE_URL
            if not webhook_base_url:
                raise HTTPException(
                    status_code=400,
                    detail="WEBHOOK_BASE_URL not configured"
                )
            
            # Register inventory and product webhooks
            await service.ensure_webhook(
                shop_domain,
                access_token,
                app_secret,
                webhook_base_url
            )
            
            return {"message": "Webhooks registered successfully"}
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Webhook registration not supported for {account.channel.type.value}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to register webhooks: {str(e)}"
        )

@router.get("")
async def get_webhook_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, le=100)
):
    """Get webhook events for the current user"""
    # TODO: Implement when webhook event model is added
    # For now, return empty array
    return []

@router.get("/events")
async def get_webhook_events_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, le=100)
):
    """Get webhook events for the current user"""
    # TODO: Implement when webhook event model is added
    return []

@router.get("/subscriptions")
async def get_webhook_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get webhook subscriptions for the current user"""
    # Get subscriptions from channel accounts
    from app.models import ChannelAccount
    accounts = db.query(ChannelAccount).filter(
        ChannelAccount.user_id == current_user.id
    ).all()
    
    subscriptions = []
    for account in accounts:
        # Create a subscription entry for each account
        subscriptions.append({
            "id": account.id,
            "integrationId": account.id,
            "topic": "inventory_levels/update,products/update,orders/create",
            "status": "ACTIVE" if account.status.value == "ACTIVE" else "INACTIVE",
            "lastError": None,
            "updatedAt": account.updated_at.isoformat() if account.updated_at else None,
        })
    
    return subscriptions
