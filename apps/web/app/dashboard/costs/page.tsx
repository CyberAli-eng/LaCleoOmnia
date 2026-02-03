"use client";

import { useEffect, useState, useMemo } from "react";
import { authFetch, API_BASE_URL, getAuthHeaders } from "@/utils/api";
import { formatCurrency } from "@/utils/currency";
import { TablePagination } from "@/app/components/TablePagination";

interface SkuCostRow {
  id: string;
  sku: string;
  product_cost: number;
  packaging_cost: number;
  box_cost: number;
  inbound_cost: number;
  created_at: string | null;
  updated_at: string | null;
}

export default function CostsPage() {
  const [rows, setRows] = useState<SkuCostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SkuCostRow | null>(null);
  const [form, setForm] = useState({
    sku: "",
    product_cost: "0",
    packaging_cost: "0",
    box_cost: "0",
    inbound_cost: "0",
  });
  const [saving, setSaving] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadList = async () => {
    setLoading(true);
    try {
      const q = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const data = await authFetch(`/sku-costs${q}`) as SkuCostRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load SKU costs:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    setPage(1);
  }, [search]);
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const resetForm = () => {
    setForm({
      sku: "",
      product_cost: "0",
      packaging_cost: "0",
      box_cost: "0",
      inbound_cost: "0",
    });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (row: SkuCostRow) => {
    setEditing(row);
    setForm({
      sku: row.sku,
      product_cost: String(row.product_cost),
      packaging_cost: String(row.packaging_cost),
      box_cost: String(row.box_cost),
      inbound_cost: String(row.inbound_cost),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sku = form.sku.trim();
    if (!sku) {
      alert("SKU is required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        sku,
        product_cost: parseFloat(form.product_cost) || 0,
        packaging_cost: parseFloat(form.packaging_cost) || 0,
        box_cost: parseFloat(form.box_cost) || 0,
        inbound_cost: parseFloat(form.inbound_cost) || 0,
      };
      if (editing) {
        await authFetch(`/sku-costs/${encodeURIComponent(editing.sku)}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await authFetch("/sku-costs", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      resetForm();
      await loadList();
    } catch (err: any) {
      alert(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sku: string) => {
    if (!confirm(`Delete cost for SKU "${sku}"?`)) return;
    try {
      await authFetch(`/sku-costs/${encodeURIComponent(sku)}`, { method: "DELETE" });
      await loadList();
      if (editing?.sku === sku) resetForm();
    } catch (err: any) {
      alert(err?.message ?? "Delete failed");
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      alert("Select a CSV file first");
      return;
    }
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const formData = new FormData();
      formData.append("file", bulkFile);
      const url = `${API_BASE_URL}/sku-costs/bulk`;
      const headers = getAuthHeaders();
      const res = await fetch(url, {
        method: "POST",
        headers: { ...headers },
        body: formData,
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          const j = JSON.parse(text);
          msg = j?.detail ?? (typeof j?.detail === "string" ? j.detail : JSON.stringify(j.detail));
        } catch {
          // use text
        }
        throw new Error(msg);
      }
      const result = JSON.parse(text || "{}") as { created: number; updated: number; errors: string[] };
      setBulkResult(result);
      setBulkFile(null);
      await loadList();
    } catch (err: any) {
      alert(err?.message ?? "Bulk upload failed");
    } finally {
      setBulkUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SKU Costs</h1>
          <p className="mt-1 text-sm text-slate-600">Product, packaging, box, and inbound costs per SKU (used for profit calculation). After updating costs, recompute profit from the Profit API so order profit reflects changes.</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditing(null); setForm({ sku: "", product_cost: "0", packaging_cost: "0", box_cost: "0", inbound_cost: "0" }); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          + Add SKU Cost
        </button>
      </div>

      {/* Bulk upload */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Bulk upload (CSV)</h2>
        <p className="text-xs text-slate-500 mb-2">Header: sku, product_cost, packaging_cost, box_cost, inbound_cost</p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            type="button"
            onClick={handleBulkUpload}
            disabled={bulkUploading || !bulkFile}
            className="px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 text-sm"
          >
            {bulkUploading ? "Uploading…" : "Upload"}
          </button>
          {bulkResult && (
            <span className="text-sm text-slate-600">
              Created: {bulkResult.created}, Updated: {bulkResult.updated}
              {bulkResult.errors?.length ? ` · ${bulkResult.errors.length} row error(s)` : ""}
            </span>
          )}
        </div>
        {bulkResult?.errors?.length ? (
          <ul className="mt-2 text-xs text-amber-700 list-disc list-inside">
            {bulkResult.errors.slice(0, 5).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {bulkResult.errors.length > 5 && <li>…and {bulkResult.errors.length - 5} more</li>}
          </ul>
        ) : null}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{editing ? "Edit SKU Cost" : "Add SKU Cost"}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                placeholder="e.g. SKU-001"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                disabled={!!editing}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Product cost</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.product_cost}
                onChange={(e) => setForm((f) => ({ ...f, product_cost: e.target.value }))}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Packaging cost</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.packaging_cost}
                onChange={(e) => setForm((f) => ({ ...f, packaging_cost: e.target.value }))}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Box cost</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.box_cost}
                onChange={(e) => setForm((f) => ({ ...f, box_cost: e.target.value }))}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Inbound cost</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.inbound_cost}
                onChange={(e) => setForm((f) => ({ ...f, inbound_cost: e.target.value }))}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Filter by SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm w-64"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No SKU costs. Add one or bulk upload a CSV.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase">SKU</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-600 uppercase">Product</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-600 uppercase">Packaging</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-600 uppercase">Box</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-600 uppercase">Inbound</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm font-medium text-slate-900">{row.sku}</td>
                    <td className="px-4 py-2 text-sm text-right text-slate-700">{formatCurrency(Number(row.product_cost))}</td>
                    <td className="px-4 py-2 text-sm text-right text-slate-700">{formatCurrency(Number(row.packaging_cost))}</td>
                    <td className="px-4 py-2 text-sm text-right text-slate-700">{formatCurrency(Number(row.box_cost))}</td>
                    <td className="px-4 py-2 text-sm text-right text-slate-700">{formatCurrency(Number(row.inbound_cost))}</td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" onClick={() => handleEdit(row)} className="text-blue-600 hover:text-blue-700 text-sm mr-2">Edit</button>
                      <button type="button" onClick={() => handleDelete(row.sku)} className="text-red-600 hover:text-red-700 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 0 && (
          <TablePagination
            currentPage={page}
            totalItems={rows.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            itemLabel="rows"
          />
        )}
      </div>
    </div>
  );
}
