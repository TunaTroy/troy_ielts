import { useState } from 'react';
import { writingAPI } from '../services/api';
import { historyAPI } from '../services/api';

const WritingTab = () => {
  const [task, setTask] = useState('Task 2 (Essay)');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!question.trim()) {
      setError('Hãy dán đề bài trước.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await writingAPI.generate(task, question);
      setResult(response.result);
      
      // Save to history
      await historyAPI.addToHistory('writing', question.substring(0, 50) + '...', { task, question }, response.result);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Có lỗi khi tạo bài mẫu, thử lại nhé.';
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
        <div className="ia-row">
          <div>
            <label className="ia-label">Dạng bài</label>
            <select 
              className="ia-select" 
              value={task}
              onChange={(e) => setTask(e.target.value)}
            >
              <option value="Task 1 (Academic - describe chart/graph/table/process)">Task 1 (Academic)</option>
              <option value="Task 1 (General Training - letter)">Task 1 (General - Letter)</option>
              <option value="Task 2 (Essay)">Task 2 (Essay)</option>
            </select>
          </div>
        </div>
        <label className="ia-label">Dán đề bài vào đây</label>
        <div className="ia-hint">Dán nguyên văn câu hỏi Writing (mô tả biểu đồ, đề thư, hoặc đề luận).</div>
        <textarea 
          className="ia-textarea" 
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="vd: The chart below shows... / Some people believe that..."
        />
        <div style={{ marginTop: '12px' }}>
          <button 
            className="ia-btn" 
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? '⏳ Đang viết bài mẫu...' : '✨ Generate bài mẫu'}
          </button>
        </div>
        {error && <div className="ia-status" style={{ color: '#D64F4F' }}>{error}</div>}
      </div>

      {result && (
        <div className="ia-card">
          <div className="ia-badge">BÀI MẪU · ~{result.wordCount || '?'} từ</div>
          <div className="ia-essay-box">{result.essay}</div>
          <div className="ia-label" style={{ marginTop: '4px' }}>💡 Vì sao bài này ổn</div>
          <ul className="ia-tips">
            {result.tips?.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {!result && !loading && (
        <div className="ia-empty">Dán đề bài Writing để nhận bài mẫu Band 7-8 nhé ✍️</div>
      )}
    </div>
  );
};

export default WritingTab;
