import { Router, Request, Response } from 'express';
import { prisma } from '../../services/prisma';
import { decryptCredentials } from '../../services/credentials';
import { ShopifyService } from '../../integrations/shopify/service';

const router = Router();

async function getShopifyService(req: Request, integrationId?: number) {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        throw new Error('Unauthorized');
    }
    const integration = integrationId
        ? await prisma.integration.findFirst({
            where: { id: integrationId, userId, type: 'SHOPIFY' },
        })
        : await prisma.integration.findFirst({
            where: { userId, type: 'SHOPIFY' },
            orderBy: { createdAt: 'desc' },
        });
    if (!integration) {
        throw new Error('Shopify integration not configured');
    }
    const decrypted = decryptCredentials(integration.credentials);
    const creds = JSON.parse(decrypted);
    const shopDomain = creds.shopDomain || creds.domain || creds.shop;
    const token = creds.accessToken || creds.token || creds.adminToken;
    if (!shopDomain || !token) {
        throw new Error('Shopify credentials missing');
    }
    return new ShopifyService(shopDomain, token);
}

router.get('/orders', async (req: Request, res: Response) => {
    try {
        const service = await getShopifyService(req);
        const orders = await service.getOrders();
        res.json(orders);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/products', async (req: Request, res: Response) => {
    try {
        const service = await getShopifyService(req);
        const products = await service.getProducts();
        res.json(products);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/inventory', async (req: Request, res: Response) => {
    try {
        const service = await getShopifyService(req);
        const levels = await service.getInventoryLevels();
        res.json(levels);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/shop', async (req: Request, res: Response) => {
    try {
        const integrationId = req.query.integrationId ? Number(req.query.integrationId) : undefined;
        const service = await getShopifyService(req, integrationId);
        const shop = await service.getShop();
        res.json(shop);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
