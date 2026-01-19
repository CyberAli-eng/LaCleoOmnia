# Quick Fix for "Failed to Fetch" Error

## The Problem
Your Vercel deployment is trying to connect to `http://127.0.0.1:4000/api` which doesn't work in production.

## The Solution (2 minutes)

### Step 1: Get Your API URL
Your API should be deployed on Render at: `https://lacleoomnia.onrender.com`

So your API URL is: `https://lacleoomnia.onrender.com/api`

### Step 2: Add Environment Variable in Vercel

1. Go to: https://vercel.com/dashboard
2. Click on your project: **lacleo-web** (or whatever it's named)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter:
   - **Key:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://lacleoomnia.onrender.com/api`
   - **Environment:** Select all (Production, Preview, Development)
6. Click **Save**

### Step 3: Redeploy

1. Go to **Deployments** tab
2. Click **...** (three dots) on the latest deployment
3. Click **Redeploy**
4. Wait for it to finish

### Step 4: Test

1. Visit: https://lacleo-web.vercel.app/
2. Try to login
3. It should work now! ✅

## If It Still Doesn't Work

1. **Check API is running:**
   - Visit: https://lacleoomnia.onrender.com/health
   - Should show: `{"status":"ok","service":"api"}`

2. **Check browser console:**
   - Press F12 → Console tab
   - Try to login
   - Look for error messages
   - The API URL should be `https://lacleoomnia.onrender.com/api`, not localhost

3. **Verify environment variable:**
   - In Vercel, go back to Environment Variables
   - Make sure `NEXT_PUBLIC_API_URL` is there
   - Make sure it's enabled for Production

## That's It!

After adding the environment variable and redeploying, your login should work. The frontend will now connect to your production API instead of trying to reach localhost.
