import { ChannelAccount } from '@prisma/client';
import crypto from 'crypto';

// Decrypt token
function decryptToken(encrypted: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!', 'utf8');
  const [ivHex, encryptedData] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function getShopifyClient(account: ChannelAccount) {
  const token = decryptToken(account.accessToken || '');
  const shop = account.shopDomain || '';

  if (!token || !shop) {
    throw new Error('Invalid Shopify credentials');
  }

  const baseUrl = `https://${shop}.myshopify.com/admin/api/2024-01`;

  return {
    async get<T>(endpoint: string): Promise<T> {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Shopify API error: ${response.status} ${error}`);
      }

      return response.json();
    },

    async post<T>(endpoint: string, data: any): Promise<T> {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Shopify API error: ${response.status} ${error}`);
      }

      return response.json();
    },

    async put<T>(endpoint: string, data: any): Promise<T> {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Shopify API error: ${response.status} ${error}`);
      }

      return response.json();
    },
  };
}
