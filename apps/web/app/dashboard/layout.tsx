"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/inventory", label: "Inventory" },
  { href: "/dashboard/integrations", label: "Integrations" },
  { href: "/dashboard/webhooks", label: "Webhooks" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/workers", label: "Workers" },
  { href: "/dashboard/labels", label: "Labels" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
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
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="hidden w-64 border-r border-slate-200 bg-white p-6 lg:block">
          <div className="text-lg font-bold text-blue-600">LaCleoOmnia</div>
          <nav className="mt-8 space-y-2 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          <div className="border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-slate-900">
                Seller Portal{userName ? ` · ${userName}` : ""}
              </div>
              <button
                className="text-sm font-semibold text-slate-600 hover:text-blue-600"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  router.push("/login");
                }}
              >
                Logout
              </button>
            </div>
          </div>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
