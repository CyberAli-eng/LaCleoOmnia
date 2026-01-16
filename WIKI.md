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

Recommended env vars:
- `GOOGLE_CLIENT_ID` (API) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (web)
- `REDIS_URL`
- `WEBHOOK_BASE_URL` (public API base for webhook registration)
- `SHOPIFY_WEBHOOK_SECRET` (optional fallback; prefer per-store app secret in UI)
- `S3_ENDPOINT` (MinIO) or leave empty for AWS
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_PUBLIC_URL` (optional public base URL)

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

## Local Development

### Prerequisites
- Node.js and npm
- SQLite (via Prisma)

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