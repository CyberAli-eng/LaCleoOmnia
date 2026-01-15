import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';

const router = Router();

router.post('/callback', async (req: Request, res: Response) => {
    const { source, payload } = req.body || {};
    const event = await prisma.eventLog.create({
        data: {
            type: 'adapter.callback',
            payload: JSON.stringify({ source, payload }),
        },
    });
    res.json({ status: 'received', id: event.id });
});

export default router;
