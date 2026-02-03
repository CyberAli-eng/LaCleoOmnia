"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("token") ||
    document.cookie
      .split(";")
      .find((c) => c.trim().startsWith("token="))
      ?.split("=")[1]
      ?.trim() ||
    null
  );
}

export default function LandingPage() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setToken(getToken());
  }, [pathname]);

  const isLoggedIn = mounted && !!token;

  return (
    <div className="relative isolate overflow-hidden bg-white">
      {/* Hero */}
      <div className="px-6 pt-14 pb-24 sm:pb-32 lg:px-8 lg:pt-20 lg:pb-36">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            Profit & Ops Engine
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Live net profit.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              RTO & lost. Settled.
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            The single source of truth for D2C finance. Connect Shopify, Delhivery, and ad spend.
            Per-order profit updates in real time—RTO, lost shipments, and settlement reconciliation included.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {!mounted ? (
              <div className="h-12 w-32 animate-pulse rounded-lg bg-slate-200" />
            ) : isLoggedIn ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="rounded-lg bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                >
                  Get started
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border-2 border-slate-300 bg-white px-8 py-4 text-base font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>

        <div
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-blue-200 to-indigo-400 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.5% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>
      </div>

      {/* Features — PRD-aligned */}
      <div className="bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Built for D2C India</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Per-order profit. No Excel.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {[
                {
                  name: "Live net profit",
                  description:
                    "Revenue minus product cost, packaging, forward & reverse shipping, marketing CAC, and payment fees. Updates on every status change.",
                },
                {
                  name: "RTO & lost tracking",
                  description:
                    "Delhivery (and more) status sync. RTO delivered and lost shipment losses applied automatically. Courier loss % on dashboard.",
                },
                {
                  name: "Settlement truth",
                  description:
                    "COD and prepaid settlement reconciliation. Variance flagged so no order is financially complete until settled.",
                },
              ].map((feature) => (
                <div key={feature.name} className="flex flex-col border-l-2 border-blue-600 pl-6">
                  <dt className="text-base font-semibold leading-7 text-slate-900">{feature.name}</dt>
                  <dd className="mt-2 flex flex-auto flex-col text-base leading-7 text-slate-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* CTA strip */}
      <div className="bg-white py-16">
        <div className="mx-auto max-w-3xl text-center px-6">
          <h2 className="text-2xl font-bold text-slate-900">Ready to see real profit?</h2>
          <p className="mt-2 text-slate-600">
            {isLoggedIn ? "Head back to your dashboard to manage orders and profit." : "Connect your store and logistics. Get started in minutes."}
          </p>
          <div className="mt-6">
            {mounted && isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create account
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
