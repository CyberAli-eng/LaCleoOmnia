"use client";

import { useEffect, useState, useMemo } from "react";
import { authFetch } from "@/utils/api";
import { TablePagination } from "@/app/components/TablePagination";

interface InventoryItem {
  id: string;
  warehouseId: string;
  warehouse: {
    id: string;
    name: string;
    city?: string;
    state?: string;
  };
  variantId: string;
  variant: {
    id: string;
    sku: string;
    product: {
      id: string;
      title: string;
      brand?: string;
    };
  };
  totalQty: number;
  reservedQty: number;
  availableQty: number;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjustSku, setAdjustSku] = useState("");
  const [adjustWarehouse, setAdjustWarehouse] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [shopifyInventory, setShopifyInventory] = useState<{ sku: string; product_name: string; available: number; location: string }[]>([]);
  const [shopifyInventoryWarning, setShopifyInventoryWarning] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageShopify, setPageShopify] = useState(1);
  const [pageSizeShopify, setPageSizeShopify] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedWarehouse, lowStockOnly]);

  const handleSyncShopify = async () => {
    setSyncing(true);
    try {
      const res = await authFetch("/integrations/shopify/sync", { method: "POST" }) as { orders_synced?: number; inventory_synced?: number; message?: string };
      alert(res?.message ?? `Synced. Inventory: ${res?.inventory_synced ?? 0} records.`);
      await loadData();
    } catch (err: any) {
      alert(`Sync failed: ${err?.message ?? "Unknown error"}`);
    } finally {
      setSyncing(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setShopifyInventoryWarning(null);
    try {
      const [inventoryData, warehousesData, shopifyData] = await Promise.all([
        authFetch("/inventory").catch(() => ({ inventory: [] })),
        authFetch("/warehouses").catch(() => ({ warehouses: [] })),
        authFetch("/integrations/shopify/inventory").catch(() => ({ inventory: [], warning: null })),
      ]);
      setInventory(Array.isArray(inventoryData?.inventory) ? inventoryData.inventory : []);
      setWarehouses(Array.isArray(warehousesData?.warehouses) ? warehousesData.warehouses : []);
      setShopifyInventory(Array.isArray(shopifyData?.inventory) ? shopifyData.inventory : []);
      if (shopifyData?.warning && typeof shopifyData.warning === "string") {
        setShopifyInventoryWarning(shopifyData.warning);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustSku || !adjustDelta || !adjustWarehouse) {
      alert("SKU, warehouse, and quantity change are required");
      return;
    }
    try {
      await authFetch("/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: adjustSku,
          warehouseId: adjustWarehouse,
          qtyDelta: Number(adjustDelta),
          reason: adjustReason || "manual_adjustment",
        }),
      });
      await loadData();
      setShowAdjustModal(false);
      setAdjustSku("");
      setAdjustDelta("");
      setAdjustReason("");
      setAdjustWarehouse("");
    } catch (err: any) {
      alert(`Failed to adjust inventory: ${err.message}`);
    }
  };

  // Unified display: prefer local DB; when empty, show Shopify live data in same table shape
  const displayInventory: InventoryItem[] =
    inventory.length > 0
      ? inventory
      : shopifyInventory.map((row, idx) => ({
          id: `shopify-${row.sku}-${row.location}-${idx}`,
          warehouseId: "shopify-live",
          warehouse: { id: "shopify-live", name: "Shopify (live)", city: undefined, state: undefined },
          variantId: `shopify-${row.sku}`,
          variant: {
            id: `shopify-${row.sku}`,
            sku: row.sku,
            product: { id: "", title: row.product_name || row.sku, brand: undefined },
          },
          totalQty: row.available,
          reservedQty: 0,
          availableQty: row.available,
        }));

  const filteredInventory = displayInventory.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.variant.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.variant.product?.title || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse = selectedWarehouse === "all" || item.warehouseId === selectedWarehouse;
    const matchesLowStock = !lowStockOnly || item.availableQty < 10;
    return matchesSearch && matchesWarehouse && matchesLowStock;
  });

  const paginatedInventory = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredInventory.slice(start, start + pageSize);
  }, [filteredInventory, page, pageSize]);

  const paginatedShopifyInventory = useMemo(() => {
    const start = (pageShopify - 1) * pageSizeShopify;
    return shopifyInventory.slice(start, start + pageSizeShopify);
  }, [shopifyInventory, pageShopify, pageSizeShopify]);

  const totalItems = new Set(displayInventory.map((i) => i.variant.sku)).size;
  const totalQuantity = displayInventory.reduce((sum, item) => sum + item.totalQty, 0);
  const reservedQuantity = displayInventory.reduce((sum, item) => sum + item.reservedQty, 0);
  const availableQuantity = displayInventory.reduce((sum, item) => sum + item.availableQty, 0);
  const lowStockItems = displayInventory.filter((item) => item.availableQty < 10 && item.availableQty > 0).length;
  const outOfStockItems = displayInventory.filter((item) => item.availableQty === 0).length;
  const isShowingShopifyOnly = inventory.length === 0 && shopifyInventory.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
          <p className="mt-1 text-sm text-slate-600">Track and manage stock across warehouses</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncShopify}
            disabled={syncing}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync Shopify"}
          </button>
          <button
            onClick={() => setShowAdjustModal(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Adjust Inventory
          </button>
        </div>
      </div>
      {isShowingShopifyOnly && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
          Showing live inventory from Shopify. Click &quot;Sync Shopify&quot; to copy into your warehouse so you can adjust and track here.
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total SKUs</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalItems}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Stock</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalQuantity.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Reserved</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{reservedQuantity.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Available</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{availableQuantity.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Low Stock</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{lowStockItems}</p>
          <p className="mt-1 text-xs text-slate-400">&lt; 10 available</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by SKU or product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
            {shopifyInventory.length > 0 && (
              <option value="shopify-live">Shopify (live)</option>
            )}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600 px-4">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded"
            />
            Low stock only
          </label>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">SKU</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Product</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Warehouse</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Total</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Reserved</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Available</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInventory.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900">{item.variant.sku}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-slate-900">{item.variant.product.title}</p>
                      {item.variant.product.brand && (
                        <p className="text-xs text-slate-500">{item.variant.product.brand}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-700">{item.warehouse.name}</span>
                    {item.warehouse.city && (
                      <p className="text-xs text-slate-500">{item.warehouse.city}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    {item.totalQty}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-600 font-medium">
                    {item.reservedQty}
                  </td>
                  <td className="py-3 px-4 text-right text-green-600 font-semibold">
                    {item.availableQty}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.availableQty === 0
                          ? "bg-red-50 text-red-700"
                          : item.availableQty < 10
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {item.availableQty === 0
                        ? "Out of Stock"
                        : item.availableQty < 10
                        ? "Low Stock"
                        : "In Stock"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {!String(item.id).startsWith("shopify-") && (
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        View History
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInventory.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              {searchTerm || selectedWarehouse !== "all" || lowStockOnly
                ? "No items match your filters."
                : "No inventory records yet. Connect Marketplace channels and click Sync Marketplace channels, or add inventory manually."}
            </div>
          )}
        </div>
        {filteredInventory.length > 0 && (
          <TablePagination
            currentPage={page}
            totalItems={filteredInventory.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            itemLabel="items"
          />
        )}
      </div>

      {/* Shopify inventory (live from API when connected) - same pattern as Orders page */}
      {shopifyInventoryWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {shopifyInventoryWarning}
        </div>
      )}
      {shopifyInventory.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="text-base font-semibold text-slate-900">From Shopify</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live inventory from your connected store</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">SKU</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Product name</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Available</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Location</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShopifyInventory.map((row, idx) => (
                  <tr key={`${row.sku}-${row.location}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-900">{row.sku}</td>
                    <td className="py-3 px-4 text-slate-700">{row.product_name || "—"}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">{row.available}</td>
                    <td className="py-3 px-4 text-slate-600">{row.location || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shopifyInventory.length > 0 && (
            <TablePagination
              currentPage={pageShopify}
              totalItems={shopifyInventory.length}
              pageSize={pageSizeShopify}
              onPageChange={setPageShopify}
              onPageSizeChange={(size) => {
                setPageSizeShopify(size);
                setPageShopify(1);
              }}
              itemLabel="items"
            />
          )}
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Adjust Inventory</h3>
              <button
                onClick={() => {
                  setShowAdjustModal(false);
                  setAdjustSku("");
                  setAdjustDelta("");
                  setAdjustReason("");
                  setAdjustWarehouse("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">SKU</label>
                <input
                  type="text"
                  value={adjustSku}
                  onChange={(e) => setAdjustSku(e.target.value)}
                  placeholder="Enter SKU"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Warehouse</label>
                <select
                  value={adjustWarehouse}
                  onChange={(e) => setAdjustWarehouse(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quantity Change (use negative for decrease)
                </label>
                <input
                  type="number"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  placeholder="e.g., -5 or +10"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reason (optional)</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g., damaged goods, return"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAdjust}
                  disabled={!adjustSku || !adjustDelta || !adjustWarehouse}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adjust Inventory
                </button>
                <button
                  onClick={() => {
                    setShowAdjustModal(false);
                    setAdjustSku("");
                    setAdjustDelta("");
                    setAdjustReason("");
                    setAdjustWarehouse("");
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

      {/* Stock History Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Stock History - {selectedItem.variant.sku}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600">
                Stock ledger/history feature coming soon. This will show all inventory movements for this SKU.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
