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


def _shop_base_url(shop_domain: str) -> str:
    """Base URL for shop (admin/oauth), not API versioned path."""
    shop = shop_domain.lower().strip()
    if not shop.endswith(".myshopify.com"):
        shop = f"{shop}.myshopify.com" if "." not in shop else shop
    return f"https://{shop}"


async def get_access_scopes(shop_domain: str, access_token: str) -> list[str]:
    """
    Fetch granted scopes for the current token from Shopify.
    GET /admin/oauth/access_scopes.json
    Returns list of scope handles (e.g. read_locations). Empty list on error.
    """
    url = f"{_shop_base_url(shop_domain)}/admin/oauth/access_scopes.json"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=_headers(access_token), timeout=10.0)
            response.raise_for_status()
        data = response.json()
        scopes = data.get("access_scopes") or []
        return [str(s.get("handle", "")).strip() for s in scopes if s and s.get("handle")]
    except Exception as e:
        logger.warning("Could not fetch Shopify access_scopes: %s", e)
        return []


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


async def get_locations(shop_domain: str, access_token: str) -> list[dict]:
    """
    Fetch locations from Shopify. Required for inventory_levels (API requires location_ids).
    Returns list of location dicts; empty list on error.
    """
    base = _base_url(shop_domain)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base}/locations.json",
                params={"limit": 50},
                headers=_headers(access_token),
                timeout=15.0,
            )
            response.raise_for_status()
        data = response.json()
        return data.get("locations") or []
    except Exception as e:
        logger.warning("Shopify locations failed (read_locations scope): %s", e)
        return []


async def get_inventory(shop_domain: str, access_token: str) -> list[dict]:
    """
    Fetch inventory via locations -> inventory_items and inventory_levels.
    Shopify requires location_ids (or inventory_item_ids) for inventory_levels.json.
    Normalizes to: SKU, product name, available quantity, location.
    Defensive: never raises. Returns [] if Shopify returns error (e.g. missing read_locations scope).
    """
    base = _base_url(shop_domain)
    h = _headers(access_token)
    items: list[dict] = []
    levels: list[dict] = []

    async with httpx.AsyncClient() as client:
        try:
            inv_response = await client.get(
                f"{base}/inventory_items.json",
                params={"limit": 250},
                headers=h,
                timeout=30.0,
            )
            inv_response.raise_for_status()
            items_data = inv_response.json()
            items = items_data.get("inventory_items") or []
        except (httpx.HTTPStatusError, Exception) as e:
            logger.warning("Shopify inventory_items failed (check read_products/read_inventory): %s", e)
            return []

        # Shopify requires location_ids or inventory_item_ids for inventory_levels
        location_ids: list[int] = []
        try:
            locs = await get_locations(shop_domain, access_token)
            location_ids = [loc["id"] for loc in locs if isinstance(loc, dict) and loc.get("id") is not None]
        except Exception as e:
            logger.warning("Could not fetch locations for inventory_levels: %s", e)
        if not location_ids:
            logger.warning("No locations returned; inventory_levels may be empty. Ensure read_locations scope.")

        try:
            # Pass up to 50 location_ids (API limit per request)
            params: dict = {"limit": 250}
            if location_ids:
                params["location_ids"] = ",".join(str(x) for x in location_ids[:50])
            levels_response = await client.get(
                f"{base}/inventory_levels.json",
                params=params,
                headers=h,
                timeout=30.0,
            )
            levels_response.raise_for_status()
            levels_data = levels_response.json()
            levels = levels_data.get("inventory_levels") or []
        except (httpx.HTTPStatusError, Exception) as e:
            logger.warning(
                "Shopify inventory_levels failed (add read_locations scope and reinstall app): %s", e
            )
            levels = []

    # Map inventory_item_id -> [levels]
    by_item: dict[int, list] = {}
    for lev in levels or []:
        iid = lev.get("inventory_item_id")
        if iid is not None:
            by_item.setdefault(iid, []).append(lev)

    result = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        sku = (item.get("sku") or "").strip() or "—"
        name = (item.get("title") or sku) or "—"
        item_id = item.get("id")
        item_levels = by_item.get(item_id, []) if item_id is not None else []
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
