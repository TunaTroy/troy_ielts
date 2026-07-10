import History from '../models/History.js';

// @desc    Get user's history
// @route   GET /api/history
// @access  Private
export const getHistory = async (req, res) => {
  try {
    const { skill } = req.query;
    const filter = { user: req.user._id };
    
    if (skill && skill !== 'all') {
      filter.skill = skill;
    }

    const history = await History.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Add item to history
// @route   POST /api/history
// @access  Private
export const addToHistory = async (req, res) => {
  try {
    const { skill, topic, content, result } = req.body;

    if (!skill || !topic || !content || !result) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const historyItem = await History.create({
      user: req.user._id,
      skill,
      topic,
      content,
      result
    });

    res.status(201).json(historyItem);
  } catch (error) {
    console.error('Add to history error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Toggle bookmark status
// @route   PATCH /api/history/:id/bookmark
// @access  Private
export const toggleBookmark = async (req, res) => {
  try {
    const historyItem = await History.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!historyItem) {
      return res.status(404).json({ error: 'History item not found' });
    }

    historyItem.bookmarked = !historyItem.bookmarked;
    await historyItem.save();

    res.json(historyItem);
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete history item
// @route   DELETE /api/history/:id
// @access  Private
export const deleteHistoryItem = async (req, res) => {
  try {
    const historyItem = await History.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!historyItem) {
      return res.status(404).json({ error: 'History item not found' });
    }

    res.json({ message: 'History item deleted' });
  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Clear all history for user
// @route   DELETE /api/history
// @access  Private
export const clearHistory = async (req, res) => {
  try {
    await History.deleteMany({ user: req.user._id });
    res.json({ message: 'All history cleared' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: error.message });
  }
};
