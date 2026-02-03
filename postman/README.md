# Postman collection – LaCleoOmnia API

## Import

1. Open **Postman**.
2. **Import** → drag and drop (or choose):
   - `LaCleoOmnia-API.postman_collection.json`
   - Optionally: `LaCleoOmnia-Local.postman_environment.json` and/or `LaCleoOmnia-Production.postman_environment.json`.
3. Select the **LaCleoOmnia – Local** (or Production) environment in the top-right dropdown.

## Variables

| Variable   | Description |
|-----------|-------------|
| `base_url` | API base URL (no trailing slash). Local: `http://localhost:8000`, Production: `https://lacleoomnia.onrender.com`. |
| `token`   | JWT from **Auth → Login**. Set manually after login, or use a script to save it (see below). |
| `order_id`| Use in Orders / Shipments requests; set from a list-orders response. |
| `user_id` | Use in Users PATCH/DELETE. |
| `event_id`| Use in Webhooks → Retry event. |

## Quick start

1. Set **environment** to **LaCleoOmnia – Local** (or Production).
2. Run **Auth → Login** (body: `admin@local` / `Admin@123` for local seed).
3. Copy the `token` from the response into the environment variable **token**.
4. Other requests in the collection use **Bearer {{token}}** automatically.

## Auto-save token after login

The **Login** request has a test script that saves the returned `token` into the collection variable `token`. After you run **Auth → Login**, all other requests (which use Bearer `{{token}}`) will use that token automatically. If you use an environment, you can also copy the token into the environment variable `token` for consistency.

## Folders

- **Health** – Health check (no auth).
- **Auth** – Login, Register, Me, Logout.
- **Orders** – List, Get, Confirm, Pack, Ship, Cancel.
- **Inventory** – List, Adjust.
- **Integrations** – Catalog, provider status/connect, Shopify status/orders/inventory/sync, webhooks, ad-spend sync.
- **Shipments** – List, By order, Create, Sync.
- **Analytics** – Summary, Profit summary.
- **SKU Costs** – List, Get, Create, Update, Delete.
- **Profit** – Recompute.
- **Config** – Status.
- **Webhooks** – List, Subscriptions, Events, Retry.
- **Workers** – List.
- **Sync** – Sync jobs.
- **Users** – List, Create, Update, Delete.
- **Audit** – Audit log.
- **Labels** – List, Generate.

For full API details and mock data, see repo root **API_LIST.md**.
