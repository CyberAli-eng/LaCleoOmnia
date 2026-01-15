import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { uploadLabel } from '../services/storage';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    const labels = await prisma.label.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
    res.json(labels);
});

router.post('/generate', async (req: Request, res: Response) => {
    const { orderId } = req.body || {};
    const filename = `label_${Date.now()}.txt`;
    const fileBody = Buffer.from(`Label for order ${orderId || 'unknown'}`);
    const url = await uploadLabel(`labels/${filename}`, fileBody);

    const label = await prisma.label.create({
        data: {
            orderId: orderId ? Number(orderId) : null,
            url,
        },
    });

    res.json(label);
});

export default router;
