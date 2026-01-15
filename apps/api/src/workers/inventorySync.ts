import { Worker } from 'bullmq';
import { prisma } from '../services/prisma';
import { redis } from '../services/redis';
import { getAdapter } from '../integrations/adapterRegistry';

const worker = new Worker(
    'inventory-sync',
    async (job: any) => {
        const { jobId, source, payload } = job.data || {};
        const adapter = source ? getAdapter(String(source).toUpperCase()) : null;
        if (adapter?.updateInventory) {
            await adapter.updateInventory(payload);
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
