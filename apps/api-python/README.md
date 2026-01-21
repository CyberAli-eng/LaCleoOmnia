# LaCleoOmnia OMS - Python FastAPI Backend

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd apps/api-python
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Set Environment Variables

```bash
cp .env.example .env
# Edit .env and set DATABASE_URL
```

### 3. Initialize Database

```bash
# Create tables
alembic upgrade head

# Seed database
python seed.py
```

### 4. Run Server

```bash
python main.py
# Or: uvicorn main:app --reload --port 4000
```

## 📁 Project Structure

```
apps/api-python/
├── app/
│   ├── __init__.py
│   ├── database.py          # Database configuration
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # Authentication utilities
│   ├── routers/             # API route handlers
│   │   ├── auth.py
│   │   ├── channels.py
│   │   ├── orders.py
│   │   ├── inventory.py
│   │   ├── products.py
│   │   ├── warehouses.py
│   │   ├── shipments.py
│   │   └── sync.py
│   └── services/            # Business logic
│       ├── credentials.py
│       ├── shopify.py
│       └── order_import.py
├── alembic/                 # Database migrations
├── main.py                  # FastAPI app entry point
├── seed.py                  # Database seeding
├── requirements.txt
└── .env.example
```

## 🔑 API Endpoints

All endpoints are prefixed with `/api`

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Channels
- `GET /api/channels` - List channels
- `POST /api/channels/shopify/connect` - Connect Shopify
- `POST /api/channels/shopify/test` - Test connection
- `POST /api/channels/shopify/import-orders` - Import orders

### Orders
- `GET /api/orders` - List orders
- `GET /api/orders/{id}` - Get order
- `POST /api/orders/{id}/confirm` - Confirm order
- `POST /api/orders/{id}/pack` - Pack order
- `POST /api/orders/{id}/ship` - Ship order
- `POST /api/orders/{id}/cancel` - Cancel order

### Inventory
- `GET /api/inventory` - List inventory
- `POST /api/inventory/adjust` - Adjust inventory

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product (Admin)
- `GET /api/products/{id}` - Get product
- `PATCH /api/products/{id}` - Update product (Admin)
- `DELETE /api/products/{id}` - Delete product (Admin)

### Warehouses
- `GET /api/warehouses` - List warehouses
- `POST /api/warehouses` - Create warehouse
- `PATCH /api/warehouses/{id}` - Update warehouse

### Shipments
- `GET /api/shipments` - List shipments
- `GET /api/shipments/{id}` - Get shipment

### Sync
- `GET /api/sync/jobs` - List sync jobs
- `GET /api/sync/logs` - List sync logs

## 🔐 Authentication

All endpoints (except `/api/auth/login`) require a Bearer token:

```
Authorization: Bearer <token>
```

## 📊 Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 🧪 Testing

```bash
# Run with auto-reload
uvicorn main:app --reload --port 4000

# Access API docs
# http://localhost:4000/docs (Swagger UI)
# http://localhost:4000/redoc (ReDoc)
```

## 🔄 Migration from Node.js API

The Python backend is a complete replacement for the Express API:

- ✅ All routes ported
- ✅ Business logic preserved
- ✅ Same database schema
- ✅ Same API contract
- ✅ Authentication with JWT
- ✅ Role-based access control

Just update the frontend API URL to point to the Python backend!
