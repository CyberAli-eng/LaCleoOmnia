"""
Integration status and data endpoints - Shopify orders/inventory from Admin API.
Never expose access_token to frontend.
"""
import logging
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    ShopifyIntegration,
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
)
from app.auth import get_current_user
from app.services.shopify_service import (
    get_orders as shopify_get_orders,
    get_inventory as shopify_get_inventory,
    get_orders_raw,
)

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


@router.post("/shopify/sync/orders")
async def shopify_sync_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    One-time sync: fetch orders from Shopify, insert into orders table (idempotent by channel_order_id).
    Updates ShopifyIntegration.last_synced_at. Safe for real data: only inserts new orders.
    """
    integration = _get_shopify_integration(db)
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

    # Get or create Channel (SHOPIFY) and ChannelAccount for this user + shop
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

    inserted = 0
    for o in raw_orders:
        shopify_id = str(o.get("id") or "")
        if not shopify_id:
            continue
        # Idempotent: skip if we already have this order
        existing = db.query(Order).filter(
            Order.channel_id == channel.id,
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

    integration.last_synced_at = datetime.now(timezone.utc)
    db.commit()
    return {"synced": inserted, "total_fetched": len(raw_orders), "message": f"Imported {inserted} new orders."}
