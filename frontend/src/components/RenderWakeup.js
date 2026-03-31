import React, { useState, useEffect } from 'react';


const POLL_INTERVAL_MS = 5000;   // check every 5s
const MAX_WAIT_MS      = 120000; // give up after 2 min

export default function RenderWakeup({ url }) {
  const [status, setStatus] = useState('waking'); // 'waking' | 'ready' | 'timeout'
  const [elapsed, setElapsed] = useState(0);
  const [dots, setDots]       = useState('');

  // Animated dots
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(id);
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (status !== 'waking') return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // Health-check poller
  useEffect(() => {
    if (!url || status !== 'waking') return;

    const startTime = Date.now();

    const check = async () => {
      try {
        // Use a no-cors ping; if the service is up the fetch won't throw
        await fetch(url, { method: 'GET', mode: 'no-cors' });
        setStatus('ready');
      } catch {
        // still sleeping — keep polling
      }
    };

    check(); // immediate first check
    const pollId = setInterval(() => {
      if (Date.now() - startTime > MAX_WAIT_MS) {
        setStatus('timeout');
        clearInterval(pollId);
        return;
      }
      check();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollId);
  }, [url, status]);

  if (status === 'ready') {
    return (
      <div style={styles.wrapper}>
        <div style={styles.badge('success')}>
          <i className="bi bi-check-circle-fill" style={{ marginRight: 6 }} />
          App is live — opening now
        </div>
        <a href={url} target="_blank" rel="noreferrer" style={styles.link}>
          {url} <i className="bi bi-box-arrow-up-right" />
        </a>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div style={styles.wrapper}>
        <div style={styles.badge('warning')}>
          <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }} />
          Taking longer than expected
        </div>
        <p style={styles.sub}>
          The app may still be starting. Try opening the link directly:
        </p>
        <a href={url} target="_blank" rel="noreferrer" style={styles.link}>
          {url} <i className="bi bi-box-arrow-up-right" />
        </a>
        <button style={styles.retryBtn} onClick={() => { setStatus('waking'); setElapsed(0); }}>
          <i className="bi bi-arrow-clockwise" style={{ marginRight: 6 }} />
          Retry
        </button>
      </div>
    );
  }

  // Default: waking
  const progress = Math.min((elapsed / 90) * 100, 95); // 90s typical cold start

  return (
    <div style={styles.wrapper}>
      {/* Spinner */}
      <div style={styles.spinnerRow}>
        <span style={styles.spinner} />
        <span style={styles.title}>Starting your app{dots}</span>
      </div>

      {/* Progress bar */}
      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${progress}%` }} />
      </div>

      {/* Info */}
      <p style={styles.sub}>
        Render free-plan apps sleep after 15 min of inactivity.<br />
        Cold start usually takes <strong>60 – 90 seconds</strong>. Hang tight!
      </p>

      {/* Timer */}
      <p style={styles.timer}>{elapsed}s elapsed</p>

      {/* Direct link fallback */}
      <a href={url} target="_blank" rel="noreferrer" style={styles.link}>
        {url} <i className="bi bi-box-arrow-up-right" />
      </a>

      {/* Tip */}
      <div style={styles.tip}>
        <i className="bi bi-lightbulb-fill" style={{ color: '#f0a500', marginRight: 6 }} />
        <span>
          <strong>Tip:</strong> Add your URL to{' '}
          <a href="https://uptimerobot.com" target="_blank" rel="noreferrer">UptimeRobot</a>
          {' '}(free) to keep this app awake 24/7.
        </span>
      </div>
    </div>
  );
}

// ── Inline styles (no extra CSS file needed) ──────────────────────────────────
const styles = {
  wrapper: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 12,
    padding: '2rem',
    maxWidth: 560,
    margin: '1.5rem auto',
    fontFamily: "'JetBrains Mono', monospace",
    color: '#e6edf3',
    textAlign: 'center',
  },
  spinnerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: '1rem',
  },
  spinner: {
    display: 'inline-block',
    width: 20,
    height: 20,
    border: '3px solid #30363d',
    borderTop: '3px solid #58a6ff',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
    // NOTE: add this to your global CSS:
    // @keyframes spin { to { transform: rotate(360deg); } }
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e6edf3',
    letterSpacing: '0.02em',
  },
  barTrack: {
    height: 6,
    background: '#21262d',
    borderRadius: 99,
    overflow: 'hidden',
    margin: '0 0 1.25rem',
    transition: 'all 0.3s',
  },
  barFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #1f6feb, #58a6ff)',
    borderRadius: 99,
    transition: 'width 1s ease',
  },
  sub: {
    fontSize: 13,
    color: '#8b949e',
    lineHeight: 1.6,
    margin: '0 0 0.5rem',
  },
  timer: {
    fontSize: 12,
    color: '#6e7681',
    margin: '0 0 1rem',
    fontVariantNumeric: 'tabular-nums',
  },
  link: {
    display: 'inline-block',
    fontSize: 13,
    color: '#58a6ff',
    wordBreak: 'break-all',
    marginBottom: '1.25rem',
    textDecoration: 'none',
  },
  tip: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: '0.75rem 1rem',
    fontSize: 12,
    color: '#8b949e',
    textAlign: 'left',
    lineHeight: 1.6,
  },
  badge: (type) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 14px',
    borderRadius: 99,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: '1rem',
    background: type === 'success' ? '#0f3d2e' : '#3d2b00',
    color:      type === 'success' ? '#3fb950' : '#f0a500',
    border:     `1px solid ${type === 'success' ? '#238636' : '#9e6a03'}`,
  }),
  retryBtn: {
    display: 'block',
    margin: '1rem auto 0',
    padding: '8px 20px',
    background: 'transparent',
    border: '1px solid #30363d',
    borderRadius: 8,
    color: '#e6edf3',
    fontSize: 13,
    cursor: 'pointer',
  },
};