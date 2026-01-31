"""
Webhook management routes. Shopify webhook receiver is public (no JWT); HMAC verified.
"""
import json
import logging
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChannelAccount, User, WebhookEvent
from app.auth import get_current_user
from app.services.shopify import ShopifyService
from app.services.credentials import decrypt_token
from app.services.shopify_webhook_handler import (
    verify_webhook_hmac,
    process_shopify_webhook,
)
from app.config import settings

logger = logging.getLogger(__name__)
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
    limit: int = Query(50, le=100),
    source: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
):
    """Get persisted webhook events (e.g. Shopify). No per-user filter for MVP."""
    query = db.query(WebhookEvent).order_by(WebhookEvent.created_at.desc()).limit(limit)
    if source:
        query = query.filter(WebhookEvent.source == source)
    if topic:
        query = query.filter(WebhookEvent.topic == topic)
    rows = query.all()
    return [
        {
            "id": r.id,
            "source": r.source,
            "shopDomain": r.shop_domain,
            "topic": r.topic,
            "payloadSummary": r.payload_summary,
            "processedAt": r.processed_at.isoformat() if r.processed_at else None,
            "error": r.error,
            "createdAt": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/events")
async def get_webhook_events_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, le=100),
):
    """Alias: get webhook events list."""
    return await get_webhook_events(db=db, current_user=current_user, limit=limit)

@router.post("/shopify")
async def shopify_webhook_receive(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Public endpoint for Shopify webhooks. No JWT.
    Verify X-Shopify-Hmac-Sha256, persist event, trigger sync/profit by topic.
    Topics: orders/create, orders/updated, orders/cancelled, refunds/create, inventory_levels/update, products/update.
    """
    raw_body = await request.body()
    hmac_header = request.headers.get("X-Shopify-Hmac-Sha256")
    topic = request.headers.get("X-Shopify-Topic") or ""
    shop_domain = (request.headers.get("X-Shopify-Shop-Domain") or "").strip().lower()
    if not shop_domain:
        logger.warning("Shopify webhook: missing X-Shopify-Shop-Domain")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing shop domain")

    secret = getattr(settings, "SHOPIFY_API_SECRET", None) or ""
    if not verify_webhook_hmac(raw_body, hmac_header, secret):
        logger.warning("Shopify webhook: HMAC verification failed for shop=%s topic=%s", shop_domain, topic)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    try:
        payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception as e:
        logger.warning("Shopify webhook: invalid JSON %s", e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON")

    # Payload summary for storage (e.g. order id)
    summary = None
    if isinstance(payload, dict):
        oid = payload.get("id") or payload.get("order_id")
        if oid is not None:
            summary = f"id={oid}"

    event = WebhookEvent(
        id=str(uuid.uuid4()),
        source="shopify",
        shop_domain=shop_domain,
        topic=topic,
        payload_summary=summary,
    )
    db.add(event)
    db.commit()

    try:
        process_shopify_webhook(db, shop_domain, topic, payload, event_id=event.id)
        db.commit()
    except Exception as e:
        logger.exception("Shopify webhook process failed: %s", e)
        try:
            ev = db.query(WebhookEvent).filter(WebhookEvent.id == event.id).first()
            if ev:
                ev.error = str(e)[:500]
            db.commit()
        except Exception:
            db.rollback()
        # Return 200 so Shopify does not retry

    return {"ok": True}


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
