"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

const integrationTypes = ["AMAZON", "SHOPIFY", "WOO", "FLIPKART", "SHIPPING"];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [type, setType] = useState("SHOPIFY");
  const [name, setName] = useState("");
  const [credentials, setCredentials] = useState("{}");

  const loadIntegrations = async () => {
    const data = await authFetch("/config/me");
    setIntegrations(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadIntegrations().catch(() => null);
  }, []);

  const handleSave = async () => {
    setStatus(null);
    try {
      const res = await authFetch("/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: name || `${type} Store`,
          credentials,
        }),
      });
      if (!res?.id) {
        throw new Error("Failed to save integration");
      }
      setStatus("Integration saved.");
      setName("");
      setCredentials("{}");
      await loadIntegrations();
    } catch (err: any) {
      setStatus(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Integrations</h2>
        <p className="mt-2 text-sm text-slate-600">Manage marketplace credentials and adapter setup.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-600">Type</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {integrationTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Store name"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-sm font-medium text-slate-600">Credentials (JSON)</label>
            <input
              value={credentials}
              onChange={(event) => setCredentials(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Save Integration
        </button>
        {status && <p className="text-sm text-slate-600">{status}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold text-slate-600">Connected Integrations</div>
        <div className="mt-4 space-y-2 text-sm">
          {integrations.map((item) => (
            <div key={item.id} className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
              <span>{item.name || item.type}</span>
              <span className="text-slate-500">{item.type}</span>
            </div>
          ))}
          {integrations.length === 0 && <p className="text-slate-500">No integrations yet.</p>}
        </div>
      </div>
    </div>
  );
}
