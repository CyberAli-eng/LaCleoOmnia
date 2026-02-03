# Store Integration Guide

## Quick Integration Steps

### Shopify Integration (5 Minutes)

#### Method 1: OAuth (Recommended - Most Secure)

1. **Go to Integrations Page**
   - Click "Integrations" in sidebar
   - Find Shopify card

2. **Start OAuth Flow**
   - Click "Connect via OAuth (Recommended)"
   - Enter your shop domain (e.g., `mystore`)

3. **Authorize on Shopify**
   - You'll be redirected to Shopify
   - Review permissions
   - Click "Install app"

4. **Done!**
   - Automatically redirected back
   - Store is connected
   - Webhooks are registered automatically

**Time: ~2 minutes**

---

#### Method 2: Manual Token (Alternative)

1. **Get Shopify Admin API Token**
   - Login to Shopify Admin
   - Settings → Apps and sales channels
   - Develop apps → Create app
   - Configure Admin API scopes:
     - ✅ read_orders, write_orders
     - ✅ read_products, write_products
     - ✅ read_inventory, write_inventory
     - ✅ read_locations (required for inventory sync)
   - Install app
   - Copy Admin API access token

2. **Connect in LaCleoOmnia**
   - Go to Integrations
   - Click "Connect Manually"
   - Enter:
     - Seller Name
     - Shop Domain
     - Admin API Token
   - Click "Connect"

3. **Test Connection**
   - Click "Test Connection"
   - Verify shop details appear

**Time: ~5 minutes**

---

## Step-by-Step: Shopify OAuth Integration

### Prerequisites
- Shopify store (any plan)
- LaCleoOmnia account

### Detailed Steps

#### Step 1: Navigate to Integrations
```
Dashboard → Integrations (in sidebar)
```

#### Step 2: Find Shopify Card
- Look for the Shopify card with 🛍️ icon
- Status should show "Not Connected"

#### Step 3: Click Connect
- Click "Connect via OAuth (Recommended)" button
- A popup will ask for your shop domain

#### Step 4: Enter Shop Domain
- Enter your shop domain in one of these formats:
  - `mystore` (recommended)
  - `mystore.myshopify.com` (also works)
- Click "Continue"

#### Step 5: Authorize on Shopify
- You'll be redirected to Shopify
- Shopify will show:
  - App name: "LaCleoOmnia"
  - Permissions requested
- Click "Install app" to authorize

#### Step 6: Return to LaCleoOmnia
- After authorization, you'll be redirected back
- You should see:
  - ✅ "Connected" status
  - Shop name displayed
  - Last sync time

#### Step 7: Test Connection (Optional but Recommended)
- Click "Test Connection" button
- You should see:
  - Shop name
  - Number of products
  - Number of locations
  - Recent orders count

**✅ Integration Complete!**

---

## Step-by-Step: Manual Token Integration

### When to Use Manual Token
- OAuth not available
- Custom app setup required
- Testing purposes

### Detailed Steps

#### Step 1: Create Shopify App

1. Login to Shopify Admin
2. Go to **Settings** → **Apps and sales channels**
3. Scroll down and click **"Develop apps"**
4. Click **"Create an app"**
5. Enter app name: `LaCleoOmnia Integration`
6. Click **"Create app"**

#### Step 2: Configure API Scopes

1. In your new app, go to **"API credentials"** tab
2. Click **"Configure Admin API scopes"**
3. Select these scopes:

   **Orders:**
   - ✅ `read_orders`
   - ✅ `write_orders`

   **Products:**
   - ✅ `read_products`
   - ✅ `write_products`

   **Inventory:**
   - ✅ `read_inventory`
   - ✅ `write_inventory`

   **Locations** (required for inventory sync):
   - ✅ `read_locations`

4. Click **"Save"**

#### Step 3: Install App and Get Token

1. Click **"Install app"** button
2. Confirm installation
3. You'll see **"Admin API access token"**
4. Click **"Reveal token once"** or **"Copy"**
5. **⚠️ Save this token immediately** - you won't see it again!

#### Step 4: Connect in LaCleoOmnia

1. Go to **Integrations** page
2. Find Shopify card
3. Click **"Connect Manually"**
4. Fill in the form:

   **Seller Name:**
   - Your store name (e.g., "My Awesome Store")
   - This is just for identification

   **Shop Domain:**
   - Enter: `mystore` (without .myshopify.com)
   - Or: `mystore.myshopify.com` (also works)

   **Admin API Access Token:**
   - Paste the token you copied
   - Should start with `shpat_...`

5. Click **"Connect"**

#### Step 5: Verify Connection

1. Click **"Test Connection"** button
2. Wait a few seconds
3. You should see:
   - ✅ Shop name
   - ✅ Product count
   - ✅ Locations list
   - ✅ Recent orders

**✅ Integration Complete!**

---

## After Integration

### Import Your First Orders

1. Go to **Integrations** page
2. Find your connected Shopify store
3. Click **"Import Orders"** button
4. Wait for import to complete
5. Go to **Orders** page to see your orders

### Set Up Webhooks (Automatic)

If you used OAuth, webhooks are automatically registered:
- ✅ `orders/create` - New orders
- ✅ `orders/updated` - Order changes
- ✅ `orders/cancelled` - Cancellations
- ✅ `inventory_levels/update` - Stock changes
- ✅ `products/update` - Product updates

If you used manual token, webhooks will register if `WEBHOOK_BASE_URL` is configured.

### Verify Webhooks

1. Go to **Webhooks** page
2. Check **"Webhook Subscriptions"** section
3. You should see active subscriptions
4. Status should be **"ACTIVE"**

---

## Connecting Multiple Stores

### Add Second Store

1. Go to **Integrations** page
2. Click **"Connect"** on Shopify card again
3. Follow the same process
4. Each store will appear separately

### Managing Multiple Stores

- All orders appear in one **Orders** page
- Filter by source to see orders from specific stores
- Each store has its own sync status
- Import orders from each store independently

---

## Troubleshooting Integration

### "Connection Failed" Error

**Possible Causes:**
1. **Wrong Shop Domain**
   - ✅ Use: `mystore`
   - ❌ Don't use: `https://mystore.myshopify.com`

2. **Invalid Token**
   - Token must start with `shpat_...`
   - Token must have correct permissions
   - Token might be expired

3. **Network Issues**
   - Check internet connection
   - Try again after a few minutes

**Solutions:**
- Double-check shop domain format
- Verify token is correct
- Try OAuth method instead

### "Test Connection" Shows Errors

**Possible Causes:**
1. **Insufficient Permissions**
   - Token doesn't have required scopes
   - Recreate app with all required scopes

2. **Store Not Active**
   - Store might be paused
   - Check Shopify admin

**Solutions:**
- Verify all scopes are selected
- Check store status in Shopify
- Contact support if issue persists

### Orders Not Importing

**Possible Causes:**
1. **No Orders in Store**
   - Store might not have orders yet
   - Check Shopify admin

2. **Permission Issues**
   - Token missing `read_orders` scope
   - Recreate app with correct scopes

3. **Import in Progress**
   - Large imports take time
   - Wait a few minutes

**Solutions:**
- Verify you have orders in Shopify
- Check token permissions
- Wait for import to complete
- Try importing again

### Webhooks Not Working

**Possible Causes:**
1. **WEBHOOK_BASE_URL Not Set**
   - Backend configuration missing
   - Contact administrator

2. **Webhook URL Not Accessible**
   - URL must be publicly accessible
   - Check backend deployment

**Solutions:**
- Contact support to configure webhooks
- Check Webhooks page for errors
- Click "Re-register Webhooks"

---

## Security Best Practices

### For OAuth Users
- ✅ Most secure method
- ✅ Tokens automatically managed
- ✅ Can revoke access anytime from Shopify

### For Manual Token Users
- ⚠️ Keep token secret
- ⚠️ Don't share token
- ⚠️ Regenerate if compromised
- ⚠️ Use minimum required permissions

### General Tips
- Use strong passwords
- Don't share account credentials
- Review connected apps regularly
- Revoke access if no longer needed

---

## Integration Checklist

### Before Integration
- [ ] Have Shopify store ready
- [ ] Know your shop domain
- [ ] Have admin access to Shopify

### During Integration
- [ ] Choose integration method (OAuth or Manual)
- [ ] Complete authorization/connection
- [ ] Test connection successfully

### After Integration
- [ ] Import first batch of orders
- [ ] Verify webhooks are active
- [ ] Test order import
- [ ] Check inventory sync (if applicable)

---

## Next Steps After Integration

1. **Import Orders**
   - Click "Import Orders" to sync existing orders

2. **Set Up Inventory**
   - Map your products/SKUs
   - Set initial stock levels

3. **Configure Logistics (optional)**
   - Integrations → Logistics → Delhivery / Selloship: paste API key
   - Sync shipments for tracking and RTO; profit updates automatically

4. **Start Processing Orders**
   - Confirm orders
   - Pack and ship
   - Generate labels

---

## Support

### Need Help?

- **Check Troubleshooting Section**: Most issues covered above
- **Contact Support**: Reach out for assistance
- **Check Logs**: View webhook logs for errors

### Common Questions

**Q: Can I connect multiple Shopify stores?**
A: Yes! Connect as many as you need. Each appears separately.

**Q: Do I need to reconnect if I change my Shopify password?**
A: No, OAuth tokens are independent. Manual tokens need to be regenerated.

**Q: Can I disconnect a store?**
A: Yes, contact support or delete the integration.

**Q: Will my existing orders be imported?**
A: Yes, "Import Orders" brings in existing orders from your store.

---

**Ready to integrate? Start with the OAuth method - it's the fastest and most secure! 🚀**
