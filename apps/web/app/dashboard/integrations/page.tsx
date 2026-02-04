"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authFetch } from "@/utils/api";
import Link from "next/link";
import { GuideDrawer, type GuideStep } from "@/app/components/GuideDrawer";

interface ActionDef {
  id: string;
  label: string;
  method?: string;
  endpoint?: string;
  href?: string;
  primary?: boolean;
}

interface ConnectFormField {
  key: string;
  label: string;
  type?: string;
  placeholder?: string;
}

interface Provider {
  id: string;
  name: string;
  icon: string;
  color: string;
  connectType: string;
  statusEndpoint?: string;
  connectEndpoint?: string;
  connectBodyKey?: string;
  connectFormFields?: ConnectFormField[];
  oauthInstallEndpoint?: string;
  oauthInstallQueryKey?: string;
  setupStatusEndpoint?: string;
  setupConnectEndpoint?: string;
  setupFormFields?: ConnectFormField[];
  setupGuide?: string;
  setupSteps?: GuideStep[];
  actions?: ActionDef[];
  description?: string;
}

interface Section {
  id: string;
  title: string;
  description: string;
  providers: Provider[];
}

interface Catalog {
  sections: Section[];
}

const ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured: "OAuth is not configured. Please contact support.",
  no_code: "Authorization code not received.",
  invalid_state: "OAuth session expired. Please try again.",
  user_not_found: "User not found. Please login again.",
  no_access_token: "Failed to get access token.",
  shopify_error_401: "Authentication failed. Please check your app credentials.",
  shopify_error_403: "Access denied. Please check permissions.",
  oauth_failed: "OAuth connection failed. Please try again or use manual connection.",
  missing_params: "Missing query parameters.",
  missing_shop_or_code: "Missing required parameter.",
};

const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
};

const PRIMARY_BUTTON_CLASSES: Record<string, string> = {
  blue: "bg-blue-600 hover:bg-blue-700 text-white",
  amber: "bg-amber-600 hover:bg-amber-700 text-white",
  purple: "bg-purple-600 hover:bg-purple-700 text-white",
  pink: "bg-pink-600 hover:bg-pink-700 text-white",
  teal: "bg-teal-600 hover:bg-teal-700 text-white",
  indigo: "bg-indigo-600 hover:bg-indigo-700 text-white",
  emerald: "bg-emerald-600 hover:bg-emerald-700 text-white",
  orange: "bg-orange-600 hover:bg-orange-700 text-white",
};

function findProviderInCatalog(catalog: Catalog | null, providerId: string): Provider | null {
  if (!catalog?.sections) return null;
  for (const section of catalog.sections) {
    const p = section.providers.find((pr) => pr.id === providerId);
    if (p) return p;
  }
  return null;
}

function IntegrationsPageContent() {
  const searchParams = useSearchParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [statusByProvider, setStatusByProvider] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [showConnectForm, setShowConnectForm] = useState<string | null>(null);
  const [showSetupForm, setShowSetupForm] = useState<string | null>(null);
  const [connectFormData, setConnectFormData] = useState<Record<string, string>>({});
  const [guideProvider, setGuideProvider] = useState<Provider | null>(null);
  const [connectedChannels, setConnectedChannels] = useState<{ id: string; name: string; accountId?: string }[]>([]);

  useEffect(() => {
    loadCatalog();
    authFetch("/integrations/connected-summary")
      .then((list: any) => setConnectedChannels(Array.isArray(list) ? list : []))
      .catch(() => setConnectedChannels([]));
  }, []);

  useEffect(() => {
    if (!catalog) return;
    const connectedId =
      searchParams?.get("connected") ??
      (searchParams?.get("shopify") === "connected" ? "SHOPIFY" : null);
    const error = searchParams?.get("error");
    if (connectedId) {
      const provider = findProviderInCatalog(catalog, connectedId);
      setStatus(provider ? `${provider.name} connected successfully` : "Connected successfully");
      setStatusType("success");
      setTimeout(() => loadCatalog(), 500);
    } else if (error && typeof error === "string") {
      setStatus(`❌ ${ERROR_MESSAGES[error] ?? `Connection failed: ${error}`}`);
      setStatusType("error");
    }
  }, [searchParams, catalog]);

  const loadCatalog = async () => {
    try {
      const data = (await authFetch("/integrations/catalog")) as Catalog;
      setCatalog(data || { sections: [] });
      if (data?.sections) {
        for (const section of data.sections) {
          for (const provider of section.providers) {
            loadProviderStatus(provider);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load catalog:", err);
      setCatalog({ sections: [] });
    }
  };

  const loadProviderStatus = async (provider: Provider) => {
    const endpoint = provider.statusEndpoint;
    let st: any = {};
    if (endpoint === "/config/status") {
      try {
        const configData = (await authFetch("/config/status")) as { integrations?: any[] };
        const integrations = configData?.integrations ?? [];
        const integration = integrations.find((i: any) => i.type === provider.id);
        st = { connected: integration?.status === "CONNECTED", name: integration?.name };
      } catch {
        st = { connected: false };
      }
    } else if (endpoint) {
      try {
        const res = (await authFetch(endpoint)) as any;
        st = res?.connected !== false ? { ...res, connected: true } : { ...res, connected: false };
      } catch {
        st = { connected: false };
      }
    }
    if (provider.setupStatusEndpoint) {
      try {
        const setupRes = (await authFetch(provider.setupStatusEndpoint)) as { configured?: boolean };
        st.setupConfigured = setupRes?.configured === true;
      } catch {
        st.setupConfigured = false;
      }
    }
    if (endpoint || provider.setupStatusEndpoint) {
      setStatusByProvider((prev) => ({ ...prev, [provider.id]: { ...prev[provider.id], ...st } }));
    }
  };

  const refreshProviderStatus = (providerId: string) => {
    const provider = findProviderInCatalog(catalog, providerId);
    if (provider) loadProviderStatus(provider);
  };

  const formKey = (providerId: string, fieldKey: string) => `${providerId}_${fieldKey}`;

  const handleConnectWithApiKey = async (provider: Provider) => {
    const fields = provider.connectFormFields ?? [];
    const body: Record<string, string> = {};
    for (const f of fields) {
      const val = connectFormData[formKey(provider.id, f.key)]?.trim();
      if (f.key && val) body[f.key] = val;
    }
    if (Object.keys(body).length === 0) {
      const firstKey = provider.connectBodyKey ?? fields[0]?.key;
      setStatus(`Please enter ${firstKey ? String(firstKey) : "credentials"}`);
      setStatusType("error");
      return;
    }
    const loadId = `connect-${provider.id}`;
    setLoading(loadId);
    setStatus(null);
    try {
      await authFetch(provider.connectEndpoint!, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setStatus(`${provider.name} connected successfully`);
      setStatusType("success");
      setShowConnectForm(null);
      setConnectFormData((prev) => {
        const next = { ...prev };
        for (const f of fields) delete next[formKey(provider.id, f.key)];
        return next;
      });
      refreshProviderStatus(provider.id);
    } catch (err: any) {
      setStatus(`Connection failed: ${err?.message ?? "Unknown error"}`);
      setStatusType("error");
    } finally {
      setLoading(null);
    }
  };

  const handleSetupSave = async (provider: Provider) => {
    const fields = provider.setupFormFields ?? [];
    const body: Record<string, string> = {};
    for (const f of fields) {
      const val = connectFormData[formKey(provider.id, "setup_" + f.key)]?.trim();
      if (f.key && val) body[f.key] = val;
    }
    if (Object.keys(body).length === 0) {
      setStatus("Please enter API Key and API Secret");
      setStatusType("error");
      return;
    }
    const loadId = `setup-${provider.id}`;
    setLoading(loadId);
    setStatus(null);
    try {
      await authFetch(provider.setupConnectEndpoint!, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setStatus("Shopify App credentials saved. You can now click Connect.");
      setStatusType("success");
      setShowSetupForm(null);
      setConnectFormData((prev) => {
        const next = { ...prev };
        for (const f of fields) delete next[formKey(provider.id, "setup_" + f.key)];
        return next;
      });
      refreshProviderStatus(provider.id);
    } catch (err: any) {
      setStatus(`Save failed: ${err?.message ?? "Unknown error"}`);
      setStatusType("error");
    } finally {
      setLoading(null);
    }
  };

  const handleOAuthConnect = async (provider: Provider) => {
    const queryKey = provider.oauthInstallQueryKey ?? "shop";
    const value = prompt(`Enter your ${queryKey} (e.g. mystore or mystore.myshopify.com):`);
    if (!value?.trim()) return;
    const loadId = `oauth-${provider.id}`;
    setLoading(loadId);
    setStatus(null);
    try {
      const url = `${provider.oauthInstallEndpoint!}?${queryKey}=${encodeURIComponent(value.trim())}`;
      const result = (await authFetch(url)) as { installUrl?: string };
      if (result?.installUrl) window.location.href = result.installUrl;
    } catch (err: any) {
      setStatus(`OAuth failed: ${err?.message ?? "Please use manual connection"}`);
      setStatusType("error");
      setLoading(null);
    }
  };

  const handleAction = async (provider: Provider, action: ActionDef) => {
    if (action.href) return;
    const loadId = `action-${provider.id}-${action.id}`;
    setLoading(loadId);
    setStatus(null);
    try {
      const res = (await authFetch(action.endpoint!, {
        method: (action.method ?? "POST") as RequestInit["method"],
      })) as any;
      setStatus((res?.message as string) ?? "Done.");
      setStatusType("success");
      refreshProviderStatus(provider.id);
    } catch (err: any) {
      setStatus(`Failed: ${err?.message ?? "Unknown error"}`);
      setStatusType("error");
    } finally {
      setLoading(null);
    }
  };

  if (!catalog) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-slate-500">Loading integrations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Channels & integrations</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure channel connectors and sync orders, inventory, and logistics.
        </p>
      </div>

      {/* Channel summary (Unicommerce-style: connected channels at a glance) */}
      {connectedChannels.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Channel summary
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            {connectedChannels.length} channel(s) connected. Trigger sync from Sync & workers.
          </p>
          <div className="flex flex-wrap gap-2">
            {connectedChannels.map((ch) => (
              <span
                key={ch.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-sm font-medium text-emerald-800"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {ch.name}
              </span>
            ))}
          </div>
          <Link
            href="/dashboard/workers"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Open Sync & workers →
          </Link>
        </div>
      )}

      {status && (
        <div
          className={`rounded-lg p-4 ${statusType === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
        >
          {status}
        </div>
      )}

      {catalog.sections.map((section) => (
        <section key={section.id} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <p className="text-sm text-slate-600 mt-0.5">{section.description}</p>
          </div>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 items-start">
            {section.providers.map((provider) => {
              const st = statusByProvider[provider.id] ?? {};
              const isConnected = st.connected === true;
              const colorClass = COLOR_CLASSES[provider.color] ?? "bg-slate-50 text-slate-700 border-slate-200";
              const primaryBtnClass =
                PRIMARY_BUTTON_CLASSES[provider.color] ?? "bg-slate-600 hover:bg-slate-700 text-white";

              return (
                <div
                  key={provider.id}
                  className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                        {provider.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900">{provider.name}</h3>
                          {(provider.setupSteps?.length || provider.setupGuide) && (
                            <button
                              type="button"
                              onClick={() => setGuideProvider(provider)}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200"
                              title="How to configure this integration"
                            >
                              Guide
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {isConnected ? (
                            <>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}
                              >
                                Connected
                              </span>
                              {st.shop && (
                                <span className="text-xs text-slate-500">{st.shop}</span>
                              )}
                              {st.source && (
                                <span className="text-xs text-slate-400">({st.source})</span>
                              )}
                            </>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              Not connected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isConnected ? (
                    <div className="space-y-2">
                      {(provider.actions ?? []).map((action) =>
                        action.href ? (
                          <Link
                            key={action.id}
                            href={action.href}
                            className="block w-full text-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {action.label}
                          </Link>
                        ) : (
                          <button
                            key={action.id}
                            onClick={() => handleAction(provider, action)}
                            disabled={loading === `action-${provider.id}-${action.id}`}
                            className={`w-full rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                              action.primary ? primaryBtnClass : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {loading === `action-${provider.id}-${action.id}`
                              ? "Loading..."
                              : action.label}
                          </button>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {provider.connectType === "oauth" &&
                        provider.oauthInstallEndpoint &&
                        provider.oauthInstallQueryKey && (
                          <>
                            {provider.setupStatusEndpoint && (statusByProvider[provider.id]?.setupConfigured !== true) ? (
                              <div className="space-y-3">
                                {showSetupForm !== provider.id ? (
                                  <button
                                    type="button"
                                    onClick={() => setShowSetupForm(showSetupForm === provider.id ? null : provider.id)}
                                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                                  >
                                    Configure
                                  </button>
                                ) : (
                                  <div className="space-y-3 pt-2 border-t border-slate-200">
                                    {(provider.setupFormFields ?? []).map((field) => (
                                      <div key={field.key}>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">{field.label}</label>
                                        <input
                                          type={field.type ?? "text"}
                                          value={connectFormData[formKey(provider.id, "setup_" + field.key)] ?? ""}
                                          onChange={(e) =>
                                            setConnectFormData((prev) => ({
                                              ...prev,
                                              [formKey(provider.id, "setup_" + field.key)]: e.target.value,
                                            }))
                                          }
                                          placeholder={field.placeholder}
                                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                    ))}
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleSetupSave(provider)}
                                        disabled={loading === `setup-${provider.id}`}
                                        className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                      >
                                        {loading === `setup-${provider.id}` ? "Saving..." : "Save credentials"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setShowSetupForm(null)}
                                        className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOAuthConnect(provider)}
                                disabled={loading === `oauth-${provider.id}`}
                                className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                {loading === `oauth-${provider.id}`
                                  ? "Redirecting..."
                                  : "Connect via OAuth (recommended)"}
                              </button>
                            )}
                          </>
                        )}
                      {provider.connectType === "api_key" &&
                        provider.connectEndpoint &&
                        (provider.connectFormFields?.length ?? 0) > 0 && (
                          <button
                            onClick={() =>
                              setShowConnectForm(showConnectForm === provider.id ? null : provider.id)
                            }
                            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                          >
                            Configure
                          </button>
                        )}
                      {provider.connectType === "manual" && (
                        <button
                          onClick={() =>
                            setStatus(`Connect ${provider.name} via Channels or contact support.`)
                          }
                          className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Connect {provider.name}
                        </button>
                      )}
                    </div>
                  )}

                  {showConnectForm === provider.id &&
                    provider.connectType === "api_key" &&
                    (provider.connectFormFields?.length ?? 0) > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                        {(provider.connectFormFields ?? []).map((field) => (
                          <div key={field.key}>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              {field.label}
                            </label>
                            <input
                              type={field.type ?? "text"}
                              value={connectFormData[formKey(provider.id, field.key)] ?? ""}
                              onChange={(e) =>
                                setConnectFormData((prev) => ({
                                  ...prev,
                                  [formKey(provider.id, field.key)]: e.target.value,
                                }))
                              }
                              placeholder={field.placeholder}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConnectWithApiKey(provider)}
                            disabled={loading === `connect-${provider.id}`}
                            className="flex-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                          >
                            {loading === `connect-${provider.id}` ? "Connecting..." : "Save"}
                          </button>
                          <button
                            onClick={() => {
                              setShowConnectForm(null);
                              setConnectFormData((prev) => {
                                const next = { ...prev };
                                for (const f of provider.connectFormFields ?? [])
                                  delete next[formKey(provider.id, f.key)];
                                return next;
                              });
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
        </section>
      ))}

      <GuideDrawer
        open={!!guideProvider}
        onClose={() => setGuideProvider(null)}
        title={guideProvider ? `How to integrate ${guideProvider.name}` : ""}
        steps={guideProvider?.setupSteps}
        fallbackText={guideProvider?.setupGuide}
      />
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <IntegrationsPageContent />
    </Suspense>
  );
}
