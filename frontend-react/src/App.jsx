import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from './api/client';

const NAV = [
  { to: '/',             icon: '◈', label: 'Command Center',    desc: 'Live overview' },
  { to: '/tasks',        icon: '⟁', label: 'Maintenance Tasks', desc: '25 tasks' },
  { to: '/blocks',       icon: '▣', label: 'Block Explorer',    desc: '10 blocks' },
  { to: '/opportunities',icon: '⬡', label: 'Opportunity Engine',desc: 'Graph analysis' },
  { to: '/optimizer',    icon: '⬟', label: 'Plan Optimizer',    desc: 'Live re-run' },
  { to: '/whatif',       icon: '⟳', label: 'What-If Simulator', desc: 'Scenario analysis' },
];

/* Tiny SVG arrow for buttons */
const Arrow = () => (
  <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
    <path d="M1 6h12M8 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* Marquee strip with live stats */
function MarqueeStrip({ stats }) {
  const items = stats ? [
    { label: 'Total Tasks',    value: stats.total_tasks ?? 25 },
    { label: 'Planned',        value: stats.planned_tasks ?? 9 },
    { label: 'Deferred',       value: stats.deferred_tasks ?? 6 },
    { label: 'Blocks',         value: stats.available_blocks ?? 10 },
    { label: 'Avg Debt Score', value: stats.avg_maintenance_debt ? stats.avg_maintenance_debt.toFixed(1) : '—' },
    { label: 'High-Debt Tasks',value: stats.high_debt_tasks ?? 5 },
    { label: 'Low-Flex Tasks', value: stats.low_flexibility_tasks ?? 3 },
    { label: 'SIH 2026',       value: 'PS SIH26027' },
    { label: 'Team',           value: 'Runtime Rebels' },
    { label: 'Optimizer',      value: stats.optimization_run ? 'Active ✓' : 'Ready' },
  ] : [];

  if (!stats) return null;

  const doubled = [...items, ...items]; // duplicate for seamless loop

  return (
    <div className="marquee-wrap" style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
      height: 34,
    }}>
      <div className="marquee-track" style={{ height: 34 }}>
        {doubled.map((item, i) => (
          <div key={i} className="marquee-item">
            <span className="marquee-dot" />
            <span style={{ color: 'var(--text-3)' }}>{item.label}</span>
            <span style={{ color: 'var(--text-2)', fontWeight: 700, fontFamily: 'var(--mono)' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [apiOk, setApiOk]     = useState(null);
  const [banner, setBanner]   = useState(true);
  const [stats, setStats]     = useState(null);
  const location = useLocation();

  useEffect(() => {
    api.health()
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false));
    api.stats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const bannerH = banner ? 36 : 0;
  const marqueeH = stats ? 34 : 0;
  const totalTop = bannerH + marqueeH;

  return (
    <div className="app-shell">

      {/* Disclaimer */}
      {banner && (
        <div className="disclaimer-banner">
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ flex: 1 }}>
            PROTOTYPE — <strong>SYNTHETIC DEMONSTRATION DATA ONLY.</strong> Not connected to live Indian Railways systems. | SIH 2026 · PS ID: SIH26027 · Team: Runtime Rebels
          </span>
          <button
            onClick={() => setBanner(false)}
            style={{ color: '#fde68a', opacity: 0.6, fontSize: 18, lineHeight: 1, transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.target.style.opacity = 1}
            onMouseLeave={e => e.target.style.opacity = 0.6}
          >✕</button>
        </div>
      )}

      {/* Marquee stats ticker */}
      <MarqueeStrip stats={stats} />

      <div className="app-body">

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="sidebar" style={{
          height: `calc(100vh - ${totalTop}px)`,
          position: 'sticky',
          top: totalTop,
        }}>

          {/* Logo */}
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🚆</div>
            <div>
              <div className="sidebar-logo-name gradient-text">RAILFUSE</div>
              <div className="sidebar-logo-sub">SIH 2026 · SIH26027</div>
            </div>
          </div>

          {/* Section label */}
          <div style={{ padding: '0 18px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '1px', color: 'var(--text-4)' }}>
            Navigation
          </div>

          {/* Nav */}
          <nav className="sidebar-nav">
            {NAV.map(({ to, icon, label, desc }, i) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-link-item${isActive ? ' active' : ''}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <span className="nav-icon">{icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 1 }}>{desc}</div>
                </span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="sidebar-footer">
            <div className="api-status">
              <div className="api-dot" style={{
                background: apiOk === null ? '#475569' : apiOk ? '#10b981' : '#ef4444',
                boxShadow: apiOk ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none',
                animation: apiOk === null ? 'pulse 2s infinite' : apiOk ? 'breathe 3s ease infinite' : 'none',
              }} />
              <span>{apiOk === null ? 'Connecting…' : apiOk ? 'API Online' : 'API Offline'}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', fontStyle: 'italic' }}>Team: Runtime Rebels</div>
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────────────── */}
        <main
          className="main-content"
          style={{ height: `calc(100vh - ${totalTop}px)` }}
          key={location.pathname}  /* re-trigger page animation on route change */
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
