# Project issues and fixes

This document summarizes issues found during re-examination of the LaCleoOmnia project and their status.

**Integration documentation:** All 8 channels (Shopify, Amazon, Flipkart, Myntra, Meta Ads, Google Ads, Delhivery, Selloship) have in-app **Guide** buttons with step-by-step setup. Backend catalog in `apps/api-python/app/routers/integrations.py` defines `setupSteps` (and optionally `setupGuide`) per provider. See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for full integration rules and tables.

**Inventory scoping:** `GET /api/inventory` is now scoped to the current user: only variants that appear in orders from the user's connected channel accounts are returned. If no marketplace is connected, the list is empty. This prevents stored inventory from being visible to all users when no channel is integrated. File: `apps/api-python/app/routers/inventory.py`.

**Workers page:** Redesigned to show all connected channels (from `/integrations/connected-summary`) with per-channel "Sync orders" and "Sync inventory" (Shopify only). Each action calls the correct endpoint (`/sync/orders/{accountId}` or `/integrations/shopify/sync`). Job queue shows SyncJobs for the user's channel accounts.

**Webhooks:** Subscriptions and events are channel-agnostic; subscription labels include channel name (e.g. "SHOPIFY (mystore)", "AMAZON"). Filter source dropdown is built from actual event sources. Register button label: "Register webhooks (Shopify)".

**Integrations UI:** Card layout uses `min-h-[280px]` and `items-start` so opening one card's Configure form does not change the height of other cards. All connect/setup CTAs use the same label: "Configure".

**Unicommerce-style replication:** Dashboard and channels follow Unicommerce's structure: (1) **Overview** – Section 1: Revenue & orders (today vs yesterday, items sold). Section 2: Alert grids – Order alerts (pending orders, pending shipment), Product alerts (low stock), Channel connectors (connected count). Section 3: Recent orders + Quick actions + Profit summary. API: `GET /api/analytics/overview`. (2) **Channels** – "Channel summary" at top with connected channels and link to Sync & workers. Sidebar: "Channels", "Sync & workers". (3) **Sync & workers** – Per-channel sync and job queue.

**Unicommerce-style replication:** Dashboard and channels are aligned with Unicommerce's structure where applicable:
- **Dashboard (Overview):** Section 1 – Revenue & orders (today vs yesterday, items sold). Section 2 – Alert grids: Order alerts (pending orders, pending shipment), Product alerts (low stock count), Channel connectors (connected count + link to configure). Section 3 – Recent orders + Quick actions + Profit summary. API: `GET /api/analytics/overview`.
- **Channels/Integrations:** "Channel summary" at top listing connected channels with link to "Sync & workers". Sidebar: "Channels" (was Integrations), "Sync & workers" (was Workers). Page title: "Channels & integrations".
- **Sync & workers:** Per-channel sync (orders + inventory for Shopify) and job queue, matching Unicommerce’s channel-wise sync and fulfillment visibility.

---

## Critical (fixed)

### 1. Order actions allowed on any user's order
- **Fix:** Each of confirm/pack/ship/cancel now verifies `order.channel_account_id` is in the current user's channel account IDs; otherwise returns `403 Access denied`.
- **Files:** `apps/api-python/app/routers/orders.py`

### 2. Audit logs visible to all users
- **Fix:** Query filtered by `AuditLog.user_id == current_user.id`. Admins also see system logs (`user_id IS NULL`).
- **Files:** `apps/api-python/app/routers/audit.py`

### 3. Channels: account_id not scoped to current user
- **Fix:** Test connection and import-orders now filter by `user_id == current_user.id`.
- **Files:** `apps/api-python/app/routers/channels.py`

### 4. Webhook event retry endpoint missing
- **Fix:** Added `POST /webhooks/events/{event_id}/retry` with ownership check; returns `501` with clear message (payload not stored). Frontend shows user-friendly message.
- **Files:** `apps/api-python/app/routers/webhooks.py`, `apps/web/app/dashboard/webhooks/page.tsx`

### 5. Webhooks register: integration_id type and creds
- **Fix:** `integration_id` is now `str` (UUID). Creds parsing supports both JSON `{shopDomain, accessToken, appSecret}` and raw token string; app secret from ProviderCredential or env.
- **Files:** `apps/api-python/app/routers/webhooks.py`

---

## Design / product (documented)

### 6. Inventory, warehouses, products: global vs per-user
- **Current:** No `user_id` filter; shared catalog/warehouses. Acceptable for single-tenant.
- **Optional later:** If multi-tenant is required, add `user_id` (or tenant_id) to models and scope all reads/writes.

### 7. SKU costs: global
- **Current:** Shared SKU cost table. Acceptable for company-wide cost master.
- **Optional later:** Add `user_id` and scope CRUD if per-user costs are needed.

---

## Optional improvements (fixed)

### 8. Audit logs with null user_id
- **Fix:** Admins now see logs where `user_id IS NULL` (system actions) in addition to their own.
- **Files:** `apps/api-python/app/routers/audit.py`

### 9. “Main Warehouse” hardcoded
- **Fix:** Default warehouse is resolved via `get_default_warehouse(db)`: uses `DEFAULT_WAREHOUSE_ID` if set, else `DEFAULT_WAREHOUSE_NAME` (env, default `Main Warehouse`), else first warehouse. Used in orders (confirm/pack/ship/cancel) and order_import.
- **Files:** `apps/api-python/app/config.py`, `app/services/warehouse_helper.py`, `app/routers/orders.py`, `app/services/order_import.py`, `README_ENV.md`

### 10. Webhook register creds format
- **Fix:** `POST /webhooks/register/{integration_id}` now accepts both JSON creds and raw token; app secret from user's ProviderCredential or `SHOPIFY_API_SECRET`.
- **Files:** `apps/api-python/app/routers/webhooks.py`

### 11. CORS and API URL
- **Fix:** In production, startup logs a warning if `ALLOWED_ORIGINS` is not set. Frontend already warns when `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_API_URL` are unset in production.
- **Files:** `apps/api-python/main.py`

---

## Summary

| Category            | Status |
|---------------------|--------|
| Critical            | 5 fixed |
| Design (optional)   | 2 documented for future |
| Optional improvements | 4 fixed |

All identified security, correctness, and minor issues have been addressed. Design items 6 and 7 remain as optional multi-tenant enhancements if needed later.
