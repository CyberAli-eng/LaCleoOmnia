# LaCleoOmnia Wiki

## Overview
LaCleoOmnia is a monorepo that ships a Next.js web app and an Express API for a multi-channel commerce orchestration platform. The current build is an MVP with authentication, integration configuration, and mock product feeds for Amazon, Shopify, and WooCommerce.

- Web app: `apps/web` (Next.js App Router)
- API: `apps/api` (Express + Prisma)
- Root orchestration: npm workspaces

## Architecture
```
apps/
  api/        Express API, Prisma (SQLite for dev)
  web/        Next.js frontend
```

### Runtime flow (happy path)
1. User registers or logs in on the web app.
2. The API issues a JWT and returns the user payload.
3. The dashboard loads product feeds via API endpoints.
4. The user saves integration credentials via the config endpoint.

## API Service (`apps/api`)

### Entry point
- `apps/api/src/index.ts` initializes Express, enables CORS/JSON, mounts `/api`, and serves `/health`.

### Routes
Base router: `apps/api/src/routes/index.ts`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Service health check |
| GET | `/api` | Welcome message |
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Login and receive JWT |
| POST | `/api/auth/google` | Google login (ID token) |
| GET | `/api/auth/status` | Validate JWT + return user |
| POST | `/api/config` | Save integration config |
| GET | `/api/config/me` | List integrations for the authenticated user |
| GET | `/api/config/status` | Integrations + webhook status |
| PATCH | `/api/config/:id` | Update integration settings |
| GET | `/api/webhooks` | List webhook events |
| POST | `/api/webhooks/:source` | Receive marketplace webhook |
| GET | `/api/webhooks/subscriptions` | List webhook subscriptions |
| POST | `/api/webhooks/register/:integrationId` | Re-register webhooks |
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order (unified payload) |
| GET | `/api/inventory` | Inventory counts |
| POST | `/api/inventory/adjust` | Manual inventory adjustment |
| POST | `/api/inventory/broadcast` | Broadcast inventory update |
| GET | `/api/workers` | List worker jobs |
| POST | `/api/workers/order-sync` | Enqueue order sync job |
| POST | `/api/workers/inventory-sync` | Enqueue inventory sync job |
| GET | `/api/labels` | List labels |
| POST | `/api/labels/generate` | Generate label (stub) |
| GET | `/api/marketplaces/shopify/orders` | Shopify orders |
| GET | `/api/marketplaces/shopify/products` | Shopify products |
| GET | `/api/marketplaces/shopify/inventory` | Shopify inventory |
| GET | `/api/marketplaces/shopify/shop` | Shopify shop info |

### Authentication
`apps/api/src/auth/router.ts`
- Uses bcrypt for password hashing.
- Issues JWT signed with `JWT_SECRET`.
- Stores users in SQLite via Prisma.

### Integrations
`apps/api/src/integrations/*`
- Each service returns placeholder product lists.
- Actual API integration logic is a TODO.

### Config & persistence
`apps/api/src/config/router.ts`
- Accepts `type`, `name`, `credentials`, and `userId`.
- Persists to `Integration` table.
- Uses authenticated userId from JWT.

### Prisma schema
`apps/api/prisma/schema.prisma`
- `User` table with hashed password.
- `Integration` table with JSON string credentials.

### Environment
`apps/api/src/pre.ts` sets defaults for MVP:
- `DATABASE_URL=file:./dev.db`
- `JWT_SECRET=supersecret_for_mvp`

**Required Environment Variables:**

**For Production (Render/Railway/etc):**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Authentication
JWT_SECRET=your-secure-random-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# Redis (for queues and locks)
REDIS_URL=redis://host:port

# Webhooks (CRITICAL for Shopify integration)
WEBHOOK_BASE_URL=https://your-api-domain.onrender.com
# Example: WEBHOOK_BASE_URL=https://lacleoomnia.onrender.com
# This is the public URL where Shopify will send webhooks
# Must be accessible from the internet (no localhost)

# S3/MinIO (for label storage)
S3_ENDPOINT=https://s3.amazonaws.com  # or MinIO endpoint
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=your-bucket-name
S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com  # optional
```

**Important Notes:**
- `WEBHOOK_BASE_URL` must be your **public API URL** (not localhost)
- Shopify webhooks will be registered to: `${WEBHOOK_BASE_URL}/api/webhooks/shopify`
- If `WEBHOOK_BASE_URL` is not set, integrations will save but webhooks won't be registered
- Each Shopify integration stores its own `appSecret` (encrypted) for HMAC verification
- `SHOPIFY_WEBHOOK_SECRET` is optional (prefer per-store app secret in UI)

## Web App (`apps/web`)

### Pages
App Router pages:
- `/` redirects to login
- `/login` login form
- `/register` sign-up form
- `/dashboard/orders` marketplace orders
- `/dashboard/inventory` inventory counts (read-only)
- `/dashboard/integrations` integration settings
- `/dashboard/webhooks` webhook activity
- `/dashboard/analytics` analytics snapshot
- `/dashboard/workers` job queue controls
- `/dashboard/labels` label downloads

### Auth flow
1. `apps/web/app/login/page.tsx` submits credentials to `/api/auth/login` or `/api/auth/google`.
2. JWT and user are stored in `localStorage`.
3. Dashboard pages attach JWT to API requests.

### Dashboard
`apps/web/app/dashboard/*`
- Orders list and inventory counts pulled from API.

### API helper
`apps/web/utils/api.ts` provides a minimal `fetchFromApi()` helper.

## Webhook Setup Guide

### Shopify Webhook Configuration

1. **Set `WEBHOOK_BASE_URL` in your API environment:**
   ```bash
   WEBHOOK_BASE_URL=https://lacleoomnia.onrender.com
   ```
   - This must be your **public API URL** (accessible from the internet)
   - Do NOT use `localhost` or `127.0.0.1`
   - Shopify will send webhooks to: `${WEBHOOK_BASE_URL}/api/webhooks/shopify`

2. **Add Shopify Integration:**
   - Go to Dashboard → Integrations
   - Select "SHOPIFY" type
   - Enter:
     - **Shop Domain**: `your-store.myshopify.com`
     - **Admin Access Token**: `shpat_...` (from Shopify Admin API)
     - **App Secret**: `shpss_...` (from Shopify App settings)
   - Click "Save Integration"
   - Webhooks will auto-register for:
     - `orders/create`
     - `orders/updated`
     - `products/update`
     - `inventory_levels/update`

3. **Verify Webhook Status:**
   - Check the "Webhooks" badge on the integration card
   - Click the integration to expand and see individual webhook topics
   - Status shows: "Healthy (4/4)" when all webhooks are active

4. **Re-register Webhooks:**
   - If webhooks fail, click "Re-register Webhooks" button
   - This will attempt to register all webhooks again

5. **Test Webhook Reception:**
   - Create a test order in your Shopify store
   - Check Dashboard → Webhooks to see incoming events
   - Orders should appear in Dashboard → Orders

### Troubleshooting

**Webhooks show "Not configured":**
- Check that `WEBHOOK_BASE_URL` is set in your API environment
- Verify the URL is publicly accessible (not localhost)
- Try clicking "Re-register Webhooks"

**Webhooks show "Issues" or "FAILED":**
- Check Shopify Admin → Settings → Notifications → Webhooks
- Verify the webhook URL is correct
- Check API logs for errors
- Ensure your API is running and accessible

**"WEBHOOK_BASE_URL not configured" error:**
- Set `WEBHOOK_BASE_URL` in your Render/Railway environment variables
- Restart your API service after adding the variable
- Integration will save but webhooks won't register until this is set

## Local Development

### Prerequisites
- Node.js and npm
- SQLite (via Prisma)
- Redis (for queues and locks) - optional for basic testing

### Install
```
npm install
```

### Run all apps
```
npm run dev
```

### Run individually
```
npm run dev --workspace=apps/api
npm run dev --workspace=apps/web
```

### Ports
- Web: `http://localhost:3000`
- API: `http://localhost:4000`

## Database
Prisma uses SQLite by default for local dev. The schema is in:
- `apps/api/prisma/schema.prisma`

To switch to Postgres, update `DATABASE_URL` and adjust the Prisma provider.

## Docker
`docker-compose.yml` includes:
- Postgres 15
- Redis 7

These services are not wired into the current API runtime.

## Known Limitations (MVP)
- JWT secret and DB URL are hardcoded in `pre.ts`.
- Integration adapters use placeholder logic.
- Inventory and labels are MVP-grade (simple locks and text labels).
- No automated tests.

## External Help Needed
- Redis + BullMQ setup for background workers.
- PostgreSQL for production data storage.
- Object storage (S3/MinIO) for labels and invoices.

## Suggested Next Steps
- Encrypt integration credentials at rest.
- Replace stubs with real API integrations.
- Add labels PDF generation and storage policies.
- Add tests (unit + integration).

## File Map
- `apps/api/src/index.ts`: Express bootstrap
- `apps/api/src/routes/index.ts`: API router
- `apps/api/src/auth/router.ts`: Auth endpoints
- `apps/api/src/config/router.ts`: Integration config
- `apps/api/src/integrations/*`: Stub services
- `apps/api/prisma/schema.prisma`: Data model
- `apps/web/app/dashboard/*`: Seller portal routes
- `apps/web/utils/api.ts`: API helper
- `docker-compose.yml`: Infra services