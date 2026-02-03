"""
Integration status and data endpoints - Shopify orders/inventory from Admin API.
Catalog and provider status/connect are dynamic; no hardcoding in frontend.
Never expose access_token to frontend.
"""
import json
import logging
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    ShopifyIntegration,
    ShopifyInventory,
    User,
    Channel,
    ChannelAccount,
    ChannelType,
    ChannelAccountStatus,
    Order,
    OrderItem,
    OrderStatus,
    PaymentMode,
    FulfillmentStatus,
    ProviderCredential,
)
from app.auth import get_current_user
from app.services.shopify_service import (
    get_orders as shopify_get_orders,
    get_inventory as shopify_get_inventory,
    get_orders_raw,
    get_access_scopes,
)
from app.services.shopify_inventory_persist import persist_shopify_inventory
from app.services.profit_calculator import compute_profit_for_order
from app.services.shopify import ShopifyService
from sqlalchemy import func
from app.services.credentials import encrypt_token, decrypt_token
from app.services.ad_spend_sync import sync_ad_spend_for_date
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# Single source of truth for integration catalog (sections + providers). Add new providers here.
def _get_integration_catalog() -> dict:
    return {
        "sections": [
            {
                "id": "commerce",
                "title": "Commerce & Channels",
                "description": "Connect your sales channels and sync orders",
                "providers": [
                    {
                        "id": "SHOPIFY",
                        "name": "Shopify",
                        "icon": "🛍️",
                        "color": "blue",
                        "connectType": "oauth",
                        "statusEndpoint": "/integrations/shopify/status",
                        "oauthInstallEndpoint": "/channels/shopify/oauth/install",
                        "oauthInstallQueryKey": "shop",
                        "setupStatusEndpoint": "/integrations/providers/shopify_app/status",
                        "setupConnectEndpoint": "/integrations/providers/shopify_app/connect",
                        "setupFormFields": [
                            {"key": "apiKey", "label": "API Key (Client ID)", "type": "text", "placeholder": "From Shopify Partner app"},
                            {"key": "apiSecret", "label": "API Secret (Client secret)", "type": "password", "placeholder": "From Shopify Partner app"}
                        ],
                        "setupGuide": "Create an app in Shopify Admin: Apps → Develop apps → Create an app. In Configuration set App URL to your app base URL (e.g. the URL where this dashboard is hosted). Set Redirect URI to: your_app_url/auth/shopify/callback. Under Client credentials copy API key and API secret. Request scopes: read_orders, write_orders, read_products, write_products, read_inventory, write_inventory, read_locations.",
                        "setupSteps": [
                            {"step": 1, "title": "Create a Shopify app", "description": "In your Shopify Admin go to Apps → Develop apps → Create an app (or use an existing custom app)."},
                            {"step": 2, "title": "Configure App URL", "description": "In Configuration set the App URL to the base URL where this dashboard is hosted (e.g. https://your-domain.com). Do not include a trailing slash."},
                            {"step": 3, "title": "Set Redirect URI", "description": "Set Redirect URI to: your_app_url/auth/shopify/callback (e.g. https://your-domain.com/auth/shopify/callback)."},
                            {"step": 4, "title": "Copy credentials", "description": "Under Client credentials copy the API key (Client ID) and API secret (Client secret). Paste them in the form below on this page."},
                            {"step": 5, "title": "Request scopes", "description": "Ensure your app requests at least: read_orders, write_orders, read_products, write_products, read_inventory, write_inventory, read_locations. Then click Connect via OAuth and enter your store name (e.g. mystore for mystore.myshopify.com)."},
                        ],
                        "actions": [
                            {"id": "sync", "label": "Sync Shopify", "method": "POST", "endpoint": "/integrations/shopify/sync", "primary": True},
                            {"id": "registerWebhooks", "label": "Register webhooks", "method": "POST", "endpoint": "/integrations/shopify/register-webhooks"},
                            {"id": "webhooks", "label": "View webhooks", "href": "/dashboard/webhooks"},
                        ],
                        "description": "Sync orders and inventory from your Shopify store",
                    },
                    {
                        "id": "AMAZON",
                        "name": "Amazon",
                        "icon": "📦",
                        "color": "amber",
                        "connectType": "manual",
                        "statusEndpoint": "/config/status",
                        "actions": [],
                        "description": "Connect your Amazon seller account",
                    },
                    {
                        "id": "FLIPKART",
                        "name": "Flipkart",
                        "icon": "🛒",
                        "color": "purple",
                        "connectType": "manual",
                        "statusEndpoint": "/config/status",
                        "actions": [],
                        "description": "Connect your Flipkart seller account",
                    },
                    {
                        "id": "MYNTRA",
                        "name": "Myntra",
                        "icon": "👕",
                        "color": "pink",
                        "connectType": "manual",
                        "statusEndpoint": "/config/status",
                        "actions": [],
                        "description": "Connect your Myntra seller account",
                    },
                ],
            },
            {
                "id": "marketing",
                "title": "Marketing Channels",
                "description": "Connect ad accounts to auto-calculate CAC and marketing cost per order",
                "providers": [
                    {
                        "id": "meta_ads",
                        "name": "Meta Ads",
                        "icon": "📱",
                        "color": "indigo",
                        "connectType": "api_key",
                        "statusEndpoint": "/integrations/providers/meta_ads/status",
                        "connectEndpoint": "/integrations/providers/meta_ads/connect",
                        "connectBodyKey": "access_token",
                        "connectFormFields": [
                            {"key": "ad_account_id", "label": "Ad Account ID", "type": "text", "placeholder": "e.g. 123456789"},
                            {"key": "access_token", "label": "Access Token", "type": "password", "placeholder": "Meta Marketing API token"}
                        ],
                        "actions": [],
                        "description": "Sync daily ad spend from Meta (Facebook/Instagram). Used for blended CAC per order. Synced daily at 00:30 IST.",
                    },
                    {
                        "id": "google_ads",
                        "name": "Google Ads",
                        "icon": "🔍",
                        "color": "emerald",
                        "connectType": "api_key",
                        "statusEndpoint": "/integrations/providers/google_ads/status",
                        "connectEndpoint": "/integrations/providers/google_ads/connect",
                        "connectBodyKey": "refresh_token",
                        "connectFormFields": [
                            {"key": "developer_token", "label": "Developer Token", "type": "text", "placeholder": "From Google Ads API"},
                            {"key": "client_id", "label": "Client ID", "type": "text", "placeholder": "OAuth2 Client ID"},
                            {"key": "client_secret", "label": "Client Secret", "type": "password", "placeholder": "OAuth2 Client Secret"},
                            {"key": "refresh_token", "label": "Refresh Token", "type": "password", "placeholder": "OAuth2 Refresh Token"},
                            {"key": "customer_id", "label": "Customer ID (optional)", "type": "text", "placeholder": "Google Ads customer ID"}
                        ],
                        "actions": [],
                        "description": "Sync daily ad spend from Google Ads for CAC. Converts to INR. Synced daily at 00:30 IST.",
                    },
                ],
            },
            {
                "id": "logistics",
                "title": "Logistics & Supply Chain",
                "description": "Connect couriers and fulfillment for tracking and RTO",
                "providers": [
                    {
                        "id": "delhivery",
                        "name": "Delhivery",
                        "icon": "🚚",
                        "color": "teal",
                        "connectType": "api_key",
                        "statusEndpoint": "/integrations/providers/delhivery/status",
                        "connectEndpoint": "/integrations/providers/delhivery/connect",
                        "connectBodyKey": "apiKey",
                        "connectFormFields": [{"key": "apiKey", "label": "API Key", "type": "password", "placeholder": "Your Delhivery API key"}],
                        "actions": [
                            {"id": "syncShipments", "label": "Sync shipments", "method": "POST", "endpoint": "/shipments/sync", "primary": True},
                        ],
                        "description": "Paste your API key below to connect. Track shipments, RTO and lost status every 30 minutes.",
                    },
                    {
                        "id": "selloship",
                        "name": "Selloship",
                        "icon": "📦",
                        "color": "orange",
                        "connectType": "api_key",
                        "statusEndpoint": "/integrations/providers/selloship/status",
                        "connectEndpoint": "/integrations/providers/selloship/connect",
                        "connectBodyKey": "apiKey",
                        "connectFormFields": [{"key": "apiKey", "label": "API Key", "type": "password", "placeholder": "Your Selloship API key"}],
                        "actions": [
                            {"id": "syncShipments", "label": "Sync shipments", "method": "POST", "endpoint": "/shipments/sync", "primary": True},
                        ],
                        "description": "Paste your API key below to connect. Track shipments, RTO and lost status every 30 minutes.",
                    },
                ],
            },
        ],
    }


@router.get("/catalog")
async def get_integration_catalog(
    current_user: User = Depends(get_current_user),
):
    """Return dynamic integration catalog (sections + providers). No hardcoding in frontend."""
    return _get_integration_catalog()


# Providers that use ProviderCredential + optional env fallback. Add new api_key providers here.
CREDENTIAL_PROVIDER_ENV_KEYS: dict[str, str] = {"delhivery": "DELHIVERY_API_KEY", "selloship": "SELLOSHIP_API_KEY"}
# Providers allowed for generic /providers/{id}/status and /providers/{id}/connect (catalog-driven).
ALLOWED_CREDENTIAL_PROVIDERS: set[str] = {"delhivery", "selloship", "meta_ads", "google_ads"}


def _get_shopify_app_credentials(db: Session, user_id: str) -> dict | None:
    """Return { apiKey, apiSecret } for current user's Shopify app credentials, or None."""
    cred = db.query(ProviderCredential).filter(
        ProviderCredential.user_id == user_id,
        ProviderCredential.provider_id == "shopify_app",
    ).first()
    if not cred or not cred.value_encrypted:
        return None
    try:
        dec = decrypt_token(cred.value_encrypted)
        data = json.loads(dec) if isinstance(dec, str) and dec.strip().startswith("{") else {}
        if isinstance(data, dict) and data.get("apiKey") and data.get("apiSecret"):
            return {"apiKey": (data["apiKey"] or "").strip(), "apiSecret": (data["apiSecret"] or "").strip()}
    except Exception:
        pass
    return None


@router.get("/providers/shopify_app/status")
async def get_shopify_app_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return whether the user has saved Shopify App API Key and Secret (for OAuth). No .env required."""
    creds = _get_shopify_app_credentials(db, current_user.id)
    return {"configured": bool(creds), "connected": bool(creds)}


@router.post("/providers/shopify_app/connect")
async def connect_shopify_app(
    body: dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save Shopify App API Key and Secret (from Partner dashboard). Required before Connect via OAuth."""
    api_key = (body.get("apiKey") or body.get("api_key") or "").strip()
    api_secret = (body.get("apiSecret") or body.get("api_secret") or "").strip()
    if not api_key or not api_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both API Key and API Secret are required. Get them from your Shopify Partner app.",
        )
    value_json = json.dumps({"apiKey": api_key, "apiSecret": api_secret})
    encrypted = encrypt_token(value_json)
    cred = db.query(ProviderCredential).filter(
        ProviderCredential.user_id == current_user.id,
        ProviderCredential.provider_id == "shopify_app",
    ).first()
    if cred:
        cred.value_encrypted = encrypted
        db.commit()
        db.refresh(cred)
    else:
        cred = ProviderCredential(
            user_id=current_user.id,
            provider_id="shopify_app",
            value_encrypted=encrypted,
        )
        db.add(cred)
        db.commit()
        db.refresh(cred)
    return {"connected": True, "message": "Shopify App credentials saved. You can now click Connect."}


def _get_provider_credential_status(db: Session, user_id: int, provider_id: str) -> dict:
    """Return connected status for a credential-based provider (user key or env)."""
    cred = db.query(ProviderCredential).filter(
        ProviderCredential.user_id == user_id,
        ProviderCredential.provider_id == provider_id,
    ).first()
    if cred and cred.value_encrypted:
        try:
            dec = decrypt_token(cred.value_encrypted)
            data = json.loads(dec) if isinstance(dec, str) and dec.strip().startswith("{") else {"apiKey": dec}
            if data and any(v for v in data.values() if isinstance(v, str) and v.strip()):
                return {"connected": True, "source": "user", "configured": True}
        except Exception:
            pass
    env_key = CREDENTIAL_PROVIDER_ENV_KEYS.get(provider_id)
    if env_key:
        global_val = getattr(settings, env_key, None) or ""
        if isinstance(global_val, str) and global_val.strip():
            return {"connected": True, "source": "env", "configured": True}
    return {"connected": False, "source": None, "configured": False}


@router.get("/providers/{provider_id}/status")
async def get_provider_status(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return connection status for credential-based providers (e.g. delhivery, meta_ads, google_ads). Driven by catalog statusEndpoint."""
    if provider_id not in ALLOWED_CREDENTIAL_PROVIDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown provider")
    return _get_provider_credential_status(db, current_user.id, provider_id)


@router.post("/providers/{provider_id}/connect")
async def connect_provider(
    provider_id: str,
    body: dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save API key/credentials for the given provider. Body keys come from catalog connectFormFields (e.g. apiKey, ad_account_id, access_token)."""
    if provider_id not in ALLOWED_CREDENTIAL_PROVIDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown provider")
    if not body or not any(str(v).strip() for v in body.values() if v is not None):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one credential value is required")
    value_json = json.dumps(body)
    encrypted = encrypt_token(value_json)
    cred = db.query(ProviderCredential).filter(
        ProviderCredential.user_id == current_user.id,
        ProviderCredential.provider_id == provider_id,
    ).first()
    if cred:
        cred.value_encrypted = encrypted
        db.commit()
        db.refresh(cred)
    else:
        cred = ProviderCredential(
            user_id=current_user.id,
            provider_id=provider_id,
            value_encrypted=encrypted,
        )
        db.add(cred)
        db.commit()
        db.refresh(cred)
    return {"connected": True, "message": "Credentials saved"}


# IST for "yesterday" in manual sync
_IST = timezone(timedelta(hours=5, minutes=30))


@router.post("/ad-spend/sync")
async def trigger_ad_spend_sync(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually sync ad spend for yesterday (IST). Fetches Meta + Google and upserts ad_spend_daily.
    Daily sync also runs automatically at 00:30 IST.
    """
    now_ist = datetime.now(_IST)
    yesterday = (now_ist - timedelta(days=1)).date()
    result = await sync_ad_spend_for_date(db, current_user.id, yesterday)
    db.commit()
    # Recompute profit for orders on that date so marketing_cost is updated
    for (oid,) in db.query(Order.id).filter(func.date(Order.created_at) == yesterday).all():
        compute_profit_for_order(db, str(oid))
    db.commit()
    return {
        "message": "Ad spend sync completed",
        "date": yesterday.isoformat(),
        "meta": str(result.get("meta", 0)),
        "google": str(result.get("google", 0)),
        "errors": result.get("errors", []),
    }


def _get_user_shopify_account(db: Session, user_id: str):
    """Get current user's first Shopify ChannelAccount. Returns None if not connected."""
    channel = db.query(Channel).filter(Channel.name == ChannelType.SHOPIFY).first()
    if not channel:
        return None
    return (
        db.query(ChannelAccount)
        .filter(
            ChannelAccount.channel_id == channel.id,
            ChannelAccount.user_id == user_id,
            ChannelAccount.shop_domain.isnot(None),
        )
        .first()
    )


def _get_user_shopify_context(db: Session, current_user: User):
    """
    Resolve Shopify shop and token for the current user only (per-user dashboard).
    Returns (shop_domain, access_token, app_secret, integration_row for last_synced_at) or raises 401.
    """
    account = _get_user_shopify_account(db, str(current_user.id))
    if not account or not account.access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Shopify not connected. Connect via OAuth first.",
        )
    try:
        dec = decrypt_token(account.access_token or "")
        # Stored as raw token string or JSON with accessToken
        if isinstance(dec, str) and dec.strip().startswith("{"):
            data = json.loads(dec)
            access_token = (data.get("accessToken") or data.get("access_token") or "").strip()
        else:
            access_token = (dec or "").strip()
    except Exception:
        access_token = ""
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Shopify not connected. Connect via OAuth first.",
        )
    shop_domain = (account.shop_domain or "").strip()
    if not shop_domain:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Shopify shop domain missing. Reconnect your store.",
        )
    # App secret: user's ProviderCredential (shopify_app) or ShopifyIntegration for this shop
    app_secret = ""
    app_creds = _get_shopify_app_credentials(db, str(current_user.id))
    if app_creds and app_creds.get("apiSecret"):
        app_secret = app_creds["apiSecret"]
    if not app_secret:
        integration = db.query(ShopifyIntegration).filter(
            ShopifyIntegration.shop_domain == shop_domain
        ).first()
        if integration and getattr(integration, "app_secret_encrypted", None):
            try:
                app_secret = decrypt_token(integration.app_secret_encrypted) or ""
            except Exception:
                pass
    integration_row = (
        db.query(ShopifyIntegration).filter(ShopifyIntegration.shop_domain == shop_domain).first()
    )
    return shop_domain, access_token, app_secret, integration_row


def _get_shopify_integration(db: Session, current_user: User):
    """Get Shopify context for the current user only. Returns an object with shop_domain, access_token, app_secret, and optional integration row for last_synced_at."""
    shop_domain, access_token, app_secret, integration_row = _get_user_shopify_context(
        db, current_user
    )
    # Return a simple object so existing code using integration.shop_domain, .access_token still works
    class UserShopifyContext:
        def __init__(self):
            self.shop_domain = shop_domain
            self.access_token = access_token
            self.app_secret_encrypted = None  # not used when we pass decrypted secret
            self.last_synced_at = getattr(integration_row, "last_synced_at", None) if integration_row else None
            self._integration_row = integration_row  # for updating last_synced_at on sync
    ctx = UserShopifyContext()
    ctx._app_secret = app_secret
    return ctx


def _normalize_scopes_for_inventory(scopes_list: list[str]) -> bool:
    """True if list contains read_inventory, read_locations, read_products (case-insensitive)."""
    required = {"read_inventory", "read_locations", "read_products"}
    normalized = {s.strip().lower() for s in scopes_list if s and s.strip()}
    return required.issubset(normalized)


@router.post("/shopify/register-webhooks")
async def shopify_register_webhooks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Register Shopify webhooks for the current user's connected shop (orders/create, orders/updated,
    orders/cancelled, refunds/create, inventory_levels/update, products/update).
    Requires WEBHOOK_BASE_URL. App secret from Integrations (Shopify App setup) or env.
    """
    integration = _get_shopify_integration(db, current_user)
    webhook_base_url = (getattr(settings, "WEBHOOK_BASE_URL", None) or "").strip().rstrip("/")
    if not webhook_base_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="WEBHOOK_BASE_URL is not set. Set it to your API base URL (e.g. https://yourapp.onrender.com), or ask your administrator to configure it.",
        )
    secret = getattr(integration, "_app_secret", None) or ""
    if not secret:
        secret = getattr(settings, "SHOPIFY_API_SECRET", None) or ""
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shopify App Secret is required. Add your Shopify App credentials in Integrations (Shopify App setup), or ask your administrator to set SHOPIFY_API_SECRET.",
        )
    try:
        service = ShopifyService()
        result = await service.ensure_webhook(
            integration.shop_domain,
            integration.access_token,
            secret,
            webhook_base_url,
        )
        return {
            "message": "Webhooks registered",
            "registered": result.get("registered", []),
            "errors": result.get("errors", []),
            "total": result.get("total", 0),
        }
    except Exception as e:
        logger.exception("Register webhooks failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to register webhooks: {str(e)}",
        )


@router.get("/shopify/status")
async def shopify_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    GET /api/integrations/shopify/status
    Returns the current user's Shopify connection only (per-user dashboard). Uses live scopes when possible.
    """
    try:
        shop_domain, access_token, _, integration_row = _get_user_shopify_context(db, current_user)
    except HTTPException:
        return {"connected": False, "shop": None}
    # Prefer live scopes from Shopify (GET /admin/oauth/access_scopes.json)
    live_scopes = await get_access_scopes(shop_domain, access_token)
    if live_scopes:
        scopes_list = live_scopes
        has_inventory_scopes = _normalize_scopes_for_inventory(scopes_list)
    else:
        # Fallback: stored scopes from ShopifyIntegration for this shop
        scope_str = (getattr(integration_row, "scopes", None) or "") if integration_row else ""
        scopes_list = [s.strip() for s in (scope_str or "").split(",") if s.strip()]
        has_inventory_scopes = _normalize_scopes_for_inventory(scopes_list)
    return {
        "connected": True,
        "shop": shop_domain,
        "scopes": scopes_list,
        "scopes_ok_for_inventory": has_inventory_scopes,
    }


@router.get("/shopify/orders")
async def shopify_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    GET /api/integrations/shopify/orders
    Read access_token from DB (current user's connection), call Shopify Admin API, return.
    """
    integration = _get_shopify_integration(db, current_user)
    try:
        orders = await shopify_get_orders(
            integration.shop_domain,
            integration.access_token,
        )
        return {"orders": orders}
    except Exception as e:
        logger.exception("Shopify API error in get_orders: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch orders from Shopify.",
        )


@router.get("/shopify/inventory")
async def shopify_inventory(
    refresh: bool = Query(False, description="Force fetch from Shopify and update cache"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    GET /api/integrations/shopify/inventory
    Returns cached inventory from DB (no Shopify call by default). Use ?refresh=true to fetch live and update cache.
    Always returns 200. On errors returns empty list + optional warning.
    """
    try:
        integration = _get_shopify_integration(db, current_user)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Unexpected error getting Shopify integration: %s", e)
        return {"inventory": [], "warning": "Inventory could not be loaded. Check Shopify connection."}
    shop = integration.shop_domain

    # Prefer cache (no Shopify call every time) — never 500 on empty cache
    if not refresh:
        cached = (
            db.query(ShopifyInventory)
            .filter(ShopifyInventory.shop_domain == shop)
            .all()
        )
        logger.info("GET /shopify/inventory: shop=%s from_cache=%s count=%s", shop, True, len(cached))
        if cached:
            out = [
                {
                    "sku": r.sku,
                    "product_name": r.product_name or r.sku,
                    "available": r.available or 0,
                    "location": str(r.location_id or ""),
                }
                for r in cached
            ]
            return {"inventory": out, "source": "cache"}
        return {"inventory": [], "source": "cache"}

    # Refresh: call Shopify, persist to cache, return
    logger.info("GET /shopify/inventory: shop=%s refresh=true calling Shopify", shop)
    try:
        inventory = await shopify_get_inventory(shop, integration.access_token)
    except Exception as e:
        logger.warning("Shopify inventory fetch failed: %s", e)
        return {
            "inventory": [],
            "warning": "Inventory could not be loaded from Shopify. Ensure scopes read_products, read_inventory, read_locations and reinstall the app.",
        }
    if not inventory:
        logger.info("GET /shopify/inventory: shop=%s refresh returned 0 items", shop)
        return {"inventory": [], "source": "shopify"}

    # Upsert cache
    try:
        db.query(ShopifyInventory).filter(ShopifyInventory.shop_domain == shop).delete()
        for row in inventory:
            if not isinstance(row, dict):
                continue
            r = ShopifyInventory(
                shop_domain=shop,
                sku=(row.get("sku") or "—")[:255],
                product_name=(row.get("product_name") or "")[:255],
                variant_id=str(row.get("variant_id") or "")[:64] if row.get("variant_id") else None,
                inventory_item_id=str(row.get("inventory_item_id") or "")[:64] if row.get("inventory_item_id") else None,
                location_id=str(row.get("location_id") or "")[:64] if row.get("location_id") else None,
                available=int(row.get("available", 0) or 0),
            )
            db.add(r)
        db.commit()
    except Exception as e:
        logger.warning("Failed to persist Shopify inventory cache: %s", e)
        db.rollback()

    # Return same shape as before for frontend
    out = [
        {
            "sku": (row.get("sku") or "—"),
            "product_name": (row.get("product_name") or "—"),
            "available": int(row.get("available", 0) or 0),
            "location": str(row.get("location_id") or row.get("location") or ""),
        }
        for row in inventory
    ]
    return {"inventory": out, "source": "shopify"}


@router.post("/shopify/sync/orders")
async def shopify_sync_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    One-time sync: fetch orders from Shopify (current user's shop), insert into orders table.
    Idempotent by channel_order_id. Safe for real data: only inserts new orders.
    """
    integration = _get_shopify_integration(db, current_user)
    channel = db.query(Channel).filter(Channel.name == ChannelType.SHOPIFY).first()
    if not channel:
        raise HTTPException(status_code=500, detail="Shopify channel not found.")
    account = _get_user_shopify_account(db, str(current_user.id))
    if not account:
        raise HTTPException(status_code=401, detail="Shopify not connected. Connect via OAuth first.")
    try:
        raw_orders = await get_orders_raw(
            integration.shop_domain,
            integration.access_token,
            limit=250,
        )
    except Exception as e:
        logger.exception("Shopify API error in sync/orders: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch orders from Shopify.",
        )
    inserted = 0
    for o in raw_orders:
        shopify_id = str(o.get("id") or "")
        if not shopify_id:
            continue
        # Idempotent: skip if we already have this order for this user's account
        existing = db.query(Order).filter(
            Order.channel_id == channel.id,
            Order.channel_account_id == account.id,
            Order.channel_order_id == shopify_id,
        ).first()
        if existing:
            continue

        # Customer name from billing or email
        billing = o.get("billing_address") or {}
        first = (billing.get("first_name") or "").strip()
        last = (billing.get("last_name") or "").strip()
        customer_name = f"{first} {last}".strip() if (first or last) else (o.get("email") or "Customer")[:100]
        customer_email = (o.get("email") or "").strip() or None
        total = float(o.get("total_price", 0) or 0)
        financial = (o.get("financial_status") or "").lower()
        payment_mode = PaymentMode.PREPAID if financial == "paid" else PaymentMode.COD

        order = Order(
            channel_id=channel.id,
            channel_account_id=account.id,
            channel_order_id=shopify_id,
            customer_name=customer_name[:255],
            customer_email=customer_email[:255] if customer_email else None,
            payment_mode=payment_mode,
            order_total=Decimal(str(total)),
            status=OrderStatus.NEW,
        )
        db.add(order)
        db.flush()

        for line in o.get("line_items") or []:
            sku = (line.get("sku") or str(line.get("variant_id") or "") or "—")[:64]
            title = (line.get("title") or "Item")[:255]
            qty = int(line.get("quantity", 0) or 0)
            price = float(line.get("price", 0) or 0)
            db.add(OrderItem(
                order_id=order.id,
                sku=sku,
                title=title,
                qty=qty,
                price=Decimal(str(price)),
                fulfillment_status=FulfillmentStatus.PENDING,
            ))
        inserted += 1

    if getattr(integration, "_integration_row", None):
        integration._integration_row.last_synced_at = datetime.now(timezone.utc)
    db.commit()
    return {"synced": inserted, "total_fetched": len(raw_orders), "message": f"Imported {inserted} new orders."}


def _get_or_create_shopify_channel_account(db: Session, integration: ShopifyIntegration, current_user: User):
    """Get or create Channel + ChannelAccount for this user + shop. Returns (channel, account)."""
    channel = db.query(Channel).filter(Channel.name == ChannelType.SHOPIFY).first()
    if not channel:
        channel = Channel(name=ChannelType.SHOPIFY, is_active=True)
        db.add(channel)
        db.flush()
    account = db.query(ChannelAccount).filter(
        ChannelAccount.channel_id == channel.id,
        ChannelAccount.user_id == current_user.id,
        ChannelAccount.shop_domain == integration.shop_domain,
    ).first()
    if not account:
        account = ChannelAccount(
            channel_id=channel.id,
            user_id=current_user.id,
            seller_name=integration.shop_domain,
            shop_domain=integration.shop_domain,
            status=ChannelAccountStatus.CONNECTED,
        )
        db.add(account)
        db.flush()
    return channel, account


@router.post("/shopify/sync")
async def shopify_sync(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Unified initial sync: fetch orders + inventory from current user's Shopify shop, save into DB.
    Idempotent for orders (skip existing); upsert inventory.
    """
    integration = _get_shopify_integration(db, current_user)
    channel = db.query(Channel).filter(Channel.name == ChannelType.SHOPIFY).first()
    if not channel:
        raise HTTPException(status_code=500, detail="Shopify channel not found.")
    account = _get_user_shopify_account(db, str(current_user.id))
    if not account:
        raise HTTPException(status_code=401, detail="Shopify not connected. Connect via OAuth first.")

    # 1) Sync orders
    try:
        raw_orders = await get_orders_raw(
            integration.shop_domain,
            integration.access_token,
            limit=250,
        )
    except Exception as e:
        logger.exception("Shopify API error in sync (orders): %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch orders from Shopify.",
        )
    def _format_address(addr: dict | None) -> str | None:
        if not addr or not isinstance(addr, dict):
            return None
        parts = []
        if (addr.get("address1") or "").strip():
            parts.append((addr.get("address1") or "").strip())
        if (addr.get("address2") or "").strip():
            parts.append((addr.get("address2") or "").strip())
        city = (addr.get("city") or "").strip()
        prov = (addr.get("province_code") or addr.get("province") or "").strip()
        zip_ = (addr.get("zip") or "").strip()
        country = (addr.get("country") or "").strip()
        if city or prov or zip_ or country:
            parts.append(", ".join(p for p in [city, prov, zip_, country] if p))
        line = ", ".join(parts)
        return line[:1024] if line else None

    orders_inserted = 0
    new_order_ids: list[str] = []
    for o in raw_orders:
        shopify_id = str(o.get("id") or "")
        if not shopify_id:
            continue
        if db.query(Order).filter(Order.channel_id == channel.id, Order.channel_account_id == account.id, Order.channel_order_id == shopify_id).first():
            continue
        billing = o.get("billing_address") or {}
        first = (billing.get("first_name") or "").strip()
        last = (billing.get("last_name") or "").strip()
        customer_name = f"{first} {last}".strip() if (first or last) else (o.get("email") or "Customer")[:100]
        customer_email = (o.get("email") or "").strip() or None
        total = float(o.get("total_price", 0) or 0)
        financial = (o.get("financial_status") or "").lower()
        payment_mode = PaymentMode.PREPAID if financial == "paid" else PaymentMode.COD
        shipping_addr = _format_address(o.get("shipping_address"))
        billing_addr = _format_address(o.get("billing_address"))
        order = Order(
            channel_id=channel.id,
            channel_account_id=account.id,
            channel_order_id=shopify_id,
            customer_name=customer_name[:255],
            customer_email=customer_email[:255] if customer_email else None,
            shipping_address=shipping_addr,
            billing_address=billing_addr,
            payment_mode=payment_mode,
            order_total=Decimal(str(total)),
            status=OrderStatus.NEW,
        )
        db.add(order)
        db.flush()
        for line in o.get("line_items") or []:
            sku = (line.get("sku") or str(line.get("variant_id") or "") or "—")[:64]
            title = (line.get("title") or "Item")[:255]
            qty = int(line.get("quantity", 0) or 0)
            price = float(line.get("price", 0) or 0)
            db.add(OrderItem(
                order_id=order.id,
                sku=sku,
                title=title,
                qty=qty,
                price=Decimal(str(price)),
                fulfillment_status=FulfillmentStatus.PENDING,
            ))
        new_order_ids.append(order.id)
        orders_inserted += 1

    # 2) Sync inventory into DB (cache + Inventory table); never crash
    inv_list: list = []
    try:
        inv_list = await shopify_get_inventory(
            integration.shop_domain,
            integration.access_token,
        )
    except Exception as e:
        logger.warning("Shopify inventory fetch in sync failed: %s", e)
    inventory_synced = persist_shopify_inventory(db, integration.shop_domain, inv_list or [])

    # 3) Recompute profit for newly synced orders (uses sku_costs when present)
    for oid in new_order_ids:
        try:
            compute_profit_for_order(db, oid)
        except Exception as e:
            logger.warning("Profit recompute for order %s failed: %s", oid, e)

    if getattr(integration, "_integration_row", None):
        integration._integration_row.last_synced_at = datetime.now(timezone.utc)
    db.commit()
    message = f"Synced {orders_inserted} new orders and {inventory_synced} inventory records."
    return {
        "orders_synced": orders_inserted,
        "inventory_synced": inventory_synced,
        "total_orders_fetched": len(raw_orders),
        "message": message,
    }
