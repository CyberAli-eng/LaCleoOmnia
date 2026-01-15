"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

interface Order {
  id: number;
  source: string;
  status: string;
  total?: number | null;
  currency?: string | null;
  createdAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    authFetch("/orders")
      .then((data) => setOrders(data))
      .catch(() => null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Order Management</h2>
        <p className="mt-2 text-sm text-slate-600">Orders created from webhook and adapter flows.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold text-slate-600">Recent Orders</div>
        <div className="mt-4 divide-y divide-slate-100">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{order.source}</p>
                <p className="text-slate-500">{order.status}</p>
              </div>
              <span className="text-slate-400">
                {order.currency ? `${order.currency} ` : ""}{order.total ?? "—"}
              </span>
            </div>
          ))}
          {orders.length === 0 && <p className="py-6 text-sm text-slate-500">No orders found.</p>}
        </div>
      </div>
    </div>
  );
}
