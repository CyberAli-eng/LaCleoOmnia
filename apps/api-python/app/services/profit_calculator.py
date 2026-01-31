"""
Profit engine: compute net_profit per order from revenue, SKU costs, and allocations.
Recomputed on order create/update/refund. Feeds order_profit table.
"""
import logging
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models import Order, OrderItem, SkuCost, OrderProfit

logger = logging.getLogger(__name__)


def compute_profit_for_order(db: Session, order_id: str) -> OrderProfit | None:
    """
    Compute profit for an order and upsert order_profit.
    Formula: net_profit = revenue - product_cost - packaging_cost - shipping_cost - marketing_cost - payment_fee
    Uses sku_costs for product_cost; packaging/shipping/marketing/payment_fee default to 0 until set.
    Returns OrderProfit row or None if order not found.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return None

    revenue = Decimal(str(order.order_total or 0))
    product_cost = Decimal("0")
    packaging_cost = Decimal("0")
    shipping_cost = Decimal("0")
    marketing_cost = Decimal("0")
    payment_fee = Decimal("0")
    status = "computed"
    missing_skus: list[str] = []

    for item in order.items or []:
        sku = (item.sku or "").strip()
        qty = int(item.qty or 0)
        if not sku or qty <= 0:
            continue
        cost_row = db.query(SkuCost).filter(SkuCost.sku == sku).first()
        if cost_row:
            # Per-unit cost * qty (product_cost from sku_costs; packaging/box/inbound can be allocated later)
            unit_cost = (
                Decimal(str(cost_row.product_cost or 0))
                + Decimal(str(cost_row.packaging_cost or 0))
            )
            product_cost += unit_cost * qty
        else:
            missing_skus.append(sku)

    if missing_skus:
        status = "partial" if product_cost > 0 else "missing_costs"
        logger.debug("Order %s profit: missing sku_costs for %s", order_id, missing_skus[:5])

    net_profit = revenue - product_cost - packaging_cost - shipping_cost - marketing_cost - payment_fee

    existing = db.query(OrderProfit).filter(OrderProfit.order_id == order_id).first()
    if existing:
        existing.revenue = revenue
        existing.product_cost = product_cost
        existing.packaging_cost = packaging_cost
        existing.shipping_cost = shipping_cost
        existing.marketing_cost = marketing_cost
        existing.payment_fee = payment_fee
        existing.net_profit = net_profit
        existing.status = status
        db.flush()
        return existing
    else:
        row = OrderProfit(
            order_id=order_id,
            revenue=revenue,
            product_cost=product_cost,
            packaging_cost=packaging_cost,
            shipping_cost=shipping_cost,
            marketing_cost=marketing_cost,
            payment_fee=payment_fee,
            net_profit=net_profit,
            status=status,
        )
        db.add(row)
        db.flush()
        return row
