import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deployApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const stCfg = {
  SUCCESS: { cls: 'badge-success', icon: 'bi-check-circle-fill', label: 'Success' },
  RUNNING: { cls: 'badge-running', icon: 'bi-arrow-repeat', label: 'Running' },
  PENDING: { cls: 'badge-pending', icon: 'bi-hourglass-split', label: 'Pending' },
  FAILED: { cls: 'badge-error', icon: 'bi-x-circle-fill', label: 'Failed' },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deps, setDeps] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const { data } = await deployApi.getHistory(); setDeps(data.deployments || []); }
    catch { setDeps([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, []);

  const stats = [
    { label: 'Total Deploys', val: deps.length, icon: '🚀', color: 'var(--blue)', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Successful', val: deps.filter(d => d.status === 'SUCCESS').length, icon: '✅', color: 'var(--green)', bg: 'rgba(34,197,94,0.1)' },
    { label: 'Running', val: deps.filter(d => d.status === 'RUNNING').length, icon: '⚡', color: 'var(--orange)', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Failed', val: deps.filter(d => d.status === 'FAILED').length, icon: '❌', color: 'var(--red)', bg: 'rgba(239,68,68,0.1)' },
  ];

  return (
    <div>
      <div className="flex between center mb3">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Welcome back, {user?.username} 👋</h1>
          <p className="sm s2">LiveDeploy Pipeline Dashboard v3.0</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/pipeline')}>
          <i className="bi bi-plus-lg"></i> New Deployment
        </button>
      </div>

      <div className="g4 mb3">
        {stats.map(({ label, val, icon, color, bg }) => (
          <div className="stat" key={label}>
            <div className="stat-icon" style={{ background: bg }}>{icon}</div>
            <div>
              <div className="stat-val" style={{ color }}>{val}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb3">
        <div className="card-head">
          <i className="bi bi-clock-history blue"></i> Recent Deployments
          <button className="btn btn-ghost ms-auto" style={{ padding: '2px 8px', fontSize: 11 }} onClick={load}>
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
        {loading ? (
          <div className="empty"><span className="spin" style={{ width: 24, height: 24, margin: '0 auto 10px' }}></span>Loading...</div>
        ) : deps.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🚀</div>
            <div className="empty-title">No deployments yet</div>
            <p className="xs muted mt1">Start your first deployment from the Pipeline page</p>
            <button className="btn btn-primary mt2" onClick={() => navigate('/pipeline')}>Start Pipeline</button>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>{['Repository', 'Status', 'Started', 'Live URL'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {deps.slice(0, 8).map(dep => {
                const cfg = stCfg[dep.status] || stCfg.PENDING;
                return (
                  <tr key={dep.id}>
                    <td>
                      <div className="bold sm">{dep.repoName}</div>
                      <div className="xs muted trunc" style={{ maxWidth: 200 }}>{dep.repoUrl}</div>
                    </td>
                    <td>
                      <span className={`badge ${cfg.cls}`}>
                        {dep.status === 'RUNNING' && <span className="dot"></span>}
                        <i className={`bi ${cfg.icon}`}></i> {cfg.label}
                      </span>
                    </td>
                    <td className="xs muted">{new Date(dep.startedAt).toLocaleString()}</td>
                    <td>
                      {dep.deployUrl
                        ? <a href={dep.deployUrl} target="_blank" rel="noopener noreferrer" className="xs blue mono"><i className="bi bi-box-arrow-up-right me-1"></i>Open</a>
                        : <span className="muted xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="g2">
        <div className="card">
          <div className="card-head"><i className="bi bi-lightning orange"></i> Quick Actions</div>
          <div className="card-body flex col gap2">
            <button className="btn btn-primary" onClick={() => navigate('/pipeline')} style={{ justifyContent: 'flex-start' }}>
              <i className="bi bi-rocket-takeoff"></i> New Pipeline Deployment
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/history')} style={{ justifyContent: 'flex-start' }}>
              <i className="bi bi-clock-history"></i> View Full History
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><i className="bi bi-info-circle blue"></i> What's New in v3</div>
          <div className="card-body">
            {[
              ['🤖', 'AI Modifier — Just describe what you need!'],
              ['📊', 'Auto repo analysis with tech stack info'],
              ['🔍', 'Smart project type detection'],
              ['⚡', 'Faster pipeline with Render API'],
              ['🛡️', 'Better error handling & logs'],
            ].map(([icon, text]) => (
              <div key={text} className="flex center gap2" style={{ padding: '5px 0', borderBottom: '1px solid var(--border2)', fontSize: 12 }}>
                <span>{icon}</span><span className="s2">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
