import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { uploadLabel } from '../services/storage';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const labels = await prisma.label.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        res.json(labels);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch labels', details: error.message });
    }
});

router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Verify order belongs to user
        if (req.body?.orderId) {
            const order = await prisma.order.findFirst({
                where: {
                    id: Number(req.body.orderId),
                    userId,
                },
            });
            
            if (!order) {
                return res.status(403).json({ error: 'Order not found or access denied' });
            }
        }
        const { orderId } = req.body || {};
        const filename = `label_${Date.now()}.txt`;
        const fileBody = Buffer.from(`Label for order ${orderId || 'unknown'}`);
        const url = await uploadLabel(`labels/${filename}`, fileBody);

        const label = await prisma.label.create({
            data: {
                orderId: orderId ? Number(orderId) : null,
                url,
                userId,
            },
        });

        res.json(label);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to generate label', details: error.message });
    }
});

export default router;
