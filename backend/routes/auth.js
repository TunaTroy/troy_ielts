import express from 'express';
import { register, login, getProfile } from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/security.js';

const router = express.Router();

// register/login are classic brute-force targets - rate-limit them specifically
// (the global `limiter` in server.js alone allows 100 req/15min, which is far
// too generous for password guessing / account-creation spam).
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/profile', protect, getProfile);

export default router;