import { prisma } from './prisma';
import { adjustInventory } from './inventoryService';

export interface UnifiedOrderItem {
    sku: string;
    name?: string;
    quantity: number;
    price?: number;
}

export interface UnifiedOrder {
    source: string;
    externalId?: string;
    status: string;
    total?: number;
    currency?: string;
    items: UnifiedOrderItem[];
    rawPayload?: unknown;
}

export async function createUnifiedOrder(order: UnifiedOrder, userId: number) {
    return prisma.$transaction(async (tx) => {
        const created = await (tx as typeof prisma & Record<string, any>).order.create({
            data: {
                source: order.source,
                externalId: order.externalId,
                status: order.status,
                total: order.total ?? null,
                currency: order.currency ?? null,
                payload: order.rawPayload ? JSON.stringify(order.rawPayload) : null,
                userId,
                items: {
                    create: order.items.map((item) => ({
                        sku: item.sku,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price ?? null,
                    })),
                },
            },
            include: { items: true },
        });

        for (const item of order.items) {
            await adjustInventory(item.sku, -item.quantity, 'order_created', userId);
        }

        return created;
    });
}
