"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";
import Link from "next/link";

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
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  sku: string;
  title: string;
  qty: number;
  price: number;
  fulfillmentStatus: string;
}

interface ShopifyOrder {
  id: string;
  order_id: string;
  customer: string;
  customer_name?: string;
  total: number;
  status: string;
  created_at: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const [ordersRes, shopifyRes] = await Promise.all([
        authFetch("/orders").catch(() => ({ orders: [] })),
        authFetch("/integrations/shopify/orders").catch(() => ({ orders: [] })),
      ]);
      setOrders(Array.isArray(ordersRes?.orders) ? ordersRes.orders : []);
      setShopifyOrders(Array.isArray(shopifyRes?.orders) ? shopifyRes.orders : []);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedOrders.size === 0) return;

    setProcessing(new Set(Array.from(selectedOrders)));
    const orderIds = Array.from(selectedOrders);

    try {
      for (const orderId of orderIds) {
        const endpoint = `/orders/${orderId}/${bulkAction.toLowerCase()}`;
        await authFetch(endpoint, { method: "POST" });
      }
      await loadOrders();
      setSelectedOrders(new Set());
      setBulkAction("");
    } catch (err) {
      console.error("Bulk action failed:", err);
      alert("Some actions failed. Please try again.");
    } finally {
      setProcessing(new Set());
    }
  };

  const handleOrderAction = async (orderId: string, action: string) => {
    setProcessing(new Set([orderId]));
    try {
      await authFetch(`/orders/${orderId}/${action}`, { method: "POST" });
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "Action failed");
    } finally {
      setProcessing(new Set());
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchTerm ||
      order.channelOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: orders.length,
    NEW: orders.filter((o) => o.status === "NEW").length,
    CONFIRMED: orders.filter((o) => o.status === "CONFIRMED").length,
    PACKED: orders.filter((o) => o.status === "PACKED").length,
    SHIPPED: orders.filter((o) => o.status === "SHIPPED").length,
    DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
    CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
    HOLD: orders.filter((o) => o.status === "HOLD").length,
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
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">Prepaid</span>
    ) : (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">COD</span>
    );
  };

  const canConfirm = (order: Order) => order.status === "NEW" || order.status === "HOLD";
  const canPack = (order: Order) => order.status === "CONFIRMED";
  const canShip = (order: Order) => order.status === "PACKED";
  const canCancel = (order: Order) => !["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.status);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-600">Manage and process orders from all channels</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/integrations"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Import Orders
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-lg border p-4 text-left transition-colors ${
              statusFilter === status
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <p className="text-xs text-slate-500 uppercase">{status}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{count}</p>
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrders.size > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-900">
              {selectedOrders.size} order{selectedOrders.size !== 1 ? "s" : ""} selected
            </span>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select action...</option>
              <option value="confirm">Bulk Confirm</option>
              <option value="pack">Bulk Pack</option>
              <option value="ship">Bulk Ship</option>
              <option value="cancel">Bulk Cancel</option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Apply
            </button>
          </div>
          <button
            onClick={() => setSelectedOrders(new Set())}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by order ID, customer name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                    onChange={toggleAllSelection}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Order ID</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Payment</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Total</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-slate-900">#{order.channelOrderId}</p>
                      <p className="text-xs text-slate-400">ID: {order.id.slice(0, 8)}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-slate-900">{order.customerName}</p>
                      {order.customerEmail && (
                        <p className="text-xs text-slate-500">{order.customerEmail}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">{getPaymentBadge(order.paymentMode)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    ${order.orderTotal.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        View
                      </button>
                      {canConfirm(order) && (
                        <button
                          onClick={() => handleOrderAction(order.id, "confirm")}
                          disabled={processing.has(order.id)}
                          className="text-purple-600 hover:text-purple-700 text-xs font-medium disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      )}
                      {canPack(order) && (
                        <button
                          onClick={() => handleOrderAction(order.id, "pack")}
                          disabled={processing.has(order.id)}
                          className="text-yellow-600 hover:text-yellow-700 text-xs font-medium disabled:opacity-50"
                        >
                          Pack
                        </button>
                      )}
                      {canShip(order) && (
                        <button
                          onClick={() => handleOrderAction(order.id, "ship")}
                          disabled={processing.has(order.id)}
                          className="text-green-600 hover:text-green-700 text-xs font-medium disabled:opacity-50"
                        >
                          Ship
                        </button>
                      )}
                      {canCancel(order) && (
                        <button
                          onClick={() => handleOrderAction(order.id, "cancel")}
                          disabled={processing.has(order.id)}
                          className="text-red-600 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-slate-500 mb-4">No orders found</p>
              {orders.length === 0 && (
                <Link
                  href="/dashboard/integrations"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Connect Shopify to Import Orders
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shopify orders (live from API when connected) */}
      {shopifyOrders.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="text-base font-semibold text-slate-900">From Shopify</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live orders from your connected store</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Customer</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Created At</th>
                </tr>
              </thead>
              <tbody>
                {shopifyOrders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-900">{o.order_id}</td>
                    <td className="py-3 px-4 text-slate-700">{o.customer_name || o.customer || "—"}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">${Number(o.total).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {o.created_at ? new Date(o.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Order #{selectedOrder.channelOrderId}</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Customer</p>
                  <p className="mt-1 font-medium text-slate-900">{selectedOrder.customerName}</p>
                  {selectedOrder.customerEmail && (
                    <p className="text-sm text-slate-600">{selectedOrder.customerEmail}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Payment Mode</p>
                  <p className="mt-1">{getPaymentBadge(selectedOrder.paymentMode)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="mt-1 font-semibold text-slate-900">${selectedOrder.orderTotal.toFixed(2)}</p>
                </div>
              </div>
              {(selectedOrder.shippingAddress || selectedOrder.billingAddress) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                  {selectedOrder.shippingAddress && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Shipping address</p>
                      <p className="mt-1 text-sm text-slate-900 whitespace-pre-line">{selectedOrder.shippingAddress}</p>
                    </div>
                  )}
                  {selectedOrder.billingAddress && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Billing address</p>
                      <p className="mt-1 text-sm text-slate-900 whitespace-pre-line">{selectedOrder.billingAddress}</p>
                    </div>
                  )}
                </div>
              )}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-3">Items</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between py-2 border-b border-slate-100">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-900">Qty: {item.qty}</p>
                          <p className="text-xs text-slate-500">${item.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
