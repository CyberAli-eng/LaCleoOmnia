"""
Delhivery integration stub. For shipment tracking, RTO, lost, reverse pickup.
When ready: GET /api/v1/packages/json/?waybill=XXXX (track), then store status and map RTO/Lost.
Persists to shipment_tracking when db is provided.
"""
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


def get_client(api_key: str) -> "DelhiveryClient":
    """Return a client instance. Api key from env/config."""
    return DelhiveryClient(api_key=api_key)


class DelhiveryClient:
    """
    Stub for Delhivery API. Implement when moving to Phase 2:
    - track_shipment: GET waybill status from Delhivery
    - store_status: persist status to DB (e.g. shipment_events table)
    - map_rto_or_lost: map RTO/Lost/Delivered to internal order/shipment state
    """

    def __init__(self, api_key: str, base_url: str = "https://track.delhivery.com"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    async def track_shipment(self, waybill: str) -> dict:
        """
        Track shipment by waybill. Production: GET /api/v1/packages/json/?waybill=XXXX
        Returns: { waybill, status, scan[], delivery_status, rto_status, ... }
        """
        logger.info("Delhivery track_shipment stub called for waybill=%s", waybill)
        return {
            "waybill": waybill,
            "status": "not_integrated",
            "delivery_status": None,
            "rto_status": None,
            "scan": [],
            "message": "Delhivery not integrated yet",
        }

    async def fetch_status(self, waybill: str) -> dict:
        """Alias for track_shipment; fetch current status from Delhivery."""
        return await self.track_shipment(waybill)

    def store_status(
        self,
        waybill: str,
        status: str,
        payload: Optional[dict] = None,
        db: Optional[Any] = None,
        delivery_status: Optional[str] = None,
        rto_status: Optional[str] = None,
    ) -> None:
        """
        Store shipment status (e.g. from webhook or poll). Persist to shipment_tracking when db is provided.
        status: e.g. "Dispatched", "Delivered", "RTO", "Lost"
        """
        logger.info("Delhivery store_status: waybill=%s status=%s", waybill, status)
        if db is not None:
            try:
                from app.models import Shipment, ShipmentTracking
                shipment = db.query(Shipment).filter(Shipment.awb_number == waybill).first()
                if shipment:
                    tracking = db.query(ShipmentTracking).filter(ShipmentTracking.shipment_id == shipment.id).first()
                    if tracking:
                        tracking.status = status
                        tracking.delivery_status = delivery_status
                        tracking.rto_status = rto_status
                        tracking.raw_response = payload
                        db.flush()
                    else:
                        tracking = ShipmentTracking(
                            shipment_id=shipment.id,
                            waybill=waybill,
                            status=status,
                            delivery_status=delivery_status,
                            rto_status=rto_status,
                            raw_response=payload,
                        )
                        db.add(tracking)
                        db.flush()
                    db.commit()
            except Exception as e:
                logger.warning("Failed to persist tracking: %s", e)
                if db:
                    db.rollback()

    def map_rto_or_lost(self, waybill: str, event: str) -> Optional[dict]:
        """
        Map RTO/Lost events to internal status. Returns action dict or None.
        event: "RTO" | "Lost" | "Delivered" | etc.
        """
        logger.info("Delhivery map_rto_or_lost stub: waybill=%s event=%s", waybill, event)
        return None
