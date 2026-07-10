import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let result;
    if (isLogin) {
      result = await login(email, password);
    } else {
      result = await register(username, email, password);
    }

    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setUsername('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="ia-card" style={{ maxWidth: '400px', margin: '40px auto' }}>
      <div className="ia-header">
        <div className="ia-title">🌸 Troy IELTS</div>
        <div className="ia-sub">{isLogin ? 'Đăng nhập để tiếp tục' : 'Đăng ký tài khoản mới'}</div>
      </div>
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <>
            <label className="ia-label">Tên đăng nhập</label>
            <input 
              className="ia-input" 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
              minLength={3}
              style={{ marginBottom: '12px' }}
            />
          </>
        )}
        <label className="ia-label">Email</label>
        <input 
          className="ia-input" 
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          required
          style={{ marginBottom: '12px' }}
        />
        <label className="ia-label">Mật khẩu</label>
        <input 
          className="ia-input" 
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
          style={{ marginBottom: '12px' }}
        />
        {error && <div className="ia-status" style={{ color: '#D64F4F' }}>{error}</div>}
        <button 
          className="ia-btn" 
          type="submit"
          disabled={loading}
          style={{ width: '100%', marginTop: '12px' }}
        >
          {loading ? '⏳ Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>
        {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
        <span 
          onClick={toggleMode}
          style={{ color: '#FF6FA0', cursor: 'pointer', fontWeight: 600 }}
        >
          {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
        </span>
      </div>
    </div>
  );
};

export default AuthForm;
