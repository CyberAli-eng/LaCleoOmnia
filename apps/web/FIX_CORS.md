# Fix CORS Error - Local Development

## Problem

You're getting CORS errors because:
- Frontend is trying to connect to **production backend** (`https://lacleoomnia.onrender.com`)
- But you're running **locally** (`http://localhost:3000`)
- Production backend doesn't allow localhost origins

## Solution

### Option 1: Use Local Backend (Recommended for Development)

1. **Make sure backend is running locally:**
   ```bash
   cd apps/api-python
   source venv/bin/activate
   python -m uvicorn main:app --reload
   ```
   Backend should be at: `http://localhost:8000`

2. **Create `.env.local` in `apps/web/`:**
   ```bash
   cd apps/web
   echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
   ```

3. **Restart Next.js dev server:**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart
   npm run dev
   ```

4. **Clear Next.js cache (if needed):**
   ```bash
   rm -rf .next
   npm run dev
   ```

### Option 2: Remove Production URL from Environment

If you have a `.env` or `.env.local` file with the production URL, remove or comment it out:

```env
# Comment out or remove this line:
# NEXT_PUBLIC_API_URL=https://lacleoomnia.onrender.com/api

# Use local backend instead:
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Option 3: Check for Environment Variables

Check if you have any environment variables set that override the default:

```bash
cd apps/web
# Check for .env files
ls -la .env*

# Check what's being used
grep -r "NEXT_PUBLIC_API" .env* 2>/dev/null || echo "No .env files found"
```

## Verify It's Working

1. **Check browser console** - Should see API calls to `localhost:8000`
2. **Check Network tab** - Login request should go to `http://localhost:8000/api/auth/login`
3. **Test login** - Should work without CORS errors

## Quick Fix Command

Run this in `apps/web/`:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local && rm -rf .next && npm run dev
```

This will:
1. Create `.env.local` with local backend URL
2. Clear Next.js cache
3. Restart dev server

## For Production

When deploying to Vercel, set in Vercel dashboard:
```
NEXT_PUBLIC_API_URL=https://lacleoomnia.onrender.com/api
```

The code now automatically uses localhost in development mode, even if production URL is set!
