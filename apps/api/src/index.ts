import './pre';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import baseRoutes from './routes';
import './workers/orderSync';
import './workers/inventorySync';
import './workers/inventoryScheduler';
import { apiRateLimiter } from './middleware/rateLimit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configure CORS to allow requests from Vercel deployment and localhost
const allowedOrigins = [
    'https://lacleo-web.vercel.app',
    /^https:\/\/.*\.vercel\.app$/,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Check if origin matches allowed patterns
        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed instanceof RegExp) {
                return allowed.test(origin);
            }
            return origin === allowed;
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            // In development, allow all origins
            if (process.env.NODE_ENV !== 'production') {
                callback(null, true);
            } else {
                console.warn(`CORS blocked origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
}));
app.use(express.json({
    verify: (req, res, buf) => {
        (req as any).rawBody = buf;
    },
}));

app.use('/api', apiRateLimiter, baseRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'api' });
});

app.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
});
