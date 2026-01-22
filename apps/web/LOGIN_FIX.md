# Login Flow Fix - Summary

## Problem
The login page was refreshing continuously because:
1. Login stored token in `localStorage` only
2. Middleware checked for token in `cookies` only
3. Mismatch caused infinite redirect loop

## Solution
Implemented dual storage system:
- **Cookies**: For middleware/server-side checks
- **localStorage**: For client-side API calls

## Changes Made

### 1. Cookie Utilities (`apps/web/utils/cookies.ts`)
- `setCookie()` - Set cookie with expiration
- `getCookie()` - Get cookie value
- `deleteCookie()` - Remove cookie

### 2. Login Page (`apps/web/app/login/page.tsx`)
- Stores token in both `localStorage` AND `cookies` on successful login
- Checks both sources when determining if user is already logged in

### 3. Middleware (`apps/web/middleware.ts`)
- Checks cookies for token (server-side)
- Redirects to login if no token found
- Redirects authenticated users away from login/register pages

### 4. Dashboard Layout (`apps/web/app/dashboard/layout.tsx`)
- Checks both cookie and localStorage for token
- Syncs token between storage methods
- Clears both on logout

## Testing

1. **Login Flow:**
   - Enter credentials
   - Token stored in both places
   - Redirect to dashboard

2. **Refresh Test:**
   - Login successfully
   - Refresh page
   - Should stay on dashboard (cookie persists)

3. **Logout:**
   - Click logout
   - Both storage cleared
   - Redirect to login

4. **Direct Access:**
   - Try accessing `/dashboard` without token
   - Should redirect to login

## Environment Variables

Make sure these are set in Vercel:
- `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_API_BASE_URL` - Your backend URL

Example:
```
NEXT_PUBLIC_API_URL=https://lacleoomnia.onrender.com/api
```

## Backend Requirements

Backend should:
- Accept `Authorization: Bearer <token>` header
- Return token in login response: `{ token: "...", user: {...} }`
- Validate JWT tokens on protected routes
