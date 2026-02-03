# LaCleoOmnia – API List

This document lists the backend API endpoints used by the LaCleoOmnia app. The frontend calls these via `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8000/api` or `https://lacleoomnia.onrender.com/api`). All paths below are relative to that base unless noted.

**Authentication:** Endpoints marked *Auth required* expect the request header:
```http
Authorization: Bearer <token>
```
Token is returned from `POST /api/auth/login` and stored in the frontend (e.g. localStorage / cookie).

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Local | `http://localhost:8000/api` |
| Production | `https://<your-backend>/api` (e.g. `https://lacleoomnia.onrender.com/api`) |

**Non-/api routes on backend:**
- `GET /health` – Health check (no auth)
- `GET /auth/shopify/callback` – Shopify OAuth callback (no auth; redirect)

---

## Mock API (fixture data)

When **`MOCK_DATA=true`** (or `1` / `yes`) is set in the backend environment, the API returns **fixture data** for the endpoints below instead of querying the database. Use this to run the frontend without a database or external services (Shopify, Delhivery, etc.).

**Enable:** In `apps/api-python`, set in `.env`:
```env
MOCK_DATA=true
```
Then start the API as usual. On startup you’ll see: `MOCK_DATA=true: mock API enabled for orders, inventory, analytics, integrations, etc.`

**Mocked endpoints:**

| Method | Path | Mock response |
|--------|------|----------------|
| POST | `/api/auth/login` | `{ "token": "mock-jwt-token-for-development", "user": { "id", "name", "email", "role": "ADMIN" } }` |
| GET | `/api/auth/me` | Same user object |
| GET | `/api/orders` | 2 sample orders (SHOP-1001, SHOP-1002) |
| GET | `/api/orders/{order_id}` | Single order with items and profit |
| GET | `/api/inventory` | 3 inventory rows (SKU-001, SKU-002, SKU-003) |
| GET | `/api/analytics/summary` | totalOrders, totalRevenue, recentOrders |
| GET | `/api/analytics/profit-summary` | revenue, netProfit, marginPercent, loss/RTO counts |
| GET | `/api/config/status` | integrations, subscriptions |
| GET | `/api/integrations/catalog` | Sections (stores, logistics) |
| GET | `/api/integrations/shopify/status` | `{ "connected": true, "shop_domain": "mock-store.myshopify.com" }` |
| GET | `/api/integrations/shopify/orders` | Same as `/api/orders` |
| GET | `/api/integrations/shopify/inventory` | SKU list with available qty |
| GET | `/api/sync/jobs` | 2 sample sync jobs |
| GET | `/api/workers` | Single worker entry |
| GET | `/api/webhooks` | `[]` |
| GET | `/api/webhooks/subscriptions` | `[]` |
| GET | `/api/warehouses` | One warehouse |
| GET | `/api/integrations/providers/{id}/status` | `{ "connected": false }` |

Fixture data is defined in **`apps/api-python/app/mock_data.py`**. You can edit that file to change sample orders, SKUs, or analytics numbers.

---

## Auth

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| POST | `/api/auth/login` | Login (email + password). Returns `token`, `user`. | Login page |
| POST | `/api/auth/register` | Register new user. Returns `token`, `user`. | Register page |
| GET | `/api/auth/me` | Current user (Auth required). | Dashboard layout, Users page |
| POST | `/api/auth/logout` | Logout (Auth required). | Header / account menu |

---

## Orders

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| GET | `/api/orders` | List orders (Auth required). Optional query: status, channel, etc. | Dashboard, Orders list, Labels |
| GET | `/api/orders/{order_id}` | Get single order with items, profit (Auth required). | Order detail page |
| POST | `/api/orders/{order_id}/confirm` | Confirm order (Auth required). | Order detail, bulk actions |
| POST | `/api/orders/{order_id}/pack` | Pack order (Auth required). | Order detail, bulk actions |
| POST | `/api/orders/{order_id}/ship` | Ship order (body: courier_name, awb_number, etc.) (Auth required). | Order detail, Labels (generate) |
| POST | `/api/orders/{order_id}/cancel` | Cancel order (Auth required). | Order detail, bulk actions |

---

## Inventory

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| GET | `/api/inventory` | List internal inventory (Auth required). Query: `warehouse_id`, `sku`. | Dashboard, Inventory page |
| POST | `/api/inventory/adjust` | Adjust inventory (SKU, warehouse, qty delta, reason) (Auth required). | Inventory page |

---

## Integrations (catalog, providers, Shopify)

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| GET | `/api/integrations/catalog` | Integration catalog (sections, providers, actions) (Auth required). | Integrations page |
| GET | `/api/integrations/providers/{provider_id}/status` | Provider connection status, e.g. `delhivery`, `selloship`, `meta_ads`, `google_ads`, `shopify_app` (Auth required). | Integrations page |
| POST | `/api/integrations/providers/{provider_id}/connect` | Connect provider (body: e.g. `apiKey`) (Auth required). | Integrations page |
| GET | `/api/integrations/providers/shopify_app/status` | Shopify app configured (API key/secret) (Auth required). | Integrations page |
| POST | `/api/integrations/providers/shopify_app/connect` | Save Shopify API key/secret (Auth required). | Integrations page |
| GET | `/api/integrations/shopify/status` | Shopify OAuth connected + shop domain (Auth required). | Dashboard layout, Integrations page |
| GET | `/api/integrations/shopify/orders` | Orders from connected Shopify store (Auth required). | Orders page (live Shopify orders) |
| GET | `/api/integrations/shopify/inventory` | Cached Shopify inventory. Query: `?refresh=true` to fetch live and update cache (Auth required). | Inventory page (live Shopify inventory) |
| POST | `/api/integrations/shopify/sync` | Sync orders + inventory from Shopify into DB (Auth required). | Integrations page, Workers, Inventory page |
| POST | `/api/integrations/shopify/register-webhooks` | Register Shopify webhooks (Auth required). | Webhooks page |
| POST | `/api/integrations/ad-spend/sync` | Manually sync ad spend (Meta/Google) for CAC (Auth required). | Integrations (if exposed) |

---

## Shipments

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| GET | `/api/shipments` | List shipments (Auth required). | — |
| GET | `/api/shipments/order/{order_id}` | Get shipment for order (Auth required). | — |
| POST | `/api/shipments` | Create shipment (order_id, awb_number, courier_name, forward_cost, reverse_cost, etc.) (Auth required). | — |
| POST | `/api/shipments/sync` | Sync Delhivery + Selloship status/costs (Auth required). | Integrations (Sync shipments action) |
| GET | `/api/shipments/{shipment_id}` | Get shipment by id (Auth required). | — |

---

## Analytics & profit

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| GET | `/api/analytics/summary` | Dashboard summary (total orders, recent orders, etc.) (Auth required). | Dashboard, Analytics page |
| GET | `/api/analytics/profit-summary` | Profit KPIs (revenue, net profit, margin %, RTO/lost counts and amounts) (Auth required). | Dashboard |
| GET | `/api/profit/order/{order_id}` | Profit breakdown for one order (Auth required). | Order detail (if used) |
| POST | `/api/profit/recompute` | Recompute profit (all or single order_id) (Auth required). | Costs / profit flows |

---

## SKU costs

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| GET | `/api/sku-costs` | List SKU costs (Auth required). Query: optional filters. | Costs page |
| GET | `/api/sku-costs/{sku}` | Get one SKU cost (Auth required). | Costs page |
| POST | `/api/sku-costs` | Create SKU cost (Auth required). | Costs page |
| PATCH | `/api/sku-costs/{sku}` | Update SKU cost (Auth required). | Costs page |
| DELETE | `/api/sku-costs/{sku}` | Delete SKU cost (Auth required). | Costs page |
| POST | `/api/sku-costs/bulk` | Bulk create/update SKU costs (e.g. CSV) (Auth required). | Costs page (bulk upload) |

---

## Config & status

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| GET | `/api/config/status` | Config status (integrations, subscriptions, etc.) (Auth required). | Dashboard layout, Integrations page |
| POST | `/api/config` | Create config (Auth required). | — |
| PATCH | `/api/config/{integration_id}` | Update config (Auth required). | — |
| DELETE | `/api/config/{integration_id}` | Delete config (Auth required). | — |

---

## Webhooks

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| GET | `/api/webhooks` | List webhook configs/events (Auth required). | Webhooks page |
| GET | `/api/webhooks/subscriptions` | List webhook subscriptions (Auth required). | Webhooks page |
| GET | `/api/webhooks/events` | List webhook events (Auth required). Query: e.g. `source=shopify`. | Webhooks page |
| POST | `/api/webhooks/events/{event_id}/retry` | Retry failed webhook event (Auth required). | Webhooks page |
| POST | `/api/webhooks/shopify` | **Public** – Shopify sends events here (HMAC verified). | Backend only |

---

## Workers & sync

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| GET | `/api/workers` | List worker/job status (Auth required). | Dashboard, Workers page |
| POST | `/api/workers/{job_id}/{action}` | Run worker action (Auth required). | Workers page |
| GET | `/api/sync/jobs` | List sync jobs (Auth required). | Dashboard |

---

## Users (admin)

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| GET | `/api/users` | List users (Auth required, typically admin). | Users page |
| POST | `/api/users` | Create user (Auth required). | Users page |
| PATCH | `/api/users/{user_id}` | Update user (Auth required). | Users page |
| DELETE | `/api/users/{user_id}` | Delete user (Auth required). | Users page |

---

## Audit

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| GET | `/api/audit` | Audit log (Auth required). Query: entity_type, entity_id, limit, etc. | Audit page |

---

## Labels

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| GET | `/api/labels` | List labels (Auth required). | Labels page |
| POST | `/api/labels/generate` | Generate label (order, carrier, tracking, etc.) (Auth required). | Labels page |

---

## Channels (legacy / onboarding)

| Method | Path | Description | Used by frontend |
|--------|------|-------------|------------------|
| GET | `/api/channels` | List channels (Auth required). | — |
| POST | `/api/channels/shopify/connect` | Connect Shopify (manual token) (Auth required). | — |
| POST | `/api/channels/shopify/test` | Test Shopify connection (Auth required). | — |
| POST | `/api/channels/shopify/import-orders` | Import orders from Shopify (Auth required). | Onboarding |
| GET | `/api/channels/shopify/oauth/install` | Get Shopify OAuth install URL (Auth required). Query: `shop`. | Integrations / onboarding |

---

## Other backend routes (not under /api)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check. Returns `{ "status": "ok", ... }`. |
| GET | `/auth/shopify/callback` | Shopify OAuth callback. Query: `shop`, `code`, `hmac`, `state`, `timestamp`. Redirects to frontend. |
| GET | `/api` | API info (if implemented). |
| GET | `/docs` | Swagger UI (dev only). |
| GET | `/redoc` | ReDoc (dev only). |

---

## Quick reference by frontend page

| Page / feature | Main API calls |
|----------------|----------------|
| **Login** | `POST /api/auth/login` |
| **Register** | `POST /api/auth/register` |
| **Dashboard** | `GET /api/orders`, `GET /api/analytics/summary`, `GET /api/config/status`, `GET /api/inventory`, `GET /api/sync/jobs`, `GET /api/analytics/profit-summary` |
| **Orders list** | `GET /api/orders`, `GET /api/integrations/shopify/orders` |
| **Order detail** | `GET /api/orders/{id}`, `POST /api/orders/{id}/confirm`, pack, ship, cancel |
| **Inventory** | `GET /api/inventory`, `GET /api/warehouses`, `GET /api/integrations/shopify/inventory`, `POST /api/integrations/shopify/sync`, `POST /api/inventory/adjust` |
| **Integrations** | `GET /api/integrations/catalog`, `GET /api/integrations/providers/.../status`, `POST /api/integrations/providers/.../connect`, `GET /api/integrations/shopify/status`, `POST /api/integrations/shopify/sync`, `GET /api/integrations/shopify/install` (OAuth), etc. |
| **Costs (SKU)** | `GET /api/sku-costs`, `POST /api/sku-costs`, `PATCH /api/sku-costs/{sku}`, `DELETE /api/sku-costs/{sku}`, `POST /api/sku-costs/bulk` |
| **Analytics** | `GET /api/analytics/summary`, `GET /api/orders` |
| **Webhooks** | `GET /api/webhooks`, `GET /api/webhooks/subscriptions`, `POST /api/integrations/shopify/register-webhooks`, `POST /api/webhooks/events/{id}/retry` |
| **Workers** | `GET /api/workers`, `POST /api/integrations/shopify/sync`, `POST /api/workers/...` |
| **Labels** | `GET /api/labels`, `GET /api/orders`, `POST /api/orders/{id}/ship`, `POST /api/labels/generate` |
| **Users** | `GET /api/users`, `GET /api/auth/me`, `POST /api/users`, `PATCH /api/users/{id}`, `DELETE /api/users/{id}` |
| **Audit** | `GET /api/audit` |

---

## Example API calls and mock data

Below are example **request** and **response** bodies for key endpoints. Responses match the mock data shape when `MOCK_DATA=true`.

### POST /api/auth/login

**Request:**
```json
{
  "email": "mock@lacleoomnia.com",
  "password": "any"
}
```

**Response (200):**
```json
{
  "token": "mock-jwt-token-for-development",
  "user": {
    "id": "mock-user-001",
    "name": "Mock User",
    "email": "mock@lacleoomnia.com",
    "role": "ADMIN"
  }
}
```

---

### GET /api/orders

**Headers:** `Authorization: Bearer <token>`

**Response (200) – mock:**
```json
{
  "orders": [
    {
      "id": "mock-order-001",
      "channelOrderId": "SHOP-1001",
      "customerName": "Rahul Sharma",
      "customerEmail": "rahul@example.com",
      "shippingAddress": "123 MG Road, Bangalore, Karnataka 560001",
      "paymentMode": "PREPAID",
      "orderTotal": 2499.00,
      "status": "CONFIRMED",
      "createdAt": "2026-01-22T10:00:00Z",
      "items": [
        { "id": "oi-1", "sku": "SKU-001", "title": "Classic Tee Blue", "qty": 2, "price": 999.00, "fulfillmentStatus": "MAPPED" },
        { "id": "oi-2", "sku": "SKU-002", "title": "Cotton Socks", "qty": 1, "price": 501.00, "fulfillmentStatus": "MAPPED" }
      ]
    }
  ]
}
```

---

### GET /api/inventory

**Headers:** `Authorization: Bearer <token>`

**Response (200) – mock:**
```json
{
  "inventory": [
    {
      "id": "inv-1",
      "warehouseId": "wh-1",
      "warehouse": { "id": "wh-1", "name": "Main Warehouse", "city": "Bangalore", "state": "Karnataka" },
      "variantId": "pv-1",
      "variant": { "id": "pv-1", "sku": "SKU-001", "product": { "id": "p-1", "title": "Classic Tee", "brand": "LaCleo" } },
      "totalQty": 150,
      "reservedQty": 10,
      "availableQty": 140
    }
  ]
}
```

---

### GET /api/analytics/summary

**Headers:** `Authorization: Bearer <token>`

**Response (200) – mock:**
```json
{
  "totalOrders": 42,
  "totalRevenue": 125000.00,
  "recentOrders": [
    { "id": "mock-order-001", "externalId": "SHOP-1001", "source": "SHOPIFY", "status": "CONFIRMED", "total": 2499.00, "createdAt": "2026-01-22T10:00:00Z" }
  ]
}
```

---

### GET /api/analytics/profit-summary

**Headers:** `Authorization: Bearer <token>`

**Response (200) – mock:**
```json
{
  "revenue": 125000.00,
  "netProfit": 28500.00,
  "marginPercent": 22.8,
  "lossCount": 3,
  "lossAmount": 2400.00,
  "rtoCount": 2,
  "rtoAmount": 1800.00,
  "lostCount": 1,
  "lostAmount": 600.00,
  "courierLossPercent": 4.2
}
```

---

### GET /api/integrations/shopify/inventory

**Headers:** `Authorization: Bearer <token>`

**Response (200) – mock:**
```json
{
  "inventory": [
    { "sku": "SKU-001", "product_name": "Classic Tee Blue", "available": 140, "location_id": "loc-1" },
    { "sku": "SKU-002", "product_name": "Cotton Socks", "available": 78, "location_id": "loc-1" }
  ],
  "warning": null
}
```

---

*Generated from the LaCleoOmnia codebase. Backend: `apps/api-python`; frontend: `apps/web`.*
