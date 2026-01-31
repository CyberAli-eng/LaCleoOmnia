"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

interface WebhookEvent {
  id: string;
  source: string;
  shopDomain?: string;
  topic: string;
  eventType?: string; // legacy
  payloadSummary?: string;
  status: "success" | "failed" | "pending";
  payload?: any;
  receivedAt?: string;
  createdAt?: string;
  processedAt?: string;
  error?: string;
}

interface WebhookSubscription {
  id: string;
  integrationId: string;
  topic: string;
  status: string;
  lastError?: string | null;
  updatedAt: string;
}

export default function WebhooksPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsData, subscriptionsData] = await Promise.all([
        authFetch("/webhooks").catch(() => []),
        authFetch("/webhooks/subscriptions").catch(() => []),
      ]);
      const rawEvents = Array.isArray(eventsData) ? eventsData : (eventsData?.events ?? []);
      setEvents(
        rawEvents.map((e: any) => ({
          ...e,
          eventType: e.topic ?? e.eventType,
          receivedAt: e.createdAt ?? e.receivedAt,
          status: e.error ? "failed" : e.processedAt ? "success" : "pending",
        }))
      );
      setSubscriptions(Array.isArray(subscriptionsData) ? subscriptionsData : (subscriptionsData?.subscriptions ?? []));
    } catch (err) {
      console.error("Failed to load webhooks:", err);
    }
  };

  const handleRegisterShopifyWebhooks = async () => {
    setRegistering(true);
    try {
      const res = await authFetch("/integrations/shopify/register-webhooks", { method: "POST" }) as {
        message?: string;
        registered?: { topic: string; status: string }[];
        errors?: { topic: string; error: string }[];
      };
      const msg = res?.message ?? "Webhooks registered";
      const errs = res?.errors ?? [];
      if (errs.length) {
        alert(`${msg}. Errors: ${errs.map((e: any) => e.topic + ": " + e.error).join("; ")}`);
      } else {
        alert(msg + (res?.registered?.length ? ` (${res.registered.length} topics)` : ""));
      }
      await loadData();
    } catch (err: any) {
      alert("Register failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setRegistering(false);
    }
  };

  const handleRetry = async (eventId: string) => {
    try {
      await authFetch(`/webhooks/events/${eventId}/retry`, { method: "POST" });
      await loadData();
      alert("Webhook retried successfully");
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesStatus = filterStatus === "all" || event.status === filterStatus;
    const matchesSource = filterSource === "all" || event.source === filterSource;
    return matchesStatus && matchesSource;
  });

  const successCount = events.filter((e) => e.status === "success").length;
  const failedCount = events.filter((e) => e.status === "failed").length;
  const pendingCount = events.filter((e) => e.status === "pending").length;
  const activeSubscriptions = subscriptions.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
          <p className="mt-1 text-sm text-slate-600">Monitor webhook events and subscriptions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Events</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{events.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Successful</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{successCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Failed</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{failedCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
      </div>

      {/* Subscriptions */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Webhook Subscriptions</h2>
          <span className="text-sm text-slate-500">{activeSubscriptions} active</span>
        </div>
        <div className="space-y-2">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{sub.topic}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      sub.status === "ACTIVE"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>
                {sub.lastError && (
                  <p className="text-xs text-red-600 mt-1">{sub.lastError}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Last updated: {new Date(sub.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {subscriptions.length === 0 && (
            <p className="text-sm text-slate-500 py-4 text-center">No subscriptions configured</p>
          )}
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Webhook Events</h2>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sources</option>
              <option value="shopify">Shopify</option>
              <option value="amazon">Amazon</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Source</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Event Type</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Received</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900 capitalize">{event.source}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-700">{event.topic ?? event.eventType}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.status === "success"
                          ? "bg-green-50 text-green-700"
                          : event.status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(event.createdAt ?? event.receivedAt ?? 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        View
                      </button>
                      {event.status === "failed" && (
                        <button
                          onClick={() => handleRetry(event.id)}
                          className="text-green-600 hover:text-green-700 text-xs font-medium"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEvents.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              {events.length === 0 ? "No webhook events yet" : "No events match your filters"}
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Webhook Event Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Source</p>
                  <p className="mt-1 font-medium text-slate-900 capitalize">{selectedEvent.source}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Topic</p>
                  <p className="mt-1 font-medium text-slate-900">{selectedEvent.topic ?? selectedEvent.eventType}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedEvent.status === "success"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {selectedEvent.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Received At</p>
                  <p className="mt-1 text-slate-600">{new Date((selectedEvent.createdAt ?? selectedEvent.receivedAt) ?? "").toLocaleString()}</p>
                </div>
              </div>
              {selectedEvent.error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm font-medium text-red-900 mb-1">Error</p>
                  <p className="text-sm text-red-700">{selectedEvent.error}</p>
                </div>
              )}
              {(selectedEvent.payloadSummary || selectedEvent.payload) && (
                <div>
                  <p className="text-sm font-medium text-slate-900 mb-2">Payload summary</p>
                  <p className="text-sm text-slate-600">
                    {selectedEvent.payloadSummary ?? (typeof selectedEvent.payload === "string" ? selectedEvent.payload : JSON.stringify(selectedEvent.payload, null, 2))}
                  </p>
                </div>
              )}
              {selectedEvent.status === "failed" && (
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      handleRetry(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Retry Webhook
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
