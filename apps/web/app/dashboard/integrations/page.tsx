"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

const integrationTypes = ["SHOPIFY", "AMAZON", "WOO", "FLIPKART", "SHIPPING"];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");
  const [loading, setLoading] = useState<string | null>(null);
  const [type, setType] = useState("SHOPIFY");
  const [name, setName] = useState("");
  const [credentials, setCredentials] = useState("{}");
  const [shopDomain, setShopDomain] = useState("");
  const [shopToken, setShopToken] = useState("");
  const [shopSecret, setShopSecret] = useState("");
  const [expandedIntegration, setExpandedIntegration] = useState<number | null>(null);

  const loadIntegrations = async () => {
    try {
      const data = await authFetch("/config/status");
      const raw = data?.integrations || [];
      const seen = new Set<string>();
      const deduped = raw.filter((item: any) => {
        const nameKey = String(item.name || "").trim().toLowerCase();
        const key = `${item.type}:${nameKey}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setIntegrations(deduped);
      setSubscriptions(data?.subscriptions || []);
    } catch (err: any) {
      setStatus(err.message);
      setStatusType("error");
    }
  };

  useEffect(() => {
    loadIntegrations().catch((err) => setStatus(err.message));
  }, []);

  const handleSave = async () => {
    setStatus(null);
    setLoading("save");
    try {
      if (type === "SHOPIFY" && (!shopDomain || !shopToken)) {
        throw new Error("Shop Domain and Admin Token are required");
      }
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
      setStatus(res.message || "Integration saved successfully!");
      setStatusType("success");
      setName("");
      setCredentials("{}");
      setShopDomain("");
      setShopToken("");
      setShopSecret("");
      await loadIntegrations();
    } catch (err: any) {
      setStatus(err.message);
      setStatusType("error");
    } finally {
      setLoading(null);
    }
  };

  const getWebhookHealth = (integrationId: number) => {
    const subs = subscriptions.filter((sub) => sub.integrationId === integrationId);
    if (!subs.length) return { status: "Not configured", count: 0, total: 0 };
    const active = subs.filter((sub) => sub.status === "ACTIVE").length;
    const failed = subs.filter((sub) => sub.status !== "ACTIVE").length;
    return {
      status: failed > 0 ? "Issues" : "Healthy",
      count: active,
      total: subs.length,
      subscriptions: subs,
    };
  };

  const handleTestConnection = async (integrationId: number) => {
    setStatus(null);
    setLoading(`test-${integrationId}`);
    try {
      const integration = integrations.find((i) => i.id === integrationId);
      if (!integration || integration.type !== "SHOPIFY") {
        throw new Error("Connection test only available for Shopify integrations");
      }
      const data = await authFetch(`/marketplaces/shopify/shop?integrationId=${integrationId}`);
      setStatus(`✅ Connected to ${data.name || data.domain || "Shopify store"}`);
      setStatusType("success");
    } catch (err: any) {
      setStatus(`❌ Connection failed: ${err.message}`);
      setStatusType("error");
    } finally {
      setLoading(null);
    }
  };

  const handleReRegister = async (integrationId: number) => {
    setStatus(null);
    setLoading(`reregister-${integrationId}`);
    try {
      await authFetch(`/webhooks/register/${integrationId}`, { method: "POST" });
      await loadIntegrations();
      setStatus("✅ Webhooks re-registered successfully");
      setStatusType("success");
    } catch (err: any) {
      setStatus(`❌ Failed to re-register webhooks: ${err.message}`);
      setStatusType("error");
    } finally {
      setLoading(null);
    }
  };

  const updateSchedule = async (integrationId: number, enabled: boolean, interval: number) => {
    setLoading(`schedule-${integrationId}`);
    try {
      await authFetch(`/config/${integrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventorySyncEnabled: enabled,
          inventorySyncIntervalMinutes: interval,
        }),
      });
      await loadIntegrations();
      setStatus(`✅ Inventory sync ${enabled ? "enabled" : "disabled"} (${interval}m interval)`);
      setStatusType("success");
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus(`❌ Failed to update schedule: ${err.message}`);
      setStatusType("error");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (integrationId: number) => {
    if (!confirm("Are you sure you want to delete this integration? This will also remove all associated webhooks.")) {
      return;
    }
    setStatus(null);
    setLoading(`delete-${integrationId}`);
    try {
      await authFetch(`/config/${integrationId}`, { method: "DELETE" });
      await loadIntegrations();
      setStatus("✅ Integration deleted successfully");
      setStatusType("success");
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus(`❌ Failed to delete: ${err.message}`);
      setStatusType("error");
    } finally {
      setLoading(null);
    }
  };

  const handleCleanupDuplicates = async () => {
    setStatus(null);
    setLoading("cleanup");
    try {
      const res = await authFetch("/config/cleanup", { method: "POST" });
      await loadIntegrations();
      setStatus(`✅ Cleaned up ${res.deleted || 0} duplicate integration(s)`);
      setStatusType("success");
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus(`❌ Cleanup failed: ${err.message}`);
      setStatusType("error");
    } finally {
      setLoading(null);
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
          disabled={loading === "save"}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "save" ? "Saving..." : "Save Integration"}
        </button>
        {status && (
          <div className={`mt-2 rounded-lg px-3 py-2 text-sm ${
            statusType === "error" ? "bg-red-50 text-red-700" :
            statusType === "success" ? "bg-emerald-50 text-emerald-700" :
            "bg-blue-50 text-blue-700"
          }`}>
            {status}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold text-slate-600">Connected Integrations</div>
        <div className="mt-4 space-y-2 text-sm">
          {integrations.map((item) => {
            const webhookHealth = getWebhookHealth(item.id);
            const isExpanded = expandedIntegration === item.id;
            return (
            <div key={item.id} className="rounded-lg border border-slate-200 px-4 py-4 space-y-3 hover:border-slate-300 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{item.name || item.type}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{item.type}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    {item.createdAt && (
                      <span>Created {new Date(item.createdAt).toLocaleDateString()}</span>
                    )}
                    {item.lastInventorySyncAt && (
                      <span>• Last sync: {new Date(item.lastInventorySyncAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setExpandedIntegration(isExpanded ? null : item.id)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  {isExpanded ? "▼" : "▶"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-1 font-medium ${
                  webhookHealth.status === "Healthy" ? "bg-emerald-50 text-emerald-700" :
                  webhookHealth.status === "Issues" ? "bg-amber-50 text-amber-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  Webhooks: {webhookHealth.status} {webhookHealth.total > 0 && `(${webhookHealth.count}/${webhookHealth.total})`}
                </span>
                <span className={`rounded-full px-2.5 py-1 font-medium ${item.inventorySyncEnabled ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                  Inventory Sync: {item.inventorySyncEnabled ? `On (${item.inventorySyncIntervalMinutes || 60}m)` : "Off"}
                </span>
              </div>
              {isExpanded && webhookHealth.subscriptions && webhookHealth.subscriptions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                  <div className="text-xs font-medium text-slate-600 mb-2">Webhook Subscriptions:</div>
                  {webhookHealth.subscriptions.map((sub: any) => (
                    <div key={sub.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{sub.topic}</span>
                      <span className={`px-2 py-0.5 rounded ${
                        sub.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {item.type === "SHOPIFY" && (
                  <>
                    <button
                      onClick={() => handleTestConnection(item.id)}
                      disabled={loading === `test-${item.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading === `test-${item.id}` ? "Testing..." : "Test Connection"}
                    </button>
                    <button
                      onClick={() => handleReRegister(item.id)}
                      disabled={loading === `reregister-${item.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading === `reregister-${item.id}` ? "Registering..." : "Re-register Webhooks"}
                    </button>
                  </>
                )}
                <button
                  onClick={() => updateSchedule(item.id, !item.inventorySyncEnabled, item.inventorySyncIntervalMinutes || 60)}
                  disabled={loading === `schedule-${item.id}`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === `schedule-${item.id}` ? "Updating..." : item.inventorySyncEnabled ? "Disable Sync" : "Enable Sync"}
                </button>
                {item.inventorySyncEnabled && (
                  <>
                    <button
                      onClick={() => updateSchedule(item.id, true, 30)}
                      disabled={loading === `schedule-${item.id}`}
                      className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Set 30m
                    </button>
                    <button
                      onClick={() => updateSchedule(item.id, true, 60)}
                      disabled={loading === `schedule-${item.id}`}
                      className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Set 60m
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={loading === `delete-${item.id}`}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === `delete-${item.id}` ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
            );
          })}
          {integrations.length === 0 && <p className="text-slate-500">No integrations yet.</p>}
        </div>
        {integrations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={handleCleanupDuplicates}
              disabled={loading === "cleanup"}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "cleanup" ? "Cleaning..." : "Clean Duplicate Integrations"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
