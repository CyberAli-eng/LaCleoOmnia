# Vercel Deployment Guide

## Configuration

This project is configured to deploy the Next.js web app (`apps/web`) to Vercel.

### Option 1: Configure in Vercel Dashboard (Recommended)

1. Go to your Vercel project settings
2. Navigate to **Settings** → **General**
3. Set **Root Directory** to: `apps/web`
4. Vercel will automatically detect Next.js and use the correct build settings

### Option 2: Use vercel.json (Current Setup)

The `vercel.json` file is configured to:
- Install dependencies in `apps/web`
- Build the Next.js app
- Output to `apps/web/.next`

## Environment Variables

Make sure to set these in Vercel Dashboard → Settings → Environment Variables:

**Required:**
- `NEXT_PUBLIC_API_URL` - Your API URL (e.g., `https://lacleoomnia.onrender.com/api`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth Client ID

## Troubleshooting

### "Tracker 'idealTree' already exists" Error

If you see this error:
1. The `vercel.json` should handle this by installing only in `apps/web`
2. If it persists, try Option 1 above (set Root Directory in dashboard)
3. Or delete `node_modules` and `.next` folders and redeploy

### Build Fails

1. Check that all dependencies in `apps/web/package.json` are correct
2. Ensure Node.js version is 18+ (set in Vercel dashboard)
3. Check build logs for specific errors

## Notes

- The API (`apps/api`) should be deployed separately (e.g., on Render, Railway, etc.)
- Only the web app is deployed to Vercel
- The monorepo structure is handled by installing dependencies only in `apps/web`
