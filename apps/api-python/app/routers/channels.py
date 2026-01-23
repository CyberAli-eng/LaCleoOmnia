"""
Channel and integration routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Channel, ChannelAccount, ChannelType, ChannelAccountStatus, User, AuditLog, AuditLogAction
from app.auth import get_current_user, create_access_token
from app.schemas import ShopifyConnectRequest, ChannelAccountResponse
from app.services.shopify import ShopifyService
from app.services.shopify_oauth import ShopifyOAuthService
from app.services.credentials import encrypt_token
from app.config import settings
from jose import jwt, JWTError
from datetime import timedelta
import re
import httpx
import os

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

@router.get("/shopify/oauth/install")
async def shopify_oauth_install(
    request: Request,
    shop: str = Query(..., description="Shop domain (e.g., mystore or mystore.myshopify.com)"),
    redirect_uri: str = Query(None, description="Redirect URI after OAuth"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get Shopify OAuth install URL - requires authentication"""
    if not settings.SHOPIFY_API_KEY or not settings.SHOPIFY_API_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Shopify OAuth not configured. Please set SHOPIFY_API_KEY and SHOPIFY_API_SECRET"
        )
    
    # Generate state parameter with signed user_id (expires in 10 minutes)
    state_data = {
        "user_id": current_user.id,
        "timestamp": str(int(__import__("time").time()))
    }
    state_token = jwt.encode(
        state_data,
        settings.JWT_SECRET,
        algorithm=settings.AUTH_ALGORITHM
    )
    
    # Build redirect URI dynamically
    if not redirect_uri:
        # Try to get from request or use WEBHOOK_BASE_URL
        if request:
            # Get base URL from request
            scheme = request.url.scheme
            host = request.url.hostname
            port = request.url.port
            if port and port not in [80, 443]:
                base_url = f"{scheme}://{host}:{port}"
            else:
                base_url = f"{scheme}://{host}"
        else:
            # Fallback to WEBHOOK_BASE_URL or default
            base_url = settings.WEBHOOK_BASE_URL or "http://localhost:8000"
        
        redirect_uri = f"{base_url}/api/channels/shopify/oauth/callback"
    
    oauth_service = ShopifyOAuthService()
    install_url = oauth_service.get_install_url(shop, redirect_uri, state_token)
    
    return {
        "installUrl": install_url,
        "shop": shop,
        "redirectUri": redirect_uri,
        "state": state_token
    }

@router.get("/shopify/oauth/callback")
async def shopify_oauth_callback(
    shop: str = Query(...),
    code: str = Query(None),
    hmac: str = Query(None),
    state: str = Query(None),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Handle Shopify OAuth callback - PUBLIC endpoint (no JWT required)"""
    
    # Helper function to get frontend URL dynamically - no hardcoding
    def get_frontend_url():
        if settings.ALLOWED_ORIGINS:
            return settings.ALLOWED_ORIGINS[0]
        if settings.IS_CLOUD:
            return os.getenv("FRONTEND_URL") or os.getenv("NEXT_PUBLIC_URL") or "http://localhost:3000"
        return "http://localhost:3000"
    
    if not settings.SHOPIFY_API_KEY or not settings.SHOPIFY_API_SECRET:
        return RedirectResponse(
            url=f"{get_frontend_url()}/dashboard/integrations?error=oauth_not_configured"
        )
    
    if not code:
        return RedirectResponse(
            url=f"{get_frontend_url()}/dashboard/integrations?error=no_code"
        )
    
    # Decode state to get user_id
    user_id = None
    if state:
        try:
            state_data = jwt.decode(
                state,
                settings.JWT_SECRET,
                algorithms=[settings.AUTH_ALGORITHM]
            )
            user_id = state_data.get("user_id")
        except JWTError:
            # State invalid or expired
            pass
    
    if not user_id:
        return RedirectResponse(
            url=f"{get_frontend_url()}/dashboard/integrations?error=invalid_state"
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(
            url=f"{get_frontend_url()}/dashboard/integrations?error=user_not_found"
        )
    
    oauth_service = ShopifyOAuthService()
    
    # Exchange code for access token
    try:
        token_data = await oauth_service.exchange_code_for_token(shop, code)
        access_token = token_data.get("access_token")
        
        if not access_token:
            return RedirectResponse(
                url=f"{get_frontend_url()}/dashboard/integrations?error=no_access_token"
            )
        
        # Get shop info
        shopify_service = ShopifyService()
        shop_info = await shopify_service.get_shop_info(shop, access_token)
        
        # Normalize shop domain
        normalized_domain = re.sub(r'^https?://', '', shop)
        normalized_domain = re.sub(r'\.myshopify\.com$', '', normalized_domain, flags=re.IGNORECASE)
        normalized_domain = normalized_domain.lower()
        
        # Get or create Shopify channel
        channel = db.query(Channel).filter(Channel.name == ChannelType.SHOPIFY).first()
        if not channel:
            channel = Channel(name=ChannelType.SHOPIFY, is_active=True)
            db.add(channel)
            db.commit()
            db.refresh(channel)
        
        # Check if account already exists
        existing_account = db.query(ChannelAccount).filter(
            ChannelAccount.shop_domain == normalized_domain,
            ChannelAccount.user_id == user.id
        ).first()
        
        if existing_account:
            # Update existing account
            existing_account.access_token = encrypt_token(access_token)
            existing_account.status = ChannelAccountStatus.CONNECTED
            account = existing_account
        else:
            # Create new account
            account = ChannelAccount(
                channel_id=channel.id,
                user_id=user.id,
                seller_name=shop_info.get("name", normalized_domain),
                shop_domain=normalized_domain,
                access_token=encrypt_token(access_token),
                status=ChannelAccountStatus.CONNECTED
            )
            db.add(account)
        
        db.commit()
        db.refresh(account)
        
        # Automatically register webhooks
        webhook_result = None
        if settings.WEBHOOK_BASE_URL:
            try:
                webhook_result = await shopify_service.ensure_webhook(
                    shop,
                    access_token,
                    settings.SHOPIFY_API_SECRET,
                    settings.WEBHOOK_BASE_URL
                )
            except Exception as e:
                # Log error but don't fail the connection
                print(f"Warning: Failed to register webhooks: {e}")
        
        # Log audit event
        audit_log = AuditLog(
            user_id=user.id,
            action=AuditLogAction.INTEGRATION_CONNECTED,
            entity_type="Integration",
            entity_id=account.id,
            details={"channel": "SHOPIFY", "shop_domain": normalized_domain, "method": "OAuth", "webhooks": webhook_result}
        )
        db.add(audit_log)
        db.commit()
        
        # Redirect to frontend success page - fully dynamic
        return RedirectResponse(
            url=f"{get_frontend_url()}/dashboard/integrations?connected=shopify&shop={normalized_domain}"
        )
    
    except httpx.HTTPStatusError as e:
        # Helper function to get frontend URL dynamically
        def get_frontend_url():
            if settings.ALLOWED_ORIGINS:
                return settings.ALLOWED_ORIGINS[0]
            if settings.IS_CLOUD:
                return os.getenv("FRONTEND_URL") or os.getenv("NEXT_PUBLIC_URL") or "http://localhost:3000"
            return "http://localhost:3000"
        
        error_msg = f"shopify_error_{e.response.status_code}"
        return RedirectResponse(
            url=f"{get_frontend_url()}/dashboard/integrations?error={error_msg}"
        )
    except Exception as e:
        # Helper function to get frontend URL dynamically
        def get_frontend_url():
            if settings.ALLOWED_ORIGINS:
                return settings.ALLOWED_ORIGINS[0]
            if settings.IS_CLOUD:
                return os.getenv("FRONTEND_URL") or os.getenv("NEXT_PUBLIC_URL") or "http://localhost:3000"
            return "http://localhost:3000"
        
        return RedirectResponse(
            url=f"{get_frontend_url()}/dashboard/integrations?error=oauth_failed"
        )
