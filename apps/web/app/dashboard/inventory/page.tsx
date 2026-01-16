"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

interface InventoryItem {
  id: number;
  sku: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjustSku, setAdjustSku] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await authFetch("/inventory");
      setInventory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustSku || !adjustDelta) {
      alert("SKU and quantity change are required");
      return;
    }
    try {
      await authFetch("/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: adjustSku,
          delta: Number(adjustDelta),
          reason: adjustReason || "manual_adjustment",
        }),
      });
      await loadInventory();
      setShowAdjustModal(false);
      setAdjustSku("");
      setAdjustDelta("");
      setAdjustReason("");
    } catch (err: any) {
      alert(`Failed to adjust inventory: ${err.message}`);
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = !searchTerm || item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLowStock = !lowStockOnly || item.quantity < 10;
    return matchesSearch && matchesLowStock;
  });

  const totalItems = inventory.length;
  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockItems = inventory.filter((item) => item.quantity < 10).length;
  const outOfStockItems = inventory.filter((item) => item.quantity === 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Inventory Management</h2>
            <p className="mt-2 text-sm text-slate-600">Track and manage stock across all marketplaces.</p>
          </div>
          <button
            onClick={() => setShowAdjustModal(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            + Adjust Inventory
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total SKUs</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalItems}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Quantity</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalQuantity.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Low Stock</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{lowStockItems}</p>
          <p className="mt-1 text-xs text-slate-400">&lt; 10 units</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Out of Stock</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{outOfStockItems}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded"
            />
            Show low stock only (&lt; 10)
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-600">SKU</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600">Quantity</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900">{item.sku}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-semibold text-slate-900">{item.quantity}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.quantity === 0
                          ? "bg-red-50 text-red-700"
                          : item.quantity < 10
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {item.quantity === 0
                        ? "Out of Stock"
                        : item.quantity < 10
                        ? "Low Stock"
                        : "In Stock"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(item.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInventory.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              {searchTerm || lowStockOnly ? "No items match your filters." : "No inventory records yet."}
            </div>
          )}
        </div>
      </div>

      {showAdjustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Adjust Inventory</h3>
              <button
                onClick={() => {
                  setShowAdjustModal(false);
                  setAdjustSku("");
                  setAdjustDelta("");
                  setAdjustReason("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">SKU</label>
                <input
                  type="text"
                  value={adjustSku}
                  onChange={(e) => setAdjustSku(e.target.value)}
                  placeholder="Enter SKU"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Quantity Change (use negative for decrease)
                </label>
                <input
                  type="number"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  placeholder="e.g., -5 or +10"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Reason (optional)</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g., damaged goods, return"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAdjust}
                  disabled={!adjustSku || !adjustDelta}
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adjust Inventory
                </button>
                <button
                  onClick={() => {
                    setShowAdjustModal(false);
                    setAdjustSku("");
                    setAdjustDelta("");
                    setAdjustReason("");
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
