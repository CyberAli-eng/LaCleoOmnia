"""
Shopify Admin API service - authenticated requests. API version 2024-01 (stable).
Centralizes headers and request building. Never expose access_token to frontend.
"""
import httpx
import logging
from typing import Any, Optional

SHOPIFY_API_VERSION = "2026-01"
logger = logging.getLogger(__name__)


def _base_url(shop_domain: str) -> str:
    shop = shop_domain.lower().strip()
    if not shop.endswith(".myshopify.com"):
        shop = f"{shop}.myshopify.com" if "." not in shop else shop
    return f"https://{shop}/admin/api/{SHOPIFY_API_VERSION}"


def _headers(access_token: str) -> dict:
    return {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
    }


async def get_orders(shop_domain: str, access_token: str, limit: int = 250) -> list[dict]:
    """
    Fetch orders from Shopify Admin API.
    GET /admin/api/2026-01/orders.json
    Returns normalized list of orders (id, customer, total, status, created_at).
    """
    url = f"{_base_url(shop_domain)}/orders.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            params={"status": "any", "limit": limit},
            headers=_headers(access_token),
            timeout=30.0,
        )
        response.raise_for_status()
    data = response.json()
    raw_orders = data.get("orders", [])
    return [
        {
            "id": str(o.get("id")),
            "order_id": str(o.get("id")),
            "customer": (o.get("customer") or {}).get("email") or o.get("email") or "—",
            "customer_name": _order_customer_name(o),
            "total": float(o.get("total_price", 0) or 0),
            "status": (o.get("fulfillment_status") or o.get("financial_status") or "unknown"),
            "created_at": o.get("created_at") or "",
        }
        for o in raw_orders
    ]


def _order_customer_name(o: dict) -> str:
    """First name + last name or email for display."""
    c = o.get("customer") or {}
    first = (c.get("first_name") or "").strip()
    last = (c.get("last_name") or "").strip()
    if first or last:
        return f"{first} {last}".strip()
    return (o.get("email") or "").strip() or "—"


async def get_orders_raw(shop_domain: str, access_token: str, limit: int = 250) -> list[dict]:
    """Fetch raw orders from Shopify for sync (full payload including line_items)."""
    url = f"{_base_url(shop_domain)}/orders.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            params={"status": "any", "limit": limit},
            headers=_headers(access_token),
            timeout=30.0,
        )
        response.raise_for_status()
    data = response.json()
    return data.get("orders", [])


async def get_products(shop_domain: str, access_token: str, limit: int = 250) -> list[dict]:
    """
    Fetch products from Shopify Admin API.
    GET /admin/api/2026-01/products.json
    """
    url = f"{_base_url(shop_domain)}/products.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            params={"limit": limit},
            headers=_headers(access_token),
            timeout=30.0,
        )
        response.raise_for_status()
    data = response.json()
    return data.get("products", [])


async def get_inventory(shop_domain: str, access_token: str) -> list[dict]:
    """
    Fetch inventory via inventory_items and inventory_levels.
    Normalizes to: SKU, product name, available quantity, location.
    """
    base = _base_url(shop_domain)
    h = _headers(access_token)
    async with httpx.AsyncClient() as client:
        # Get inventory items (includes SKU via variant)
        inv_response = await client.get(
            f"{base}/inventory_items.json",
            params={"limit": 250},
            headers=h,
            timeout=30.0,
        )
        inv_response.raise_for_status()
        items_data = inv_response.json()
        items = items_data.get("inventory_items", [])

        # Get levels for available qty and location
        levels_response = await client.get(
            f"{base}/inventory_levels.json",
            params={"limit": 250},
            headers=h,
            timeout=30.0,
        )
        levels_response.raise_for_status()
        levels_data = levels_response.json()
        levels = levels_data.get("inventory_levels", [])

    # Map inventory_item_id -> [levels]
    by_item: dict[int, list] = {}
    for lev in levels:
        iid = lev.get("inventory_item_id")
        if iid is not None:
            by_item.setdefault(iid, []).append(lev)

    # Build normalized rows: SKU, product name, available, location
    result = []
    for item in items:
        sku = (item.get("sku") or "").strip() or "—"
        # Admin API inventory_item doesn't have product title; we use sku as identifier
        name = item.get("title") or sku
        item_id = item.get("id")
        item_levels = by_item.get(item_id, [])
        for lev in item_levels:
            result.append({
                "sku": sku,
                "product_name": name,
                "available": int(lev.get("available", 0) or 0),
                "location_id": lev.get("location_id"),
                "location": str(lev.get("location_id") or ""),
            })
        if not item_levels:
            result.append({
                "sku": sku,
                "product_name": name,
                "available": 0,
                "location_id": None,
                "location": "",
            })
    return result
