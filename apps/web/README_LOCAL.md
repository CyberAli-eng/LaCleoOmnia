# Local Development Setup

## Quick Start

### 1. Start the Backend (Python FastAPI)

```bash
cd apps/api-python
source venv/bin/activate
python -m uvicorn main:app --reload
```

Backend will run at: `http://localhost:8000`

### 2. Configure Frontend Environment

Create `.env.local` file in `apps/web/`:

```bash
cd apps/web
cp .env.local.example .env.local
```

Or create `.env.local` manually:

```env
# Use local backend for development
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 3. Start the Frontend

```bash
cd apps/web
npm install
npm run dev
```

Frontend will run at: `http://localhost:3000`

## Important Notes

### ⚠️ Local Development vs Production

- **Local Development**: Frontend should connect to `http://localhost:8000/api`
- **Production**: Frontend connects to `https://lacleoomnia.onrender.com/api` (set in Vercel)

### Why the CORS Error?

If you see CORS errors, it means:
1. Frontend is trying to connect to production backend (`https://lacleoomnia.onrender.com`)
2. But you're running locally (`http://localhost:3000`)
3. Production backend doesn't allow localhost origins

**Solution**: Make sure `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000/api`

### Environment Variables Priority

1. `NEXT_PUBLIC_API_BASE_URL` (highest priority)
2. `NEXT_PUBLIC_API_URL`
3. Default: `http://localhost:8000/api` (for development)

### Testing

1. **Backend Health**: http://localhost:8000/health
2. **Backend Docs**: http://localhost:8000/docs
3. **Frontend**: http://localhost:3000
4. **Login**: Use `admin@local` / `Admin@123`

## Troubleshooting

### CORS Error: "No 'Access-Control-Allow-Origin' header"

**Problem**: Frontend is connecting to production backend instead of local.

**Solution**:
1. Check `.env.local` exists in `apps/web/`
2. Verify it has: `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
3. Restart Next.js dev server: `npm run dev`

### "Failed to fetch" Error

**Problem**: Backend is not running.

**Solution**:
1. Make sure backend is running: `cd apps/api-python && python -m uvicorn main:app --reload`
2. Check backend health: http://localhost:8000/health
3. Verify database is set up: `python check_db.py`

### API URL Not Updating

**Problem**: Next.js cached the old API URL.

**Solution**:
1. Delete `.next` folder: `rm -rf .next`
2. Restart dev server: `npm run dev`
3. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
