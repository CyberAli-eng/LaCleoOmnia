"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authFetch } from "@/utils/api";
import Link from "next/link";

interface OrderTimelineEvent {
  status: string;
  timestamp: string;
  user?: string;
  note?: string;
}

interface OrderProfitBreakdown {
  revenue: number;
  productCost: number;
  packagingCost: number;
  shippingCost: number;
  shippingForward?: number;
  shippingReverse?: number;
  marketingCost: number;
  paymentFee: number;
  netProfit: number;
  rtoLoss?: number;
  lostLoss?: number;
  courierStatus?: string | null;
  finalStatus?: string | null;
  status: string;
}

interface Order {
  id: string;
  channelOrderId: string;
  customerName: string;
  customerEmail?: string;
  shippingAddress?: string | null;
  billingAddress?: string | null;
  paymentMode: string;
  orderTotal: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  shipment?: {
    courierName: string;
    awbNumber: string;
    trackingUrl?: string;
    status: string;
    forwardCost?: number;
    reverseCost?: number;
    shippedAt?: string;
    lastSyncedAt?: string;
  };
  profit?: OrderProfitBreakdown | null;
}

interface OrderItem {
  id: string;
  sku: string;
  title: string;
  qty: number;
  price: number;
  fulfillmentStatus: string;
  variantId?: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<OrderTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const data = await authFetch(`/orders/${orderId}`) as { order: Order };
      setOrder(data.order);
      
      // Build timeline from order data
      const events: OrderTimelineEvent[] = [];
      if (data.order.createdAt) {
        events.push({
          status: "NEW",
          timestamp: data.order.createdAt,
          note: "Order created",
        });
      }
      if (data.order.status !== "NEW" && data.order.updatedAt) {
        events.push({
          status: data.order.status,
          timestamp: data.order.updatedAt,
          note: `Order ${data.order.status.toLowerCase()}`,
        });
      }
      if (data.order.shipment?.shippedAt) {
        events.push({
          status: "SHIPPED",
          timestamp: data.order.shipment.shippedAt,
          note: `Shipped via ${data.order.shipment.courierName}`,
        });
      }
      setTimeline(events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (err) {
      console.error("Failed to load order:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    setProcessing(true);
    try {
      await authFetch(`/orders/${orderId}/${action}`, { method: "POST" });
      await loadOrder();
    } catch (err: any) {
      alert(err.message || "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NEW: "bg-blue-50 text-blue-700",
      CONFIRMED: "bg-purple-50 text-purple-700",
      PACKED: "bg-yellow-50 text-yellow-700",
      SHIPPED: "bg-green-50 text-green-700",
      DELIVERED: "bg-emerald-50 text-emerald-700",
      CANCELLED: "bg-red-50 text-red-700",
      HOLD: "bg-orange-50 text-orange-700",
    };
    return colors[status] || "bg-slate-100 text-slate-700";
  };

  const getPaymentBadge = (mode: string) => {
    return mode === "PREPAID" ? (
      <span className="px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">Prepaid</span>
    ) : (
      <span className="px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700">COD</span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading order...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Order not found</p>
          <Link href="/dashboard/orders" className="text-blue-600 hover:text-blue-700">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const canConfirm = order.status === "NEW" || order.status === "HOLD";
  const canPack = order.status === "CONFIRMED";
  const canShip = order.status === "PACKED";
  const canCancel = !["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/orders" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Order #{order.channelOrderId}</h1>
          <p className="mt-1 text-sm text-slate-600">Order ID: {order.id}</p>
        </div>
        <div className="flex gap-2">
          {canConfirm && (
            <button
              onClick={() => handleAction("confirm")}
              disabled={processing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
            >
              Confirm
            </button>
          )}
          {canPack && (
            <button
              onClick={() => handleAction("pack")}
              disabled={processing}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm font-medium"
            >
              Pack
            </button>
          )}
          {canShip && (
            <button
              onClick={() => handleAction("ship")}
              disabled={processing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              Ship
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => handleAction("cancel")}
              disabled={processing}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Order Info */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Customer</p>
                <p className="mt-1 font-medium text-slate-900">{order.customerName}</p>
                {order.customerEmail && (
                  <p className="text-sm text-slate-600">{order.customerEmail}</p>
                )}
              </div>
              {(order.shippingAddress || order.billingAddress) && (
                <>
                  {order.shippingAddress && (
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Shipping address</p>
                      <p className="mt-1 text-sm text-slate-900 whitespace-pre-line">{order.shippingAddress}</p>
                    </div>
                  )}
                  {order.billingAddress && (
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Billing address</p>
                      <p className="mt-1 text-sm text-slate-900 whitespace-pre-line">{order.billingAddress}</p>
                    </div>
                  )}
                </>
              )}
              <div>
                <p className="text-xs text-slate-500">Payment Mode</p>
                <p className="mt-1">{getPaymentBadge(order.paymentMode)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p className="mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="mt-1 font-semibold text-slate-900">${order.orderTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Profit breakdown */}
          {order.profit && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Profit Breakdown</h2>
              <div className="space-y-2">
                {order.profit.finalStatus && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Final status</span>
                    <span className="font-medium text-slate-900">{order.profit.finalStatus}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Revenue</span>
                  <span className="font-medium text-slate-900">${order.profit.revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Product cost</span>
                  <span className="text-slate-700">-${order.profit.productCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Shipping (forward)</span>
                  <span className="text-slate-700">-${(order.profit.shippingForward ?? order.profit.shippingCost ?? 0).toFixed(2)}</span>
                </div>
                {(order.profit.shippingReverse ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Shipping (reverse)</span>
                    <span className="text-slate-700">-${order.profit.shippingReverse!.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Ads / Marketing</span>
                  <span className="text-slate-700">-${order.profit.marketingCost.toFixed(2)}</span>
                </div>
                {(order.profit.rtoLoss ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-amber-700">
                    <span>RTO loss</span>
                    <span>-${order.profit.rtoLoss!.toFixed(2)}</span>
                  </div>
                )}
                {(order.profit.lostLoss ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-red-700">
                    <span>Lost loss</span>
                    <span>-${order.profit.lostLoss!.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                  <span className="font-medium text-slate-900">Net profit</span>
                  <span className={`font-semibold ${order.profit.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ${order.profit.netProfit.toFixed(2)}
                  </span>
                </div>
                {order.profit.courierStatus && (
                  <p className="text-xs text-slate-500 mt-1">Courier: {order.profit.courierStatus}</p>
                )}
                {order.profit.status && order.profit.status !== "computed" && (
                  <p className="text-xs text-amber-600 mt-1">Calc: {order.profit.status}</p>
                )}
              </div>
            </div>
          )}

          {/* Items */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Items</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between py-3 border-b border-slate-100 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Status:{" "}
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          item.fulfillmentStatus === "MAPPED"
                            ? "bg-green-50 text-green-700"
                            : item.fulfillmentStatus === "UNMAPPED_SKU"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {item.fulfillmentStatus}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900">Qty: {item.qty}</p>
                    <p className="text-sm text-slate-600">${item.price.toFixed(2)}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      ${(item.qty * item.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipment Info */}
          {order.shipment && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Shipment Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Courier</p>
                  <p className="mt-1 font-medium text-slate-900">{order.shipment.courierName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">AWB Number</p>
                  <p className="mt-1 font-mono text-slate-900">{order.shipment.awbNumber}</p>
                </div>
                {order.shipment.trackingUrl && (
                  <div className="col-span-2">
                    <a
                      href={order.shipment.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Track Shipment →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Timeline</h2>
            <div className="space-y-4">
              {timeline.map((event, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        idx === 0 ? "bg-blue-500" : "bg-slate-300"
                      }`}
                    />
                    {idx < timeline.length - 1 && (
                      <div className="w-0.5 h-8 bg-slate-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-medium text-slate-900">{event.status}</p>
                    {event.note && <p className="text-xs text-slate-500 mt-0.5">{event.note}</p>}
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                    {event.user && (
                      <p className="text-xs text-slate-400">by {event.user}</p>
                    )}
                  </div>
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="text-sm text-slate-500">No timeline events yet</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/dashboard/labels?orderId=${order.id}`}
                className="block w-full text-center rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                Generate Label
              </Link>
              <button
                onClick={() => {
                  // TODO: Generate invoice
                  alert("Invoice generation coming soon");
                }}
                className="block w-full text-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Download Invoice
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
