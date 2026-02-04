"use client";

import { useEffect, useState, useMemo } from "react";
import { authFetch } from "@/utils/api";
import { TablePagination } from "@/app/components/TablePagination";

interface ConnectedChannel {
  id: string;
  name: string;
  accountId?: string;
}

interface SyncJob {
  id: string;
  type: string;
  status: string;
  attempts: number;
  lastError?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const CHANNEL_ICONS: Record<string, string> = {
  SHOPIFY: "🛍️",
  AMAZON: "📦",
  FLIPKART: "🛒",
  MYNTRA: "👕",
  selloship: "📦",
  delhivery: "🚚",
};

export default function WorkersPage() {
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadChannels = async () => {
    try {
      const list = (await authFetch("/integrations/connected-summary").catch(() => [])) as ConnectedChannel[];
      setChannels(Array.isArray(list) ? list : []);
    } catch {
      setChannels([]);
    }
  };

  const loadJobs = async () => {
    try {
      const data = (await authFetch("/workers").catch(() => [])) as SyncJob[];
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      setJobs([]);
    }
  };

  useEffect(() => {
    loadChannels();
    loadJobs();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const t = setInterval(() => {
        loadJobs();
      }, 5000);
      return () => clearInterval(t);
    }
  }, [autoRefresh]);

  const triggerSyncOrders = async (channelId: string, accountId: string | undefined, channelName: string) => {
    if (!accountId) {
      setMessage({ text: "No account linked for this channel. Connect the channel in Integrations first.", type: "error" });
      return;
    }
    setLoading(`orders-${channelId}`);
    setMessage(null);
    try {
      const res = await authFetch(`/sync/orders/${accountId}`, { method: "POST" }) as { message?: string };
      setMessage({ text: res?.message ?? "Order sync started.", type: "success" });
      await loadJobs();
    } catch (err: any) {
      setMessage({ text: err?.message ?? "Order sync failed.", type: "error" });
    } finally {
      setLoading(null);
    }
  };

  const triggerSyncShipments = async (channelId: string, channelName: string) => {
    setLoading(`shipments-${channelId}`);
    setMessage(null);
    try {
      const res = await authFetch("/shipments/sync", { method: "POST" }) as { message?: string; synced?: number };
      setMessage({
        text: res?.message ?? `Synced ${res?.synced ?? 0} shipments.`,
        type: "success",
      });
      await loadJobs();
    } catch (err: any) {
      setMessage({ text: err?.message ?? "Shipment sync failed.", type: "error" });
    } finally {
      setLoading(null);
    }
  };

  const triggerSyncInventory = async (channelId: string, channelName: string) => {
    if (channelId !== "SHOPIFY") {
      setMessage({ text: "Inventory sync is only available for Shopify.", type: "error" });
      return;
    }
    setLoading(`inventory-${channelId}`);
    setMessage(null);
    try {
      const res = await authFetch("/integrations/shopify/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }) as { message?: string; inventory_synced?: number };
      setMessage({
        text: res?.message ?? `Inventory sync completed. ${res?.inventory_synced ?? 0} records updated.`,
        type: "success",
      });
      await loadJobs();
    } catch (err: any) {
      setMessage({ text: err?.message ?? "Inventory sync failed.", type: "error" });
    } finally {
      setLoading(null);
    }
  };

  const paginatedJobs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return jobs.slice(start, start + pageSize);
  }, [jobs, page, pageSize]);

  const jobStats = useMemo(() => ({
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "QUEUED" || j.status === "PENDING").length,
    processing: jobs.filter((j) => j.status === "RUNNING" || j.status === "PROCESSING").length,
    completed: jobs.filter((j) => j.status === "SUCCESS" || j.status === "COMPLETED").length,
    failed: jobs.filter((j) => j.status === "FAILED").length,
  }), [jobs]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sync & Workers</h1>
            <p className="mt-1 text-sm text-slate-600">
              Run order and inventory sync per channel. Jobs run in the background.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-300"
            />
            Auto-refresh queue
          </label>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-4 ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total jobs", value: jobStats.total, color: "text-slate-900" },
          { label: "Pending", value: jobStats.pending, color: "text-amber-600" },
          { label: "Processing", value: jobStats.processing, color: "text-blue-600" },
          { label: "Completed", value: jobStats.completed, color: "text-emerald-600" },
          { label: "Failed", value: jobStats.failed, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Channel sync</h2>
        <p className="text-sm text-slate-600 mb-6">
          Sync orders or inventory for each connected channel. Each action runs as a separate job.
        </p>
        {channels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center text-slate-600">
            <p className="font-medium">No channels connected</p>
            <p className="mt-1 text-sm">Connect at least one channel in Integrations to run sync here.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {channels.map((ch) => {
              const icon = CHANNEL_ICONS[ch.id] ?? "📌";
              const ordersLoading = loading === `orders-${ch.id}`;
              const invLoading = loading === `inventory-${ch.id}`;
              const shipmentsLoading = loading === `shipments-${ch.id}`;
              const hasInventorySync = ch.id === "SHOPIFY";
              const isLogisticsOnly = ["selloship", "delhivery"].includes(ch.id) && !ch.accountId;
              return (
                <div
                  key={ch.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 transition-all hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200 text-xl shadow-sm">
                      {icon}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{ch.name}</p>
                      <p className="text-xs text-slate-500">Connected</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {isLogisticsOnly ? (
                      <button
                        type="button"
                        onClick={() => triggerSyncShipments(ch.id, ch.name)}
                        disabled={!!loading}
                        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {shipmentsLoading ? "Syncing…" : "Sync shipments"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => triggerSyncOrders(ch.id, ch.accountId, ch.name)}
                        disabled={!!loading}
                        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {ordersLoading ? "Starting…" : "Sync orders"}
                      </button>
                    )}
                    {hasInventorySync && (
                      <button
                        type="button"
                        onClick={() => triggerSyncInventory(ch.id, ch.name)}
                        disabled={!!loading}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {invLoading ? "Syncing…" : "Sync inventory"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Job queue</h2>
          <button
            type="button"
            onClick={() => { loadJobs(); loadChannels(); }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Attempts</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Error</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Created</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Updated</th>
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.map((job) => (
                <tr key={job.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-medium text-slate-900">{job.type}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        job.status === "SUCCESS" || job.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : job.status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : job.status === "RUNNING" || job.status === "PROCESSING"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{job.attempts}</td>
                  <td className="py-3 px-4 max-w-[200px]">
                    {job.lastError ? (
                      <span className="block truncate text-red-600 text-xs" title={job.lastError}>
                        {job.lastError}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {job.createdAt ? new Date(job.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {job.updatedAt ? new Date(job.updatedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {jobs.length === 0 && (
            <div className="py-12 text-center text-slate-500">No jobs in queue.</div>
          )}
        </div>
        {jobs.length > 0 && (
          <div className="mt-4">
            <TablePagination
              currentPage={page}
              totalItems={jobs.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              itemLabel="jobs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
