import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { to: '/', icon: 'bi-grid', label: 'Dashboard' },
  { to: '/pipeline', icon: 'bi-rocket-takeoff', label: 'Pipeline' },
  { to: '/history', icon: 'bi-clock-history', label: 'History' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">⚡ LiveDeploy<span className="brand-pulse"></span></Link>
        <nav className="nav-links">
          {navLinks.map(({ to, icon, label }) => (
            <Link key={to} to={to} className={`nav-link ${pathname === to ? 'active' : ''}`}>
              <i className={`bi ${icon}`}></i> {label}
            </Link>
          ))}
        </nav>
        <div className="nav-right">
          <div className="user-pill">
            <div className="avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
            <span>{user?.username}</span>
          </div>
          <button className="btn btn-ghost" onClick={logout} style={{ padding: '4px 10px' }}>
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </header>
      <div className="body">
        <aside className="sidebar">
          <div className="sl">Main</div>
          {navLinks.map(({ to, icon, label }) => (
            <Link key={to} to={to} className={`si ${pathname === to ? 'active' : ''}`}>
              <i className={`bi ${icon}`}></i> {label}
            </Link>
          ))}
          <div className="sl" style={{ marginTop: 12 }}>Tools</div>
          <Link to="/pipeline" className="si"><i className="bi bi-github"></i> GitHub Fetch</Link>
          <Link to="/pipeline" className="si"><i className="bi bi-cpu"></i> AI Modifier</Link>
          <Link to="/pipeline" className="si"><i className="bi bi-terminal"></i> Build Logs</Link>
        </aside>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
