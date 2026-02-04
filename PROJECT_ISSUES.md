# Project issues and fixes

This document summarizes issues found during re-examination of the LaCleoOmnia project and their status.

**Integration documentation:** All 8 channels (Shopify, Amazon, Flipkart, Myntra, Meta Ads, Google Ads, Delhivery, Selloship) have in-app **Guide** buttons with step-by-step setup. Backend catalog in `apps/api-python/app/routers/integrations.py` defines `setupSteps` (and optionally `setupGuide`) per provider. See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for full integration rules and tables.

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
