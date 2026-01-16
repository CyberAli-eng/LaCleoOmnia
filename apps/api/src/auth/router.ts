import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma';
import { z } from 'zod';
import { verifyGoogleIdToken } from '../services/googleAuth';

const router = Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_fallback_key';

// Validation schemas
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const googleSchema = z.object({
    idToken: z.string().min(10),
});

// Register
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, name } = registerSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name },
        });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        res.status(400).json({ error: 'Registration failed', details: error });
    }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        res.status(400).json({ error: 'Login failed', details: error });
    }
});

router.get('/status', async (req: Request, res: Response) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
        return res.status(401).json({ error: 'Missing token' });
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        return res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
});

// Google OAuth (MVP stub)
router.post('/google', async (req: Request, res: Response) => {
    try {
        const { idToken } = googleSchema.parse(req.body);
        const { email, name } = await verifyGoogleIdToken(idToken);

        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma.user.create({
                data: { email, password: 'oauth_google', name },
            });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        res.status(400).json({ error: 'Google login failed', details: error });
    }
});

export default router;
