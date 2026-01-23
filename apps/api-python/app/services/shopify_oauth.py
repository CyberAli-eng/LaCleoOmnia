"""
Shopify OAuth service
"""
import httpx
import hmac
import hashlib
from urllib.parse import urlencode, parse_qs
from app.config import settings

class ShopifyOAuthService:
    """Handle Shopify OAuth flow"""
    
    def __init__(self):
        self.api_key = settings.SHOPIFY_API_KEY
        self.api_secret = settings.SHOPIFY_API_SECRET
        self.scopes = settings.SHOPIFY_SCOPES
    
    def get_install_url(self, shop_domain: str, redirect_uri: str, state: str = None) -> str:
        """Generate Shopify OAuth install URL"""
        # Normalize shop domain
        shop = shop_domain.lower().strip()
        if not shop.endswith(".myshopify.com"):
            shop = f"{shop}.myshopify.com"
        
        # Remove protocol if present
        shop = shop.replace("https://", "").replace("http://", "")
        
        params = {
            "client_id": self.api_key,
            "scope": self.scopes,
            "redirect_uri": redirect_uri,
        }
        
        # Add state parameter if provided
        if state:
            params["state"] = state
        
        return f"https://{shop}/admin/oauth/authorize?{urlencode(params)}"
    
    def verify_hmac(self, query_string: str) -> bool:
        """Verify HMAC signature from Shopify callback"""
        if not query_string:
            return False
        
        # Parse query string
        params = parse_qs(query_string, keep_blank_values=True)
        hmac_param = params.get("hmac", [None])[0]
        
        if not hmac_param:
            return False
        
        # Remove hmac and signature from params
        params.pop("hmac", None)
        params.pop("signature", None)
        
        # Rebuild query string
        sorted_params = sorted(params.items())
        query_parts = []
        for key, values in sorted_params:
            for value in values:
                query_parts.append(f"{key}={value}")
        
        message = "&".join(query_parts)
        
        # Calculate HMAC
        calculated_hmac = hmac.new(
            self.api_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(calculated_hmac, hmac_param)
    
    async def exchange_code_for_token(self, shop_domain: str, code: str) -> dict:
        """Exchange authorization code for access token"""
        # Normalize shop domain
        shop = shop_domain.lower().strip()
        if not shop.endswith(".myshopify.com"):
            shop = f"{shop}.myshopify.com"
        
        shop = shop.replace("https://", "").replace("http://", "")
        
        url = f"https://{shop}/admin/oauth/access_token"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={
                    "client_id": self.api_key,
                    "client_secret": self.api_secret,
                    "code": code,
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
