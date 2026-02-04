"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { authFetch } from "@/utils/api";

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

function AuthShopifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shop = searchParams?.get("shop")?.trim() || null;
  const [status, setStatus] = useState<"idle" | "redirecting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shop) {
      setStatus("error");
      setError("Missing shop parameter. Use Dashboard → Channels → Shopify → Connect and enter your store.");
      return;
    }

    const token = getToken();
    if (!token) {
      // Redirect to login with return URL so after login we come back here
      const returnUrl = `/auth/shopify?shop=${encodeURIComponent(shop)}`;
      router.replace(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setStatus("redirecting");
    authFetch(`/channels/shopify/oauth/install?shop=${encodeURIComponent(shop)}`)
      .then((data: { installUrl?: string }) => {
        if (data?.installUrl) {
          window.location.href = data.installUrl;
        } else {
          setError("No install URL returned. Add Shopify App API Key and Secret in Integrations first.");
          setStatus("error");
        }
      })
      .catch((err: Error) => {
        setError(err?.message ?? "Failed to start Shopify connection.");
        setStatus("error");
      });
  }, [shop, router]);

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-slate-900">Shopify connect</h1>
          <p className="mt-2 text-slate-600">{error ?? "Missing shop parameter."}</p>
          <Link
            href="/dashboard/integrations"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to Channels & integrations
          </Link>
        </div>
      </div>
    );
  }

  if (status === "redirecting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100" />
            <p className="text-slate-600">Redirecting to Shopify to authorize {shop}…</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-slate-900">Shopify connect</h1>
          <p className="mt-2 text-red-600">{error}</p>
          <Link
            href="/dashboard/integrations"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to Channels & integrations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-slate-200" />
          <p className="text-slate-600">Loading…</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthShopifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-slate-600">Loading…</p>
        </div>
      }
    >
      <AuthShopifyContent />
    </Suspense>
  );
}
