"use client";

import { useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/utils/api";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [resetLink, setResetLink] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setMessage("");
        setResetLink(null);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMessage(data.detail || data.message || "Something went wrong.");
                setStatus("error");
                return;
            }
            setMessage(data.message || "If an account exists with this email, you will receive a password reset link.");
            setStatus("success");
            if (data.reset_link) setResetLink(data.reset_link);
        } catch {
            setMessage("Cannot connect to server. Please try again.");
            setStatus("error");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
                        Forgot password
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">
                        Enter your email and we’ll send you a link to reset your password.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {message && (
                        <div
                            className={`rounded-md p-4 text-sm ${
                                status === "error"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-green-50 text-green-700"
                            }`}
                        >
                            {message}
                            {resetLink && (
                                <p className="mt-2 break-all">
                                    <a href={resetLink} className="underline">
                                        Open reset link
                                    </a>
                                </p>
                            )}
                        </div>
                    )}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                            Email address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="relative block w-full rounded-lg border-0 py-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-3">
                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="group relative flex w-full justify-center rounded-lg bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                        >
                            {status === "loading" ? "Sending…" : "Send reset link"}
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
