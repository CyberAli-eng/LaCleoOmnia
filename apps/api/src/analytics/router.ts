import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/summary', authMiddleware, async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get user's integrations to filter orders by source
    const integrations = await prisma.integration.findMany({
        where: { userId },
        select: { type: true },
    });
    const userSources = integrations.map((i) => i.type);
    
    const whereClause = userSources.length > 0 ? { source: { in: userSources } } : {};
    
    const totalOrders = await prisma.order.count({ where: whereClause });
    const recentOrders = await prisma.order.findMany({
        where: whereClause,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
    });

    res.json({
        totalOrders,
        recentOrders,
    });
});

export default router;
