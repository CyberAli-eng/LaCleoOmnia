"""
LaCleoOmnia OMS - FastAPI Backend
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi import status
import uvicorn
import logging

from app.routers import auth, channels, orders, inventory, products, warehouses, shipments, sync, config, webhooks, marketplaces, analytics, labels, workers, audit, users
from app.database import engine, Base
from app.config import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LaCleoOmnia OMS API",
    description="Order Management System API",
    version="1.0.0",
    docs_url="/docs" if settings.IS_DEVELOPMENT else None,  # Disable docs in production
    redoc_url="/redoc" if settings.IS_DEVELOPMENT else None,  # Disable redoc in production
)

# Log startup information
logger.info(f"🚀 Starting LaCleoOmnia API")
logger.info(f"📊 Environment: {settings.ENV}")
logger.info(f"🌐 Production: {settings.IS_PRODUCTION}")
logger.info(f"☁️  Cloud: {settings.IS_CLOUD}")
logger.info(f"🔗 Host: {settings.HOST}:{settings.PORT}")

def get_cors_headers(request: Request) -> dict:
    """Get CORS headers for a request"""
    origin = request.headers.get("origin", "")
    allowed_origins = settings.ALLOWED_ORIGINS
    
    # Check if origin is in allowed list
    if origin in allowed_origins:
        cors_origin = origin
    elif settings.IS_DEVELOPMENT and (origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1")):
        # Allow localhost in development
        cors_origin = origin
    elif allowed_origins:
        # Use first allowed origin as fallback
        cors_origin = allowed_origins[0]
    else:
        cors_origin = "*"
    
    return {
        "Access-Control-Allow-Origin": cors_origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
    }

# Add exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": exc.errors(),
            "message": "Validation error: Please check your request format"
        },
        headers=get_cors_headers(request)
    )

# Add exception handler for HTTPException to ensure CORS headers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTPException and ensure CORS headers are sent"""
    headers = get_cors_headers(request)
    # Preserve any existing headers from the exception
    if exc.headers:
        headers.update(exc.headers)
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers
    )

# Add global exception handler to ensure CORS headers are always sent
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to ensure CORS headers are always sent"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.IS_DEVELOPMENT else "An error occurred"
        },
        headers=get_cors_headers(request)
    )

# CORS configuration - Fully dynamic based on ALLOWED_ORIGINS environment variable
cors_kwargs = {
    "allow_origins": settings.ALLOWED_ORIGINS,
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    "allow_headers": ["*"],
    "expose_headers": ["*"],
}

# Only add regex if it's set (not None)
cors_regex = settings.CORS_ORIGIN_REGEX
if cors_regex:
    cors_kwargs["allow_origin_regex"] = cors_regex

app.add_middleware(CORSMiddleware, **cors_kwargs)

logger.info(f"✅ CORS configured for {len(settings.ALLOWED_ORIGINS)} origin(s)")
if cors_regex:
    logger.info(f"   + Regex pattern: {cors_regex}")
logger.info(f"   Allowed origins: {settings.ALLOWED_ORIGINS}")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(channels.router, prefix="/api/channels", tags=["channels"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(warehouses.router, prefix="/api/warehouses", tags=["warehouses"])
app.include_router(shipments.router, prefix="/api/shipments", tags=["shipments"])
app.include_router(sync.router, prefix="/api/sync", tags=["sync"])
app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])
app.include_router(marketplaces.router, prefix="/api/marketplaces", tags=["marketplaces"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(labels.router, prefix="/api/labels", tags=["labels"])
app.include_router(workers.router, prefix="/api/workers", tags=["workers"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(sync.router, prefix="/api/sync", tags=["sync"])

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "api",
        "environment": settings.ENV,
        "production": settings.IS_PRODUCTION,
        "cloud": settings.IS_CLOUD
    }

@app.get("/api")
async def root():
    """API root endpoint"""
    return {
        "message": "Welcome to LaCleoOmnia Unitecommerce API",
        "version": "1.0.0",
        "environment": settings.ENV,
        "docs": "/docs" if settings.IS_DEVELOPMENT else "disabled in production"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.IS_DEVELOPMENT,  # Auto-reload only in development
        log_level=settings.LOG_LEVEL.lower()
    )
