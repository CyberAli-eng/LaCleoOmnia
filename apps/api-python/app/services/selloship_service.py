"""
Selloship tracking and costs: same pattern as Delhivery.
Maps Selloship status → internal: delivered→DELIVERED, rto→RTO_DONE, undelivered→RTO_INITIATED,
in_transit→IN_TRANSIT, lost→LOST. Never use raw strings in DB.
"""
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

import httpx

from app.config import settings
from app.models import ShipmentStatus

logger = logging.getLogger(__name__)

# Selloship raw status (normalized lower) → internal ShipmentStatus
SELLOSHIP_TO_INTERNAL = {
    "delivered": ShipmentStatus.DELIVERED,
    "rto": ShipmentStatus.RTO_DONE,
    "rto_done": ShipmentStatus.RTO_DONE,
    "rto done": ShipmentStatus.RTO_DONE,
    "undelivered": ShipmentStatus.RTO_INITIATED,
    "rto_initiated": ShipmentStatus.RTO_INITIATED,
    "rto initiated": ShipmentStatus.RTO_INITIATED,
    "in_transit": ShipmentStatus.IN_TRANSIT,
    "in transit": ShipmentStatus.IN_TRANSIT,
    "lost": ShipmentStatus.LOST,
}


def map_selloship_status(raw_status: Optional[str]) -> ShipmentStatus:
    """
    Map Selloship API status to internal ShipmentStatus.
    Never use raw strings in DB; always normalize.
    """
    if not raw_status or not isinstance(raw_status, str):
        return ShipmentStatus.CREATED
    normalized = raw_status.strip().lower()
    return SELLOSHIP_TO_INTERNAL.get(normalized, ShipmentStatus.IN_TRANSIT)


def get_selloship_client(api_key: Optional[str] = None) -> "SelloshipService":
    """Return a Selloship client. Api key from env if not passed."""
    key = api_key or getattr(settings, "SELLOSHIP_API_KEY", None) or ""
    base = getattr(settings, "SELLOSHIP_API_BASE_URL", "https://api.selloship.com")
    return SelloshipService(api_key=key, base_url=base)


class SelloshipService:
    """
    Selloship tracking API client.
    Implements get_tracking(awb) and get_shipping_cost(awb).
    Base URL and auth configurable via env (SELLOSHIP_API_BASE_URL, SELLOSHIP_API_KEY).
    When Selloship provides API docs, adjust endpoint paths and response parsing.
    """

    def __init__(self, api_key: str, base_url: str = "https://api.selloship.com"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    async def get_tracking(self, awb: str) -> dict:
        """
        Fetch tracking for waybill from Selloship.
        Returns normalized dict: waybill, status (internal enum value), raw_status,
        delivery_status, rto_status, scan[], error.
        """
        if not self.api_key:
            logger.warning("Selloship API key not set; returning stub")
            return {
                "waybill": awb,
                "status": ShipmentStatus.CREATED.value,
                "raw_status": "not_configured",
                "delivery_status": None,
                "rto_status": None,
                "scan": [],
                "error": "SELLOSHIP_API_KEY not set",
            }
        # Common patterns: GET /track?awb=XXX or /api/v1/tracking?waybill=XXX. Adjust per Selloship docs.
        url = f"{self.base_url}/api/v1/tracking"
        params = {"waybill": awb}
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPStatusError as e:
            logger.warning("Selloship API HTTP error awb=%s status=%s", awb, e.response.status_code)
            return {
                "waybill": awb,
                "status": ShipmentStatus.CREATED.value,
                "raw_status": None,
                "delivery_status": None,
                "rto_status": None,
                "scan": [],
                "error": f"HTTP {e.response.status_code}",
            }
        except Exception as e:
            logger.warning("Selloship API error awb=%s: %s", awb, e)
            return {
                "waybill": awb,
                "status": ShipmentStatus.CREATED.value,
                "raw_status": None,
                "delivery_status": None,
                "rto_status": None,
                "scan": [],
                "error": str(e),
            }

        # Parse response: adjust keys per Selloship API response shape
        raw_status = None
        if isinstance(data, dict):
            raw_status = data.get("status") or data.get("Status") or data.get("shipment_status")
            if isinstance(raw_status, dict):
                raw_status = raw_status.get("status") or raw_status.get("Status")
        if raw_status is None and isinstance(data, dict) and "data" in data:
            raw_status = (data.get("data") or {}).get("status") or (data.get("data") or {}).get("Status")
        raw_status = str(raw_status) if raw_status is not None else ""
        internal = map_selloship_status(raw_status)
        scans = []
        if isinstance(data, dict):
            scans = data.get("scans") or data.get("Scans") or data.get("tracking_events") or []
        if not isinstance(scans, list):
            scans = []
        return {
            "waybill": awb,
            "status": internal.value,
            "raw_status": raw_status,
            "delivery_status": data.get("delivery_status") if isinstance(data, dict) else None,
            "rto_status": data.get("rto_status") if isinstance(data, dict) else None,
            "scan": scans,
            "error": None,
            "raw_response": data,
        }

    async def get_shipping_cost(self, awb: str) -> Optional[dict]:
        """
        Fetch shipping cost for waybill from Selloship (if API supports it).
        Returns { "forward_cost": Decimal, "reverse_cost": Decimal } or None.
        """
        if not self.api_key:
            return None
        # If Selloship exposes cost on tracking response, we can use get_tracking and extract cost.
        result = await self.get_tracking(awb)
        if result.get("error"):
            return None
        raw = result.get("raw_response") or {}
        if not isinstance(raw, dict):
            return None
        forward = raw.get("forward_cost") or raw.get("shipping_cost") or raw.get("cost")
        reverse = raw.get("reverse_cost") or raw.get("rto_cost") or 0
        try:
            fwd = Decimal(str(forward)) if forward is not None else Decimal("0")
            rev = Decimal(str(reverse)) if reverse is not None else Decimal("0")
            return {"forward_cost": fwd, "reverse_cost": rev}
        except Exception:
            return None

    async def get_costs(self, awb: str) -> Optional[dict]:
        """Alias for get_shipping_cost."""
        return await self.get_shipping_cost(awb)


async def sync_selloship_shipments(db: Any, api_key: Optional[str] = None) -> dict:
    """
    Sync all active Selloship shipments (status not DELIVERED/RTO_DONE/LOST).
    Uses api_key if provided, else global SELLOSHIP_API_KEY.
    Updates Shipment.status, Shipment.last_synced_at, ShipmentTracking; triggers profit recompute.
    Returns { synced: int, updated: int, errors: list }.
    """
    from app.models import Shipment, ShipmentStatus, ShipmentTracking
    from app.services.profit_calculator import compute_profit_for_order

    final_statuses = (ShipmentStatus.DELIVERED, ShipmentStatus.RTO_DONE, ShipmentStatus.LOST)
    active = (
        db.query(Shipment)
        .filter(Shipment.status.notin_(final_statuses))
        .filter(Shipment.courier_name.ilike("%selloship%"))
        .all()
    )
    synced = 0
    errors: list[str] = []
    client = get_selloship_client(api_key)
    for s in active:
        awb = (s.awb_number or "").strip()
        if not awb:
            continue
        try:
            result = await client.get_tracking(awb)
            raw_status = result.get("raw_status") or result.get("status")
            internal_status = result.get("status")
            if isinstance(internal_status, ShipmentStatus):
                internal_status = internal_status.value
            delivery_status = result.get("delivery_status")
            rto_status = result.get("rto_status")
            payload = result.get("raw_response")
            if result.get("error") and not internal_status:
                errors.append(f"{awb}: {result.get('error')}")
                continue
            try:
                s.status = ShipmentStatus(internal_status) if internal_status in [e.value for e in ShipmentStatus] else s.status
            except (ValueError, TypeError):
                pass
            s.last_synced_at = datetime.now(timezone.utc)
            cost = await client.get_shipping_cost(awb)
            if cost:
                s.forward_cost = cost.get("forward_cost") or s.forward_cost
                s.reverse_cost = cost.get("reverse_cost") or s.reverse_cost
            tracking = db.query(ShipmentTracking).filter(ShipmentTracking.shipment_id == s.id).first()
            if tracking:
                tracking.status = raw_status or internal_status
                tracking.delivery_status = delivery_status
                tracking.rto_status = rto_status
                tracking.raw_response = payload
            else:
                tracking = ShipmentTracking(
                    shipment_id=s.id,
                    waybill=awb,
                    status=raw_status or internal_status,
                    delivery_status=delivery_status,
                    rto_status=rto_status,
                    raw_response=payload,
                )
                db.add(tracking)
            db.flush()
            compute_profit_for_order(db, s.order_id)
            synced += 1
        except Exception as e:
            logger.warning("Selloship sync shipment %s failed: %s", awb, e)
            errors.append(f"{awb}: {e}")
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        errors.append(f"commit: {e}")
    return {"synced": synced, "updated": synced, "errors": errors[:50]}
