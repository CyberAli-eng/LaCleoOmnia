"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

const integrationTypes = ["SHOPIFY", "AMAZON", "WOO", "FLIPKART", "SHIPPING"];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [type, setType] = useState("SHOPIFY");
  const [name, setName] = useState("");
  const [credentials, setCredentials] = useState("{}");
  const [shopDomain, setShopDomain] = useState("");
  const [shopToken, setShopToken] = useState("");
  const [shopSecret, setShopSecret] = useState("");

  const loadIntegrations = async () => {
    const data = await authFetch("/config/status");
    setIntegrations(data?.integrations || []);
    setSubscriptions(data?.subscriptions || []);
  };

  useEffect(() => {
    loadIntegrations().catch(() => null);
  }, []);

  const handleSave = async () => {
    setStatus(null);
    try {
      const payloadCredentials =
        type === "SHOPIFY"
          ? { shopDomain, accessToken: shopToken, appSecret: shopSecret }
          : JSON.parse(credentials);
      const res = await authFetch("/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: name || `${type} Store`,
          credentials: payloadCredentials,
        }),
      });
      if (!res?.id) {
        throw new Error("Failed to save integration");
      }
      setStatus("Integration saved.");
      setName("");
      setCredentials("{}");
      setShopDomain("");
      setShopToken("");
      setShopSecret("");
      await loadIntegrations();
    } catch (err: any) {
      setStatus(err.message);
    }
  };

  const getWebhookHealth = (integrationId: number) => {
    const subs = subscriptions.filter((sub) => sub.integrationId === integrationId);
    if (!subs.length) return "Not configured";
    const failed = subs.filter((sub) => sub.status !== "ACTIVE").length;
    return failed ? "Issues" : "Healthy";
  };

  const handleTestConnection = async (integrationId: number) => {
    setStatus(null);
    try {
      const data = await authFetch("/marketplaces/shopify/shop");
      setStatus(`Connected to ${data.name} (${data.domain})`);
    } catch (err: any) {
      setStatus(err.message);
    }
  };

  const handleReRegister = async (integrationId: number) => {
    setStatus(null);
    try {
      await authFetch(`/webhooks/register/${integrationId}`, { method: "POST" });
      await loadIntegrations();
      setStatus("Webhooks re-registered.");
    } catch (err: any) {
      setStatus(err.message);
    }
  };

  const updateSchedule = async (integrationId: number, enabled: boolean, interval: number) => {
    await authFetch(`/config/${integrationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inventorySyncEnabled: enabled,
        inventorySyncIntervalMinutes: interval,
      }),
    });
    await loadIntegrations();
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
          {type === "SHOPIFY" ? (
            <>
              <div>
                <label className="text-sm font-medium text-slate-600">Shop Domain</label>
                <input
                  value={shopDomain}
                  onChange={(event) => setShopDomain(event.target.value)}
                  placeholder="your-store.myshopify.com"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Admin Access Token</label>
                <input
                  value={shopToken}
                  onChange={(event) => setShopToken(event.target.value)}
                  placeholder="shpat_..."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">App Secret (Webhook HMAC)</label>
                <input
                  value={shopSecret}
                  onChange={(event) => setShopSecret(event.target.value)}
                  placeholder="shpss_..."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </>
          ) : (
            <div className="md:col-span-1">
              <label className="text-sm font-medium text-slate-600">Credentials (JSON)</label>
              <input
                value={credentials}
                onChange={(event) => setCredentials(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
              />
            </div>
          )}
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
            <div key={item.id} className="rounded-lg border border-slate-100 px-3 py-3 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-slate-800">{item.name || item.type}</span>
                <span className="text-slate-500">{item.type}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className={`rounded-full px-2 py-1 ${getWebhookHealth(item.id) === "Healthy" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  Webhooks: {getWebhookHealth(item.id)}
                </span>
                <span className={`rounded-full px-2 py-1 ${item.inventorySyncEnabled ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                  Inventory Sync: {item.inventorySyncEnabled ? "On" : "Off"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTestConnection(item.id)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Test Connection
                </button>
                <button
                  onClick={() => handleReRegister(item.id)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Re-register Webhooks
                </button>
                <button
                  onClick={() => updateSchedule(item.id, !item.inventorySyncEnabled, item.inventorySyncIntervalMinutes || 60)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Toggle Inventory Sync
                </button>
                <button
                  onClick={() => updateSchedule(item.id, item.inventorySyncEnabled, 30)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Sync every 30m
                </button>
                <button
                  onClick={() => updateSchedule(item.id, item.inventorySyncEnabled, 60)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Sync every 60m
                </button>
              </div>
            </div>
          ))}
          {integrations.length === 0 && <p className="text-slate-500">No integrations yet.</p>}
        </div>
      </div>
    </div>
  );
}
