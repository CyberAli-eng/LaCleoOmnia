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
    Product,
    ProductVariant,
    Warehouse,
    Inventory,
)
from app.auth import get_current_user
from app.services.shopify_service import (
    get_orders as shopify_get_orders,
    get_inventory as shopify_get_inventory,
    get_orders_raw,
    get_access_scopes,
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    GET /api/integrations/shopify/inventory
    Fetch inventory from Shopify. Always returns 200.
    On missing read_locations/API errors: returns empty list + warning (never 500/502).
    """
    try:
        integration = _get_shopify_integration(db)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Unexpected error getting Shopify integration: %s", e)
        return {"inventory": [], "warning": "Inventory could not be loaded. Check Shopify connection."}
    try:
        inventory = await shopify_get_inventory(
            integration.shop_domain,
            integration.access_token,
        )
        return {"inventory": inventory or []}
    except Exception as e:
        logger.warning("Shopify inventory fetch failed (check scopes read_inventory, read_locations): %s", e)
        return {
            "inventory": [],
            "warning": "Inventory could not be loaded from Shopify. Add read_locations scope in Shopify Partner Dashboard, then uninstall and reinstall the app.",
        }


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
        orders_inserted += 1

    # 2) Sync inventory into DB (never crash; 0 synced if Shopify or DB fails)
    inv_list: list = []
    try:
        inv_list = await shopify_get_inventory(
            integration.shop_domain,
            integration.access_token,
        )
    except Exception as e:
        logger.warning("Shopify inventory fetch in sync failed: %s", e)
    inventory_synced = 0
    try:
        warehouse = db.query(Warehouse).filter(Warehouse.name == "Shopify").first()
        if not warehouse:
            warehouse = Warehouse(name="Shopify", city=None, state=None)
            db.add(warehouse)
            db.flush()
        product = db.query(Product).filter(Product.title == "Shopify Products").first()
        if not product:
            product = Product(title="Shopify Products", brand=None, category=None)
            db.add(product)
            db.flush()
        for row in inv_list or []:
            if not isinstance(row, dict):
                continue
            sku = (row.get("sku") or "").strip() or "—"
            if sku == "—":
                continue
            product_name = ((row.get("product_name") or sku) or "—")[:255]
            available = int(row.get("available", 0) or 0)
            variant = db.query(ProductVariant).filter(ProductVariant.sku == sku).first()
            if not variant:
                variant = ProductVariant(
                    product_id=product.id,
                    sku=sku,
                    mrp=Decimal("0"),
                    selling_price=Decimal("0"),
                )
                db.add(variant)
                db.flush()
            inv = db.query(Inventory).filter(
                Inventory.warehouse_id == warehouse.id,
                Inventory.variant_id == variant.id,
            ).first()
            if not inv:
                inv = Inventory(
                    warehouse_id=warehouse.id,
                    variant_id=variant.id,
                    total_qty=available,
                    reserved_qty=0,
                )
                db.add(inv)
                inventory_synced += 1
            else:
                if inv.total_qty != available:
                    inv.total_qty = available
                    inventory_synced += 1
    except Exception as e:
        logger.exception("Inventory DB sync failed (orders still saved): %s", e)
        inventory_synced = 0

    integration.last_synced_at = datetime.now(timezone.utc)
    db.commit()
    message = f"Synced {orders_inserted} new orders and {inventory_synced} inventory records."
    return {
        "orders_synced": orders_inserted,
        "inventory_synced": inventory_synced,
        "total_orders_fetched": len(raw_orders),
        "message": message,
    }
