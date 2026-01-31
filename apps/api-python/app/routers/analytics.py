"""
Analytics routes
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Order, User, ChannelAccount, OrderProfit
from app.auth import get_current_user
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
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
        
        # Calculate summary from DB only (single source of truth)
        total_orders = len(orders)
        total_revenue = sum(float(o.order_total or 0) for o in orders)
        recent_orders = [
            {
                "id": order.id,
                "externalId": order.channel_order_id,
                "source": order.channel.name.value if order.channel else "Unknown",
                "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
                "total": float(order.order_total) if order.order_total else 0.0,
                "createdAt": order.created_at.isoformat() if order.created_at else None,
            }
            for order in sorted(orders, key=lambda x: x.created_at or datetime.min, reverse=True)[:10]
        ]
        
        return {
            "totalOrders": total_orders,
            "totalRevenue": total_revenue,
            "recentOrders": recent_orders,
        }
    except Exception as e:
        logger.error(f"Error in analytics summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching analytics: {str(e)}"
        )


@router.get("/profit-summary")
async def get_profit_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return profit analytics: revenue, net_profit, margin %, loss buckets (orders with net_profit < 0).
    RTO/Loss counts and amounts are placeholders until Delhivery tracking is wired.
    """
    try:
        channel_accounts = db.query(ChannelAccount).filter(
            ChannelAccount.user_id == current_user.id
        ).all()
        channel_account_ids = [ca.id for ca in channel_accounts]
        if not channel_account_ids:
            return {
                "revenue": 0,
                "netProfit": 0,
                "marginPercent": 0,
                "orderCount": 0,
                "lossCount": 0,
                "lossAmount": 0,
                "rtoCount": 0,
                "rtoAmount": 0,
            }
        # Aggregate from order_profit for user's orders
        q = (
            db.query(
                func.coalesce(func.sum(OrderProfit.revenue), 0).label("revenue"),
                func.coalesce(func.sum(OrderProfit.net_profit), 0).label("net_profit"),
                func.count(OrderProfit.id).label("order_count"),
            )
            .join(Order, Order.id == OrderProfit.order_id)
            .filter(Order.channel_account_id.in_(channel_account_ids))
        )
        row = q.first()
        revenue = float(row.revenue or 0)
        net_profit = float(row.net_profit or 0)
        order_count = int(row.order_count or 0)
        margin_percent = (net_profit / revenue * 100) if revenue else 0
        # Loss bucket: orders where net_profit < 0
        loss_q = (
            db.query(
                func.count(OrderProfit.id).label("cnt"),
                func.coalesce(func.sum(OrderProfit.net_profit), 0).label("amt"),
            )
            .join(Order, Order.id == OrderProfit.order_id)
            .filter(Order.channel_account_id.in_(channel_account_ids))
            .filter(OrderProfit.net_profit < 0)
        )
        loss_row = loss_q.first()
        loss_count = int(loss_row.cnt or 0)
        loss_amount = abs(float(loss_row.amt or 0))
        # RTO placeholder until Delhivery tracking table is populated
        rto_count = 0
        rto_amount = 0.0
        return {
            "revenue": round(revenue, 2),
            "netProfit": round(net_profit, 2),
            "marginPercent": round(margin_percent, 2),
            "orderCount": order_count,
            "lossCount": loss_count,
            "lossAmount": round(loss_amount, 2),
            "rtoCount": rto_count,
            "rtoAmount": rto_amount,
        }
    except Exception as e:
        logger.error("Error in profit-summary: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching profit summary: {str(e)}")
