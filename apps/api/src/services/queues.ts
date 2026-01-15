import { Queue } from 'bullmq';
import { redis } from './redis';

export const orderSyncQueue = new Queue('order-sync', { connection: redis });
export const inventorySyncQueue = new Queue('inventory-sync', { connection: redis });
