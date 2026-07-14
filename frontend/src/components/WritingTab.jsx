import { useState } from 'react';
import { writingAPI } from '../services/api';
import { historyAPI } from '../services/api';

const WritingTab = () => {
  const [mode, setMode] = useState('generate'); // 'generate' or 'assess'
  const [task, setTask] = useState('Task 2 (Essay)');
  const [question, setQuestion] = useState('');
  const [essay, setEssay] = useState('');
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
      } else if (errorMsg === 'TIMEOUT') {
        setError('Quá thời gian chờ, thử lại nhé.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssess = async () => {
    if (!question.trim()) {
      setError('Hãy dán đề bài trước.');
      return;
    }
    if (!essay.trim()) {
      setError('Hãy nhập bài làm của bạn trước.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await writingAPI.assess(task, question, essay);
      setResult(response.result);
      
      // Save to history
      await historyAPI.addToHistory('writing', question.substring(0, 50) + '...', { task, question, essay }, response.result);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Có lỗi khi chấm điểm, thử lại nhé.';
      if (errorMsg === 'RATE_LIMITED') {
        setError('Đã dùng hết lượt miễn phí trong ít phút qua, đợi 1-2 phút rồi thử lại nhé.');
      } else if (errorMsg === 'OVERLOADED') {
        setError('Server AI đang quá tải, đợi chút rồi thử lại nhé.');
      } else if (errorMsg === 'TIMEOUT') {
        setError('Quá thời gian chờ, thử lại nhé.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setResult(null);
    setError('');
    if (newMode === 'generate') {
      setEssay('');
    }
  };

  return (
    <div className="ia-panel">
      <div className="ia-card">
        <div className="ia-row" style={{ marginBottom: '16px' }}>
          <button 
            className={`ia-btn ${mode === 'generate' ? 'ia-btn-primary' : ''}`}
            onClick={() => handleModeChange('generate')}
            style={{ marginRight: '8px' }}
          >
            ✨ Generate bài mẫu
          </button>
          <button 
            className={`ia-btn ${mode === 'assess' ? 'ia-btn-primary' : ''}`}
            onClick={() => handleModeChange('assess')}
          >
            📝 Chấm điểm bài làm
          </button>
        </div>

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
        
        {mode === 'assess' && (
          <>
            <label className="ia-label" style={{ marginTop: '12px' }}>Nhập bài làm của bạn</label>
            <div className="ia-hint">Dán bài viết của bạn để được chấm điểm theo tiêu chí IELTS.</div>
            <textarea 
              className="ia-textarea" 
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder="Dán bài viết của bạn vào đây..."
              style={{ minHeight: '200px' }}
            />
          </>
        )}
        
        <div style={{ marginTop: '12px' }}>
          <button 
            className="ia-btn" 
            onClick={mode === 'generate' ? handleGenerate : handleAssess}
            disabled={loading}
          >
            {loading ? (mode === 'generate' ? '⏳ Đang viết bài mẫu...' : '⏳ Đang chấm điểm...') : 
             (mode === 'generate' ? '✨ Generate bài mẫu' : '📝 Chấm điểm bài làm')}
          </button>
        </div>
        {error && <div className="ia-status" style={{ color: '#D64F4F' }}>{error}</div>}
      </div>

      {result && mode === 'generate' && (
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

      {result && mode === 'assess' && (
        <div className="ia-card">
          <div className="ia-badge">KẾT QUẢ CHẤM ĐIỂM · Band {result.overallBand || '?'}</div>
          
          <div className="ia-label" style={{ marginTop: '12px' }}>📊 Điểm theo tiêu chí</div>
          <div className="ia-row" style={{ marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <div className="ia-hint">Task Response/Task Achievement</div>
              <div className="ia-score">{result.criteria?.taskResponse || '?'}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="ia-hint">Coherence & Cohesion</div>
              <div className="ia-score">{result.criteria?.coherence || '?'}</div>
            </div>
          </div>
          <div className="ia-row" style={{ marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <div className="ia-hint">Lexical Resource</div>
              <div className="ia-score">{result.criteria?.lexicalResource || '?'}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="ia-hint">Grammar</div>
              <div className="ia-score">{result.criteria?.grammar || '?'}</div>
            </div>
          </div>

          <div className="ia-label">💪 Điểm mạnh</div>
          <ul className="ia-tips">
            {result.strengths?.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>

          <div className="ia-label" style={{ marginTop: '8px' }}>📈 Cần cải thiện</div>
          <ul className="ia-tips">
            {result.improvements?.map((improvement, index) => (
              <li key={index}>{improvement}</li>
            ))}
          </ul>

          <div className="ia-label" style={{ marginTop: '8px' }}>🔧 Sửa lỗi cụ thể</div>
          {result.corrections?.map((correction, index) => (
            <div key={index} style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ color: '#D64F4F', marginBottom: '4px' }}>{correction.original}</div>
              <div style={{ color: '#4CAF50', marginBottom: '4px' }}>{correction.correction}</div>
              <div className="ia-hint">{correction.explanation}</div>
            </div>
          ))}

          <div className="ia-label" style={{ marginTop: '12px' }}>📝 Chi tiết từng tiêu chí</div>
          <div style={{ marginBottom: '8px' }}>
            <div className="ia-hint">Task Response/Task Achievement</div>
            <div>{result.feedback?.taskResponse || ''}</div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div className="ia-hint">Coherence & Cohesion</div>
            <div>{result.feedback?.coherence || ''}</div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div className="ia-hint">Lexical Resource</div>
            <div>{result.feedback?.lexicalResource || ''}</div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div className="ia-hint">Grammar</div>
            <div>{result.feedback?.grammar || ''}</div>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="ia-empty">
          {mode === 'generate' ? 'Dán đề bài Writing để nhận bài mẫu Band 7-8 nhé ✍️' : 'Dán đề bài và bài làm của bạn để được chấm điểm 📝'}
        </div>
      )}
    </div>
  );
};

export default WritingTab;
