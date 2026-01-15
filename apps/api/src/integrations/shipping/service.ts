export class ShippingAggregatorService {
    async getRates() {
        return [
            { id: 'ship_1', carrier: 'FastShip', price: 12.0, etaDays: 2 },
            { id: 'ship_2', carrier: 'BudgetShip', price: 6.5, etaDays: 5 },
        ];
    }

    async handleWebhook(payload: unknown) {
        return { source: 'SHIPPING', action: 'webhook_received', payload };
    }

    toUnifiedOrder(payload: unknown) {
        return null;
    }

    async syncOrders() {
        return { source: 'SHIPPING', action: 'order_sync', synced: 0 };
    }

    async broadcastInventory(payload: unknown) {
        return { source: 'SHIPPING', action: 'inventory_broadcast', payload };
    }

    async updateInventory(payload: unknown) {
        return this.broadcastInventory(payload);
    }
}
