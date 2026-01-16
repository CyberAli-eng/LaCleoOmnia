import { Worker } from 'bullmq';
import { prisma } from '../services/prisma';
import { redis } from '../services/redis';
import { getAdapter } from '../integrations/adapterRegistry';
import { decryptCredentials } from '../services/credentials';
import { ShopifyService } from '../integrations/shopify/service';

const worker = new Worker(
    'inventory-sync',
    async (job: any) => {
        const { jobId, source, payload, integrationId } = job.data || {};
        const normalizedSource = source ? String(source).toUpperCase() : undefined;
        if (normalizedSource === 'SHOPIFY' && integrationId) {
            const integration = await prisma.integration.findUnique({
                where: { id: Number(integrationId) },
            });
            if (integration) {
                const creds = JSON.parse(decryptCredentials(integration.credentials));
                const shopDomain = creds.shopDomain || creds.domain || creds.shop;
                const token = creds.accessToken || creds.token || creds.adminToken;
                if (shopDomain && token) {
                    const service = new ShopifyService(shopDomain, token);
                    const levels = await service.getInventoryLevels();
                    for (const level of levels) {
                        const skuKey = `shopify:${level.inventory_item_id}`;
                        const quantity = Number(level.available ?? 0);
                        await prisma.inventory.upsert({
                            where: { sku: skuKey },
                            update: { quantity },
                            create: { sku: skuKey, quantity },
                        });
                    }
                }
            }
        } else {
            const adapter = normalizedSource ? getAdapter(normalizedSource) : null;
            if (adapter?.updateInventory) {
                await adapter.updateInventory(payload);
            }
        }
        if (jobId) {
            await prisma.workerJob.update({
                where: { id: Number(jobId) },
                data: { status: 'COMPLETED' },
            });
        }
    },
    {
        connection: redis,
    }
);

worker.on('failed', async (job: any, error: any) => {
    const jobId = job?.data?.jobId;
    if (jobId) {
        await prisma.workerJob.update({
            where: { id: Number(jobId) },
            data: { status: 'FAILED', lastError: error?.message || 'Unknown error' },
        });
    }
});
