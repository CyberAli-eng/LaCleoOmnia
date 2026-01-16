import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { uploadLabel } from '../services/storage';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get user's orders to filter labels
    const integrations = await prisma.integration.findMany({
        where: { userId },
        select: { type: true },
    });
    const userSources = integrations.map((i) => i.type);
    
    const userOrders = await prisma.order.findMany({
        where: userSources.length > 0 ? { source: { in: userSources } } : undefined,
        select: { id: true },
    });
    const userOrderIds = userOrders.map((o: any) => o.id);
    
    const labels = await prisma.label.findMany({
        where: userOrderIds.length > 0 ? { orderId: { in: userOrderIds } } : { orderId: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
    res.json(labels);
});

router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Verify order belongs to user
    if (req.body?.orderId) {
        const integrations = await prisma.integration.findMany({
            where: { userId },
            select: { type: true },
        });
        const userSources = integrations.map((i) => i.type);
        
        const order = await prisma.order.findFirst({
            where: {
                id: Number(req.body.orderId),
                source: userSources.length > 0 ? { in: userSources } : undefined,
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
        },
    });

    res.json(label);
});

export default router;
