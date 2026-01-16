"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

interface Order {
  id: number;
  externalId?: string | null;
  source: string;
  status: string;
  total?: number | null;
  currency?: string | null;
  items?: any[];
  createdAt: string;
  updatedAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await authFetch("/orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchTerm ||
      order.externalId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    completed: orders.filter((o) => o.status === "completed" || o.status === "fulfilled").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Order Management</h2>
        <p className="mt-2 text-sm text-slate-600">Manage and track orders from all your marketplaces.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Orders</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{orders.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{statusCounts.pending}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Completed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{statusCounts.completed}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Revenue</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by order ID, external ID, or source..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            {["all", "pending", "processing", "completed", "cancelled"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status as keyof typeof statusCounts]})
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Order ID</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Source</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Items</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600">Total</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Date</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-slate-900">#{order.externalId || order.id}</p>
                      {order.externalId && <p className="text-xs text-slate-400">ID: {order.id}</p>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">{order.source}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === "completed" || order.status === "fulfilled"
                          ? "bg-emerald-50 text-emerald-700"
                          : order.status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : order.status === "processing"
                          ? "bg-blue-50 text-blue-700"
                          : order.status === "cancelled"
                          ? "bg-red-50 text-red-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    {order.currency || "$"} {order.total?.toFixed(2) || "0.00"}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-blue-600 hover:text-blue-500 text-xs font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              {searchTerm || statusFilter !== "all" ? "No orders match your filters." : "No orders found."}
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Order Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Order ID</p>
                  <p className="mt-1 font-medium text-slate-900">#{selectedOrder.externalId || selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Source</p>
                  <p className="mt-1 font-medium text-slate-900">{selectedOrder.source}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="mt-1 font-medium text-slate-900">{selectedOrder.status}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {selectedOrder.currency || "$"} {selectedOrder.total?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Created</p>
                  <p className="mt-1 text-slate-600">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Updated</p>
                  <p className="mt-1 text-slate-600">{new Date(selectedOrder.updatedAt).toLocaleString()}</p>
                </div>
              </div>
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Items</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-2 border-b border-slate-100">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.name || item.sku}</p>
                          <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-900">Qty: {item.quantity}</p>
                          {item.price && (
                            <p className="text-xs text-slate-500">${item.price.toFixed(2)}</p>
                          )}
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
