import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});
