import express from 'express';
import { generateSpeaking, generateWriting, assessWriting, generateReading, generateListening } from '../controllers/geminiController.js';
import { protect } from '../middlewares/auth.js';
import { apiLimiter } from '../middlewares/security.js';

const router = express.Router();

// Apply rate limiting to all skill generation routes
router.use(apiLimiter);

router.post('/speaking/generate', protect, generateSpeaking);
router.post('/writing/generate', protect, generateWriting);
router.post('/writing/assess', protect, assessWriting);
router.post('/reading/generate', protect, generateReading);
router.post('/listening/generate', protect, generateListening);

export default router;
