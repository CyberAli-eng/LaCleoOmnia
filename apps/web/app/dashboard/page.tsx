"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch("/orders").catch(() => []),
      authFetch("/analytics/summary").catch(() => ({ totalOrders: 0, recentOrders: [] })),
      authFetch("/config/status").catch(() => ({ integrations: [], subscriptions: [] })),
      authFetch("/inventory").catch(() => []),
    ]).then(([orders, analytics, integrations, inventory]) => {
      const totalRevenue = Array.isArray(orders)
        ? orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
        : 0;
      const pendingOrders = Array.isArray(orders)
        ? orders.filter((o: any) => o.status === "pending" || o.status === "processing").length
        : 0;
      const activeIntegrations = integrations?.integrations?.length || 0;
      const totalProducts = Array.isArray(inventory) ? inventory.length : 0;

      setStats({
        totalOrders: analytics?.totalOrders || 0,
        totalRevenue,
        pendingOrders,
        activeIntegrations,
        totalProducts,
        recentOrders: analytics?.recentOrders || [],
      });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Overview of your e-commerce operations</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/orders" className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-300 transition-colors">
          <p className="text-sm text-slate-500">Total Orders</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.totalOrders || 0}</p>
          <p className="mt-1 text-xs text-slate-400">{stats?.pendingOrders || 0} pending</p>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            ${(stats?.totalRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-slate-400">All time</p>
        </div>

        <Link href="/dashboard/integrations" className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-300 transition-colors">
          <p className="text-sm text-slate-500">Active Integrations</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.activeIntegrations || 0}</p>
          <p className="mt-1 text-xs text-slate-400">Connected stores</p>
        </Link>

        <Link href="/dashboard/inventory" className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-300 transition-colors">
          <p className="text-sm text-slate-500">Products</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.totalProducts || 0}</p>
          <p className="mt-1 text-xs text-slate-400">Tracked SKUs</p>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-sm text-blue-600 hover:text-blue-500">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {(stats?.recentOrders || []).slice(0, 5).map((order: any) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">#{order.externalId || order.id}</p>
                  <p className="text-xs text-slate-500">{order.source} · {order.status}</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {order.currency || "$"} {order.total?.toFixed(2) || "0.00"}
                </p>
              </div>
            ))}
            {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
              <p className="text-sm text-slate-500 py-4">No orders yet</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            <Link
              href="/dashboard/integrations"
              className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              + Add Integration
            </Link>
            <Link
              href="/dashboard/orders"
              className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              View Orders
            </Link>
            <Link
              href="/dashboard/webhooks"
              className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Check Webhooks
            </Link>
            <Link
              href="/dashboard/analytics"
              className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              View Analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
