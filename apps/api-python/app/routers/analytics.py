"""
Analytics routes
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Order, User
from app.auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/summary")
async def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get analytics summary"""
    # Get orders for the current user
    orders = db.query(Order).filter(Order.user_id == current_user.id).all()
    
    # Calculate summary
    total_orders = len(orders)
    recent_orders = [
        {
            "id": order.id,
            "externalId": order.external_id,
            "source": order.channel.name if order.channel else "Unknown",
            "status": order.status.value,
            "total": float(order.total) if order.total else 0.0,
            "createdAt": order.created_at.isoformat() if order.created_at else None,
        }
        for order in sorted(orders, key=lambda x: x.created_at or datetime.min, reverse=True)[:10]
    ]
    
    return {
        "totalOrders": total_orders,
        "recentOrders": recent_orders,
    }
