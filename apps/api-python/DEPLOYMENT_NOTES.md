# Deployment Notes for Render

## Environment Variables

Set these in your Render dashboard:

1. **Environment (REQUIRED)**
   - `ENV=PROD` - Set to PROD for production, DEV for development

2. **Database**
   - `DATABASE_URL` - Your PostgreSQL connection string

3. **Authentication**
   - `JWT_SECRET` - A secure random string for JWT token signing
   - `AUTH_ALGORITHM` - (Optional) Defaults to "HS256"

4. **CORS** (Auto-configured)
   - `ALLOWED_ORIGINS` - Comma-separated list of allowed origins (optional, Vercel is auto-allowed via regex)

5. **Server** (Auto-configured)
   - `HOST` - Auto-detected (0.0.0.0 for cloud, 127.0.0.1 for local)
   - `PORT` - (Optional) Defaults to 8000, Render sets this automatically

6. **Webhooks** (if using)
   - `WEBHOOK_BASE_URL` - Your Render backend URL (e.g., https://lacleoomnia.onrender.com)
   - `ENCRYPTION_KEY` - 32-character key for credential encryption

7. **Logging**
   - `LOG_LEVEL` - (Optional) Defaults to INFO in production, DEBUG in development

## Build Command

```bash
pip install -r requirements.txt
```

## Start Command (runs migrations then starts – works on free tier)

Use this so the DB is migrated automatically on every deploy, **without** needing Pre-Deploy or Release Command (which are paid on Render free tier):

```bash
alembic upgrade head && python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

- **First:** `alembic upgrade head` updates the database (adds missing columns like `orders.shipping_address`, `orders.billing_address`). Safe to run every time (idempotent).
- **Then:** the app starts as usual.

**Render Dashboard:** Build & Deploy → **Start Command** → paste the line above → Save.

If you prefer to run migrations only once and then use the plain start command, set **Start Command** back to:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

## Shopify inventory (required scopes)

Inventory uses the full pipeline: **products → variants (inventory_item_id) → locations → inventory_levels**.  
Your Shopify app must have these scopes (and the store must reinstall after adding them):

- `read_products`
- `read_inventory`
- `read_locations`

Inventory is **cached in DB** (`shopify_inventory` table). GET `/api/integrations/shopify/inventory` returns from cache by default (no live Shopify call). Use **Sync Shopify** (or POST `/api/integrations/shopify/sync`) to refresh; or call GET with `?refresh=true` to fetch live and update cache.

**API version:** Use **2024-01** (stable). Do not use 2026-01 or unstable versions — they can cause inventory 500/502.

### Test inventory locally (after connecting Shopify)

```bash
# 1. Sync (orders + inventory) — requires auth cookie/header
curl -X POST "http://localhost:8000/api/integrations/shopify/sync" -H "Authorization: Bearer YOUR_JWT"

# 2. Get inventory from cache (no Shopify call)
curl "http://localhost:8000/api/integrations/shopify/inventory" -H "Authorization: Bearer YOUR_JWT"

# 3. Force refresh from Shopify
curl "http://localhost:8000/api/integrations/shopify/inventory?refresh=true" -H "Authorization: Bearer YOUR_JWT"
```

If you get 500/502 on inventory: check scopes (`read_products`, `read_inventory`, `read_locations`), reinstall the app, and check server logs for the exact Shopify API URL/status/error.

## Profit engine (SKU costs + order_profit)

- **shopify_inventory** is the master source for inventory: Fetch → Normalize → UPSERT → Read DB → Return. UI reads from DB, not live Shopify.
- **sku_costs**: Admin CRUD at `/api/sku-costs`. Fields: sku, product_cost, packaging_cost, box_cost, inbound_cost. Required for profit.
- **order_profit**: One row per order. Computed on order sync and on demand. Formula: net_profit = revenue - product_cost - packaging - shipping - marketing - payment_fee.
- **Recompute**: `POST /api/profit/recompute` (all user orders) or `POST /api/profit/recompute?order_id=...` (one order). Call after updating sku_costs.
- **Order detail**: `GET /api/orders/{id}` includes `profit` when computed (revenue, productCost, netProfit, status).

## Shopify Webhooks (real-time sync)

- **Receiver**: `POST /api/webhooks/shopify` — **public** (no JWT). Shopify sends `X-Shopify-Hmac-Sha256`, `X-Shopify-Topic`, `X-Shopify-Shop-Domain`. Body is verified with `SHOPIFY_API_SECRET`; events are persisted to `webhook_events`, then processed by topic.
- **Topics**: `orders/create`, `orders/updated`, `orders/cancelled`, `refunds/create`, `inventory_levels/update`, `products/update`. Orders upsert + profit recompute; inventory sync on inventory/products.
- **Register**: Set `WEBHOOK_BASE_URL` to your API base (e.g. `https://lacleoomnia.onrender.com`). After connecting Shopify, call `POST /api/integrations/shopify/register-webhooks` (with JWT) to register all topics with Shopify. Or webhooks are auto-registered on OAuth in channels flow.
- **Events**: `GET /api/webhooks?source=shopify` returns persisted events (processed_at, error).

## User-provided credentials (Integrations UI)

- **Shopify**: Users add **API Key** and **API Secret** in Integrations → Shopify App setup (no .env required). Create an app in Shopify Admin → Apps → Develop apps; set App URL and Redirect URL (e.g. `https://yourapi.com/auth/shopify/callback`); copy Client credentials. Request scopes matching `SHOPIFY_SCOPES` in .env (e.g. `read_orders`, `write_orders`, `read_products`, `write_products`, `read_inventory`, `write_inventory`, `read_locations`). Then click Connect → OAuth.
- **Delhivery**: Users paste **API key** in Integrations → Delhivery; status shows **Connected**. No .env required. Optional: set `DELHIVERY_API_KEY` in .env for 30-min background sync.
- **.env fallback**: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `DELHIVERY_API_KEY` in .env are optional; if set, they are used when the user has not saved credentials in the UI.

## Delhivery + RTO Profit Engine

- **Config**: User pastes API key in Integrations (recommended), or set `DELHIVERY_API_KEY` in .env (and optionally `DELHIVERY_TRACKING_BASE_URL`, default `https://track.delhivery.com`).
- **Tracking**: `GET https://track.delhivery.com/api/v1/packages/json/?waybill=XXXX` with `Authorization: Token <API_KEY>`. Status is mapped to internal: DELIVERED, RTO_DONE, RTO_INITIATED, IN_TRANSIT, LOST.
- **Shipments**: Table has `forward_cost`, `reverse_cost`, `last_synced_at`; status enum includes RTO_INITIATED, RTO_DONE, IN_TRANSIT, LOST.
- **Order profit**: New fields `shipping_forward`, `shipping_reverse`, `rto_loss`, `lost_loss`, `courier_status`, `final_status`. Rules: Delivered = revenue - all costs; RTO = loss (product+packaging+forward+reverse+marketing); Lost = product+packaging+forward; Cancelled (pre-ship) = marketing+payment.
- **Sync**: When `DELHIVERY_API_KEY` is set in .env, the app runs a **30-min background poll** (first run after 2 min). Otherwise use **Sync shipments** in Integrations. Manual: `POST /api/shipments/sync` (with JWT).
- **APIs**: `GET /api/shipments`, `GET /api/shipments/order/{order_id}`, `POST /api/shipments` (create with order_id, awb_number, forward_cost, reverse_cost), `GET /api/shipments/{id}`.

## Database Setup

After first deployment, run the seed script (if you use it):

```bash
python seed.py
```

## CORS Configuration

The backend automatically allows:
- All Vercel deployments (https://*.vercel.app)
- Localhost for development
- Any origins specified in `ALLOWED_ORIGINS` env var

## Automatic Detection

The system automatically detects:
- ✅ **Cloud Platform**: Render, Vercel, Heroku, Railway
- ✅ **Environment**: DEV vs PROD based on `ENV` variable
- ✅ **CORS Origins**: Localhost for dev, Vercel pattern for prod
- ✅ **API Docs**: Enabled in dev, disabled in prod
- ✅ **Logging**: DEBUG in dev, INFO in prod
- ✅ **Auto-reload**: Enabled in dev, disabled in prod

## Troubleshooting

### 400 Bad Request on Login
- Check that the request body is valid JSON
- Ensure email and password fields are present
- Check backend logs for validation errors
- Verify `ENV=PROD` is set in production

### CORS Errors
- Vercel deployments are automatically allowed via regex pattern
- Verify your frontend URL matches `https://*.vercel.app` pattern
- Check that `allow_credentials=True` is set (it is by default)
- Add custom origins to `ALLOWED_ORIGINS` if needed

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check that database is accessible from Render
- Ensure database migrations have been run

### Environment Detection Issues
- Check logs on startup - they show detected environment
- Verify `ENV=PROD` is set in production
- System auto-detects cloud platforms via environment variables
