"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";
import { formatCurrency } from "@/utils/currency";
import Link from "next/link";

interface Overview {
  todayRevenue: number;
  yesterdayRevenue: number;
  todayOrders: number;
  yesterdayOrders: number;
  todayItems: number;
  yesterdayItems: number;
  orderAlerts: { pendingOrders: number; pendingShipment: number };
  productAlerts: { lowStockCount: number };
  channelAlerts: { connectedCount: number };
  recentOrders: Array<{
    id: string;
    externalId: string;
    source: string;
    status: string;
    total: number;
    createdAt: string | null;
  }>;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [profitSummary, setProfitSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [overviewRes, profitRes, syncJobs] = await Promise.all([
        authFetch("/analytics/overview").catch(() => null),
        authFetch("/analytics/profit-summary").catch(() => null),
        authFetch("/workers").catch(() => []),
      ]);
      setOverview(overviewRes || null);
      setProfitSummary(profitRes || null);
      const jobs = Array.isArray(syncJobs) ? syncJobs : (syncJobs as { jobs?: any[] })?.jobs || [];
      if (jobs.length > 0) {
        const last = jobs.sort((a: any, b: any) => {
          const tA = new Date(a.finishedAt || a.startedAt || a.createdAt || 0).getTime();
          const tB = new Date(b.finishedAt || b.startedAt || b.createdAt || 0).getTime();
          return tB - tA;
        })[0];
        setLastSync(last?.finishedAt || last?.startedAt || last?.createdAt || null);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-slate-500">Loading overview…</div>
      </div>
    );
  }

  const o = overview || {
    todayRevenue: 0,
    yesterdayRevenue: 0,
    todayOrders: 0,
    yesterdayOrders: 0,
    todayItems: 0,
    yesterdayItems: 0,
    orderAlerts: { pendingOrders: 0, pendingShipment: 0 },
    productAlerts: { lowStockCount: 0 },
    channelAlerts: { connectedCount: 0 },
    recentOrders: [],
  };

  const revenueUp = o.todayRevenue >= (o.yesterdayRevenue || 0);
  const ordersUp = o.todayOrders >= (o.yesterdayOrders || 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
          <p className="mt-1 text-sm text-slate-600">
            Orders, inventory, and channel status at a glance
          </p>
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

      {/* Section 1: Revenue & Orders (Unicommerce Section 1) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Revenue & orders
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-xs font-medium text-slate-500">Revenue today</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(o.todayRevenue)}
            </p>
            <p className={`mt-1 text-xs ${revenueUp ? "text-emerald-600" : "text-slate-500"}`}>
              {o.yesterdayRevenue != null
                ? `Yesterday: ${formatCurrency(o.yesterdayRevenue)}`
                : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-xs font-medium text-slate-500">Revenue yesterday</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(o.yesterdayRevenue)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-xs font-medium text-slate-500">Orders today</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{o.todayOrders}</p>
            <p className={`mt-1 text-xs ${ordersUp ? "text-emerald-600" : "text-slate-500"}`}>
              Yesterday: {o.yesterdayOrders} orders · {o.todayItems} items today
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-xs font-medium text-slate-500">Items sold today</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{o.todayItems}</p>
            <p className="mt-1 text-xs text-slate-500">Yesterday: {o.yesterdayItems} items</p>
          </div>
        </div>
      </div>

      {/* Section 2: Alert grids (Unicommerce Section 2) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Order alerts
          </h2>
          <div className="space-y-3">
            <Link
              href="/dashboard/orders?status=NEW"
              className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 transition-colors hover:bg-amber-50"
            >
              <span className="text-sm font-medium text-amber-800">Pending orders</span>
              <span className="text-xl font-bold text-amber-700">
                {o.orderAlerts.pendingOrders}
              </span>
            </Link>
            <Link
              href="/dashboard/orders?status=PACKED"
              className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 transition-colors hover:bg-blue-50"
            >
              <span className="text-sm font-medium text-blue-800">Pending shipment</span>
              <span className="text-xl font-bold text-blue-700">
                {o.orderAlerts.pendingShipment}
              </span>
            </Link>
          </div>
        </div>

        {/* Product alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Product alerts
          </h2>
          <div className="space-y-3">
            <Link
              href="/dashboard/inventory"
              className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 transition-colors hover:bg-red-50"
            >
              <span className="text-sm font-medium text-red-800">Low stock items</span>
              <span className="text-xl font-bold text-red-700">
                {o.productAlerts.lowStockCount}
              </span>
            </Link>
            <p className="text-xs text-slate-500 px-1">
              Items with available qty &lt; 10
            </p>
          </div>
        </div>

        {/* Channel alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Channel connectors
          </h2>
          <div className="space-y-3">
            <Link
              href="/dashboard/integrations"
              className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 transition-colors hover:bg-emerald-50"
            >
              <span className="text-sm font-medium text-emerald-800">Connected</span>
              <span className="text-xl font-bold text-emerald-700">
                {o.channelAlerts.connectedCount}
              </span>
            </Link>
            <Link
              href="/dashboard/integrations"
              className="block rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Configure channels
            </Link>
          </div>
        </div>
      </div>

      {/* Section 3: Updates + Recent orders + Quick actions (Unicommerce Section 3 + content) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent orders</h2>
            <Link
              href="/dashboard/orders"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {(o.recentOrders || []).slice(0, 8).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 py-2.5 px-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    #{order.externalId || order.id}
                  </p>
                  <p className="text-xs text-slate-500">
                    {order.source} · {order.status}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrency(order.total)}
                </p>
              </div>
            ))}
            {(!o.recentOrders || o.recentOrders.length === 0) && (
              <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-slate-500">
                <p className="text-sm">No orders yet</p>
                <Link
                  href="/dashboard/integrations"
                  className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Connect a channel & sync orders
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Resources / Quick actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Quick actions
          </h2>
          <div className="space-y-2">
            <Link
              href="/dashboard/integrations"
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span className="text-lg">🔌</span>
              <span>Configure channels</span>
            </Link>
            <Link
              href="/dashboard/orders"
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span className="text-lg">📦</span>
              <span>Orders</span>
            </Link>
            <Link
              href="/dashboard/inventory"
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span className="text-lg">📋</span>
              <span>Inventory</span>
            </Link>
            <Link
              href="/dashboard/workers"
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span className="text-lg">⚙️</span>
              <span>Sync & workers</span>
            </Link>
            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span className="text-lg">📈</span>
              <span>Analytics</span>
            </Link>
          </div>
          {(profitSummary?.netProfit != null || profitSummary?.marginPercent != null) && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-medium text-slate-500">Profit summary</p>
              <p className={`mt-1 text-lg font-bold ${(profitSummary?.netProfit ?? 0) >= 0 ? "text-slate-900" : "text-red-600"}`}>
                {formatCurrency(profitSummary?.netProfit ?? 0)}
              </p>
              <p className="text-xs text-slate-500">
                Margin {(profitSummary?.marginPercent ?? 0).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
