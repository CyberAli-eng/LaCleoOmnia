"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch("/orders").catch(() => []),
      authFetch("/analytics/summary").catch(() => ({ totalOrders: 0, recentOrders: [] })),
    ]).then(([orders, summary]) => {
      const ordersArray = Array.isArray(orders) ? orders : [];
      const totalRevenue = ordersArray.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
      const avgOrderValue = ordersArray.length > 0 ? totalRevenue / ordersArray.length : 0;
      
      const bySource: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const dailyRevenue: Record<string, number> = {};
      
      ordersArray.forEach((order: any) => {
        bySource[order.source] = (bySource[order.source] || 0) + 1;
        byStatus[order.status] = (byStatus[order.status] || 0) + 1;
        const date = new Date(order.createdAt).toLocaleDateString();
        dailyRevenue[date] = (dailyRevenue[date] || 0) + (order.total || 0);
      });

      const topSources = Object.entries(bySource)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([source, count]) => ({ source, count, percentage: (count / ordersArray.length) * 100 }));

      setStats({
        totalOrders: summary?.totalOrders || ordersArray.length,
        totalRevenue,
        avgOrderValue,
        bySource,
        byStatus,
        topSources,
        dailyRevenue,
        recentOrders: summary?.recentOrders || [],
      });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Analytics</h2>
        <p className="mt-2 text-sm text-slate-600">Comprehensive insights into your order performance.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Total Orders</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.totalOrders || 0}</p>
          <p className="mt-1 text-xs text-slate-400">All time</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            ${(stats?.totalRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-slate-400">All time</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Average Order Value</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            ${(stats?.avgOrderValue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-slate-400">Per order</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Active Channels</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {Object.keys(stats?.bySource || {}).length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Marketplaces</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Orders by Source</h3>
          <div className="space-y-3">
            {stats?.topSources?.map((item: any) => (
              <div key={item.source}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900">{item.source}</span>
                  <span className="text-sm text-slate-600">{item.count} orders</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {(!stats?.topSources || stats.topSources.length === 0) && (
              <p className="text-sm text-slate-500">No data available</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Orders by Status</h3>
          <div className="space-y-3">
            {Object.entries(stats?.byStatus || {}).map(([status, count]: [string, any]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900 capitalize">{status}</span>
                <span className="text-sm text-slate-600">{count} orders</span>
              </div>
            ))}
            {Object.keys(stats?.byStatus || {}).length === 0 && (
              <p className="text-sm text-slate-500">No data available</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Orders</h3>
        <div className="space-y-2">
          {(stats?.recentOrders || []).slice(0, 10).map((order: any) => (
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
            <p className="text-sm text-slate-500 py-4">No recent orders</p>
          )}
        </div>
      </div>
    </div>
  );
}
