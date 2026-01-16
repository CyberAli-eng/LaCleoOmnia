"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

interface Label {
  id: number;
  url: string;
  createdAt: string;
}

export default function LabelsPage() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLabels = async () => {
    const data = await authFetch("/labels");
    setLabels(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadLabels().catch(() => null);
  }, []);

  const generateLabel = async () => {
    setLoading(true);
    await authFetch("/labels/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: null }),
    });
    await loadLabels();
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Labels</h2>
        <p className="mt-2 text-sm text-slate-600">Generate and download shipping labels.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <button
          onClick={generateLabel}
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Label"}
        </button>

        <div className="mt-6 space-y-2 text-sm text-slate-600">
          {labels.map((label) => (
            <div key={label.id} className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
              <span>Label #{label.id}</span>
              <a href={label.url} className="text-blue-600 hover:text-blue-500" target="_blank" rel="noreferrer">
                Download
              </a>
            </div>
          ))}
          {labels.length === 0 && <p>No labels yet.</p>}
        </div>
      </div>
    </div>
  );
}
