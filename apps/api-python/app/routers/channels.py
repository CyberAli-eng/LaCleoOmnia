"""
Channel and integration routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Channel, ChannelAccount, ChannelType, ChannelAccountStatus, User
from app.auth import get_current_user
from app.schemas import ShopifyConnectRequest, ChannelAccountResponse
from app.services.shopify import ShopifyService
from app.services.credentials import encrypt_token
import re

router = APIRouter()

@router.get("")
async def list_channels(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all channels"""
    channels = db.query(Channel).all()
    result = []
    for channel in channels:
        accounts = db.query(ChannelAccount).filter(
            ChannelAccount.channel_id == channel.id
        ).all()
        result.append({
            "id": channel.id,
            "name": channel.name.value,
            "isActive": channel.is_active,
            "accounts": [
                {
                    "id": acc.id,
                    "sellerName": acc.seller_name,
                    "shopDomain": acc.shop_domain,
                    "status": acc.status.value,
                    "createdAt": acc.created_at.isoformat() if acc.created_at else None,
                }
                for acc in accounts
            ]
        })
    return {"channels": result}

@router.post("/shopify/connect")
async def connect_shopify(
    request: ShopifyConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Connect Shopify store"""
    # Normalize shop domain
    normalized_domain = re.sub(r'^https?://', '', request.shop_domain)
    normalized_domain = re.sub(r'\.myshopify\.com$', '', normalized_domain, flags=re.IGNORECASE)
    normalized_domain = normalized_domain.lower()
    
    # Get or create Shopify channel
    channel = db.query(Channel).filter(Channel.name == ChannelType.SHOPIFY).first()
    if not channel:
        channel = Channel(name=ChannelType.SHOPIFY, is_active=True)
        db.add(channel)
        db.commit()
        db.refresh(channel)
    
    # Encrypt token
    encrypted_token = encrypt_token(request.access_token)
    
    # Create channel account
    account = ChannelAccount(
        channel_id=channel.id,
        seller_name=request.seller_name,
        shop_domain=normalized_domain,
        access_token=encrypted_token,
        status=ChannelAccountStatus.CONNECTED
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    
    return {
        "account": {
            "id": account.id,
            "sellerName": account.seller_name,
            "shopDomain": account.shop_domain,
            "status": account.status.value
        }
    }

@router.post("/shopify/test")
async def test_shopify(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    account_id = request.get("accountId")
    if not account_id:
        raise HTTPException(status_code=400, detail="accountId is required")
    """Test Shopify connection"""
    account = db.query(ChannelAccount).filter(ChannelAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    try:
        service = ShopifyService(account)
        shop = await service.get_shop()
        return {"success": True, "shop": shop}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/shopify/import-orders")
async def import_shopify_orders_endpoint(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import orders from Shopify"""
    from app.services.order_import import import_shopify_orders
    
    account_id = request.get("accountId")
    if not account_id:
        raise HTTPException(status_code=400, detail="accountId is required")
    
    account = db.query(ChannelAccount).filter(ChannelAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Channel account not found")
    
    result = await import_shopify_orders(db, account)
    return result
