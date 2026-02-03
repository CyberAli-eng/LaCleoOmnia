"use client";

import { useEffect, useState, useMemo } from "react";
import { authFetch } from "@/utils/api";
import { TablePagination } from "@/app/components/TablePagination";

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: any;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntityType, setFilterEntityType] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadLogs();
    setPage(1);
  }, [filterEntityType, filterAction]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEntityType !== "all") params.append("entity_type", filterEntityType);
      if (filterAction !== "all") params.append("action", filterAction);
      
      const data = await authFetch(`/audit?${params.toString()}`);
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs;
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  const getActionColor = (action: string) => {
    if (action.includes("CREATED")) return "bg-blue-50 text-blue-700";
    if (action.includes("CONFIRMED") || action.includes("PACKED")) return "bg-purple-50 text-purple-700";
    if (action.includes("SHIPPED")) return "bg-green-50 text-green-700";
    if (action.includes("CANCELLED")) return "bg-red-50 text-red-700";
    if (action.includes("ADJUSTED")) return "bg-amber-50 text-amber-700";
    return "bg-slate-50 text-slate-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="mt-1 text-sm text-slate-600">Track all system actions and changes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex gap-4">
          <select
            value={filterEntityType}
            onChange={(e) => setFilterEntityType(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Entities</option>
            <option value="Order">Orders</option>
            <option value="Inventory">Inventory</option>
            <option value="Shipment">Shipments</option>
            <option value="Integration">Integrations</option>
          </select>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Actions</option>
            <option value="ORDER_CREATED">Order Created</option>
            <option value="ORDER_CONFIRMED">Order Confirmed</option>
            <option value="ORDER_PACKED">Order Packed</option>
            <option value="ORDER_SHIPPED">Order Shipped</option>
            <option value="ORDER_CANCELLED">Order Cancelled</option>
            <option value="INVENTORY_ADJUSTED">Inventory Adjusted</option>
            <option value="SHIPMENT_CREATED">Shipment Created</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Timestamp</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">User</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Action</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Entity</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900">{log.userName}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <span className="font-medium text-slate-900">{log.entityType}</span>
                      <p className="text-xs text-slate-500">ID: {log.entityId.slice(0, 8)}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div className="py-12 text-center text-slate-500">No audit logs found</div>
          )}
        </div>
        {filteredLogs.length > 0 && (
          <TablePagination
            currentPage={page}
            totalItems={filteredLogs.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            itemLabel="logs"
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Audit Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">User</p>
                  <p className="mt-1 font-medium text-slate-900">{selectedLog.userName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Action</p>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action.replace("_", " ")}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Entity Type</p>
                  <p className="mt-1 font-medium text-slate-900">{selectedLog.entityType}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Entity ID</p>
                  <p className="mt-1 font-mono text-sm text-slate-900">{selectedLog.entityId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Timestamp</p>
                  <p className="mt-1 text-slate-600">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {selectedLog.details && (
                <div>
                  <p className="text-sm font-medium text-slate-900 mb-2">Details</p>
                  <pre className="bg-slate-50 rounded-lg p-4 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
