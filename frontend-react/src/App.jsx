import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from './api/client';

const NAV = [
  { to: '/',              icon: '◈', label: 'Command Center',     sub: 'Live overview' },
  { to: '/tasks',         icon: '⊟', label: 'Maintenance Tasks',  sub: '25 tasks' },
  { to: '/blocks',        icon: '▣', label: 'Block Explorer',     sub: '10 windows' },
  { to: '/opportunities', icon: '⬡', label: 'Opportunity Engine', sub: 'Combinations' },
  { to: '/optimizer',     icon: '⊙', label: 'Plan Optimizer',     sub: 'Live re-run' },
  { to: '/whatif',        icon: '⟳', label: 'What-If Simulator',  sub: 'Scenarios' },
];

const TICKER_ITEMS = [
  'Smart India Hackathon 2026',
  'PS ID SIH26027',
  'Team Runtime Rebels',
  'Adaptive Block Planning',
  'Heuristic Optimizer',
  'Deterministic Seed 42',
  'Synthetic Data Only',
  'FastAPI + React',
  '25 Tasks · 10 Blocks',
  '24 Train Movements',
];

function Ticker({ stats }) {
  const items = stats ? [
    `Total Tasks ${stats.total_tasks ?? 25}`,
    `Planned ${stats.planned_tasks ?? 9}`,
    `Deferred ${stats.deferred_tasks ?? 6}`,
    `Blocks ${stats.available_blocks ?? 10}`,
    `Avg Debt ${stats.avg_maintenance_debt?.toFixed(1) ?? '—'}`,
    `High-Debt ${stats.high_debt_tasks ?? 8}`,
    ...TICKER_ITEMS,
  ] : TICKER_ITEMS;

  const tripled = [...items, ...items, ...items];

  return (
    <div className="ob-ticker-wrap">
      <div className="ob-ticker">
        {tripled.map((item, i) => (
          <span key={i} className="ob-ticker-item">
            <span className="ob-ticker-dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [apiOk, setApiOk]   = useState(null);
  const [stats, setStats]   = useState(null);
  const [banner, setBanner] = useState(true);
  const location = useLocation();

  useEffect(() => {
    api.health().then(() => setApiOk(true)).catch(() => setApiOk(false));
    api.stats().then(setStats).catch(() => {});
  }, []);

  const bannerH = banner ? 36 : 0;

  return (
    <div className="app-shell">

      {/* Disclaimer */}
      {banner && (
        <div className="disclaimer-banner" style={{ height: 36 }}>
          <span>⚠</span>
          <span style={{ flex: 1 }}>
            <strong>PROTOTYPE — SYNTHETIC DATA ONLY.</strong> Not connected to live Indian Railways systems. SIH 2026 · PS ID: SIH26027 · Team: Runtime Rebels
          </span>
          <button
            onClick={() => setBanner(false)}
            style={{ color: 'inherit', opacity: 0.6, fontSize: 16, lineHeight: 1,
              transition: 'opacity 0.15s', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.target.style.opacity = 1}
            onMouseLeave={e => e.target.style.opacity = 0.6}
          >✕</button>
        </div>
      )}

      {/* Ticker */}
      <Ticker stats={stats} />

      <div className="app-body">

        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className="sidebar" style={{
          height: `calc(100vh - ${bannerH + 34}px)`,
          position: 'sticky',
          top: bannerH + 34,
        }}>
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🚆</div>
            <div>
              <div className="sidebar-logo-name">RAILFUSE</div>
              <div className="sidebar-logo-sub">SIH 2026 · SIH26027</div>
            </div>
          </div>

          <div className="sidebar-section">Navigation</div>

          {/* Nav */}
          <nav className="sidebar-nav">
            {NAV.map(({ to, icon, label, sub }, i) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-link-item${isActive ? ' active' : ''}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <span className="nav-icon-wrap">{icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 1 }}>{sub}</div>
                </span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="sidebar-footer">
            <div className="api-status">
              <div className="api-dot" style={{
                background: apiOk === null ? '#444' : apiOk ? 'var(--green)' : 'var(--red)',
                animationPlayState: apiOk === null ? 'running' : 'paused',
              }} />
              <span style={{ fontSize: 12 }}>
                {apiOk === null ? 'Connecting…' : apiOk ? 'API Online' : 'API Offline'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 4 }}>Runtime Rebels</div>
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────────── */}
        <main
          className="main-content"
          style={{ height: `calc(100vh - ${bannerH + 34}px)` }}
          key={location.pathname}
        >
          <Outlet />
        </main>

      </div>
    </div>
  );
}
