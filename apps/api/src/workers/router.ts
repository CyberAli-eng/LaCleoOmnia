import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { orderSyncQueue, inventorySyncQueue } from '../services/queues';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get user's integrations to filter jobs by source
    const integrations = await prisma.integration.findMany({
        where: { userId },
        select: { type: true },
    });
    const userSources = integrations.map((i) => i.type);
    
    const jobs = await prisma.workerJob.findMany({
        where: userSources.length > 0 ? {
            payload: {
                contains: userSources.join('|'),
            },
        } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
    res.json(jobs);
});

router.post('/order-sync', authMiddleware, async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { source, payload } = req.body || {};
    const job = await prisma.workerJob.create({
        data: {
            type: 'order_sync',
            status: 'PENDING',
            payload: JSON.stringify({ source, payload }),
        },
    });
    await orderSyncQueue.add('order_sync', { jobId: job.id, source, payload }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    res.json(job);
});

router.post('/inventory-sync', authMiddleware, async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { source, payload } = req.body || {};
    const job = await prisma.workerJob.create({
        data: {
            type: 'inventory_sync',
            status: 'PENDING',
            payload: JSON.stringify({ source, payload }),
        },
    });
    await inventorySyncQueue.add('inventory_sync', { jobId: job.id, source, payload }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    res.json(job);
});

export default router;
