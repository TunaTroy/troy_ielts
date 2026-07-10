import { useState, useEffect } from 'react';
import { historyAPI } from '../services/api';

const HistoryTab = () => {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await historyAPI.getHistory(filter);
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBookmark = async (id) => {
    try {
      await historyAPI.toggleBookmark(id);
      fetchHistory();
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa mục này?')) return;
    
    try {
      await historyAPI.deleteItem(id);
      fetchHistory();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử?')) return;
    
    try {
      await historyAPI.clearHistory();
      fetchHistory();
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const getSkillIcon = (skill) => {
    const icons = {
      speaking: '🎤',
      writing: '✍️',
      reading: '📖',
      listening: '🎧'
    };
    return icons[skill] || '📚';
  };

  const getSkillName = (skill) => {
    const names = {
      speaking: 'Speaking',
      writing: 'Writing',
      reading: 'Reading',
      listening: 'Listening'
    };
    return names[skill] || skill;
  };

  return (
    <div className="ia-panel">
      <div className="ia-card">
        <div className="ia-row" style={{ alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <label className="ia-label">Lịch sử luyện tập</label>
            <div className="ia-hint">Xem lại các bài đã làm, đánh dấu yêu thích, hoặc xóa.</div>
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <button 
              className="ia-btn secondary" 
              onClick={handleClearAll}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              🗑️ Xóa tất cả
            </button>
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <select 
            className="ia-select" 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Tất cả kỹ năng</option>
            <option value="speaking">🎤 Speaking</option>
            <option value="writing">✍️ Writing</option>
            <option value="reading">📖 Reading</option>
            <option value="listening">🎧 Listening</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="ia-empty">Đang tải...</div>
      ) : history.length === 0 ? (
        <div className="ia-empty">Chưa có lịch sử luyện tập nào. Hãy bắt đầu bằng cách tạo câu hỏi ở các tab khác! 🌷</div>
      ) : (
        history.map((item) => (
          <div key={item._id} className="ia-history-item">
            <div className="ia-history-header">
              <div className="ia-history-title">
                {getSkillIcon(item.skill)} {getSkillName(item.skill)}
              </div>
              <div className="ia-history-meta">{formatDate(item.createdAt)}</div>
            </div>
            <div className="ia-history-meta">{item.topic}</div>
            <div className="ia-history-actions">
              <button 
                className={`ia-history-btn ${item.bookmarked ? 'bookmarked' : ''}`}
                onClick={() => handleToggleBookmark(item._id)}
              >
                {item.bookmarked ? '⭐ Đã lưu' : '☆ Lưu'}
              </button>
              <button 
                className="ia-history-btn delete"
                onClick={() => handleDelete(item._id)}
              >
                🗑️ Xóa
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default HistoryTab;
