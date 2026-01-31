"""
Integration status and data endpoints - Shopify orders/inventory from Admin API.
Never expose access_token to frontend.
"""
import logging
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
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
)
from app.auth import get_current_user
from app.services.shopify_service import (
    get_orders as shopify_get_orders,
    get_inventory as shopify_get_inventory,
    get_orders_raw,
    get_access_scopes,
)
from app.services.shopify_inventory_persist import persist_shopify_inventory

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


def _normalize_scopes_for_inventory(scopes_list: list[str]) -> bool:
    """True if list contains read_inventory, read_locations, read_products (case-insensitive)."""
    required = {"read_inventory", "read_locations", "read_products"}
    normalized = {s.strip().lower() for s in scopes_list if s and s.strip()}
    return required.issubset(normalized)


@router.get("/shopify/status")
async def shopify_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    GET /api/integrations/shopify/status
    Uses live scopes from Shopify when possible so status reflects actual token permissions.
    """
    integration = db.query(ShopifyIntegration).first()
    if not integration or not integration.access_token:
        return {"connected": False, "shop": None}
    # Prefer live scopes from Shopify (GET /admin/oauth/access_scopes.json)
    live_scopes = await get_access_scopes(integration.shop_domain, integration.access_token)
    if live_scopes:
        scopes_list = live_scopes
        has_inventory_scopes = _normalize_scopes_for_inventory(scopes_list)
    else:
        # Fallback: stored scopes from OAuth callback (comma-separated)
        scopes_list = [s.strip() for s in (integration.scopes or "").split(",") if s.strip()]
        has_inventory_scopes = _normalize_scopes_for_inventory(scopes_list)
    return {
        "connected": True,
        "shop": integration.shop_domain,
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
        integration = _get_shopify_integration(db)
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
    One-time sync: fetch orders from Shopify, insert into orders table (idempotent by channel_order_id).
    Updates ShopifyIntegration.last_synced_at. Safe for real data: only inserts new orders.
    """
    integration = _get_shopify_integration(db)
    channel, account = _get_or_create_shopify_channel_account(db, integration, current_user)
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
    Unified initial sync: fetch orders + inventory from Shopify, save into DB, update last_synced_at.
    Single source of truth. Idempotent for orders (skip existing); upsert inventory.
    """
    integration = _get_shopify_integration(db)
    channel, account = _get_or_create_shopify_channel_account(db, integration, current_user)

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
    for o in raw_orders:
        shopify_id = str(o.get("id") or "")
        if not shopify_id:
            continue
        if db.query(Order).filter(Order.channel_id == channel.id, Order.channel_order_id == shopify_id).first():
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

    integration.last_synced_at = datetime.now(timezone.utc)
    db.commit()
    message = f"Synced {orders_inserted} new orders and {inventory_synced} inventory records."
    return {
        "orders_synced": orders_inserted,
        "inventory_synced": inventory_synced,
        "total_orders_fetched": len(raw_orders),
        "message": message,
    }
