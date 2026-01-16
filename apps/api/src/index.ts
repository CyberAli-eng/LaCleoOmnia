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

app.use(cors());
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
