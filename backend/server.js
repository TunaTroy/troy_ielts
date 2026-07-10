import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/database.js';
import { limiter, securityHeaders, sanitizeData } from './middlewares/security.js';
import { errorHandler } from './middlewares/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.js';
import skillRoutes from './routes/skills.js';
import historyRoutes from './routes/history.js';

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(securityHeaders);
app.use(limiter);
app.use(sanitizeData);

// CORS configuration - restrict to frontend domain in production
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '2mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', skillRoutes);
app.use('/api/history', historyRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Troy IELTS backend running on port ${PORT}`));
