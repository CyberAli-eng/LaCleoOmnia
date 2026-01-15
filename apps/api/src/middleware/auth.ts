import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_fallback_key';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Missing token' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
        (req as Request & { user?: { id: number } }).user = { id: payload.userId };
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
