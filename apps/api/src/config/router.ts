import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { decryptCredentials, encryptCredentials } from '../services/credentials';
import { ShopifyService } from '../integrations/shopify/service';
import { z } from 'zod';

const router = Router();

// Validation schema for creating/updating integration
const integrationSchema = z.object({
    type: z.enum(['AMAZON', 'SHOPIFY', 'WOO', 'FLIPKART', 'SHIPPING']),
    name: z.string().optional(),
    credentials: z.union([z.string(), z.record(z.string(), z.any())]),
});

// Create/Update Integration
router.post('/', async (req: Request, res: Response) => {
    try {
        const { type, name, credentials } = integrationSchema.parse(req.body);
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const normalizedCredentials = typeof credentials === 'string'
            ? JSON.parse(credentials)
            : credentials;
        if (type === 'SHOPIFY' && normalizedCredentials?.shopDomain) {
            normalizedCredentials.shopDomain = String(normalizedCredentials.shopDomain).toLowerCase();
        }
        const credentialsJson = JSON.stringify(normalizedCredentials);
        const encryptedCredentials = encryptCredentials(credentialsJson);

        const integration = await prisma.integration.create({
            data: {
                type,
                name,
                credentials: encryptedCredentials,
                userId,
            },
        });

        if (type === 'SHOPIFY') {
            const webhookBaseUrl = process.env.WEBHOOK_BASE_URL;
            if (!webhookBaseUrl) {
                return res.status(400).json({ error: 'WEBHOOK_BASE_URL not configured' });
            }
            const decrypted = decryptCredentials(encryptedCredentials);
            const creds = JSON.parse(decrypted);
            const shopDomain = creds.shopDomain || creds.domain || creds.shop;
            const token = creds.accessToken || creds.token || creds.adminToken;
            if (!shopDomain || !token) {
                return res.status(400).json({ error: 'Shopify credentials missing' });
            }
            const service = new ShopifyService(shopDomain, token);
            const topics = ['orders/create', 'orders/updated', 'products/update', 'inventory_levels/update'];
            for (const topic of topics) {
                const address = `${webhookBaseUrl}/api/webhooks/shopify`;
                try {
                    const hook = await service.ensureWebhook(topic, address);
                    await prisma.webhookSubscription.upsert({
                        where: {
                            integrationId_topic: {
                                integrationId: integration.id,
                                topic,
                            },
                        },
                        update: {
                            address,
                            status: 'ACTIVE',
                            lastError: null,
                        },
                        create: {
                            integrationId: integration.id,
                            topic,
                            address,
                            status: 'ACTIVE',
                        },
                    });
                    void hook;
                } catch (error: any) {
                    await prisma.webhookSubscription.upsert({
                        where: {
                            integrationId_topic: {
                                integrationId: integration.id,
                                topic,
                            },
                        },
                        update: {
                            address: `${webhookBaseUrl}/api/webhooks/shopify`,
                            status: 'FAILED',
                            lastError: error.message,
                        },
                        create: {
                            integrationId: integration.id,
                            topic,
                            address: `${webhookBaseUrl}/api/webhooks/shopify`,
                            status: 'FAILED',
                            lastError: error.message,
                        },
                    });
                }
            }
        }

        res.json(integration);
    } catch (error) {
        res.status(400).json({ error: 'Failed to save integration', details: error });
    }
});

// List Integrations for a user
router.get('/me', async (req: Request, res: Response) => {
    try {
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const integrations = await prisma.integration.findMany({
            where: { userId },
        });
        res.json(integrations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});

router.get('/status', async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const integrations = await prisma.integration.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
    const subscriptions = await prisma.webhookSubscription.findMany({
        where: { integrationId: { in: integrations.map((i) => i.id) } },
        orderBy: { updatedAt: 'desc' },
    });
    res.json({ integrations, subscriptions });
});

router.patch('/:id', async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const integrationId = Number(req.params.id);
    if (!integrationId) {
        return res.status(400).json({ error: 'Invalid integration id' });
    }
    const { name, inventorySyncEnabled, inventorySyncIntervalMinutes } = req.body || {};
    const prismaAny = prisma as any;
    const integration = await prismaAny.integration.update({
        where: { id: integrationId },
        data: {
            name: typeof name === 'string' ? name : undefined,
            inventorySyncEnabled: typeof inventorySyncEnabled === 'boolean' ? inventorySyncEnabled : undefined,
            inventorySyncIntervalMinutes: typeof inventorySyncIntervalMinutes === 'number' ? inventorySyncIntervalMinutes : undefined,
        },
    });
    res.json(integration);
});

export default router;
