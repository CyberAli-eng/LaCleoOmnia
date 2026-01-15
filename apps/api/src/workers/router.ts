import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { orderSyncQueue, inventorySyncQueue } from '../services/queues';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    const jobs = await prisma.workerJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
    res.json(jobs);
});

router.post('/order-sync', async (req: Request, res: Response) => {
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

router.post('/inventory-sync', async (req: Request, res: Response) => {
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
