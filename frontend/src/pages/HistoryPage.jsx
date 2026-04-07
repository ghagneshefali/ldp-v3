import React, { useState, useEffect } from 'react';
import { deployApi } from '../utils/api';

const stCfg = {
  SUCCESS: { cls: 'badge-success', icon: 'bi-check-circle-fill', label: 'Success' },
  RUNNING: { cls: 'badge-running', icon: 'bi-arrow-repeat', label: 'Running' },
  PENDING: { cls: 'badge-pending', icon: 'bi-hourglass-split', label: 'Pending' },
  FAILED: { cls: 'badge-error', icon: 'bi-x-circle-fill', label: 'Failed' },
};

export default function HistoryPage() {
  const [deps, setDeps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL');

  const load = async () => {
    try { const { data } = await deployApi.getHistory(); setDeps(data.deployments || []); }
    catch { setDeps([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, []);

  const viewLogs = async (dep) => {
    setSel(dep);
    try { const { data } = await deployApi.getLogs(dep.id); setLogs(data.logs || []); }
    catch { setLogs(['Failed to load logs']); }
  };

  const remove = async (id) => {
    await deployApi.remove(id);
    setDeps(p => p.filter(d => d.id !== id));
    if (sel?.id === id) setSel(null);
  };

  const filtered = filter === 'ALL' ? deps : deps.filter(d => d.status === filter);
  const dur = dep => {
    if (!dep.completedAt) return '—';
    return `${((new Date(dep.completedAt) - new Date(dep.startedAt)) / 1000).toFixed(1)}s`;
  };

  return (
    <div>
      <div className="flex between center mb3">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}><i className="bi bi-clock-history me-2 blue"></i>Deployment History</h1>
          <p className="sm s2">{deps.length} total deployment{deps.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-ghost" onClick={load}><i className="bi bi-arrow-clockwise"></i> Refresh</button>
      </div>

      <div className="tabs mb3" style={{ background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)' }}>
        {['ALL', 'SUCCESS', 'RUNNING', 'PENDING', 'FAILED'].map(f => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
            <span style={{ background: 'var(--bg3)', borderRadius: 10, padding: '1px 5px', fontSize: 10, marginLeft: 3 }}>
              {f === 'ALL' ? deps.length : deps.filter(d => d.status === f).length}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 1.2fr' : '1fr', gap: 14 }}>
        <div>
          {loading ? (
            <div className="empty"><span className="spin" style={{ margin: '0 auto 10px' }}></span>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📭</div>
              <div className="empty-title">No deployments found</div>
            </div>
          ) : (
            <div className="flex col gap2">
              {filtered.map(dep => {
                const cfg = stCfg[dep.status] || stCfg.PENDING;
                return (
                  <div key={dep.id} className="card" style={{ cursor: 'pointer', border: sel?.id === dep.id ? '1px solid var(--blue)' : undefined }} onClick={() => viewLogs(dep)}>
                    <div className="card-body">
                      <div className="flex between center mb1">
                        <div className="flex center gap2">
                          <span className={`badge ${cfg.cls}`}>
                            {dep.status === 'RUNNING' && <span className="dot"></span>}
                            <i className={`bi ${cfg.icon}`}></i> {cfg.label}
                          </span>
                          <code className="xs muted">#{dep.id?.slice(0, 8)}</code>
                        </div>
                        <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 11 }}
                          onClick={e => { e.stopPropagation(); remove(dep.id); }}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                      <div className="sm bold mb1">{dep.repoName}</div>
                      <div className="xs muted trunc mb2">{dep.repoUrl}</div>
                      <div className="flex gap2 xs muted">
                        <span><i className="bi bi-git me-1"></i>{dep.branch}</span>
                        <span><i className="bi bi-clock me-1"></i>{new Date(dep.startedAt).toLocaleString()}</span>
                        <span><i className="bi bi-stopwatch me-1"></i>{dur(dep)}</span>
                      </div>
                      {dep.deployUrl && (
                        <div className="mt2">
                          <a href={dep.deployUrl} target="_blank" rel="noopener noreferrer"
                            className="xs blue mono" onClick={e => e.stopPropagation()}>
                            <i className="bi bi-link-45deg me-1"></i>{dep.deployUrl}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {sel && (
          <div className="card" style={{ position: 'sticky', top: 70, maxHeight: 'calc(100vh - 100px)' }}>
            <div className="card-head">
              <i className="bi bi-terminal green"></i> Logs — <code style={{ fontSize: 11 }}>#{sel.id?.slice(0, 8)}</code>
              <button className="btn btn-ghost ms-auto" style={{ padding: '2px 6px' }} onClick={() => setSel(null)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="log-box" style={{ maxHeight: 'calc(100vh - 180px)', borderRadius: '0 0 10px 10px', border: 'none' }}>
              {logs.length === 0 ? <span className="muted">No logs</span> : logs.map((l, i) => (
                <div key={i} className={`log-line ${l.includes('❌') ? 'err' : l.includes('⚠️') ? 'warn' : ''}`}>{l}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
