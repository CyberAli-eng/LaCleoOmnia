"""
Channel and integration routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Channel, ChannelAccount, ChannelType, ChannelAccountStatus, User, AuditLog, AuditLogAction
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
        user_id=current_user.id,  # Associate with current user
        seller_name=request.seller_name,
        shop_domain=normalized_domain,
        access_token=encrypted_token,
        status=ChannelAccountStatus.CONNECTED
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    
    # Log audit event
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditLogAction.INTEGRATION_CONNECTED,
        entity_type="Integration",
        entity_id=account.id,
        details={"channel": "SHOPIFY", "shop_domain": normalized_domain}
    )
    db.add(audit_log)
    db.commit()
    
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
    """Test Shopify connection - can test with accountId or with shopDomain + accessToken"""
    account_id = request.get("accountId")
    shop_domain = request.get("shopDomain")
    access_token = request.get("accessToken")
    
    account = None
    
    if account_id:
        # Test existing connection
        account = db.query(ChannelAccount).filter(ChannelAccount.id == account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Channel account not found")
    elif shop_domain and access_token:
        # Test new connection before saving
        from app.services.credentials import encrypt_token
        normalized_domain = re.sub(r'^https?://', '', shop_domain)
        normalized_domain = re.sub(r'\.myshopify\.com$', '', normalized_domain, flags=re.IGNORECASE)
        normalized_domain = normalized_domain.lower()
        
        # Create temporary account object for testing
        from app.models import ChannelAccount, ChannelAccountStatus
        channel = db.query(Channel).filter(Channel.name == ChannelType.SHOPIFY).first()
        if not channel:
            raise HTTPException(status_code=404, detail="Shopify channel not found")
        
        account = ChannelAccount(
            channel_id=channel.id,
            seller_name="Test",
            shop_domain=normalized_domain,
            access_token=encrypt_token(access_token),
            status=ChannelAccountStatus.CONNECTED
        )
    else:
        raise HTTPException(status_code=400, detail="Either accountId or (shopDomain + accessToken) is required")
    
    try:
        service = ShopifyService(account)
        shop = await service.get_shop()
        
        # Get additional info
        locations = await service.get_locations()
        products_count = await service.get_products_count()
        recent_orders = await service.get_recent_orders(limit=10)
        
        return {
            "success": True,
            "shop": {
                "name": shop.get("name", ""),
                "domain": shop.get("domain", ""),
                "email": shop.get("email", ""),
                "currency": shop.get("currency", ""),
            },
            "locations": [{"id": loc.get("id"), "name": loc.get("name")} for loc in locations[:5]],
            "productsCount": products_count,
            "recentOrdersCount": len(recent_orders),
            "lastOrderDate": recent_orders[0].get("created_at") if recent_orders else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection test failed: {str(e)}")

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
