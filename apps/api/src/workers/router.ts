import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { orderSyncQueue, inventorySyncQueue } from '../services/queues';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const jobs = await prisma.workerJob.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        res.json(jobs);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
    }
});

router.post('/order-sync', authMiddleware, async (req: Request, res: Response) => {
    try {
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
                userId,
            },
        });
        await orderSyncQueue.add('order_sync', { jobId: job.id, source, payload }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
        res.json(job);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to enqueue order sync', details: error.message });
    }
});

router.post('/inventory-sync', authMiddleware, async (req: Request, res: Response) => {
    try {
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
                userId,
            },
        });
        await inventorySyncQueue.add('inventory_sync', { jobId: job.id, source, payload }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
        res.json(job);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to enqueue inventory sync', details: error.message });
    }
});

export default router;
