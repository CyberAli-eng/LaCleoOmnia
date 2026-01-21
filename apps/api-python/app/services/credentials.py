"""
Credential encryption/decryption
"""
from cryptography.fernet import Fernet
import base64
from app.config import settings

def get_encryption_key() -> bytes:
    """Get or generate encryption key"""
    key_str = settings.ENCRYPTION_KEY
    # Ensure key is 32 bytes for Fernet
    key_bytes = key_str.encode()[:32].ljust(32, b'0')
    return base64.urlsafe_b64encode(key_bytes)

def encrypt_token(token: str) -> str:
    """Encrypt a token"""
    key = get_encryption_key()
    f = Fernet(key)
    encrypted = f.encrypt(token.encode())
    return encrypted.decode()

def decrypt_token(encrypted: str) -> str:
    """Decrypt a token"""
    key = get_encryption_key()
    f = Fernet(key)
    decrypted = f.decrypt(encrypted.encode())
    return decrypted.decode()
