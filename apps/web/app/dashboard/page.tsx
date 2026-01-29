"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [ordersData, analytics, integrations, inventory, syncJobs] = await Promise.all([
        authFetch("/orders").catch(() => ({ orders: [] })),
        authFetch("/analytics/summary").catch(() => ({ totalOrders: 0, recentOrders: [] })),
        authFetch("/config/status").catch(() => ({ integrations: [], subscriptions: [] })),
        authFetch("/inventory").catch(() => []),
        authFetch("/sync/jobs").catch(() => ({ jobs: [] })),
      ]);

      const orders = Array.isArray(ordersData?.orders) ? ordersData.orders : [];
      const totalRevenue = (analytics?.totalRevenue != null ? analytics.totalRevenue : orders.reduce((sum: number, o: any) => sum + (o.orderTotal || 0), 0)) as number;
      const pendingConfirm = orders.filter((o: any) => o.status === "NEW" || o.status === "HOLD").length;
      const pendingShipment = orders.filter((o: any) => o.status === "CONFIRMED" || o.status === "PACKED").length;
      const activeIntegrations = integrations?.integrations?.length || 0;
      const totalProducts = Array.isArray(inventory) ? inventory.length : 0;

      // Get last sync time
      const jobs = syncJobs?.jobs || [];
      if (jobs.length > 0) {
        const lastJob = jobs.sort((a: any, b: any) => {
          const timeA = new Date(a.finishedAt || a.startedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.finishedAt || b.startedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        })[0];
        setLastSync(lastJob?.finishedAt || lastJob?.startedAt || lastJob?.createdAt || null);
      }

      // Calculate low stock items (assuming inventory has available_qty)
      const lowStockItems = Array.isArray(inventory) 
        ? inventory.filter((item: any) => (item.availableQty || item.available_qty || 0) < 10).length
        : 0;

      setStats({
        totalOrders: analytics?.totalOrders || orders.length,
        totalRevenue,
        pendingConfirm,
        pendingShipment,
        activeIntegrations,
        totalProducts,
        recentOrders: analytics?.recentOrders || [],
        lowStockItems,
        hasOrders: orders.length > 0,
        hasIntegrations: activeIntegrations > 0,
        hasInventory: totalProducts > 0,
      });
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  const hasData = stats?.hasOrders || stats?.hasIntegrations || stats?.hasInventory;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Overview of your e-commerce operations</p>
        </div>
        {lastSync && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Last sync</p>
            <p className="text-sm font-medium text-slate-700">
              {new Date(lastSync).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Orders */}
        <Link 
          href="/dashboard/orders" 
          className="rounded-lg border border-slate-200 bg-white p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Orders</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.totalOrders || 0}</p>
              <p className="mt-1 text-xs text-slate-400">{stats?.pendingConfirm || 0} pending confirm</p>
            </div>
            <div className="text-3xl">📦</div>
          </div>
        </Link>

        {/* Total Revenue */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                ${(stats?.totalRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-slate-400">All time</p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>

        {/* Pending Shipment */}
        <Link 
          href="/dashboard/orders?status=PACKED" 
          className="rounded-lg border border-slate-200 bg-white p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending Shipment</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{stats?.pendingShipment || 0}</p>
              <p className="mt-1 text-xs text-slate-400">Ready to ship</p>
            </div>
            <div className="text-3xl">🚚</div>
          </div>
        </Link>

        {/* Low Stock Alert */}
        <Link 
          href="/dashboard/inventory" 
          className="rounded-lg border border-slate-200 bg-white p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Low Stock Items</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{stats?.lowStockItems || 0}</p>
              <p className="mt-1 text-xs text-slate-400">Need attention</p>
            </div>
            <div className="text-3xl">⚠️</div>
          </div>
        </Link>
      </div>

      {/* Empty State or Content */}
      {!hasData ? (
        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Get Started with LaCleoOmnia</h2>
            <p className="text-sm text-slate-600 mb-6">
              Connect your store, import orders, and start managing your inventory in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard/integrations"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Connect Shopify
              </Link>
              <Link
                href="/dashboard/inventory"
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                Add Warehouse
              </Link>
              <Link
                href="/dashboard/inventory"
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                Upload Inventory
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Orders */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
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
                    ${order.total?.toFixed(2) || "0.00"}
                  </p>
                </div>
              ))}
              {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500 mb-4">No orders yet</p>
                  <Link
                    href="/dashboard/integrations"
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Import Orders
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
            </div>
            <div className="space-y-2">
              <Link
                href="/dashboard/integrations"
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>🔌</span>
                <span>Connect Integration</span>
              </Link>
              <Link
                href="/dashboard/orders"
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>📦</span>
                <span>View Orders</span>
              </Link>
              <Link
                href="/dashboard/inventory"
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>📋</span>
                <span>Manage Inventory</span>
              </Link>
              <Link
                href="/dashboard/analytics"
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>📈</span>
                <span>View Analytics</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
