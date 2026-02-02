"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

const getToken = (): string | null => {
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
};

const getUserName = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.name || parsed?.email || null;
  } catch {
    return null;
  }
};

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setToken(getToken());
    setUserName(getUserName());
  }, [pathname]);

  const isLoggedIn = mounted && !!token;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setToken(null);
    setUserName(null);
    setAccountOpen(false);
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 transition-colors hover:text-blue-600"
        >
          <span className="text-blue-600">LaCleo</span>
          <span>Omnia</span>
        </Link>

        <div className="flex items-center gap-3">
          {!mounted ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200" />
          ) : isLoggedIn ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen(!accountOpen)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-expanded={accountOpen}
                aria-haspopup="true"
              >
                <span className="truncate max-w-[120px]">{userName || "Account"}</span>
                <svg
                  className={`h-4 w-4 text-slate-500 transition-transform ${accountOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {accountOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden="true"
                    onClick={() => setAccountOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-52 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setAccountOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/privacy"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setAccountOpen(false)}
                    >
                      Privacy Policy
                    </Link>
                    <Link
                      href="/terms"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setAccountOpen(false)}
                    >
                      Terms of Service
                    </Link>
                    <hr className="my-1 border-slate-100" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
