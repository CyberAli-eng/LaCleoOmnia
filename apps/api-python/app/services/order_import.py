"""
Order import service
"""
from sqlalchemy.orm import Session
from app.models import (
    ChannelAccount, Order, OrderItem, OrderStatus, PaymentMode,
    FulfillmentStatus, ProductVariant, Inventory, InventoryMovement,
    InventoryMovementType, Warehouse, SyncJob, SyncJobType, SyncJobStatus,
    SyncLog, LogLevel
)
from app.services.shopify import ShopifyService
from app.services.warehouse_helper import get_default_warehouse
from datetime import datetime
from decimal import Decimal

async def import_shopify_orders(db: Session, account: ChannelAccount) -> dict:
    """Import orders from Shopify"""
    service = ShopifyService(account)
    
    # Create sync job
    sync_job = SyncJob(
        channel_account_id=account.id,
        job_type=SyncJobType.PULL_ORDERS,
        status=SyncJobStatus.RUNNING,
        started_at=datetime.utcnow()
    )
    db.add(sync_job)
    db.commit()
    db.refresh(sync_job)
    
    try:
        # Get default warehouse
        warehouse = get_default_warehouse(db)
        if not warehouse:
            raise Exception("No warehouse configured. Create a warehouse or set DEFAULT_WAREHOUSE_NAME / DEFAULT_WAREHOUSE_ID.")
        
        # Fetch orders from Shopify
        shopify_orders = await service.get_orders()
        
        imported = 0
        skipped = 0
        errors = 0
        
        for shopify_order in shopify_orders:
            try:
                # Check if order already exists (idempotent)
                existing = db.query(Order).filter(
                    Order.channel_id == account.channel_id,
                    Order.channel_order_id == str(shopify_order["id"])
                ).first()
                
                if existing:
                    skipped += 1
                    continue
                
                # Determine payment mode
                payment_mode = PaymentMode.PREPAID if shopify_order.get("financial_status") == "paid" else PaymentMode.COD
                
                # Extract customer info
                shipping_address = shopify_order.get("shipping_address", {})
                customer = shopify_order.get("customer", {})
                customer_name = (
                    shipping_address.get("name") or
                    f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip() or
                    "Unknown"
                )
                customer_email = shopify_order.get("email")
                
                # Process order items
                order_items_data = []
                all_mapped = True
                all_stock_available = True
                
                for line_item in shopify_order.get("line_items", []):
                    sku = line_item.get("sku", "")
                    variant = db.query(ProductVariant).filter(ProductVariant.sku == sku).first()
                    
                    fulfillment_status = FulfillmentStatus.PENDING
                    variant_id = None
                    
                    if variant:
                        fulfillment_status = FulfillmentStatus.MAPPED
                        variant_id = variant.id
                        
                        # Check inventory availability
                        inventory = db.query(Inventory).filter(
                            Inventory.warehouse_id == warehouse.id,
                            Inventory.variant_id == variant.id
                        ).first()
                        
                        available_qty = (inventory.total_qty if inventory else 0) - (inventory.reserved_qty if inventory else 0)
                        
                        if available_qty < line_item.get("quantity", 0):
                            all_stock_available = False
                    else:
                        fulfillment_status = FulfillmentStatus.UNMAPPED_SKU
                        all_mapped = False
                    
                    order_items_data.append({
                        "variant_id": variant_id,
                        "sku": sku,
                        "title": line_item.get("title", ""),
                        "qty": line_item.get("quantity", 0),
                        "price": Decimal(str(line_item.get("price", 0))),
                        "fulfillment_status": fulfillment_status
                    })
                
                # Determine order status
                order_status = OrderStatus.NEW
                if not all_mapped or not all_stock_available:
                    order_status = OrderStatus.HOLD
                
                # Create order
                order = Order(
                    channel_id=account.channel_id,
                    channel_account_id=account.id,
                    channel_order_id=str(shopify_order["id"]),
                    customer_name=customer_name,
                    customer_email=customer_email,
                    payment_mode=payment_mode,
                    order_total=Decimal(str(shopify_order.get("total_price", 0))),
                    status=order_status
                )
                db.add(order)
                db.flush()
                
                # Create order items
                for item_data in order_items_data:
                    order_item = OrderItem(
                        order_id=order.id,
                        variant_id=item_data["variant_id"],
                        sku=item_data["sku"],
                        title=item_data["title"],
                        qty=item_data["qty"],
                        price=item_data["price"],
                        fulfillment_status=item_data["fulfillment_status"]
                    )
                    db.add(order_item)
                    
                    # Reserve inventory for mapped items
                    if item_data["variant_id"] and item_data["fulfillment_status"] == FulfillmentStatus.MAPPED:
                        inventory = db.query(Inventory).filter(
                            Inventory.warehouse_id == warehouse.id,
                            Inventory.variant_id == item_data["variant_id"]
                        ).first()
                        
                        if inventory:
                            inventory.reserved_qty += item_data["qty"]
                        else:
                            inventory = Inventory(
                                warehouse_id=warehouse.id,
                                variant_id=item_data["variant_id"],
                                total_qty=0,
                                reserved_qty=item_data["qty"]
                            )
                            db.add(inventory)
                        
                        # Log inventory movement
                        movement = InventoryMovement(
                            warehouse_id=warehouse.id,
                            variant_id=item_data["variant_id"],
                            type=InventoryMovementType.RESERVE,
                            qty=item_data["qty"],
                            reference=order.id
                        )
                        db.add(movement)
                
                db.commit()
                imported += 1
                
                # Log success
                log = SyncLog(
                    sync_job_id=sync_job.id,
                    level=LogLevel.INFO,
                    message=f"Imported order {order.id} from Shopify order {shopify_order['id']}",
                    raw_payload=shopify_order
                )
                db.add(log)
                db.commit()
                
            except Exception as e:
                errors += 1
                log = SyncLog(
                    sync_job_id=sync_job.id,
                    level=LogLevel.ERROR,
                    message=f"Failed to import Shopify order {shopify_order.get('id', 'unknown')}: {str(e)}",
                    raw_payload=shopify_order
                )
                db.add(log)
                db.commit()
        
        # Update sync job
        sync_job.status = SyncJobStatus.SUCCESS
        sync_job.finished_at = datetime.utcnow()
        db.commit()
        
        return {
            "success": True,
            "imported": imported,
            "skipped": skipped,
            "errors": errors,
            "jobId": sync_job.id
        }
        
    except Exception as e:
        sync_job.status = SyncJobStatus.FAILED
        sync_job.finished_at = datetime.utcnow()
        log = SyncLog(
            sync_job_id=sync_job.id,
            level=LogLevel.ERROR,
            message=f"Import failed: {str(e)}"
        )
        db.add(log)
        db.commit()
        raise
