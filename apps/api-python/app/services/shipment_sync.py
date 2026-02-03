"""
Unified shipment sync: single loop over all active shipments.
Dispatches to DelhiveryService or SelloshipService by courier_name.
Uses ProviderCredential (or env) per user per courier. Status/cost updates trigger profit recompute.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from app.config import settings
from app.models import Shipment, ShipmentStatus, ShipmentTracking, Order, ChannelAccount

logger = logging.getLogger(__name__)


def _get_courier_api_key(db: Any, user_id: str, courier_name: str) -> Optional[str]:
    """
    Return API key for (user_id, courier). Courier normalized: delhivery | selloship.
    Uses ProviderCredential first, then env fallback.
    """
    from app.models import ProviderCredential
    from app.services.credentials import decrypt_token

    normalized = "delhivery" if courier_name and "delhivery" in courier_name.lower() else "selloship" if courier_name and "selloship" in courier_name.lower() else None
    if not normalized:
        return None
    cred = db.query(ProviderCredential).filter(
        ProviderCredential.user_id == user_id,
        ProviderCredential.provider_id == normalized,
    ).first()
    if cred and cred.value_encrypted:
        try:
            dec = decrypt_token(cred.value_encrypted)
            data = json.loads(dec) if isinstance(dec, str) and dec.strip().startswith("{") else {"apiKey": dec}
            key = data.get("apiKey") or data.get("api_key")
            if key:
                return key
        except Exception:
            pass
    if normalized == "delhivery":
        return (getattr(settings, "DELHIVERY_API_KEY", None) or "").strip() or None
    if normalized == "selloship":
        return (getattr(settings, "SELLOSHIP_API_KEY", None) or "").strip() or None
    return None


def _user_id_for_shipment(db: Any, shipment: Shipment) -> Optional[str]:
    """Resolve user_id for a shipment via order -> channel_account."""
    order = db.query(Order).filter(Order.id == shipment.order_id).first()
    if not order or not order.channel_account_id:
        return None
    acc = db.query(ChannelAccount).filter(ChannelAccount.id == order.channel_account_id).first()
    return acc.user_id if acc else None


async def sync_shipments(db: Any, user_id: Optional[str] = None) -> dict:
    """
    Single loop: sync all active shipments (any courier). For each shipment:
    - Resolve user_id (from order->channel_account, or use passed user_id for manual sync).
    - Get API key for (user_id, courier_name).
    - Call Delhivery or Selloship get_tracking; update DB; recompute profit.
    Returns { synced: int, errors: list }.
    """
    from app.services.delhivery_service import get_client as get_delhivery_client
    from app.services.selloship_service import get_selloship_client
    from app.services.profit_calculator import compute_profit_for_order

    final_statuses = (ShipmentStatus.DELIVERED, ShipmentStatus.RTO_DONE, ShipmentStatus.LOST)
    query = (
        db.query(Shipment)
        .filter(Shipment.status.notin_(final_statuses))
    )
    if user_id:
        query = (
            query.join(Order, Shipment.order_id == Order.id)
            .join(ChannelAccount, Order.channel_account_id == ChannelAccount.id)
            .filter(ChannelAccount.user_id == user_id)
        )
    shipments_list = query.all()
    synced = 0
    errors: list[str] = []
    for s in shipments_list:
        awb = (s.awb_number or "").strip()
        if not awb:
            continue
        uid = user_id or _user_id_for_shipment(db, s)
        courier_raw = (s.courier_name or "").strip().lower()
        is_delhivery = "delhivery" in courier_raw
        is_selloship = "selloship" in courier_raw
        if not is_delhivery and not is_selloship:
            continue
        api_key = _get_courier_api_key(db, uid or "", s.courier_name or "")
        if not api_key:
            continue
        try:
            if is_delhivery:
                client = get_delhivery_client(api_key)
                result = await client.get_tracking(awb)
            else:
                client = get_selloship_client(api_key)
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
            if is_selloship and hasattr(client, "get_shipping_cost"):
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
            logger.warning("Sync shipment %s (%s) failed: %s", awb, s.courier_name, e)
            errors.append(f"{awb}: {e}")
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        errors.append(f"commit: {e}")
    return {"synced": synced, "updated": synced, "errors": errors[:50]}
