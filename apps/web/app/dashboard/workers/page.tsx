"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

interface WorkerJob {
  id: number;
  type: string;
  status: string;
  attempts: number;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function WorkersPage() {
  const [jobs, setJobs] = useState<WorkerJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadJobs = async () => {
    try {
      const data = await authFetch("/workers");
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load jobs:", err);
    }
  };

  useEffect(() => {
    loadJobs();
    if (autoRefresh) {
      const interval = setInterval(loadJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const enqueue = async (path: string, source: string = "SHOPIFY") => {
    setLoading(true);
    try {
      await authFetch(`/workers/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      await loadJobs();
    } catch (err: any) {
      alert(`Failed to enqueue job: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const jobStats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "PENDING").length,
    processing: jobs.filter((j) => j.status === "PROCESSING").length,
    completed: jobs.filter((j) => j.status === "COMPLETED").length,
    failed: jobs.filter((j) => j.status === "FAILED").length,
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Background Workers</h2>
            <p className="mt-2 text-sm text-slate-600">Manage order and inventory sync queues.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Jobs</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{jobStats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{jobStats.pending}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Processing</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{jobStats.processing}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Completed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{jobStats.completed}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Failed</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{jobStats.failed}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Enqueue Jobs</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => enqueue("order-sync", "SHOPIFY")}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Enqueuing..." : "Sync Orders (Shopify)"}
          </button>
          <button
            onClick={() => enqueue("inventory-sync", "SHOPIFY")}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Enqueuing..." : "Sync Inventory (Shopify)"}
          </button>
          <button
            onClick={loadJobs}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Job Queue</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Attempts</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Error</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Created</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Updated</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900">{job.type}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700"
                          : job.status === "FAILED"
                          ? "bg-red-50 text-red-700"
                          : job.status === "PROCESSING"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{job.attempts}</td>
                  <td className="py-3 px-4">
                    {job.lastError ? (
                      <span className="text-xs text-red-600 max-w-xs truncate block" title={job.lastError}>
                        {job.lastError}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(job.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {jobs.length === 0 && (
            <div className="py-12 text-center text-slate-500">No jobs in queue.</div>
          )}
        </div>
      </div>
    </div>
  );
}
