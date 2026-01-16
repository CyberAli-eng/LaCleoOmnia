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

        const existing = await prisma.integration.findFirst({
            where: {
                userId,
                type,
                name: name || undefined,
            },
            orderBy: { createdAt: 'desc' },
        });

        const integration = existing
            ? await prisma.integration.update({
                where: { id: existing.id },
                data: {
                    name,
                    credentials: encryptedCredentials,
                },
            })
            : await prisma.integration.create({
                data: {
                    type,
                    name,
                    credentials: encryptedCredentials,
                    userId,
                },
            });

        // Auto-cleanup duplicates after save
        const allIntegrations = await prisma.integration.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        const keep = new Set<string>();
        const toDelete: number[] = [];
        for (const item of allIntegrations) {
            const nameKey = String(item.name || '').trim().toLowerCase();
            const key = `${item.type}:${nameKey}`;
            if (keep.has(key)) {
                toDelete.push(item.id);
            } else {
                keep.add(key);
            }
        }
        if (toDelete.length > 0) {
            await prisma.webhookSubscription.deleteMany({
                where: { integrationId: { in: toDelete } },
            });
            await prisma.integration.deleteMany({
                where: { id: { in: toDelete } },
            });
        }

        if (type === 'SHOPIFY') {
            const webhookBaseUrl = process.env.WEBHOOK_BASE_URL;
            if (!webhookBaseUrl) {
                console.warn('WEBHOOK_BASE_URL not configured, skipping webhook registration');
                return res.json({ id: integration.id, message: 'Integration saved (webhooks skipped - WEBHOOK_BASE_URL not configured)' });
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

router.delete('/:id', async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const integrationId = Number(req.params.id);
    if (!integrationId) {
        return res.status(400).json({ error: 'Invalid integration id' });
    }
    const integration = await prisma.integration.findFirst({
        where: { id: integrationId, userId },
    });
    if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
    }
    await prisma.webhookSubscription.deleteMany({
        where: { integrationId },
    });
    await prisma.integration.delete({
        where: { id: integrationId },
    });
    res.json({ ok: true });
});

router.post('/cleanup', async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const integrations = await prisma.integration.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
    const keep = new Set<string>();
    const toDelete: number[] = [];
    for (const item of integrations) {
        const nameKey = String(item.name || '').trim().toLowerCase();
        const key = `${item.type}:${nameKey}`;
        if (keep.has(key)) {
            toDelete.push(item.id);
        } else {
            keep.add(key);
        }
    }
    if (toDelete.length) {
        await prisma.webhookSubscription.deleteMany({
            where: { integrationId: { in: toDelete } },
        });
        await prisma.integration.deleteMany({
            where: { id: { in: toDelete } },
        });
    }
    res.json({ ok: true, deleted: toDelete.length });
});

router.delete('/:id', async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const integrationId = Number(req.params.id);
    if (!integrationId) {
        return res.status(400).json({ error: 'Invalid integration id' });
    }
    const integration = await prisma.integration.findFirst({
        where: { id: integrationId, userId },
    });
    if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
    }
    await prisma.webhookSubscription.deleteMany({
        where: { integrationId },
    });
    await prisma.integration.delete({
        where: { id: integrationId },
    });
    res.json({ ok: true });
});

export default router;
