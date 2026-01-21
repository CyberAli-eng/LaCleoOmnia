# Deployment Notes for Render

## Environment Variables

Set these in your Render dashboard:

1. **Environment (REQUIRED)**
   - `ENV=PROD` - Set to PROD for production, DEV for development

2. **Database**
   - `DATABASE_URL` - Your PostgreSQL connection string

3. **Authentication**
   - `JWT_SECRET` - A secure random string for JWT token signing
   - `AUTH_ALGORITHM` - (Optional) Defaults to "HS256"

4. **CORS** (Auto-configured)
   - `ALLOWED_ORIGINS` - Comma-separated list of allowed origins (optional, Vercel is auto-allowed via regex)

5. **Server** (Auto-configured)
   - `HOST` - Auto-detected (0.0.0.0 for cloud, 127.0.0.1 for local)
   - `PORT` - (Optional) Defaults to 8000, Render sets this automatically

6. **Webhooks** (if using)
   - `WEBHOOK_BASE_URL` - Your Render backend URL (e.g., https://lacleoomnia.onrender.com)
   - `ENCRYPTION_KEY` - 32-character key for credential encryption

7. **Logging**
   - `LOG_LEVEL` - (Optional) Defaults to INFO in production, DEBUG in development

## Build Command

```bash
pip install -r requirements.txt
```

## Start Command

```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Note:** The system automatically detects Render and uses the correct host/port settings.

## Database Setup

After first deployment, run the seed script:

```bash
python seed.py
```

Or connect to your database and run migrations manually.

## CORS Configuration

The backend automatically allows:
- All Vercel deployments (https://*.vercel.app)
- Localhost for development
- Any origins specified in `ALLOWED_ORIGINS` env var

## Automatic Detection

The system automatically detects:
- ✅ **Cloud Platform**: Render, Vercel, Heroku, Railway
- ✅ **Environment**: DEV vs PROD based on `ENV` variable
- ✅ **CORS Origins**: Localhost for dev, Vercel pattern for prod
- ✅ **API Docs**: Enabled in dev, disabled in prod
- ✅ **Logging**: DEBUG in dev, INFO in prod
- ✅ **Auto-reload**: Enabled in dev, disabled in prod

## Troubleshooting

### 400 Bad Request on Login
- Check that the request body is valid JSON
- Ensure email and password fields are present
- Check backend logs for validation errors
- Verify `ENV=PROD` is set in production

### CORS Errors
- Vercel deployments are automatically allowed via regex pattern
- Verify your frontend URL matches `https://*.vercel.app` pattern
- Check that `allow_credentials=True` is set (it is by default)
- Add custom origins to `ALLOWED_ORIGINS` if needed

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check that database is accessible from Render
- Ensure database migrations have been run

### Environment Detection Issues
- Check logs on startup - they show detected environment
- Verify `ENV=PROD` is set in production
- System auto-detects cloud platforms via environment variables
