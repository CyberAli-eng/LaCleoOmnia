import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { eventBus } from '../services/eventBus';
import { adjustInventory } from '../services/inventoryService';
import { inventorySyncQueue } from '../services/queues';

const router = Router();

router.get('/broadcasts', async (req: Request, res: Response) => {
    const broadcasts = await prisma.inventoryBroadcast.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
    res.json(broadcasts);
});

router.get('/', async (req: Request, res: Response) => {
    const inventory = await prisma.inventory.findMany({
        orderBy: { sku: 'asc' },
    });
    res.json(inventory);
});

router.post('/adjust', async (req: Request, res: Response) => {
    const { sku, delta, reason } = req.body || {};
    if (!sku || typeof delta !== 'number') {
        return res.status(400).json({ error: 'sku and delta are required' });
    }
    const updated = await adjustInventory(String(sku), delta, reason || 'manual_adjustment');
    res.json(updated);
});

router.post('/broadcast', async (req: Request, res: Response) => {
    const { source, payload } = req.body || {};
    const record = await prisma.inventoryBroadcast.create({
        data: {
            source,
            payload: JSON.stringify(payload ?? {}),
        },
    });

    eventBus.emit('inventory.broadcast', { source, payload: JSON.stringify(payload ?? {}) });

    if (source) {
        const job = await prisma.workerJob.create({
            data: {
                type: 'inventory_sync',
                status: 'PENDING',
                payload: JSON.stringify({ source, payload }),
            },
        });
        await inventorySyncQueue.add('inventory_sync', { jobId: job.id, source, payload }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    } else {
        const sources = ['AMAZON', 'SHOPIFY', 'WOO', 'FLIPKART'];
        for (const adapterSource of sources) {
            const job = await prisma.workerJob.create({
                data: {
                    type: 'inventory_sync',
                    status: 'PENDING',
                    payload: JSON.stringify({ source: adapterSource, payload }),
                },
            });
            await inventorySyncQueue.add('inventory_sync', { jobId: job.id, source: adapterSource, payload }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
        }
    }

    res.json(record);
});

export default router;
