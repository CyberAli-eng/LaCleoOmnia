import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { eventBus } from '../services/eventBus';
import { createUnifiedOrder } from '../services/orderService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    res.json(orders);
});

router.post('/', async (req: Request, res: Response) => {
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
    });

    await prisma.eventLog.create({
        data: {
            type: 'order.created',
            payload: JSON.stringify({ orderId: order.id, source }),
        },
    });

    eventBus.emit('order.created', { orderId: order.id, source });

    res.json(order);
});

export default router;
