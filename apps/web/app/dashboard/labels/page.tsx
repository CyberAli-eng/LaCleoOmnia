"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

interface Label {
  id: number;
  orderId?: number | null;
  url: string;
  createdAt: string;
}

export default function LabelsPage() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    loadLabels();
    loadOrders();
  }, []);

  const loadLabels = async () => {
    try {
      const data = await authFetch("/labels");
      setLabels(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load labels:", err);
    }
  };

  const loadOrders = async () => {
    try {
      const data = await authFetch("/orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load orders:", err);
    }
  };

  const generateLabel = async () => {
    if (!selectedOrderId) {
      alert("Please select an order");
      return;
    }
    setLoading(true);
    try {
      await authFetch("/labels/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selectedOrderId }),
      });
      await loadLabels();
      setShowGenerateModal(false);
      setSelectedOrderId(null);
    } catch (err: any) {
      alert(`Failed to generate label: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Shipping Labels</h2>
            <p className="mt-2 text-sm text-slate-600">Generate and download shipping labels for orders.</p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            + Generate Label
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Labels</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{labels.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">With Orders</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {labels.filter((l) => l.orderId).length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">This Month</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {labels.filter((l) => {
              const labelDate = new Date(l.createdAt);
              const now = new Date();
              return labelDate.getMonth() === now.getMonth() && labelDate.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Generated Labels</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Label ID</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Order ID</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Created</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((label) => (
                <tr key={label.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900">#{label.id}</span>
                  </td>
                  <td className="py-3 px-4">
                    {label.orderId ? (
                      <span className="text-slate-600">#{label.orderId}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(label.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <a
                      href={label.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-500 font-medium"
                    >
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {labels.length === 0 && (
            <div className="py-12 text-center text-slate-500">No labels generated yet.</div>
          )}
        </div>
      </div>

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Generate Shipping Label</h3>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setSelectedOrderId(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Select Order
                </label>
                <select
                  value={selectedOrderId || ""}
                  onChange={(e) => setSelectedOrderId(Number(e.target.value) || null)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an order...</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      #{order.externalId || order.id} - {order.source} - {order.status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={generateLabel}
                  disabled={loading || !selectedOrderId}
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Generating..." : "Generate Label"}
                </button>
                <button
                  onClick={() => {
                    setShowGenerateModal(false);
                    setSelectedOrderId(null);
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
