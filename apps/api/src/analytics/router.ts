import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/summary', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const totalOrders = await prisma.order.count({ where: { userId } });
        const recentOrders = await prisma.order.findMany({
            where: { userId },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        res.json({
            totalOrders,
            recentOrders,
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
    }
});

export default router;
