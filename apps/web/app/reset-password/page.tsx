"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE_URL } from "@/utils/api";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tokenFromUrl = searchParams?.get("token") || "";
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [token, setToken] = useState(tokenFromUrl);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            setMessage("Passwords do not match.");
            setStatus("error");
            return;
        }
        if (password.length < 8) {
            setMessage("Password must be at least 8 characters.");
            setStatus("error");
            return;
        }
        const t = token.trim();
        if (!t) {
            setMessage("Reset link is invalid or missing. Use the link from your email or request a new one.");
            setStatus("error");
            return;
        }
        setStatus("loading");
        setMessage("");
        try {
            const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: t, new_password: password }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMessage(data.detail || data.message || "Something went wrong.");
                setStatus("error");
                return;
            }
            setMessage(data.message || "Password has been reset. You can sign in with your new password.");
            setStatus("success");
            setTimeout(() => router.replace("/login"), 2000);
        } catch {
            setMessage("Cannot connect to server. Please try again.");
            setStatus("error");
        }
    };

    if (!tokenFromUrl && status === "idle") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
                <div className="w-full max-w-md space-y-6 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
                    <h2 className="text-2xl font-bold text-slate-900">Reset password</h2>
                    <p className="text-sm text-slate-600">
                        Use the link from your email to reset your password, or paste the token below.
                    </p>
                    <div>
                        <label htmlFor="token" className="block text-sm font-medium text-slate-700 mb-1">
                            Reset token
                        </label>
                        <input
                            id="token"
                            type="text"
                            className="relative block w-full rounded-lg border-0 py-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                            placeholder="Paste token from email"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                            New password
                        </label>
                        <input
                            id="password"
                            type="password"
                            minLength={8}
                            className="relative block w-full rounded-lg border-0 py-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm mb-2"
                            placeholder="At least 8 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-1">
                            Confirm password
                        </label>
                        <input
                            id="confirm"
                            type="password"
                            minLength={8}
                            className="relative block w-full rounded-lg border-0 py-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                            placeholder="Confirm new password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                        />
                    </div>
                    {message && (
                        <div className={`rounded-md p-4 text-sm ${status === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                            {message}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={status === "loading" || !token.trim() || !password || !confirm}
                        className="w-full rounded-lg bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                        {status === "loading" ? "Resetting…" : "Reset password"}
                    </button>
                    <p className="text-center text-sm text-slate-600">
                        <Link href="/forgot-password" className="text-blue-600 hover:text-blue-500">
                            Request a new link
                        </Link>
                        {" · "}
                        <Link href="/login" className="text-blue-600 hover:text-blue-500">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
                        Set new password
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">
                        Enter your new password below.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {message && (
                        <div
                            className={`rounded-md p-4 text-sm ${
                                status === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                            }`}
                        >
                            {message}
                        </div>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                                New password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={8}
                                className="relative block w-full rounded-lg border-0 py-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                placeholder="At least 8 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-1">
                                Confirm password
                            </label>
                            <input
                                id="confirm"
                                name="confirm"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={8}
                                className="relative block w-full rounded-lg border-0 py-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                placeholder="Confirm new password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="group relative flex w-full justify-center rounded-lg bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                        >
                            {status === "loading" ? "Resetting…" : "Reset password"}
                        </button>
                        <p className="text-center text-sm text-slate-600">
                            <Link href="/login" className="text-blue-600 hover:text-blue-500">
                                Back to sign in
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Loading…</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
