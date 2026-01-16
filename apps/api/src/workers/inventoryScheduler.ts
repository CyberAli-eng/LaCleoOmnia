import { prisma } from '../services/prisma';
import { inventorySyncQueue } from '../services/queues';

const POLL_INTERVAL_MS = 60_000;

async function runScheduler() {
    const prismaAny = prisma as any;
    const integrations = await prismaAny.integration.findMany({
        where: { inventorySyncEnabled: true, type: 'SHOPIFY' },
    }) as any[];
    const now = new Date();

    for (const integration of integrations) {
        const lastRun = integration.lastInventorySyncAt;
        const intervalMs = (integration.inventorySyncIntervalMinutes || 60) * 60_000;
        if (!lastRun || now.getTime() - lastRun.getTime() >= intervalMs) {
            const job = await prisma.workerJob.create({
                data: {
                    type: 'inventory_sync',
                    status: 'PENDING',
                    payload: JSON.stringify({ source: 'SHOPIFY', integrationId: integration.id }),
                },
            });
            await inventorySyncQueue.add(
                'inventory_sync',
                { jobId: job.id, source: 'SHOPIFY', integrationId: integration.id },
                { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
            );
            await prismaAny.integration.update({
                where: { id: integration.id },
                data: { lastInventorySyncAt: now },
            });
        }
    }
}

setInterval(() => {
    runScheduler().catch(() => null);
}, POLL_INTERVAL_MS);
