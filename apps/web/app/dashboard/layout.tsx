"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCookie, deleteCookie, setCookie } from "@/utils/cookies";
import { authFetch } from "@/utils/api";

const navItemsBase = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/orders", label: "Orders", icon: "📦" },
  { href: "/dashboard/inventory", label: "Inventory", icon: "📋" },
  { href: "/dashboard/costs", label: "SKU Costs", icon: "💰" },
  { href: "/dashboard/integrations", label: "Integrations", icon: "🔌" },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: "🔔" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "📈" },
  { href: "/dashboard/workers", label: "Workers", icon: "⚙️" },
  { href: "/dashboard/labels", label: "Labels", icon: "🏷️" },
  { href: "/dashboard/audit", label: "Audit Logs", icon: "📝" },
];
const navItemUsers = { href: "/dashboard/users", label: "Users", icon: "👥" };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [connectedChannels, setConnectedChannels] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("dashboard-sidebar-collapsed") === "true";
  });

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("dashboard-sidebar-collapsed");
      setSidebarCollapsed(stored === "true");
    } catch {}
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
        setUserRole(parsed?.role ?? null);
      } catch {
        setUserName(null);
        setUserRole(null);
      }
    }
    // Refresh user role from API (e.g. so admin sees Users menu)
    authFetch("/auth/me")
      .then((user: { role?: string }) => {
        if (user?.role) setUserRole(user.role);
      })
      .catch(() => {});
    loadIntegrations();
    loadConnectedChannels();
  }, [router, pathname]);

  const loadIntegrations = async () => {
    try {
      const configData = await authFetch("/config/status").catch(() => ({ integrations: [] }));
      setIntegrations(configData?.integrations || []);
    } catch (err) {
      console.error("Failed to load integrations:", err);
    }
  };

  const loadConnectedChannels = async () => {
    try {
      const list = await authFetch("/integrations/connected-summary").catch(() => []);
      setConnectedChannels(Array.isArray(list) ? list : []);
    } catch {
      setConnectedChannels([]);
    }
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/orders?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navItems = userRole === "ADMIN"
    ? [...navItemsBase, navItemUsers]
    : navItemsBase;

  const closeSidebar = () => setSidebarOpen(false);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("dashboard-sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar: overlay on mobile, static on lg; collapsible on desktop with <-- --> */}
        <aside
          className={`
            fixed top-0 left-0 z-50 h-full border-r border-slate-200 bg-white shadow-xl
            transform transition-[transform,width] duration-200 ease-out lg:relative lg:z-auto lg:translate-x-0 lg:shadow-none
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            ${sidebarCollapsed ? "lg:w-16 w-72 max-w-[85vw]" : "lg:w-72 w-72 max-w-[85vw]"}
          `}
        >
          <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden">
            <div className={`flex items-center justify-between shrink-0 ${sidebarCollapsed ? "lg:flex-col lg:px-0 lg:py-4 lg:gap-2 p-4 lg:p-2" : "p-4 lg:p-6"}`}>
              <div className={`min-w-0 ${sidebarCollapsed ? "lg:flex lg:flex-col lg:items-center" : ""}`}>
                <Link
                  href="/"
                  onClick={closeSidebar}
                  className="text-xl font-bold text-blue-600 hover:text-blue-700 block truncate"
                  title="LaCleoOmnia"
                >
                  {sidebarCollapsed ? "L" : "LaCleoOmnia"}
                </Link>
                {!sidebarCollapsed && <p className="mt-1 text-xs text-slate-500">Order Management System</p>}
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                className="lg:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

          {/* Global Search - hide when collapsed */}
          {!sidebarCollapsed && (
          <div className="px-6 mb-6 shrink-0">
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
          )}

          {/* Connected channels only - dynamic from API */}
          {!sidebarCollapsed && connectedChannels.length > 0 && (
          <div className="px-6 mb-6 shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Channels</p>
            <div className="space-y-2">
              {connectedChannels.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 truncate">{ch.name}</span>
                  <span className="text-green-600 shrink-0" title="Connected">✓</span>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Navigation */}
          <nav className={`${sidebarCollapsed ? "lg:px-2 px-6" : "px-6"} space-y-1 flex-1`}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`flex items-center rounded-lg transition-colors ${
                    sidebarCollapsed ? "lg:justify-center lg:px-2 gap-3 px-3 py-2.5" : "gap-3 px-3 py-2.5"
                  } ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{item.icon}</span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions - hide when collapsed */}
          {!sidebarCollapsed && (
          <div className="px-6 mt-8 pt-6 border-t border-slate-200 shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Quick Actions</p>
            <div className="space-y-1">
              <Link
                href="/dashboard/integrations"
                onClick={closeSidebar}
                className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                + Import Orders
              </Link>
              <Link
                href="/dashboard/orders"
                onClick={closeSidebar}
                className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Create Shipment
              </Link>
              <Link
                href="/dashboard/labels"
                onClick={closeSidebar}
                className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Print Labels
              </Link>
              <button
                onClick={() => {
                  alert("Sync started");
                }}
                className="w-full text-left rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Sync Now
              </button>
            </div>
          </div>
          )}

          {/* Collapse / Expand toggle - desktop only */}
          <div className="hidden lg:block shrink-0 border-t border-slate-200 p-2">
            <button
              type="button"
              onClick={toggleSidebarCollapse}
              className="w-full flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
              aria-label={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
            >
              {sidebarCollapsed ? (
                <span className="text-lg" aria-hidden="true">&#8594;</span>
              ) : (
                <span className="text-lg" aria-hidden="true">&#8592;</span>
              )}
            </button>
          </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header: menu (mobile) + greeting + Quick Actions + Account dropdown */}
          <div className="relative border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Open menu"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-slate-900 truncate">
                    {mounted && userName ? `Hi, ${userName}` : "Dashboard"}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">Profit & Ops Engine</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Quick Actions
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountOpen(!accountOpen)}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    aria-expanded={accountOpen}
                    aria-haspopup="true"
                  >
                    <span className="truncate max-w-[100px]">{userName || "Account"}</span>
                    <svg className={`h-4 w-4 text-slate-500 transition-transform ${accountOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {accountOpen && (
                    <>
                      <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setAccountOpen(false)} />
                      <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        <Link href="/privacy" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setAccountOpen(false)}>Privacy</Link>
                        <Link href="/terms" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setAccountOpen(false)}>Terms</Link>
                        <button
                          type="button"
                          className="block w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setAccountOpen(false);
                            localStorage.removeItem("token");
                            localStorage.removeItem("user");
                            deleteCookie("token");
                            router.replace("/login");
                          }}
                        >
                          Log out
                        </button>
                      </div>
                    </>
                  )}
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
