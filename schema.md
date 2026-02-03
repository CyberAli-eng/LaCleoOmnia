# LaCleoOmnia – Database Schema

This document describes the database schema used by the LaCleoOmnia OMS API (PostgreSQL). It is derived from `apps/api-python/app/models.py` and Alembic migrations.

---

## Overview

The schema supports:

- **Users & auth** – roles, credentials
- **Channels & accounts** – Shopify (and future marketplaces) per user
- **Products & variants** – SKU, pricing, internal inventory
- **Orders & items** – from channels; shipping/billing; payment mode
- **Shipments & tracking** – Delhivery/Selloship; forward/reverse cost; RTO/lost status
- **Integrations** – Shopify OAuth, provider credentials (Delhivery, Selloship, Meta/Google Ads)
- **Profit & costs** – SKU costs, order-level profit, ad spend (CAC)
- **Sync & webhooks** – sync jobs, Shopify webhook events
- **Audit & labels** – audit log, label records

---

## Enums

| Enum | Values |
|------|--------|
| **UserRole** | `ADMIN`, `STAFF` |
| **ChannelType** | `SHOPIFY`, `AMAZON`, `FLIPKART`, `MYNTRA` |
| **ChannelAccountStatus** | `CONNECTED`, `DISCONNECTED` |
| **ProductStatus** | `ACTIVE`, `ARCHIVED` |
| **VariantStatus** | `ACTIVE`, `INACTIVE` |
| **InventoryMovementType** | `IN`, `OUT`, `RESERVE`, `RELEASE` |
| **OrderStatus** | `NEW`, `CONFIRMED`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`, `HOLD` |
| **PaymentMode** | `PREPAID`, `COD` |
| **FulfillmentStatus** | `PENDING`, `MAPPED`, `UNMAPPED_SKU` |
| **ShipmentStatus** | `CREATED`, `SHIPPED`, `DELIVERED`, `RTO_INITIATED`, `RTO_DONE`, `IN_TRANSIT`, `LOST` |
| **SyncJobType** | `PULL_ORDERS`, `PULL_PRODUCTS`, `PUSH_INVENTORY` |
| **SyncJobStatus** | `QUEUED`, `RUNNING`, `SUCCESS`, `FAILED` |
| **LogLevel** | `INFO`, `ERROR` |
| **LabelStatus** | `PENDING`, `GENERATED`, `PRINTED`, `CANCELLED` |
| **AuditLogAction** | `ORDER_CREATED`, `ORDER_CONFIRMED`, `ORDER_PACKED`, `ORDER_SHIPPED`, `ORDER_CANCELLED`, `INVENTORY_ADJUSTED`, `SHIPMENT_CREATED`, `INTEGRATION_CONNECTED`, `INTEGRATION_DISCONNECTED` |

---

## Tables

### Users & auth

#### `users`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| name | VARCHAR | NO | — | Display name |
| email | VARCHAR | NO | — | Unique, indexed |
| password_hash | VARCHAR | NO | — | Hashed password |
| role | UserRole | NO | STAFF | ADMIN / STAFF |
| created_at | TIMESTAMP | NO | now() | |
| updated_at | TIMESTAMP | NO | now() | |

---

### Channels & marketplace accounts

#### `channels`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| name | ChannelType | NO | — | SHOPIFY, AMAZON, etc. (unique) |
| is_active | BOOLEAN | NO | true | |
| created_at | TIMESTAMP | NO | now() | |

#### `channel_accounts`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| channel_id | VARCHAR | NO | — | FK → channels.id (CASCADE) |
| user_id | VARCHAR | NO | — | FK → users.id (CASCADE) |
| seller_name | VARCHAR | NO | — | Store/seller name |
| shop_domain | VARCHAR | YES | — | e.g. store.myshopify.com |
| access_token | VARCHAR | YES | — | Encrypted channel token |
| status | ChannelAccountStatus | NO | DISCONNECTED | CONNECTED / DISCONNECTED |
| created_at | TIMESTAMP | NO | now() | |

---

### Products & inventory (internal)

#### `products`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| title | VARCHAR | NO | — | |
| brand | VARCHAR | YES | — | |
| category | VARCHAR | YES | — | |
| status | ProductStatus | NO | ACTIVE | ACTIVE / ARCHIVED |
| created_at | TIMESTAMP | NO | now() | |
| updated_at | TIMESTAMP | NO | now() | |

#### `product_variants`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| product_id | VARCHAR | NO | — | FK → products.id (CASCADE) |
| sku | VARCHAR | NO | — | Unique, indexed |
| barcode | VARCHAR | YES | — | |
| mrp | NUMERIC(10,2) | NO | — | |
| selling_price | NUMERIC(10,2) | NO | — | |
| weight_grams | INTEGER | YES | — | |
| status | VariantStatus | NO | ACTIVE | |
| created_at | TIMESTAMP | NO | now() | |
| updated_at | TIMESTAMP | NO | now() | |

#### `warehouses`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| name | VARCHAR | NO | — | |
| city | VARCHAR | YES | — | |
| state | VARCHAR | YES | — | |
| created_at | TIMESTAMP | NO | now() | |

#### `inventory`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| warehouse_id | VARCHAR | NO | — | FK → warehouses.id (CASCADE) |
| variant_id | VARCHAR | NO | — | FK → product_variants.id (CASCADE) |
| total_qty | INTEGER | NO | 0 | |
| reserved_qty | INTEGER | NO | 0 | |
| updated_at | TIMESTAMP | NO | now() | |

**Unique:** `(warehouse_id, variant_id)`

#### `inventory_movements`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| warehouse_id | VARCHAR | NO | — | FK → warehouses.id (CASCADE) |
| variant_id | VARCHAR | NO | — | FK → product_variants.id (CASCADE) |
| type | InventoryMovementType | NO | — | IN, OUT, RESERVE, RELEASE |
| qty | INTEGER | NO | — | |
| reference | VARCHAR | YES | — | |
| created_at | TIMESTAMP | NO | now() | |

---

### Orders

#### `orders`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| channel_id | VARCHAR | YES | — | FK → channels.id (SET NULL) |
| channel_account_id | VARCHAR | YES | — | FK → channel_accounts.id (SET NULL) |
| channel_order_id | VARCHAR | NO | — | External order id |
| customer_name | VARCHAR | NO | — | |
| customer_email | VARCHAR | YES | — | |
| shipping_address | VARCHAR | YES | — | Full address / JSON |
| billing_address | VARCHAR | YES | — | Full address / JSON |
| payment_mode | PaymentMode | NO | — | PREPAID / COD |
| order_total | NUMERIC(10,2) | NO | — | |
| status | OrderStatus | NO | NEW | NEW … CANCELLED, etc. |
| created_at | TIMESTAMP | NO | now() | |
| updated_at | TIMESTAMP | NO | now() | |

**Unique:** `(channel_id, channel_order_id)`

#### `order_items`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| order_id | VARCHAR | NO | — | FK → orders.id (CASCADE) |
| variant_id | VARCHAR | YES | — | FK → product_variants.id (SET NULL) |
| sku | VARCHAR | NO | — | |
| title | VARCHAR | NO | — | |
| qty | INTEGER | NO | — | |
| price | NUMERIC(10,2) | NO | — | |
| fulfillment_status | FulfillmentStatus | NO | PENDING | PENDING / MAPPED / UNMAPPED_SKU |
| created_at | — | — | — | (if present in migrations) |

---

### Shipments & tracking (Delhivery / Selloship)

#### `shipments`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| order_id | VARCHAR | NO | — | FK → orders.id (CASCADE), unique |
| courier_name | VARCHAR | NO | — | e.g. `delhivery`, `selloship` |
| awb_number | VARCHAR | NO | — | Waybill / AWB |
| tracking_url | VARCHAR | YES | — | |
| label_url | VARCHAR | YES | — | |
| status | ShipmentStatus | NO | CREATED | CREATED … LOST |
| shipped_at | TIMESTAMP | YES | — | |
| forward_cost | NUMERIC(12,2) | NO | 0 | Outbound shipping cost |
| reverse_cost | NUMERIC(12,2) | NO | 0 | RTO/return cost |
| last_synced_at | TIMESTAMP | YES | — | Last courier sync |
| created_at | TIMESTAMP | NO | now() | |

#### `shipment_tracking`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| shipment_id | VARCHAR | NO | — | FK → shipments.id (CASCADE), indexed |
| waybill | VARCHAR | NO | — | Indexed |
| status | VARCHAR | YES | — | Raw or internal status |
| delivery_status | VARCHAR | YES | — | |
| rto_status | VARCHAR | YES | — | |
| raw_response | JSON | YES | — | Courier API response |
| last_updated_at | TIMESTAMP | NO | now() | |
| created_at | TIMESTAMP | NO | now() | |

---

### Integrations

#### `shopify_integrations`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| shop_domain | VARCHAR | NO | — | Unique, indexed (e.g. store.myshopify.com) |
| access_token | VARCHAR | NO | — | OAuth access token (stored encrypted where applicable) |
| scopes | VARCHAR | YES | — | Granted scopes |
| app_secret_encrypted | VARCHAR | YES | — | For webhook HMAC verification |
| installed_at | TIMESTAMP | NO | now() | |
| last_synced_at | TIMESTAMP | YES | — | |

#### `shopify_inventory`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| shop_domain | VARCHAR | NO | — | Indexed |
| sku | VARCHAR | NO | — | Indexed |
| product_name | VARCHAR | YES | — | |
| variant_id | VARCHAR | YES | — | Shopify variant id |
| inventory_item_id | VARCHAR | YES | — | Shopify inventory_item_id |
| location_id | VARCHAR | YES | — | Shopify location id |
| available | INTEGER | NO | 0 | Available qty |
| synced_at | TIMESTAMP | NO | now() | |

**Unique:** `(shop_domain, sku, location_id)`

#### `provider_credentials`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| user_id | VARCHAR | NO | — | FK → users.id (CASCADE), indexed |
| provider_id | VARCHAR | NO | — | e.g. delhivery, selloship, meta_ads, google_ads (indexed) |
| value_encrypted | VARCHAR | YES | — | Encrypted JSON (e.g. { "apiKey": "…" }) |
| created_at | TIMESTAMP | NO | now() | |
| updated_at | TIMESTAMP | NO | now() | |

**Unique:** `(user_id, provider_id)`

---

### Profit & costs

#### `sku_costs`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| sku | VARCHAR | NO | — | Unique, indexed |
| product_cost | NUMERIC(12,2) | NO | 0 | |
| packaging_cost | NUMERIC(12,2) | NO | 0 | |
| box_cost | NUMERIC(12,2) | NO | 0 | |
| inbound_cost | NUMERIC(12,2) | NO | 0 | |
| created_at | TIMESTAMP | NO | now() | |
| updated_at | TIMESTAMP | NO | now() | |

#### `order_profit`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| order_id | VARCHAR | NO | — | FK → orders.id (CASCADE), unique |
| revenue | NUMERIC(12,2) | NO | 0 | |
| product_cost | NUMERIC(12,2) | NO | 0 | |
| packaging_cost | NUMERIC(12,2) | NO | 0 | |
| shipping_cost | NUMERIC(12,2) | NO | 0 | Legacy |
| shipping_forward | NUMERIC(12,2) | NO | 0 | From shipment |
| shipping_reverse | NUMERIC(12,2) | NO | 0 | RTO cost |
| marketing_cost | NUMERIC(12,2) | NO | 0 | Blended CAC from ad_spend_daily |
| payment_fee | NUMERIC(12,2) | NO | 0 | |
| net_profit | NUMERIC(12,2) | NO | 0 | |
| rto_loss | NUMERIC(12,2) | NO | 0 | |
| lost_loss | NUMERIC(12,2) | NO | 0 | |
| courier_status | VARCHAR | YES | — | Raw from courier |
| final_status | VARCHAR | YES | — | DELIVERED / RTO_DONE / LOST / CANCELLED / PENDING |
| status | VARCHAR | NO | computed | computed / partial / missing_costs |
| created_at | TIMESTAMP | NO | now() | |
| updated_at | TIMESTAMP | NO | now() | |

#### `ad_spend_daily`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| date | DATE | NO | — | Calendar date (indexed) |
| platform | VARCHAR | NO | — | meta / google (indexed) |
| spend | NUMERIC(12,2) | NO | 0 | In INR (or currency) |
| currency | VARCHAR(3) | NO | INR | |
| synced_at | TIMESTAMP | NO | now() | |

**Unique:** `(date, platform)`

---

### Sync & webhooks

#### `sync_jobs`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| channel_account_id | VARCHAR | NO | — | FK → channel_accounts.id (CASCADE) |
| job_type | SyncJobType | NO | — | PULL_ORDERS / PULL_PRODUCTS / PUSH_INVENTORY |
| status | SyncJobStatus | NO | QUEUED | QUEUED / RUNNING / SUCCESS / FAILED |
| started_at | TIMESTAMP | YES | — | |
| finished_at | TIMESTAMP | YES | — | |
| records_processed | INTEGER | NO | 0 | |
| records_failed | INTEGER | NO | 0 | |
| error_message | VARCHAR | YES | — | |
| created_at | TIMESTAMP | NO | now() | |

#### `sync_logs`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| sync_job_id | VARCHAR | NO | — | FK → sync_jobs.id (CASCADE) |
| level | LogLevel | NO | — | INFO / ERROR |
| message | VARCHAR | NO | — | |
| raw_payload | JSON | YES | — | |
| created_at | TIMESTAMP | NO | now() | |

#### `webhook_events`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| source | VARCHAR | NO | — | e.g. shopify (indexed) |
| shop_domain | VARCHAR | YES | — | Indexed |
| topic | VARCHAR | NO | — | e.g. orders/create (indexed) |
| payload_summary | VARCHAR | YES | — | id, order_id, etc. |
| processed_at | TIMESTAMP | YES | — | |
| error | VARCHAR | YES | — | |
| created_at | TIMESTAMP | NO | now() | |

---

### Audit & labels

#### `audit_logs`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| user_id | VARCHAR | YES | — | FK → users.id (SET NULL) |
| action | AuditLogAction | NO | — | |
| entity_type | VARCHAR | NO | — | Order, Inventory, Shipment, etc. |
| entity_id | VARCHAR | NO | — | |
| details | JSON | YES | — | |
| created_at | TIMESTAMP | NO | now() | |

#### `labels`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR (UUID) | NO | uuid | Primary key |
| order_id | VARCHAR | NO | — | FK → orders.id (CASCADE) |
| user_id | VARCHAR | NO | — | FK → users.id (CASCADE) |
| tracking_number | VARCHAR | NO | — | |
| carrier | VARCHAR | NO | — | |
| status | VARCHAR | NO | PENDING | PENDING / GENERATED / PRINTED / CANCELLED |
| created_at | TIMESTAMP | NO | now() | |
| updated_at | TIMESTAMP | NO | now() | |

---

## Entity relationships (summary)

```
users
  ├── channel_accounts (user_id)
  ├── provider_credentials (user_id)
  ├── audit_logs (user_id)
  └── labels (user_id)

channels
  └── channel_accounts (channel_id)

channel_accounts
  ├── orders (channel_account_id)
  └── sync_jobs (channel_account_id)

products
  └── product_variants (product_id)

product_variants
  ├── inventory (variant_id)
  ├── inventory_movements (variant_id)
  └── order_items (variant_id)

warehouses
  ├── inventory (warehouse_id)
  └── inventory_movements (warehouse_id)

orders
  ├── order_items (order_id)
  ├── shipment (order_id)  [1:1]
  ├── order_profit (order_id)  [1:1]
  └── labels (order_id)

shipments
  └── shipment_tracking (shipment_id)  [1:1]

sync_jobs
  └── sync_logs (sync_job_id)
```

---

## Indexes & constraints (not exhaustive)

- **Primary keys:** All tables use `id` (UUID string).
- **Uniques:** `users.email`; `channels.name`; `(channel_id, channel_order_id)` on orders; `order_id` on shipments; `(user_id, provider_id)` on provider_credentials; `(date, platform)` on ad_spend_daily; `(shop_domain, sku, location_id)` on shopify_inventory; `order_id` on order_profit; `shop_domain` on shopify_integrations; `sku` on product_variants and sku_costs.
- **Foreign keys:** As listed in tables; CASCADE or SET NULL per column.
- **Indexes:** Commonly on foreign keys, `email`, `shop_domain`, `sku`, `provider_id`, `date`, `platform`, `source`, `topic`, `waybill`, etc. (see models and migrations).

---

## Migrations

Schema changes are applied via **Alembic** in `apps/api-python/alembic/`. After pulling or changing models:

```bash
cd apps/api-python
alembic upgrade head
```

See `apps/api-python/README.md` and `DEPLOYMENT_NOTES.md` for deploy-time migration commands.
