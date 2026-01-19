import { prisma } from './prisma';
import { redis } from './redis';

const LOCK_TTL_MS = 5000;

async function acquireLock(key: string) {
    const lockKey = `lock:${key}`;
    const result = await redis.set(lockKey, '1', 'PX', LOCK_TTL_MS, 'NX');
    return result === 'OK';
}

async function releaseLock(key: string) {
    const lockKey = `lock:${key}`;
    await redis.del(lockKey);
}

export async function adjustInventory(sku: string, delta: number, reason: string, userId: number) {
    const lockKey = `${userId}:${sku}`;
    const locked = await acquireLock(lockKey);
    if (!locked) {
        throw new Error(`Inventory lock busy for ${sku}`);
    }

    try {
        const current = await prisma.inventory.findUnique({ 
            where: { userId_sku: { userId, sku } } 
        });
        const nextQty = (current?.quantity ?? 0) + delta;
        if (nextQty < 0) {
            throw new Error(`Insufficient inventory for ${sku}`);
        }

        const inventory = await prisma.inventory.upsert({
            where: { userId_sku: { userId, sku } },
            update: { quantity: nextQty },
            create: { sku, quantity: nextQty, userId },
        });

        await prisma.inventoryLog.create({
            data: {
                sku,
                delta,
                reason,
                userId,
            },
        });

        return inventory;
    } finally {
        await releaseLock(lockKey);
    }
}
