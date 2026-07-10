import { useState, useRef } from 'react';
import { listeningAPI } from '../services/api';
import { historyAPI } from '../services/api';

const ListeningTab = () => {
  const [transcript, setTranscript] = useState('');
  const [questions, setQuestions] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const audioPlayerRef = useRef(null);

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setError('Cần có transcript trước (dán tay hoặc dùng nút ghi âm thử nghiệm).');
      return;
    }
    if (!questions.trim()) {
      setError('Hãy dán câu hỏi trước.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await listeningAPI.generate(transcript, questions);
      setResult(response.result);
      
      // Save to history
      await historyAPI.addToHistory('listening', questions.substring(0, 50) + '...', { transcript, questions }, response.result);
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

  const handleRecord = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Trình duyệt này không hỗ trợ tính năng nhận diện giọng nói. Hãy thử Chrome, hoặc dán transcript thủ công.');
      return;
    }

    if (recording) {
      // Stop recording
      setRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setRecording(true);
    };

    recognition.onresult = (event) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' ';
        }
      }
      setTranscript(prev => prev + final);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognition.onerror = () => {
      setRecording(false);
    };

    recognition.start();
  };

  const handleAudioFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = URL.createObjectURL(file);
        audioPlayerRef.current.style.display = 'block';
      }
    }
  };

  return (
    <div className="ia-panel">
      <div className="ia-card">
        <div className="ia-note">🎧 Lưu ý: App này cần <b>transcript</b> (bản ghi lời thoại) để phân tích. Bạn có thể dán transcript có sẵn, hoặc dùng nút thử nghiệm bên dưới để tự chuyển giọng nói thành chữ (chỉ hoạt động tốt trên Chrome, cần bật mic).</div>
        
        <div className="ia-file-drop">
          🔊 Tải file ghi âm lên để nghe lại (chỉ để tham khảo, không gửi cho AI)
          <br />
          <input 
            type="file" 
            accept="audio/*" 
            onChange={handleAudioFileChange}
          />
          <audio 
            ref={audioPlayerRef}
            controls 
            style={{ width: '100%', marginTop: '10px', display: 'none' }}
          />
        </div>

        <label className="ia-label">Transcript (lời thoại)</label>
        <textarea 
          className="ia-textarea" 
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Dán transcript của đoạn ghi âm ở đây..."
        />
        <div style={{ marginTop: '8px' }}>
          <button 
            className="ia-btn secondary" 
            onClick={handleRecord}
            disabled={recording}
          >
            {recording ? '⏹️ Dừng ghi (đang nghe qua mic...)' : '🎙️ Thử tự động chuyển giọng nói (thử nghiệm)'}
          </button>
        </div>

        <label className="ia-label" style={{ marginTop: '14px' }}>Câu hỏi</label>
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
        <div className="ia-empty">Dán transcript + câu hỏi Listening để nhận đáp án 🎧</div>
      )}
    </div>
  );
};

export default ListeningTab;
