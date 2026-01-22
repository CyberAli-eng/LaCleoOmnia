"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";
import Link from "next/link";

interface Label {
  id: string;
  orderId: string;
  trackingNumber: string;
  carrier: string;
  status: string;
  createdAt: string;
}

const COURIERS = [
  { id: "shiprocket", name: "Shiprocket", icon: "🚚" },
  { id: "delhivery", name: "Delhivery", icon: "📦" },
  { id: "bluedart", name: "BlueDart", icon: "✈️" },
  { id: "fedex", name: "FedEx", icon: "📮" },
  { id: "dhl", name: "DHL", icon: "🌐" },
  { id: "standard", name: "Standard", icon: "📋" },
];

export default function LabelsPage() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<string>("shiprocket");
  const [awbNumber, setAwbNumber] = useState("");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [labelsData, ordersData] = await Promise.all([
        authFetch("/labels").catch(() => []),
        authFetch("/orders").catch(() => ({ orders: [] })),
      ]);
      setLabels(Array.isArray(labelsData) ? labelsData : []);
      setOrders(Array.isArray(ordersData?.orders) ? ordersData.orders : []);
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  };

  const generateLabel = async () => {
    if (!selectedOrderId) {
      alert("Please select an order");
      return;
    }
    setLoading(true);
    try {
      // First, ship the order with courier info
      await authFetch(`/orders/${selectedOrderId}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courier_name: COURIERS.find((c) => c.id === selectedCourier)?.name || selectedCourier,
          awb_number: awbNumber || `AWB${Date.now()}`,
          tracking_url: `https://track.${selectedCourier}.com/${awbNumber || Date.now()}`,
        }),
      });
      
      // Then generate label
      await authFetch("/labels/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selectedOrderId }),
      });
      
      await loadData();
      setShowGenerateModal(false);
      setSelectedOrderId(null);
      setAwbNumber("");
    } catch (err: any) {
      alert(`Failed to generate label: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const printLabel = (label: Label) => {
    // In production, this would open the actual label PDF
    window.open(`/api/labels/${label.id}/print`, "_blank");
  };

  const downloadInvoice = (orderId: string) => {
    // In production, this would generate and download invoice
    window.open(`/api/orders/${orderId}/invoice`, "_blank");
  };

  const totalLabels = labels.length;
  const pendingLabels = labels.filter((l) => l.status === "PENDING").length;
  const shippedLabels = labels.filter((l) => l.status !== "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipping Labels</h1>
          <p className="mt-1 text-sm text-slate-600">Generate, print, and track shipping labels</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Generate Label
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Labels</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalLabels}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{pendingLabels}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Shipped</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{shippedLabels}</p>
        </div>
      </div>

      {/* Labels Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Order ID</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Tracking Number</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Carrier</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Created</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((label) => (
                <tr key={label.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <Link
                      href={`/dashboard/orders/${label.orderId}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      #{label.orderId}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-slate-900">{label.trackingNumber}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-700">{label.carrier}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        label.status === "PENDING"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {label.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(label.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => printLabel(label)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        Print
                      </button>
                      <button
                        onClick={() => downloadInvoice(label.orderId)}
                        className="text-purple-600 hover:text-purple-700 text-xs font-medium"
                      >
                        Invoice
                      </button>
                      <button
                        onClick={() => setSelectedLabel(label)}
                        className="text-slate-600 hover:text-slate-700 text-xs font-medium"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {labels.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-slate-500 mb-4">No labels generated yet</p>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Generate First Label
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Generate Shipping Label</h3>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setSelectedOrderId(null);
                  setAwbNumber("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Order</label>
                <select
                  value={selectedOrderId || ""}
                  onChange={(e) => setSelectedOrderId(e.target.value || null)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an order...</option>
                  {orders
                    .filter((o) => o.status === "PACKED" || o.status === "CONFIRMED")
                    .map((order) => (
                      <option key={order.id} value={order.id}>
                        #{order.channelOrderId} - {order.customerName} - ${order.orderTotal.toFixed(2)}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Courier</label>
                <div className="grid grid-cols-3 gap-2">
                  {COURIERS.map((courier) => (
                    <button
                      key={courier.id}
                      onClick={() => setSelectedCourier(courier.id)}
                      className={`rounded-lg border-2 p-3 text-center transition-colors ${
                        selectedCourier === courier.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-2xl mb-1">{courier.icon}</div>
                      <div className="text-xs font-medium text-slate-700">{courier.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  AWB Number (optional - auto-generated if empty)
                </label>
                <input
                  type="text"
                  value={awbNumber}
                  onChange={(e) => setAwbNumber(e.target.value)}
                  placeholder="Enter AWB number"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={generateLabel}
                  disabled={loading || !selectedOrderId}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Generating..." : "Generate & Ship"}
                </button>
                <button
                  onClick={() => {
                    setShowGenerateModal(false);
                    setSelectedOrderId(null);
                    setAwbNumber("");
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Label Detail Modal */}
      {selectedLabel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Label Details</h3>
              <button
                onClick={() => setSelectedLabel(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Order ID</p>
                  <p className="mt-1 font-medium text-slate-900">#{selectedLabel.orderId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tracking Number</p>
                  <p className="mt-1 font-mono text-slate-900">{selectedLabel.trackingNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Carrier</p>
                  <p className="mt-1 text-slate-900">{selectedLabel.carrier}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedLabel.status === "PENDING"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {selectedLabel.status}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => printLabel(selectedLabel)}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Print Label
                </button>
                <button
                  onClick={() => downloadInvoice(selectedLabel.orderId)}
                  className="flex-1 rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                >
                  Download Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
