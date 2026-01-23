"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/utils/api";
import Link from "next/link";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [shopDomain, setShopDomain] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const data = await authFetch("/config/status");
      setIntegrations(data?.integrations || []);
      
      // If already has integrations, mark step 1 as complete
      if (data?.integrations?.length > 0) {
        setStep(2);
      }
    } catch (err) {
      console.error("Failed to load integrations:", err);
    }
  };

  const handleConnectShopify = async () => {
    if (!shopDomain) {
      alert("Please enter your Shopify store domain");
      return;
    }

    setLoading(true);
    try {
      const result = await authFetch(`/channels/shopify/oauth/install?shop=${encodeURIComponent(shopDomain)}`);
      if (result.installUrl) {
        // Redirect to Shopify OAuth
        window.location.href = result.installUrl;
      }
    } catch (err: any) {
      alert(`Failed to connect: ${err.message || "Unknown error"}`);
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setStep(step + 1);
  };

  const handleComplete = () => {
    setCompleted(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Setup Complete!</h2>
          <p className="text-slate-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Skip onboarding →
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to LaCleoOmnia</h1>
          <p className="text-slate-600 mb-8">Let's get your store set up in a few simple steps</p>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step >= s
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {step > s ? "✓" : s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        step > s ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Connect Store</span>
              <span>Warehouse</span>
              <span>Import Data</span>
              <span>Shipping</span>
            </div>
          </div>

          {/* Step 1: Connect Shopify */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Connect Your Shopify Store</h2>
                <p className="text-slate-600 mb-6">
                  Connect your Shopify store to start managing orders and inventory in one place.
                </p>
              </div>

              {integrations.length > 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                  <p className="text-emerald-800 font-medium mb-2">✅ Store Connected!</p>
                  <p className="text-emerald-700 text-sm">
                    {integrations.length} store{integrations.length !== 1 ? "s" : ""} connected
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Shopify Store Domain
                    </label>
                    <input
                      type="text"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      placeholder="your-store.myshopify.com or your-store"
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Enter your store domain (e.g., "mystore" or "mystore.myshopify.com")
                    </p>
                  </div>
                  <button
                    onClick={handleConnectShopify}
                    disabled={loading || !shopDomain}
                    className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Connecting..." : "Connect via OAuth"}
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900"
                >
                  Skip for now
                </button>
                {integrations.length > 0 && (
                  <button
                    onClick={() => setStep(2)}
                    className="ml-auto rounded-lg bg-blue-600 px-6 py-2 text-white font-semibold hover:bg-blue-700"
                  >
                    Continue →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Warehouse Setup */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Set Up Warehouse</h2>
                <p className="text-slate-600 mb-6">
                  Configure your warehouse or fulfillment location for inventory management.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  💡 Default warehouse "Main Warehouse" will be created automatically. You can add more warehouses later in Settings.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="ml-auto rounded-lg bg-blue-600 px-6 py-2 text-white font-semibold hover:bg-blue-700"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Import Data */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Import Orders & Products</h2>
                <p className="text-slate-600 mb-6">
                  Import your existing orders and products to get started quickly.
                </p>
              </div>

              {integrations.length > 0 ? (
                <div className="space-y-4">
                  {integrations.map((integration) => (
                    <div key={integration.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{integration.sellerName || integration.shopDomain}</p>
                          <p className="text-sm text-slate-600">{integration.type}</p>
                        </div>
                        <button
                          onClick={async () => {
                            setLoading(true);
                            try {
                              await authFetch(`/channels/shopify/import-orders`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ account_id: integration.id }),
                              });
                              alert("Orders imported successfully!");
                            } catch (err: any) {
                              alert(`Import failed: ${err.message}`);
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          {loading ? "Importing..." : "Import Orders"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-slate-600 text-sm">
                    Connect a store first to import orders and products.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="ml-auto rounded-lg bg-blue-600 px-6 py-2 text-white font-semibold hover:bg-blue-700"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Shipping Setup */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Configure Shipping</h2>
                <p className="text-slate-600 mb-6">
                  Set up your shipping provider to generate labels and track shipments.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  💡 Shipping integrations (Shiprocket, Delhivery, etc.) can be configured later in the Labels section.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900"
                >
                  ← Back
                </button>
                <button
                  onClick={handleComplete}
                  className="ml-auto rounded-lg bg-blue-600 px-6 py-2 text-white font-semibold hover:bg-blue-700"
                >
                  Complete Setup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
