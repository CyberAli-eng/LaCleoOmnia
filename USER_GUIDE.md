# LaCleoOmnia OMS - User Guide

Welcome to LaCleoOmnia! This guide will help you get started with managing your orders, inventory, and multiple store integrations.

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Connecting Your First Store](#connecting-your-first-store)
3. [Managing Orders](#managing-orders)
4. [Inventory Management](#inventory-management)
5. [Shipping Labels](#shipping-labels)
6. [Managing Multiple Stores](#managing-multiple-stores)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Step 1: Create Your Account

1. Visit your LaCleoOmnia dashboard URL
2. Click **"Sign up"** or **"Register"**
3. Fill in your details:
   - **Name**: Your full name
   - **Email**: Your business email address
   - **Password**: Create a strong password (minimum 8 characters)
4. Click **"Create Account"**
5. You'll be automatically logged in

### Step 2: Explore the Dashboard

Once logged in, you'll see:
- **Overview**: Summary of your orders, revenue, and integrations
- **Orders**: All your orders from connected stores
- **Inventory**: Product stock levels across warehouses
- **Integrations**: Connect and manage your stores
- **Labels**: Generate shipping labels
- **Analytics**: Business insights and reports

---

## Connecting Your First Store

### Option A: Connect Shopify via OAuth (Recommended)

This is the easiest and most secure method.

#### Step 1: Go to Integrations
1. Click **"Integrations"** in the sidebar
2. Find the **Shopify** card
3. Click **"Connect via OAuth (Recommended)"**

#### Step 2: Authorize Access
1. Enter your **Shop Domain** (e.g., `mystore` or `mystore.myshopify.com`)
2. You'll be redirected to Shopify
3. Review the permissions requested
4. Click **"Install app"** or **"Allow"**
5. You'll be redirected back to LaCleoOmnia

#### Step 3: Verify Connection
1. You should see **"Connected ✅"** on the Shopify card
2. Click **"Test Connection"** to verify everything works
3. You'll see your shop name, product count, and recent orders

**✅ Done!** Your Shopify store is now connected and ready to sync orders.

---

### Option B: Connect Shopify Manually

If OAuth is not available, you can connect manually using an Admin API token.

#### Step 1: Get Your Shopify Admin API Token

1. Log in to your Shopify Admin panel
2. Go to **Settings** → **Apps and sales channels**
3. Click **"Develop apps"** (at the bottom)
4. Click **"Create an app"**
5. Name it (e.g., "LaCleoOmnia Integration")
6. Click **"Create app"**
7. Go to **"API credentials"** tab
8. Click **"Configure Admin API scopes"**
9. Select these scopes:
   - `read_orders`
   - `write_orders`
   - `read_products`
   - `write_products`
   - `read_inventory`
   - `write_inventory`
10. Click **"Save"**
11. Click **"Install app"**
12. Copy the **Admin API access token** (starts with `shpat_...`)

#### Step 2: Connect in LaCleoOmnia

1. Go to **Integrations** page
2. Find the **Shopify** card
3. Click **"Connect Manually"**
4. Fill in the form:
   - **Seller Name**: Your store name (e.g., "My Store")
   - **Shop Domain**: Your shop domain (e.g., `mystore` or `mystore.myshopify.com`)
   - **Admin API Access Token**: Paste the token you copied
5. Click **"Connect"**

#### Step 3: Test Connection

1. Click **"Test Connection"** button
2. You should see:
   - ✅ Shop name
   - ✅ Number of products
   - ✅ Number of locations
   - ✅ Recent orders count

**✅ Done!** Your store is connected.

---

## Managing Orders

### Import Orders from Shopify

1. Go to **Integrations** page
2. Find your connected Shopify store
3. Click **"Import Orders"**
4. Wait for the import to complete (you'll see a success message)
5. Go to **Orders** page to see your imported orders

### View Orders

1. Click **"Orders"** in the sidebar
2. You'll see all orders in a table with:
   - Order ID
   - Customer name
   - Payment mode (COD/Prepaid)
   - Total amount
   - Status
   - Date

### Filter and Search Orders

- **Status Filter**: Click status buttons (All, Pending, Confirmed, etc.)
- **Search**: Use the search bar to find orders by:
  - Order ID
  - Customer name
  - Customer email

### Order Actions

#### View Order Details
1. Click **"View"** on any order
2. See complete order information:
   - Customer details
   - Order items
   - Payment information
   - Order timeline
   - Shipment details (if shipped)

#### Confirm Order
1. Open order details
2. Click **"Confirm"** button
3. Order status changes to "Confirmed"
4. Inventory is automatically reserved

#### Pack Order
1. After confirming, click **"Pack"** button
2. Order status changes to "Packed"
3. Ready for shipping

#### Ship Order
1. After packing, click **"Ship"** button
2. You'll be prompted to:
   - Select courier (Shiprocket, Delhivery, etc.)
   - Enter AWB number (optional - auto-generated if empty)
3. Click **"Generate & Ship"**
4. Order status changes to "Shipped"
5. Inventory is automatically deducted

#### Cancel Order
1. Click **"Cancel"** button
2. Confirm cancellation
3. Reserved inventory is automatically released

### Bulk Operations

You can perform actions on multiple orders at once:

1. Select orders using checkboxes
2. Choose action from dropdown:
   - **Bulk Confirm**: Confirm multiple orders
   - **Bulk Pack**: Pack multiple orders
   - **Bulk Ship**: Ship multiple orders
   - **Bulk Cancel**: Cancel multiple orders
3. Click **"Apply"**

---

## Inventory Management

### View Inventory

1. Click **"Inventory"** in the sidebar
2. See all products with:
   - SKU
   - Product name
   - Warehouse
   - Total quantity
   - Reserved quantity
   - Available quantity
   - Stock status

### Filter Inventory

- **Search**: Search by SKU or product name
- **Low Stock Only**: Toggle to see only low stock items
- **Warehouse Filter**: Select specific warehouse

### Adjust Inventory

1. Find the product you want to adjust
2. Click **"Adjust"** button
3. Fill in:
   - **Warehouse**: Select warehouse
   - **Quantity Delta**: Enter positive number to add, negative to subtract
   - **Reason**: Enter reason (e.g., "Stock correction", "Returned items")
4. Click **"Adjust"**
5. Inventory is updated immediately

### Multi-Warehouse Management

- View stock levels across different warehouses
- See reserved vs available stock
- Track inventory movements

---

## Shipping Labels

### Generate Shipping Label

1. Go to **Labels** page
2. Click **"+ Generate Label"**
3. Select:
   - **Order**: Choose from packed/confirmed orders
   - **Courier**: Select shipping provider
     - Shiprocket
     - Delhivery
     - BlueDart
     - FedEx
     - DHL
     - Standard
   - **AWB Number**: Enter manually or leave blank for auto-generation
4. Click **"Generate & Ship"**
5. Label is created and order is marked as shipped

### Print Label

1. Go to **Labels** page
2. Find the label you want to print
3. Click **"Print"** button
4. Label opens in new window for printing

### Download Invoice

1. Go to **Labels** page
2. Find the label
3. Click **"Invoice"** button
4. Invoice downloads automatically

### View Label Details

1. Click **"View"** on any label
2. See:
   - Order information
   - Tracking number
   - Courier details
   - Status
   - Print and download options

---

## Managing Multiple Stores

### Connect Additional Stores

You can connect multiple Shopify stores:

1. Go to **Integrations** page
2. Click **"Connect"** on Shopify card again
3. Follow the same connection process
4. Each store will appear as a separate integration

### Switch Between Stores

- All orders from all connected stores appear in the **Orders** page
- Filter by source/channel to see orders from specific stores
- Each integration shows its own sync status

### Sync Status

Each connected store shows:
- **Last Sync Time**: When orders were last imported
- **Connection Status**: Connected ✅ or Not Connected ❌
- **Webhook Status**: Active webhooks count

### Re-sync Orders

1. Go to **Integrations** page
2. Find your store
3. Click **"Import Orders"**
4. New orders will be imported

---

## Webhooks & Real-time Updates

### What are Webhooks?

Webhooks automatically send order updates from your stores to LaCleoOmnia in real-time. This means:
- New orders appear automatically
- Order status changes sync instantly
- Inventory updates happen in real-time

### View Webhook Events

1. Go to **Webhooks** page
2. See all webhook events:
   - Source (Shopify, Amazon, etc.)
   - Event type
   - Status (Success/Failed)
   - Timestamp

### Retry Failed Webhooks

If a webhook fails:
1. Go to **Webhooks** page
2. Find the failed event
3. Click **"Retry"** button
4. Event will be processed again

### Webhook Subscriptions

View all active webhook subscriptions:
- `orders/create` - New orders
- `orders/updated` - Order changes
- `orders/cancelled` - Cancelled orders
- `inventory_levels/update` - Stock changes
- `products/update` - Product updates

---

## Analytics & Reports

### Dashboard Overview

The dashboard shows:
- **Total Orders**: All-time order count
- **Total Revenue**: Total sales amount
- **Active Integrations**: Number of connected stores
- **Products**: Total tracked SKUs
- **Recent Orders**: Latest 10 orders

### View Analytics

1. Click **"Analytics"** in the sidebar
2. See detailed reports and insights

---

## User Management (Admin Only)

If you're an admin, you can manage team members:

### Add New User

1. Go to **Users** page
2. Click **"+ Add User"**
3. Fill in:
   - Name
   - Email
   - Password
   - Role (Staff or Admin)
4. Click **"Create User"**

### Manage User Roles

1. Go to **Users** page
2. Find the user
3. Change role using dropdown (Admin/Staff)
4. Changes save automatically

### Delete User

1. Go to **Users** page
2. Click **"Delete"** on the user
3. Confirm deletion

---

## Troubleshooting

### Can't Connect Shopify Store

**Problem**: Connection fails or test fails

**Solutions**:
1. **Check Shop Domain**: Make sure it's correct (e.g., `mystore` not `mystore.myshopify.com`)
2. **Verify API Token**: Ensure token is correct and has required permissions
3. **Check Permissions**: Token must have read/write access to orders, products, inventory
4. **Try OAuth**: Use OAuth method instead of manual token

### Orders Not Importing

**Problem**: Click "Import Orders" but nothing happens

**Solutions**:
1. **Check Connection**: Test connection first
2. **Verify Permissions**: Ensure API token has `read_orders` permission
3. **Check Orders**: Make sure you have orders in your Shopify store
4. **Wait**: Large imports may take a few minutes

### Inventory Not Syncing

**Problem**: Inventory levels don't match

**Solutions**:
1. **Manual Sync**: Click "Push Inventory" or "Import Orders"
2. **Check Warehouse**: Ensure warehouse is selected correctly
3. **Verify SKU Mapping**: Products must have SKU mapping
4. **Check Permissions**: API token needs inventory read/write access

### Shipping Label Not Generating

**Problem**: Can't generate shipping label

**Solutions**:
1. **Order Status**: Order must be "Packed" or "Confirmed"
2. **Select Order**: Make sure order is selected in dropdown
3. **Check Courier**: Select a courier option
4. **Try Again**: Sometimes retry works

### Webhooks Not Working

**Problem**: Webhooks showing as failed

**Solutions**:
1. **Check WEBHOOK_BASE_URL**: Must be set in backend configuration
2. **Verify URL**: Webhook URL must be publicly accessible
3. **Retry**: Click "Retry" on failed webhooks
4. **Re-register**: Click "Re-register Webhooks" in Integrations

### Can't Login

**Problem**: Login fails with "Invalid credentials"

**Solutions**:
1. **Check Email**: Ensure email is correct (case-sensitive)
2. **Check Password**: Verify password is correct
3. **Reset Password**: Contact admin to reset password
4. **Clear Cache**: Clear browser cache and cookies

---

## Best Practices

### 1. Regular Order Import
- Import orders daily or set up automatic sync
- Check for new orders regularly

### 2. Inventory Management
- Keep inventory levels updated
- Set low stock alerts
- Regular stock reconciliation

### 3. Order Processing
- Confirm orders promptly
- Pack orders in batches
- Generate labels before shipping

### 4. Multiple Stores
- Use consistent SKU naming across stores
- Keep inventory synced
- Monitor all stores regularly

### 5. Security
- Use strong passwords
- Don't share API tokens
- Use OAuth when possible (more secure)

---

## Support

### Need Help?

1. **Check This Guide**: Most issues are covered here
2. **Contact Support**: Reach out to your account manager
3. **Check Logs**: View webhook logs and sync history for errors

### Useful Pages

- **Webhooks**: Monitor real-time events
- **Audit Logs**: See all system actions
- **Workers**: View sync job status
- **Analytics**: Business insights

---

## Quick Reference

### Common Tasks

| Task | Steps |
|------|-------|
| Connect Shopify | Integrations → Shopify → Connect via OAuth |
| Import Orders | Integrations → Shopify → Import Orders |
| Confirm Order | Orders → View → Confirm |
| Generate Label | Labels → Generate Label → Select Order & Courier |
| Adjust Inventory | Inventory → Adjust → Enter Quantity |
| View Webhooks | Webhooks → See Events Table |

### Keyboard Shortcuts

- `Ctrl/Cmd + K`: Global search (when available)
- `Esc`: Close modals
- `Enter`: Submit forms

---

**Welcome to LaCleoOmnia! Start by connecting your first store and importing your orders. Happy selling! 🚀**
