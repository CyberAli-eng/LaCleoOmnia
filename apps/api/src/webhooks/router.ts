import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { getAdapter } from '../integrations/adapterRegistry';
import { createUnifiedOrder, UnifiedOrder } from '../services/orderService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    const events = await prisma.webhookEvent.findMany({
        orderBy: { receivedAt: 'desc' },
        take: 50,
    });
    res.json(events);
});

router.post('/:source', async (req: Request, res: Response) => {
    const source = String(req.params.source || '').toUpperCase();
    const payload = req.body;
    const eventType = req.header('x-event-type');

    const record = await prisma.webhookEvent.create({
        data: {
            source,
            eventType: eventType || null,
            payload: JSON.stringify(payload ?? {}),
        },
    });

    const adapter = getAdapter(source);
    let adapterResult = null;
    let createdOrder = null;
    if (adapter?.handleWebhook) {
        adapterResult = await adapter.handleWebhook(payload);
    }
    if (adapter?.toUnifiedOrder) {
        const unified = adapter.toUnifiedOrder(payload) as UnifiedOrder;
        if (unified) {
            createdOrder = await createUnifiedOrder({
                ...unified,
                rawPayload: payload,
            });
        }
    }

    res.json({
        status: 'received',
        id: record.id,
        adapterResult,
        createdOrder,
    });
});

export default router;
