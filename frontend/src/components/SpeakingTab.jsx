import { useState } from 'react';
import { speakingAPI } from '../services/api';
import { historyAPI } from '../services/api';

const SpeakingTab = () => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Vui lòng nhập chủ đề');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await speakingAPI.generate(topic);
      setResult(response.result);
      
      // Save to history
      await historyAPI.addToHistory('speaking', topic, { topic }, response.result);
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ia-panel">
      <div className="ia-card">
        <label className="ia-label">Chủ đề Speaking</label>
        <div className="ia-hint">Gõ một chủ đề bất kỳ — tự động sinh Part 1, 2, 3 kèm câu trả lời mẫu.</div>
        <div className="ia-row">
          <div>
            <input 
              className="ia-input" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="vd: du lịch, technology, a memorable trip..." 
            />
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <button 
              className="ia-btn" 
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? '⏳ Đang tạo...' : '✨ Generate'}
            </button>
          </div>
        </div>
        {error && <div className="ia-status" style={{ color: '#D64F4F' }}>{error}</div>}
      </div>

      {result && (
        <div className="ia-card">
          <div className="ia-badge mint">Part 1</div>
          {result.part1?.map((item, index) => (
            <div key={index} className="ia-qa">
              <div className="ia-q">Q: {item.q}</div>
              <div className="ia-a">{item.a}</div>
            </div>
          ))}

          <div className="ia-badge mint" style={{ marginTop: '20px' }}>Part 2</div>
          {result.part2 && (
            <>
              <div className="ia-label">{result.part2.title}</div>
              <ul className="ia-tips">
                {result.part2.bullets?.map((bullet, index) => (
                  <li key={index}>{bullet}</li>
                ))}
              </ul>
              <div className="ia-essay-box">{result.part2.answer}</div>
              {result.part2.followup && (
                <div className="ia-qa">
                  <div className="ia-q">Follow-up: {result.part2.followup.q}</div>
                  <div className="ia-a">{result.part2.followup.a}</div>
                </div>
              )}
            </>
          )}

          <div className="ia-badge mint" style={{ marginTop: '20px' }}>Part 3</div>
          {result.part3?.map((item, index) => (
            <div key={index} className="ia-qa">
              <div className="ia-q">Q: {item.q}</div>
              <div className="ia-a">{item.a}</div>
            </div>
          ))}
        </div>
      )}

      {!result && !loading && (
        <div className="ia-empty">Chưa có gì ở đây — nhập chủ đề rồi bấm Generate nhé 🌷</div>
      )}
    </div>
  );
};

export default SpeakingTab;
