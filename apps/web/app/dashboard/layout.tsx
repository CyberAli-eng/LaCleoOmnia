"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCookie, deleteCookie, setCookie } from "@/utils/cookies";
import { authFetch } from "@/utils/api";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/orders", label: "Orders", icon: "📦" },
  { href: "/dashboard/inventory", label: "Inventory", icon: "📋" },
  { href: "/dashboard/integrations", label: "Integrations", icon: "🔌" },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: "🔔" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "📈" },
  { href: "/dashboard/workers", label: "Workers", icon: "⚙️" },
  { href: "/dashboard/labels", label: "Labels", icon: "🏷️" },
  { href: "/dashboard/audit", label: "Audit Logs", icon: "📝" },
  { href: "/dashboard/users", label: "Users", icon: "👥" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = getCookie("token") || localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!localStorage.getItem("token") && token) {
      localStorage.setItem("token", token);
    }
    if (!getCookie("token") && token) {
      setCookie("token", token, 7);
    }
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserName(parsed?.name || parsed?.email || null);
      } catch {
        setUserName(null);
      }
    }
    loadIntegrations();
  }, [router]);

  const loadIntegrations = async () => {
    try {
      const data = await authFetch("/config/status");
      setIntegrations(data?.integrations || []);
    } catch (err) {
      console.error("Failed to load integrations:", err);
    }
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/orders?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getChannelStatus = (type: string) => {
    const integration = integrations.find((i) => i.type === type);
    return integration?.status === "CONNECTED" ? "✅" : "❌";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-72 border-r border-slate-200 bg-white lg:block">
          <div className="p-6">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600 hover:text-blue-700 block">
              LaCleoOmnia
            </Link>
            <p className="mt-1 text-xs text-slate-500">Order Management System</p>
          </div>

          {/* Global Search */}
          <div className="px-6 mb-6">
            <form onSubmit={handleGlobalSearch}>
              <input
                type="text"
                placeholder="Search orders, customers, SKUs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </form>
          </div>

          {/* Channel Badges */}
          <div className="px-6 mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Channels</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">Shopify</span>
                <span>{getChannelStatus("SHOPIFY")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">Amazon</span>
                <span>{getChannelStatus("AMAZON")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">Flipkart</span>
                <span>{getChannelStatus("FLIPKART")}</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="px-6 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="px-6 mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Quick Actions</p>
            <div className="space-y-1">
              <Link
                href="/dashboard/integrations"
                className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                + Import Orders
              </Link>
              <Link
                href="/dashboard/orders"
                className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Create Shipment
              </Link>
              <Link
                href="/dashboard/labels"
                className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Print Labels
              </Link>
              <button
                onClick={() => {
                  // TODO: Trigger sync
                  alert("Sync started");
                }}
                className="w-full text-left rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Sync Now
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  {mounted && userName ? userName : "Dashboard"}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Seller Portal</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Quick Actions
                </button>
              <div className="flex items-center gap-4">
                <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-700">
                  Privacy
                </Link>
                <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-700">
                  Terms
                </Link>
              <div className="flex items-center gap-4">
                <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-700 hidden sm:block">
                  Privacy
                </Link>
                <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-700 hidden sm:block">
                  Terms
                </Link>
                <button
                  className="text-sm font-semibold text-slate-600 hover:text-blue-600"
                  onClick={() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    deleteCookie("token");
                    router.replace("/login");
                  }}
                >
                  Logout
                </button>
              </div>
              </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Dropdown */}
          {showQuickActions && (
            <div className="absolute top-16 right-6 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[200px]">
              <div className="p-2">
                <Link
                  href="/dashboard/integrations"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors"
                  onClick={() => setShowQuickActions(false)}
                >
                  Import Orders
                </Link>
                <Link
                  href="/dashboard/orders"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors"
                  onClick={() => setShowQuickActions(false)}
                >
                  Create Shipment
                </Link>
                <Link
                  href="/dashboard/labels"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors"
                  onClick={() => setShowQuickActions(false)}
                >
                  Print Labels
                </Link>
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    // TODO: Trigger sync
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors"
                >
                  Sync Now
                </button>
              </div>
            </div>
          )}

          {/* Page Content */}
          <div className="flex-1 p-6 overflow-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
