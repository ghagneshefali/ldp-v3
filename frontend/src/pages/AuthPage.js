import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') await login(form.email, form.password);
      else {
        if (!form.username) { setError('Username required'); return; }
        await register(form.username, form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed');
    }
  };

  const demo = async () => {
    setError('');
    const rand = Date.now();
    try {
      await register(`user${rand}`, `user${rand}@demo.com`, 'demo123');
      navigate('/');
    } catch {
      setError('Try Sign Up tab instead');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-icon">⚡</div>
          <div className="auth-title">LiveDeploy Pipeline</div>
          <div className="auth-sub">CI/CD Automation System v3.0</div>
        </div>

        <div className="flex gap1 mb3" style={{ background: 'var(--bg3)', borderRadius: 8, padding: 4 }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              className="btn w100" style={{ flex: 1, justifyContent: 'center', background: mode === m ? 'var(--blue)' : 'transparent', color: mode === m ? '#fff' : 'var(--text2)', border: 'none', padding: '7px' }}>
              <i className={`bi ${m === 'login' ? 'bi-box-arrow-in-right' : 'bi-person-plus'}`}></i>
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error mb2"><i className="bi bi-exclamation-triangle"></i>{error}</div>}

        <form onSubmit={handle}>
          {mode === 'register' && (
            <div className="mb2">
              <label className="label">Username</label>
              <input className="inp" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="yourname" required />
            </div>
          )}
          <div className="mb2">
            <label className="label">Email</label>
            <input className="inp" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
          </div>
          <div className="mb3">
            <label className="label">Password</label>
            <input className="inp" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary w100" disabled={loading} style={{ justifyContent: 'center', padding: 10 }}>
            {loading ? <><span className="spin"></span> Loading...</> : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="divider" />
        <button onClick={demo} className="btn btn-ghost w100" style={{ justifyContent: 'center' }} disabled={loading}>
          <i className="bi bi-play-circle"></i> Quick Demo Access
        </button>
        <p className="xs muted mt2" style={{ textAlign: 'center' }}>Works without MongoDB</p>
      </div>
    </div>
  );
}
