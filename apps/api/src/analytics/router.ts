import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';

const router = Router();

router.get('/summary', async (req: Request, res: Response) => {
    const totalOrders = await prisma.order.count();
    const recentOrders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
    });

    res.json({
        totalOrders,
        recentOrders,
    });
});

export default router;
