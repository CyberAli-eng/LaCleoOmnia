"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";
import Link from "next/link";

const CHANNELS = [
  { type: "SHOPIFY", name: "Shopify", icon: "🛍️", color: "blue" },
  { type: "AMAZON", name: "Amazon", icon: "📦", color: "amber" },
  { type: "FLIPKART", name: "Flipkart", icon: "🛒", color: "purple" },
  { type: "MYNTRA", name: "Myntra", icon: "👕", color: "pink" },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [syncJobs, setSyncJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [showConnectForm, setShowConnectForm] = useState<string | null>(null);
  
  // Shopify form state
  const [shopDomain, setShopDomain] = useState("");
  const [shopToken, setShopToken] = useState("");
  const [sellerName, setSellerName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [configData, jobsData] = await Promise.all([
        authFetch("/config/status").catch(() => ({ integrations: [] })),
        authFetch("/sync/jobs").catch(() => ({ jobs: [] })),
      ]);
      setIntegrations(configData?.integrations || []);
      setSyncJobs(jobsData?.jobs || []);
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  };

  const getLastSync = (channelType: string) => {
    const integration = integrations.find((i) => i.type === channelType);
    if (!integration) return null;
    const job = syncJobs
      .filter((j) => j.channelAccountId === integration.id)
      .sort((a, b) => new Date(b.finishedAt || b.startedAt || 0).getTime() - new Date(a.finishedAt || a.startedAt || 0).getTime())[0];
    return job?.finishedAt || job?.startedAt || null;
  };

  const handleConnectShopify = async () => {
    if (!shopDomain || !shopToken || !sellerName) {
      setStatus("Please fill all fields");
      setStatusType("error");
      return;
    }
    setLoading("connect");
    setStatus(null);
    try {
      await authFetch("/channels/shopify/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_name: sellerName,
          shop_domain: shopDomain,
          access_token: shopToken,
        }),
      });
      setStatus("✅ Shopify connected successfully!");
      setStatusType("success");
      setShowConnectForm(null);
      setShopDomain("");
      setShopToken("");
      setSellerName("");
      await loadData();
    } catch (err: any) {
      setStatus(`❌ Connection failed: ${err.message || "Unknown error"}`);
      setStatusType("error");
    } finally {
      setLoading(null);
    }
  };

  const handleTestConnection = async (integrationId: string) => {
    setLoading(`test-${integrationId}`);
    setStatus(null);
    try {
      const result = await authFetch("/channels/shopify/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: integrationId }),
      });
      setStatus(
        `✅ Connected! Shop: ${result.shop?.name || "Unknown"}, Products: ${result.productsCount || 0}, Locations: ${result.locations?.length || 0}`
      );
      setStatusType("success");
    } catch (err: any) {
      setStatus(`❌ Test failed: ${err.message || "Unknown error"}`);
      setStatusType("error");
    } finally {
      setLoading(null);
    }
  };

  const handleImportOrders = async (integrationId: string) => {
    setLoading(`import-${integrationId}`);
    setStatus(null);
    try {
      await authFetch("/channels/shopify/import-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: integrationId }),
      });
      setStatus("✅ Orders imported successfully!");
      setStatusType("success");
      await loadData();
    } catch (err: any) {
      setStatus(`❌ Import failed: ${err.message || "Unknown error"}`);
      setStatusType("error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
          <p className="mt-1 text-sm text-slate-600">Connect your marketplaces and sync orders</p>
        </div>
      </div>

      {/* Status Message */}
      {status && (
        <div
          className={`rounded-lg p-4 ${
            statusType === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          {status}
        </div>
      )}

      {/* Channel Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {CHANNELS.map((channel) => {
          const integration = integrations.find((i) => i.type === channel.type);
          const isConnected = integration?.status === "CONNECTED";
          const lastSync = getLastSync(channel.type);

          return (
            <div
              key={channel.type}
              className="rounded-lg border border-slate-200 bg-white p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{channel.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{channel.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {isConnected ? (
                        <>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            Connected
                          </span>
                          {integration.name && (
                            <span className="text-xs text-slate-500">{integration.name}</span>
                          )}
                        </>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {isConnected && lastSync && (
                <div className="mb-4 text-xs text-slate-500">
                  Last sync: {new Date(lastSync).toLocaleString()}
                </div>
              )}

              {isConnected ? (
                <div className="space-y-2">
                  <button
                    onClick={() => handleTestConnection(integration.id)}
                    disabled={loading === `test-${integration.id}`}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {loading === `test-${integration.id}` ? "Testing..." : "Test Connection"}
                  </button>
                  {channel.type === "SHOPIFY" && (
                    <>
                      <button
                        onClick={() => handleImportOrders(integration.id)}
                        disabled={loading === `import-${integration.id}`}
                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading === `import-${integration.id}` ? "Importing..." : "Import Orders"}
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Push inventory
                          alert("Push inventory feature coming soon");
                        }}
                        className="w-full rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Push Inventory
                      </button>
                    </>
                  )}
                  <Link
                    href="/dashboard/webhooks"
                    className="block w-full text-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View Logs
                  </Link>
                </div>
              ) : (
                <button
                  onClick={() => setShowConnectForm(showConnectForm === channel.type ? null : channel.type)}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Connect {channel.name}
                </button>
              )}

              {/* Connect Form */}
              {showConnectForm === channel.type && channel.type === "SHOPIFY" && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Seller Name
                    </label>
                    <input
                      type="text"
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      placeholder="My Store"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Shop Domain
                    </label>
                    <input
                      type="text"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      placeholder="your-store.myshopify.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Admin API Access Token
                    </label>
                    <input
                      type="password"
                      value={shopToken}
                      onChange={(e) => setShopToken(e.target.value)}
                      placeholder="shpat_..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleConnectShopify}
                      disabled={loading === "connect"}
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading === "connect" ? "Connecting..." : "Connect"}
                    </button>
                    <button
                      onClick={() => {
                        setShowConnectForm(null);
                        setShopDomain("");
                        setShopToken("");
                        setSellerName("");
                      }}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
