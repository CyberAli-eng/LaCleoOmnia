import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { getAdapter } from '../integrations/adapterRegistry';
import { createUnifiedOrder, UnifiedOrder } from '../services/orderService';
import crypto from 'crypto';
import { decryptCredentials } from '../services/credentials';
import { authMiddleware } from '../middleware/auth';
import { ShopifyService } from '../integrations/shopify/service';

function verifyShopifyHmac(rawBody: Buffer, hmacHeader: string | undefined, secret: string) {
    if (!hmacHeader) {
        throw new Error('Missing Shopify HMAC header');
    }
    const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    const valid = crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
    if (!valid) {
        throw new Error('Invalid Shopify webhook signature');
    }
}

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const events = await prisma.webhookEvent.findMany({
            where: { userId },
            orderBy: { receivedAt: 'desc' },
            take: 50,
        });
        res.json(events);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch webhook events', details: error.message });
    }
});

router.get('/subscriptions', authMiddleware, async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const integrations = await prisma.integration.findMany({
        where: { userId },
        select: { id: true, type: true, name: true },
    });
    const integrationIds = integrations.map((i) => i.id);
    const subscriptions = await prisma.webhookSubscription.findMany({
        where: { integrationId: { in: integrationIds } },
        orderBy: { updatedAt: 'desc' },
    });
    res.json({ integrations, subscriptions });
});

router.post('/register/:integrationId', authMiddleware, async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const integrationId = Number(req.params.integrationId);
    const integration = await prisma.integration.findFirst({
        where: { id: integrationId, userId, type: 'SHOPIFY' },
    });
    if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
    }
    const webhookBaseUrl = process.env.WEBHOOK_BASE_URL;
    if (!webhookBaseUrl) {
        return res.status(400).json({ error: 'WEBHOOK_BASE_URL not configured' });
    }
    const creds = JSON.parse(decryptCredentials(integration.credentials));
    const shopDomain = creds.shopDomain || creds.domain || creds.shop;
    const token = creds.accessToken || creds.token || creds.adminToken;
    if (!shopDomain || !token) {
        return res.status(400).json({ error: 'Shopify credentials missing' });
    }
    const service = new ShopifyService(shopDomain, token);
    const topics = ['orders/create', 'orders/updated', 'products/update', 'inventory_levels/update'];
    const address = `${webhookBaseUrl}/api/webhooks/shopify`;
    for (const topic of topics) {
        try {
            await service.ensureWebhook(topic, address);
            await prisma.webhookSubscription.upsert({
                where: { integrationId_topic: { integrationId, topic } },
                update: { address, status: 'ACTIVE', lastError: null },
                create: { integrationId, topic, address, status: 'ACTIVE' },
            });
        } catch (error: any) {
            await prisma.webhookSubscription.upsert({
                where: { integrationId_topic: { integrationId, topic } },
                update: { address, status: 'FAILED', lastError: error.message },
                create: { integrationId, topic, address, status: 'FAILED', lastError: error.message },
            });
        }
    }
    res.json({ ok: true });
});

router.post('/:source', async (req: Request, res: Response) => {
    try {
        const source = String(req.params.source || '').toUpperCase();
        const rawBody: Buffer = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));
        const payload = req.body;
        const eventType = req.header('x-event-type');

        let integration: any = null;
        let userId: number | null = null;

        if (source === 'SHOPIFY') {
            const shopDomain = String(req.header('x-shopify-shop-domain') || '').toLowerCase();
            const integrations = await prisma.integration.findMany({
                where: { type: 'SHOPIFY' },
                orderBy: { createdAt: 'desc' },
            });
            integration = integrations.find((item) => {
                try {
                    const creds = JSON.parse(decryptCredentials(item.credentials));
                    const configuredDomain = String(creds.shopDomain || '').toLowerCase();
                    return configuredDomain && configuredDomain === shopDomain;
                } catch {
                    return false;
                }
            }) || integrations[0];
            if (!integration) {
                return res.status(400).json({ error: 'Shopify integration not found' });
            }
            userId = integration.userId;
            const creds = JSON.parse(decryptCredentials(integration.credentials));
            const secret = creds.appSecret || creds.secret;
            if (!secret) {
                return res.status(400).json({ error: 'Shopify app secret missing' });
            }
            verifyShopifyHmac(rawBody, req.header('x-shopify-hmac-sha256') || undefined, secret);
        } else {
            // For other sources, find the first integration
            integration = await prisma.integration.findFirst({
                where: { type: source },
                orderBy: { createdAt: 'desc' },
            });
            userId = integration?.userId ?? null;
        }

    const record = await prisma.webhookEvent.create({
        data: {
            source,
            eventType: eventType || null,
            payload: JSON.stringify(payload ?? {}),
            userId: userId ?? undefined,
        },
    });

    const adapter = getAdapter(source);
    let adapterResult = null;
    let createdOrder = null;
    if (adapter?.handleWebhook) {
        adapterResult = await adapter.handleWebhook(payload);
    }
    if (adapter?.toUnifiedOrder && userId) {
        const unified = adapter.toUnifiedOrder(payload) as UnifiedOrder;
        if (unified) {
            createdOrder = await createUnifiedOrder({
                ...unified,
                rawPayload: payload,
            }, userId);
        }
    }

        res.json({
            status: 'received',
            id: record.id,
            adapterResult,
            createdOrder,
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to process webhook', details: error.message });
    }
});

export default router;
