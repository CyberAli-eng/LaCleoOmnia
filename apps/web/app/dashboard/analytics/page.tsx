"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<{ totalOrders: number; recentOrders: any[] } | null>(null);

  useEffect(() => {
    authFetch("/analytics/summary")
      .then((data) => setSummary(data))
      .catch(() => null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Analytics</h2>
        <p className="mt-2 text-sm text-slate-600">Order performance snapshot.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Total Orders</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary?.totalOrders ?? "—"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Recent Orders</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            {(summary?.recentOrders || []).slice(0, 5).map((order) => (
              <div key={order.id} className="flex justify-between">
                <span>{order.source}</span>
                <span className="text-slate-500">{order.status}</span>
              </div>
            ))}
            {!summary && <span>Loading…</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
