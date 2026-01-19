import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { eventBus } from '../services/eventBus';
import { adjustInventory } from '../services/inventoryService';
import { inventorySyncQueue } from '../services/queues';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/broadcasts', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const integrations = await prisma.integration.findMany({
            where: { userId },
            select: { type: true },
        });
        const userSources = integrations.map((i) => i.type);
        
        const broadcasts = await prisma.inventoryBroadcast.findMany({
            where: userSources.length > 0 ? { source: { in: userSources } } : undefined,
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        res.json(broadcasts);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch broadcasts', details: error.message });
    }
});

router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const inventory = await prisma.inventory.findMany({
            where: { userId },
            orderBy: { sku: 'asc' },
        });
        res.json(inventory);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch inventory', details: error.message });
    }
});

router.post('/adjust', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { sku, delta, reason } = req.body || {};
        if (!sku || typeof delta !== 'number') {
            return res.status(400).json({ error: 'sku and delta are required' });
        }
        const updated = await adjustInventory(String(sku), delta, reason || 'manual_adjustment', userId);
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to adjust inventory', details: error.message });
    }
});

router.post('/broadcast', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
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
                    userId,
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
                        userId,
                    },
                });
                await inventorySyncQueue.add('inventory_sync', { jobId: job.id, source: adapterSource, payload }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
            }
        }

        res.json(record);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to broadcast inventory', details: error.message });
    }
});

export default router;
