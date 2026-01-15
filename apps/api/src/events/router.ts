import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    const events = await prisma.eventLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    res.json(events);
});

router.post('/publish', async (req: Request, res: Response) => {
    const { type, payload } = req.body || {};
    if (!type) {
        return res.status(400).json({ error: 'type is required' });
    }

    const event = await prisma.eventLog.create({
        data: {
            type,
            payload: JSON.stringify(payload ?? {}),
        },
    });

    res.json(event);
});

export default router;
