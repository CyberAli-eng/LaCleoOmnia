"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/utils/api";

interface WebhookEvent {
  id: number;
  source: string;
  eventType?: string | null;
  receivedAt: string;
}

interface WebhookSubscription {
  id: number;
  integrationId: number;
  topic: string;
  status: string;
  lastError?: string | null;
  updatedAt: string;
}

export default function WebhooksPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);

  useEffect(() => {
    authFetch("/webhooks")
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => null);
    authFetch("/webhooks/subscriptions")
      .then((data) => setSubscriptions(data?.subscriptions || []))
      .catch(() => null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Webhook Receiver</h2>
        <p className="mt-2 text-sm text-slate-600">Inbound events routed to adapters.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold text-slate-600">Recent Webhooks</div>
        <div className="mt-4 divide-y divide-slate-100">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{event.source}</p>
                <p className="text-slate-500">{event.eventType || "Webhook Event"}</p>
              </div>
              <span className="text-slate-400">{new Date(event.receivedAt).toLocaleString()}</span>
            </div>
          ))}
          {events.length === 0 && <p className="py-6 text-sm text-slate-500">No webhooks yet.</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold text-slate-600">Webhook Status by Store</div>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <div>
                <div className="font-medium text-slate-800">{sub.topic}</div>
                {sub.lastError && <div className="text-xs text-amber-600">{sub.lastError}</div>}
              </div>
              <span className={sub.status === "ACTIVE" ? "text-emerald-600" : "text-amber-600"}>
                {sub.status}
              </span>
            </div>
          ))}
          {subscriptions.length === 0 && <p className="text-slate-500">No subscriptions yet.</p>}
        </div>
      </div>
    </div>
  );
}
