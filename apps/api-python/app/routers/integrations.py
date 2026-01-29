"""
Integration status and data endpoints - Shopify orders/inventory from Admin API.
Never expose access_token to frontend.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ShopifyIntegration, User
from app.auth import get_current_user
from app.services.shopify_service import get_orders as shopify_get_orders, get_inventory as shopify_get_inventory

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_shopify_integration(db: Session):
    """Get first Shopify integration (one shop for MVP). Raises 401 if no token."""
    integration = db.query(ShopifyIntegration).first()
    if not integration or not integration.access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Shopify not connected. Connect via OAuth first.",
        )
    return integration


@router.get("/shopify/status")
async def shopify_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    GET /api/integrations/shopify/status
    Response: { "connected": true, "shop": "velomora-com.myshopify.com" }
    """
    integration = db.query(ShopifyIntegration).first()
    if not integration or not integration.access_token:
        return {"connected": False, "shop": None}
    return {
        "connected": True,
        "shop": integration.shop_domain,
    }


@router.get("/shopify/orders")
async def shopify_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    GET /api/integrations/shopify/orders
    Read access_token from DB, call Shopify Admin API 2026-01/orders.json, normalize, return.
    """
    integration = _get_shopify_integration(db)
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    GET /api/integrations/shopify/inventory
    Fetch inventory levels via inventory_items and inventory_levels. Normalize: SKU, product name, available, location.
    """
    integration = _get_shopify_integration(db)
    try:
        inventory = await shopify_get_inventory(
            integration.shop_domain,
            integration.access_token,
        )
        return {"inventory": inventory}
    except Exception as e:
        logger.exception("Shopify API error in get_inventory: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch inventory from Shopify.",
        )
