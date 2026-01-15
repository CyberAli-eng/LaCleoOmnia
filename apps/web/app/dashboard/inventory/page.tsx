"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Array<{ sku: string; quantity: number }>>([]);

  const loadInventory = async () => {
    const data = await authFetch("/inventory");
    setInventory(data);
  };

  useEffect(() => {
    loadInventory().catch(() => null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Inventory Counts</h2>
        <p className="mt-2 text-sm text-slate-600">Read-only stock view across marketplaces.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mt-6 space-y-2 text-sm text-slate-600">
          {inventory.map((item) => (
            <div key={item.sku} className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
              <span>{item.sku}</span>
              <span className="text-slate-500">{item.quantity}</span>
            </div>
          ))}
          {inventory.length === 0 && <p>No inventory records yet.</p>}
        </div>
      </div>
    </div>
  );
}
