# Vercel Environment Variables Setup

## ⚠️ CRITICAL: Required for Production

Your Vercel deployment is failing because the API URL is not configured. The frontend is trying to connect to `http://127.0.0.1:4000/api` which doesn't work in production.

## Required Environment Variables

Go to your Vercel project dashboard:
1. Navigate to **Settings** → **Environment Variables**
2. Add the following variables:

### 1. API URL (REQUIRED)
```
NEXT_PUBLIC_API_URL=https://lacleoomnia.onrender.com/api
```
**Important:** Replace `https://lacleoomnia.onrender.com/api` with your actual API URL.

**How to find your API URL:**
- If your API is on Render: `https://your-app-name.onrender.com/api`
- If your API is on Railway: `https://your-app-name.railway.app/api`
- If your API is on another service: `https://your-api-domain.com/api`

### 2. Google OAuth (Optional but Recommended)
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
```

## Steps to Fix "Failed to Fetch" Error

1. **Get your API URL**
   - Check your Render/Railway dashboard for the API URL
   - It should look like: `https://lacleoomnia.onrender.com/api`

2. **Add to Vercel**
   - Go to: https://vercel.com/your-project/settings/environment-variables
   - Click "Add New"
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: Your API URL (e.g., `https://lacleoomnia.onrender.com/api`)
   - Environment: Select "Production", "Preview", and "Development"
   - Click "Save"

3. **Redeploy**
   - Go to Deployments tab
   - Click "..." on the latest deployment
   - Click "Redeploy"

## Verify It's Working

After redeploying:
1. Visit https://lacleo-web.vercel.app/
2. Open browser console (F12)
3. Try to login
4. Check console for any errors
5. The API URL should now be your production API, not localhost

## Troubleshooting

### Still seeing "Failed to fetch"?

1. **Check API is running:**
   - Visit your API health endpoint: `https://your-api-url.com/health`
   - Should return: `{"status":"ok","service":"api"}`

2. **Check CORS:**
   - The API should allow requests from `https://lacleo-web.vercel.app`
   - Check API logs for CORS errors

3. **Check Network tab:**
   - Open browser DevTools → Network tab
   - Try to login
   - See what URL it's trying to fetch
   - Check the error message

4. **Verify environment variable:**
   - In Vercel, go to Settings → Environment Variables
   - Make sure `NEXT_PUBLIC_API_URL` is set
   - Make sure it's enabled for "Production" environment

## Example Configuration

```
NEXT_PUBLIC_API_URL=https://lacleoomnia.onrender.com/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=431141315377-g113h5og2e7a7ujmppkof7f87m7pmut6.apps.googleusercontent.com
```

## Notes

- Environment variables starting with `NEXT_PUBLIC_` are exposed to the browser
- After adding/changing environment variables, you MUST redeploy
- The API URL must include `/api` at the end
- Make sure your API server is accessible from the internet (not localhost)
