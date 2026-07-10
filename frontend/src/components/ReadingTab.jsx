import { useState } from 'react';
import { readingAPI } from '../services/api';
import { historyAPI } from '../services/api';

const ReadingTab = () => {
  const [passage, setPassage] = useState('');
  const [questions, setQuestions] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!questions.trim()) {
      setError('Hãy dán câu hỏi trước.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await readingAPI.generate(passage, questions);
      setResult(response.result);
      
      // Save to history
      await historyAPI.addToHistory('reading', questions.substring(0, 50) + '...', { passage, questions }, response.result);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Có lỗi khi phân tích, thử lại nhé.';
      if (errorMsg === 'RATE_LIMITED') {
        setError('Đã dùng hết lượt miễn phí trong ít phút qua, đợi 1-2 phút rồi thử lại nhé.');
      } else if (errorMsg === 'OVERLOADED') {
        setError('Server AI đang quá tải, đợi chút rồi thử lại nhé.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ia-panel">
      <div className="ia-card">
        <label className="ia-label">Đoạn văn (không bắt buộc)</label>
        <div className="ia-hint">Dán passage nếu có — câu trả lời sẽ chính xác hơn nhiều.</div>
        <textarea 
          className="ia-textarea" 
          value={passage}
          onChange={(e) => setPassage(e.target.value)}
          placeholder="Dán đoạn văn đọc hiểu ở đây (nếu có)..."
        />
        <label className="ia-label" style={{ marginTop: '12px' }}>Câu hỏi</label>
        <div className="ia-hint">Dán các câu hỏi (True/False/Not Given, trắc nghiệm, điền từ...).</div>
        <textarea 
          className="ia-textarea" 
          value={questions}
          onChange={(e) => setQuestions(e.target.value)}
          placeholder="1. ...\n2. ..."
        />
        <div style={{ marginTop: '12px' }}>
          <button 
            className="ia-btn" 
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? '⏳ Đang phân tích...' : '✨ Generate đáp án'}
          </button>
        </div>
        {error && <div className="ia-status" style={{ color: '#D64F4F' }}>{error}</div>}
      </div>

      {result && (
        <div className="ia-card">
          <div className="ia-badge mint">ĐÁP ÁN</div>
          {result.answers?.map((item, index) => (
            <div key={index} className="ia-qa">
              <div className="ia-q">{item.question}</div>
              <div className="ia-a" style={{ fontWeight: '600', color: '#E14F84' }}>✅ {item.answer}</div>
              <div className="ia-a">{item.reason}</div>
            </div>
          ))}
        </div>
      )}

      {!result && !loading && (
        <div className="ia-empty">Dán câu hỏi Reading để nhận đáp án gợi ý 📖</div>
      )}
    </div>
  );
};

export default ReadingTab;
