"""
Analytics routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import Order, User, ChannelAccount
from app.auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/summary")
async def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get analytics summary"""
    try:
        # Get channel accounts for the current user
        channel_accounts = db.query(ChannelAccount).filter(
            ChannelAccount.user_id == current_user.id
        ).all()
        
        channel_account_ids = [ca.id for ca in channel_accounts]
        
        # Get orders for the current user (through channel accounts)
        if channel_account_ids:
            orders = db.query(Order).filter(
                Order.channel_account_id.in_(channel_account_ids)
            ).all()
        else:
            orders = []
        
        # Calculate summary
        total_orders = len(orders)
        recent_orders = [
            {
                "id": order.id,
                "externalId": order.channel_order_id,
                "source": order.channel.name if order.channel else "Unknown",
                "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
                "total": float(order.order_total) if order.order_total else 0.0,
                "createdAt": order.created_at.isoformat() if order.created_at else None,
            }
            for order in sorted(orders, key=lambda x: x.created_at or datetime.min, reverse=True)[:10]
        ]
        
        return {
            "totalOrders": total_orders,
            "recentOrders": recent_orders,
        }
    except Exception as e:
        # Log the error for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in analytics summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching analytics: {str(e)}"
        )
