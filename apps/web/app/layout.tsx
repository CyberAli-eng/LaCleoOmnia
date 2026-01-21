import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LaCleoOmnia | Simplify E-commerce",
  description: "A leading platform to automate order processing, warehouses, inventory, couriers, and marketing for your business.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900`} suppressHydrationWarning>
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-2xl font-bold tracking-tight text-blue-600">
                LaCleo<span className="text-slate-900">Omnia</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-semibold leading-6 text-slate-900 hover:text-blue-600 transition-colors">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all"
              >
                Sign up
              </Link>
            </div>
          </div>
        </nav>
        {children}
        <footer className="border-t border-slate-200 bg-white pb-12 pt-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="text-xl font-bold text-blue-600">
                LaCleo<span className="text-slate-900">Omnia</span>
              </div>
              <p className="text-sm text-slate-500">
                © 2026 LaCleoOmnia Inc. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
