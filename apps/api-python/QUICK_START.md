# Quick Start Guide

## 1. Setup Environment

```bash
cd apps/api-python
cp .env.example .env
```

## 2. Configure .env

### For Development (Local)
```env
ENV=DEV
DATABASE_URL=postgresql://admin:password@localhost:5432/lacleo_omnia
JWT_SECRET=dev-secret-key
ENCRYPTION_KEY=dev-encryption-key-32-chars!!
```

### For Production (Render/Vercel)
```env
ENV=PROD
DATABASE_URL=your_production_postgresql_url
JWT_SECRET=super-secure-random-secret
ENCRYPTION_KEY=production-encryption-key-32!!
WEBHOOK_BASE_URL=https://your-backend.onrender.com
```

## 3. Install Dependencies

```bash
source venv/bin/activate  # or create venv first
pip install -r requirements.txt
```

## 4. Setup Database

```bash
python seed.py
```

## 5. Run Server

```bash
# Development (auto-reload enabled)
python -m uvicorn main:app --reload

# Or use the run script
./run.sh
```

## Automatic Features

✅ **Environment Detection**: Automatically detects DEV/PROD  
✅ **Cloud Detection**: Auto-detects Render, Vercel, Heroku, Railway  
✅ **CORS**: Auto-configures based on environment  
✅ **API Docs**: Enabled in dev, disabled in prod  
✅ **Logging**: DEBUG in dev, INFO in prod  
✅ **Host**: 127.0.0.1 for local, 0.0.0.0 for cloud  

## Check Status

Visit: `http://localhost:8000/health`

You'll see:
```json
{
  "status": "ok",
  "service": "api",
  "environment": "DEV",
  "production": false,
  "cloud": false
}
```
