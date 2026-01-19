import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { eventBus } from '../services/eventBus';
import { createUnifiedOrder } from '../services/orderService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const orders = await prisma.order.findMany({
            where: { userId },
            include: {
                items: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        res.json(orders);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
    }
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { source, externalId, status, total, currency, items } = req.body || {};

        if (!source || !status) {
            return res.status(400).json({ error: 'source and status are required' });
        }

        const order = await createUnifiedOrder({
            source,
            externalId,
            status,
            total,
            currency,
            items: Array.isArray(items) ? items : [],
            rawPayload: req.body,
        }, userId);

        await prisma.eventLog.create({
            data: {
                type: 'order.created',
                payload: JSON.stringify({ orderId: order.id, source }),
            },
        });

        eventBus.emit('order.created', { orderId: order.id, source });

        res.json(order);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to create order', details: error.message });
    }
});

export default router;
