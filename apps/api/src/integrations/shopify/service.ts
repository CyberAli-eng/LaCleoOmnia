export class ShopifyService {
    constructor(private shopDomain?: string, private token?: string) {}

    private async request(path: string): Promise<any> {
        if (!this.shopDomain || !this.token) {
            throw new Error('Shopify credentials missing');
        }
        const res = await fetch(`https://${this.shopDomain}/admin/api/2024-01${path}`, {
            headers: {
                'X-Shopify-Access-Token': this.token,
                'Content-Type': 'application/json',
            },
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Shopify API error: ${res.status} ${text}`);
        }
        return res.json();
    }

    async getProducts() {
        const data: any = await this.request('/products.json?limit=50');
        return data.products;
    }

    async getOrders() {
        const data: any = await this.request('/orders.json?status=any&limit=50');
        return data.orders;
    }

    async handleWebhook(payload: unknown) {
        return { source: 'SHOPIFY', action: 'webhook_received', payload };
    }

    toUnifiedOrder(payload: any) {
        const items = (payload?.line_items || payload?.items || []).map((item: any) => ({
            sku: String(item?.sku || item?.variant_id || 'UNKNOWN'),
            name: item?.name,
            quantity: Number(item?.quantity || 1),
            price: Number(item?.price || 0),
        }));
        return {
            source: 'SHOPIFY',
            externalId: String(payload?.id || payload?.order_number || ''),
            status: payload?.financial_status || payload?.status || 'NEW',
            total: Number(payload?.total_price || 0),
            currency: payload?.currency || 'USD',
            items,
        };
    }

    async syncOrders() {
        return { source: 'SHOPIFY', action: 'order_sync', synced: 0 };
    }

    async broadcastInventory(payload: unknown) {
        return { source: 'SHOPIFY', action: 'inventory_broadcast', payload };
    }

    async updateInventory(payload: unknown) {
        return this.broadcastInventory(payload);
    }

    async getInventoryLevels() {
        const locations: any = await this.request('/locations.json');
        const locationIds = locations.locations?.map((loc: any) => loc.id).join(',') || '';
        if (!locationIds) return [];
        const levels: any = await this.request(`/inventory_levels.json?location_ids=${locationIds}`);
        return levels.inventory_levels || [];
    }

    async createWebhook(topic: string, address: string) {
        const payload = {
            webhook: {
                topic,
                address,
                format: 'json',
            },
        };
        const res = await fetch(`https://${this.shopDomain}/admin/api/2024-01/webhooks.json`, {
            method: 'POST',
            headers: {
                'X-Shopify-Access-Token': this.token || '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Shopify webhook error: ${res.status} ${text}`);
        }
        return res.json();
    }

    async listWebhooks() {
        const data: any = await this.request('/webhooks.json');
        return data.webhooks || [];
    }

    async ensureWebhook(topic: string, address: string) {
        const existing = await this.listWebhooks();
        const match = existing.find((hook: any) => hook.topic === topic && hook.address === address);
        if (match) {
            return match;
        }
        const created: any = await this.createWebhook(topic, address);
        return created.webhook;
    }

    async getShop() {
        const data: any = await this.request('/shop.json');
        return data.shop;
    }
}
