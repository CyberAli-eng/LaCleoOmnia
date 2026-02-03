"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Header from "./Header";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");

  return (
    <>
      {!isDashboard && <Header />}
      <main className="flex-1">{children}</main>
      {!isDashboard && (
        <footer className="mt-auto border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/" className="text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors">
                <span className="text-blue-600">LaCleo</span>Omnia
              </Link>
              <div className="flex flex-wrap items-center gap-6">
                <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                  Terms of Service
                </Link>
                <span className="text-sm text-slate-400">
                  © {new Date().getFullYear()} LaCleoOmnia. All rights reserved.
                </span>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400 max-w-xl">
              Profit & Ops Engine — Live net profit, RTO & lost tracking, and settlement truth for D2C.
            </p>
          </div>
        </footer>
      )}
    </>
  );
}
