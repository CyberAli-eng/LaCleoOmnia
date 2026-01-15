# NES Analysis (Needs, Existing, Solutions)

This document captures a structured review of the project using the **NES** lens:
- **Needs**: What the product must deliver.
- **Existing**: What is implemented today.
- **Solutions**: Concrete steps to close the gaps.

## Needs
- Unified commerce platform that connects multiple storefronts (Amazon, Shopify, WooCommerce).
- Secure authentication and user management.
- Ability to store and manage integration credentials per user.
- Real-time or near real-time inventory and order feeds.
- Operational dashboard for merchants.
- Scalable, production-ready infrastructure.

## Existing
### Product surface
- Marketing landing page (`/`), login, register, and dashboard pages.
- Dashboard shows mock feeds for Amazon, Shopify, and WooCommerce.
- Integration configuration modal with credential fields per channel.

### API
- Express API with `/health` endpoint.
- Auth endpoints: `/api/auth/register` and `/api/auth/login`.
- Integration config endpoints: `/api/config` and `/api/config/:userId`.
- Mock product feed endpoints under `/api/amazon`, `/api/shopify`, `/api/woo`.

### Data & storage
- Prisma schema for `User` and `Integration`.
- SQLite for local development.
- Credentials stored as JSON strings.

### Dev tooling
- Monorepo with npm workspaces.
- Docker compose includes Postgres and Redis (not yet wired).

## Solutions

### Security & auth
- Add JWT middleware to protect `/api/config` and feed endpoints.
- Remove `userId` from request body; derive from token.
- Move secrets to environment variables and `.env` files.
- Implement password policies and rate limiting.

### Integrations
- Replace mock services with real API clients:
  - Amazon SP-API
  - Shopify Admin API
  - WooCommerce REST API
- Store encrypted credentials (use KMS or envelope encryption).
- Build per-integration validation and connection tests.

### Data model
- Normalize integrations: add `status`, `lastSyncedAt`, `externalStoreId`.
- Add tables for orders, products, inventory, and webhooks.
- Add migration strategy for Postgres (prod) vs SQLite (dev).

### Platform & ops
- Wire Postgres + Redis for production.
- Add job queue (BullMQ or similar) for sync tasks.
- Add observability: structured logs + request tracing.

### UX
- Show connected status and last sync time.
- Add error handling for API failures in dashboard.
- Add onboarding checklist for merchants.

## Gap Summary (Top Priorities)
1. **Auth hardening**: protect endpoints and remove untrusted userId.
2. **Real integrations**: replace stubs with API clients.
3. **Credential security**: encrypt at rest and rotate secrets.
4. **Data expansion**: persist products/orders instead of in-memory feeds.
5. **Operational tooling**: monitoring, retries, and sync scheduling.

## Risks
- Storing credentials as plain JSON is unsafe for production.
- Hardcoded JWT secret and database URL can leak or misconfigure environments.
- No validation of integration connectivity increases support burden.
- No tests or health metrics will slow future changes.

## Suggested Next Implementation Slice
1. Add JWT middleware + user context.
2. Create real integration table fields (`status`, `lastSyncAt`).
3. Implement Shopify product sync (as the first real integration).
4. Add job queue + scheduled sync.
5. Update dashboard to show real data and status.

## NES Scenario Evaluation

### End-of-file completion
The editor should be able to finish a file naturally when it sees common structural patterns (headings, list items, or an unfinished paragraph). For this repo, the most likely EOF completions are closing a section with a final list item, or adding a "Next Steps" or "Notes" section after a block of bullets.

### Inline completion
Inside existing blocks, the editor should continue an established pattern. Examples include:
- Completing another list item in the same tense and style.
- Continuing a table row series in docs.
- Extending a React JSX map or a Prisma schema block with another field following the same formatting.

### Code modification coupling
If a human renames a route, model, or variable, related references should be updated across the repo. For example:
- Renaming an integration type should update API routes, config validation, and dashboard UI labels.
- Renaming a Prisma model field should update auth/config handlers and any frontend usage.

### Cross-file coupling
Edits in one file often imply updates in another. Expected couplings in this repo:
- API route changes should update frontend fetch calls in `apps/web`.
- Prisma schema changes should update API logic and potentially UI assumptions.
- Auth flow changes should update both web login/register pages and API middleware.

## Flowchart-Based Implementation Plan

### Architecture extracted from the flowchart
- **External Systems**: Flipkart Seller API, Shopify Admin API, WooCommerce REST API, Amazon SP-API, Shipping Aggregator API.
- **Integration Layer**: Flipkart Adapter, Shopify Adapter, WooCommerce Adapter, Amazon Adapter.
- **Webhook Flow**: Webhook Event → Webhook Receiver → Webhook Dispatch → Integration Adapters.
- **Secrets & Credentials**: Secrets Manager → Credentials Fetch → API Gateway + Integration Layer.
- **Backend**: API Gateway → Core Services (Order Management, Analytics) → Data Layer (PostgreSQL, Redis, Object Storage).
- **Events**: Order Created Event → Publish Event → Inventory Broadcast → Adapter Callback.
- **Background Workers**: Order Sync processing + failure handling.
- **Frontend**: Seller portal communicating through API Gateway.

### What to build next (full-stack)
1. **Backend API Gateway**: centralize routes for auth, integrations, webhooks, orders, analytics, inventory, events, and workers.
2. **Webhook Receiver/Dispatcher**: accept webhooks, persist, and route to adapter handlers.
3. **Integration Adapters**: add Flipkart + Shipping adapters and unify adapter interface for Amazon/Shopify/Woo.
4. **Core Services**: order management + analytics services that react to order-created events.
5. **Event & Broadcast**: publish order events and trigger inventory broadcast + adapter callbacks.
6. **Background Workers**: order sync jobs with retry/failure status.
7. **Frontend Seller Portal**: pages for integrations, webhooks, orders, analytics, inventory, and worker status.
 