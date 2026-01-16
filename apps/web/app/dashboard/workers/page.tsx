"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

interface WorkerJob {
  id: number;
  type: string;
  status: string;
  attempts: number;
  createdAt: string;
}

export default function WorkersPage() {
  const [jobs, setJobs] = useState<WorkerJob[]>([]);
  const [loading, setLoading] = useState(false);

  const loadJobs = async () => {
    const data = await authFetch("/workers");
    setJobs(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadJobs().catch(() => null);
  }, []);

  const enqueue = async (path: string) => {
    setLoading(true);
    await authFetch(`/workers/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "SHOPIFY" }),
    });
    await loadJobs();
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Background Workers</h2>
        <p className="mt-2 text-sm text-slate-600">Order and inventory sync queues.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => enqueue("order-sync")}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Enqueue Order Sync
          </button>
          <button
            onClick={() => enqueue("inventory-sync")}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Enqueue Inventory Sync
          </button>
        </div>

        <div className="mt-6 space-y-2 text-sm text-slate-600">
          {jobs.map((job) => (
            <div key={job.id} className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
              <span>{job.type}</span>
              <span className="text-slate-400">{job.status} · {job.attempts}</span>
            </div>
          ))}
          {jobs.length === 0 && <p>No jobs yet.</p>}
        </div>
      </div>
    </div>
  );
}
