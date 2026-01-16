import { Router, Request, Response } from 'express';
import authRouter from '../auth/router';
import configRouter from '../config/router';
import webhookRouter from '../webhooks/router';
import ordersRouter from '../orders/router';
import analyticsRouter from '../analytics/router';
import eventsRouter from '../events/router';
import inventoryRouter from '../inventory/router';
import workersRouter from '../workers/router';
import adaptersRouter from '../adapters/router';
import labelsRouter from '../labels/router';
import { authMiddleware } from '../middleware/auth';
import shopifyMarketplaceRouter from '../marketplaces/shopify/router';

const router = Router();

router.use('/auth', authRouter);
router.use('/webhooks', webhookRouter);

router.use(authMiddleware);
router.use('/config', configRouter);
router.use('/orders', ordersRouter);
router.use('/analytics', analyticsRouter);
router.use('/events', eventsRouter);
router.use('/inventory', inventoryRouter);
router.use('/workers', workersRouter);
router.use('/adapters', adaptersRouter);
router.use('/labels', labelsRouter);
router.use('/marketplaces/shopify', shopifyMarketplaceRouter);

router.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Welcome to LaCleoOmnia API' });
});


export default router;
