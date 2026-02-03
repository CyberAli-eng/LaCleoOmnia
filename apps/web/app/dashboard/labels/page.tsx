"use client";

import { useEffect, useState, useMemo } from "react";
import { authFetch } from "@/utils/api";
import { formatCurrency } from "@/utils/currency";
import Link from "next/link";
import { TablePagination } from "@/app/components/TablePagination";

interface Label {
  id: string;
  orderId: string;
  trackingNumber: string;
  carrier: string;
  status: string;
  createdAt: string;
}

interface ShipmentRow {
  id: string;
  orderId: string;
  courierName: string;
  awbNumber: string;
  trackingUrl?: string | null;
  labelUrl?: string | null;
  status: string;
  forwardCost: number;
  reverseCost: number;
  shippedAt?: string | null;
  lastSyncedAt?: string | null;
  createdAt: string;
}

const COURIERS = [
  { id: "shiprocket", name: "Shiprocket", icon: "🚚" },
  { id: "delhivery", name: "Delhivery", icon: "📦" },
  { id: "selloship", name: "Selloship", icon: "📦" },
  { id: "bluedart", name: "BlueDart", icon: "✈️" },
  { id: "fedex", name: "FedEx", icon: "📮" },
  { id: "dhl", name: "DHL", icon: "🌐" },
  { id: "standard", name: "Standard", icon: "📋" },
];

export default function LabelsPage() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<string>("shiprocket");
  const [awbNumber, setAwbNumber] = useState("");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<{ waybill: string; shippingLabel: string } | null>(null);
  const [pageLabels, setPageLabels] = useState(1);
  const [pageSizeLabels, setPageSizeLabels] = useState(10);
  const [pageShipments, setPageShipments] = useState(1);
  const [pageSizeShipments, setPageSizeShipments] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [labelsRes, ordersRes, shipmentsRes] = await Promise.all([
        authFetch("/labels").catch(() => []),
        authFetch("/orders").catch(() => ({ orders: [] })),
        authFetch("/shipments").catch(() => ({ shipments: [] })),
      ]);
      const labelsList = Array.isArray(labelsRes) ? labelsRes : (labelsRes?.labels ?? []);
      setLabels(labelsList);
      setOrders(Array.isArray(ordersRes?.orders) ? ordersRes.orders : []);
      const list = Array.isArray(shipmentsRes?.shipments) ? shipmentsRes.shipments : [];
      setShipments(list);
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  };

  /** Generate waybill + label via Selloship API, then create shipment. */
  const generateSelloshipLabel = async () => {
    if (!selectedOrderId) {
      alert("Please select an order");
      return;
    }
    setLoading(true);
    setGenerateSuccess(null);
    try {
      const res = await authFetch("/shipments/generate-label", {
        method: "POST",
        body: JSON.stringify({ order_id: selectedOrderId, courier_name: "selloship" }),
      }) as { waybill?: string; shippingLabel?: string; courierName?: string };
      const waybill = res?.waybill ?? "";
      const shippingLabel = res?.shippingLabel ?? "";
      if (!waybill) {
        alert("No waybill returned. Check Selloship connection in Integrations.");
        return;
      }
      await authFetch("/shipments", {
        method: "POST",
        body: JSON.stringify({
          order_id: selectedOrderId,
          awb_number: waybill,
          courier_name: "selloship",
          label_url: shippingLabel || undefined,
          tracking_url: shippingLabel ? undefined : `https://track.selloship.com/${waybill}`,
          forward_cost: 0,
          reverse_cost: 0,
        }),
      });
      setGenerateSuccess({ waybill, shippingLabel });
      await loadData();
      if (shippingLabel) {
        window.open(shippingLabel, "_blank");
      }
    } catch (err: any) {
      alert(err?.message ?? "Failed to generate Selloship label. Connect Selloship in Integrations → Logistics.");
    } finally {
      setLoading(false);
    }
  };

  const generateLabel = async () => {
    if (!selectedOrderId) {
      alert("Please select an order");
      return;
    }
    if (selectedCourier === "selloship") {
      await generateSelloshipLabel();
      return;
    }
    setLoading(true);
    setGenerateSuccess(null);
    try {
      await authFetch(`/orders/${selectedOrderId}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courier_name: COURIERS.find((c) => c.id === selectedCourier)?.name || selectedCourier,
          awb_number: awbNumber || `AWB${Date.now()}`,
          tracking_url: `https://track.${selectedCourier}.com/${awbNumber || Date.now()}`,
        }),
      });
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
  const paginatedLabels = useMemo(() => {
    const start = (pageLabels - 1) * pageSizeLabels;
    return labels.slice(start, start + pageSizeLabels);
  }, [labels, pageLabels, pageSizeLabels]);
  const paginatedShipments = useMemo(() => {
    const start = (pageShipments - 1) * pageSizeShipments;
    return shipments.slice(start, start + pageSizeShipments);
  }, [shipments, pageShipments, pageSizeShipments]);

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
              {paginatedLabels.map((label) => (
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
                        #{order.channelOrderId} - {order.customerName} - {formatCurrency(order.orderTotal)}
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
              {selectedCourier === "selloship" && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  Selloship: we&apos;ll generate the waybill and label PDF automatically. No AWB needed.
                </div>
              )}
              {selectedCourier !== "selloship" && (
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
              )}
              {generateSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  <p className="font-medium">Label generated</p>
                  <p className="mt-1">AWB: <span className="font-mono">{generateSuccess.waybill}</span></p>
                  {generateSuccess.shippingLabel && (
                    <a
                      href={generateSuccess.shippingLabel}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-blue-600 hover:underline"
                    >
                      Download label PDF →
                    </a>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={generateLabel}
                  disabled={loading || !selectedOrderId}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "Generating..."
                    : selectedCourier === "selloship"
                    ? "Generate waybill & label (Selloship)"
                    : "Generate & Ship"}
                </button>
                <button
                  onClick={() => {
                    setShowGenerateModal(false);
                    setSelectedOrderId(null);
                    setAwbNumber("");
                    setGenerateSuccess(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {generateSuccess ? "Done" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shipments (with label URLs) */}
      {shipments.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="text-base font-semibold text-slate-900">Shipments</h2>
            <p className="text-xs text-slate-500 mt-0.5">AWB, courier, status, and label download</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Order</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">AWB</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Courier</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Label</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Created</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShipments.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/orders/${s.orderId}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        #{orders.find((o) => o.id === s.orderId)?.channelOrderId ?? s.orderId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900">{s.awbNumber}</td>
                    <td className="py-3 px-4 text-slate-700">{s.courierName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {s.labelUrl ? (
                        <a href={s.labelUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          Download label
                        </a>
                      ) : s.trackingUrl ? (
                        <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="text-slate-600 hover:underline">
                          Track
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.createdAt ? new Date(s.createdAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shipments.length > 0 && (
            <TablePagination
              currentPage={pageShipments}
              totalItems={shipments.length}
              pageSize={pageSizeShipments}
              onPageChange={setPageShipments}
              onPageSizeChange={(size) => { setPageSizeShipments(size); setPageShipments(1); }}
              itemLabel="shipments"
            />
          )}
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
