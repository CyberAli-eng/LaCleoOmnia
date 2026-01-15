import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient() as PrismaClient & Record<string, any>;
