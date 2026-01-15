export class FlipkartService {
    async getProducts() {
        return [
            { id: 'flip_1', name: 'Flipkart Product 1', price: 35.5 },
            { id: 'flip_2', name: 'Flipkart Product 2', price: 80.0 },
        ];
    }

    async getOrders() {
        return [];
    }

    async handleWebhook(payload: unknown) {
        return { source: 'FLIPKART', action: 'webhook_received', payload };
    }

    toUnifiedOrder(payload: any) {
        const items = (payload?.items || []).map((item: any) => ({
            sku: String(item?.sku || item?.productId || 'UNKNOWN'),
            name: item?.title || item?.name,
            quantity: Number(item?.quantity || 1),
            price: Number(item?.price || 0),
        }));
        return {
            source: 'FLIPKART',
            externalId: String(payload?.id || payload?.orderId || ''),
            status: payload?.status || 'NEW',
            total: Number(payload?.total || 0),
            currency: payload?.currency || 'INR',
            items,
        };
    }

    async syncOrders() {
        return { source: 'FLIPKART', action: 'order_sync', synced: 0 };
    }

    async broadcastInventory(payload: unknown) {
        return { source: 'FLIPKART', action: 'inventory_broadcast', payload };
    }

    async updateInventory(payload: unknown) {
        return this.broadcastInventory(payload);
    }
}
