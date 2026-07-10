import express from 'express';
import { getHistory, addToHistory, toggleBookmark, deleteHistoryItem, clearHistory } from '../controllers/historyController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect); // All history routes require authentication

router.route('/')
  .get(getHistory)
  .post(addToHistory)
  .delete(clearHistory);

router.patch('/:id/bookmark', toggleBookmark);
router.delete('/:id', deleteHistoryItem);

export default router;
