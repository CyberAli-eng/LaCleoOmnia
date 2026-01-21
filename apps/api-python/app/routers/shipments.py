"""
Shipment routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Shipment, User
from app.auth import get_current_user

router = APIRouter()

@router.get("")
async def list_shipments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List shipments"""
    shipments = db.query(Shipment).all()
    return {
        "shipments": [
            {
                "id": s.id,
                "orderId": s.order_id,
                "courierName": s.courier_name,
                "awbNumber": s.awb_number,
                "trackingUrl": s.tracking_url,
                "labelUrl": s.label_url,
                "status": s.status.value,
                "shippedAt": s.shipped_at.isoformat() if s.shipped_at else None,
                "createdAt": s.created_at.isoformat() if s.created_at else None
            }
            for s in shipments
        ]
    }

@router.get("/{shipment_id}")
async def get_shipment(
    shipment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get shipment details"""
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    return {"shipment": shipment}
