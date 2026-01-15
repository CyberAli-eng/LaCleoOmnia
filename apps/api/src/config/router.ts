import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { z } from 'zod';

const router = Router();

// Validation schema for creating/updating integration
const integrationSchema = z.object({
    type: z.enum(['AMAZON', 'SHOPIFY', 'WOO', 'FLIPKART', 'SHIPPING']),
    name: z.string().optional(),
    credentials: z.string(), // JSON string
});

// Create/Update Integration
router.post('/', async (req: Request, res: Response) => {
    try {
        const { type, name, credentials } = integrationSchema.parse(req.body);
        const userId = (req as Request & { user?: { id: number } }).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const integration = await prisma.integration.create({
            data: {
                type,
                name,
                credentials,
                userId,
            },
        });

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

export default router;
