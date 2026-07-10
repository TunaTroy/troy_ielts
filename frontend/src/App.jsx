import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import SpeakingTab from './components/SpeakingTab';
import WritingTab from './components/WritingTab';
import ReadingTab from './components/ReadingTab';
import ListeningTab from './components/ListeningTab';
import HistoryTab from './components/HistoryTab';
import AuthForm from './components/AuthForm';

function App() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('speaking');

  if (loading) {
    return (
      <div className="ielts-app">
        <div className="ia-empty">Đang tải...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="ielts-app">
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="ielts-app">
      <div className="ia-header">
        <div className="ia-title">🌸 Troy IELTS</div>
        <div className="ia-sub">
          Xin chào, {user.username}! — Chọn kỹ năng bên dưới để bắt đầu
          <button 
            onClick={logout}
            style={{
              marginLeft: '12px',
              padding: '4px 12px',
              fontSize: '12px',
              background: '#fff',
              border: '1px solid #FFDCEC',
              borderRadius: '999px',
              cursor: 'pointer',
              color: '#FF6FA0'
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="ia-tabs">
        <button 
          className={`ia-tab ${activeTab === 'speaking' ? 'active' : ''}`} 
          onClick={() => setActiveTab('speaking')}
        >
          🎤 Speaking
        </button>
        <button 
          className={`ia-tab ${activeTab === 'writing' ? 'active' : ''}`} 
          onClick={() => setActiveTab('writing')}
        >
          ✍️ Writing
        </button>
        <button 
          className={`ia-tab ${activeTab === 'reading' ? 'active' : ''}`} 
          onClick={() => setActiveTab('reading')}
        >
          📖 Reading
        </button>
        <button 
          className={`ia-tab ${activeTab === 'listening' ? 'active' : ''}`} 
          onClick={() => setActiveTab('listening')}
        >
          🎧 Listening
        </button>
        <button 
          className={`ia-tab ${activeTab === 'history' ? 'active' : ''}`} 
          onClick={() => setActiveTab('history')}
        >
          📚 History
        </button>
      </div>

      {activeTab === 'speaking' && <SpeakingTab />}
      {activeTab === 'writing' && <WritingTab />}
      {activeTab === 'reading' && <ReadingTab />}
      {activeTab === 'listening' && <ListeningTab />}
      {activeTab === 'history' && <HistoryTab />}
    </div>
  );
}

export default App;
