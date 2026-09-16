import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from './api/client';

const NAV_GROUPS = [
  {
    section: 'Core',
    items: [
      { to: '/',              icon: '◈', label: 'Command Center',     sub: 'Live overview' },
      { to: '/tasks',         icon: '⊟', label: 'Maintenance Tasks',  sub: '25 tasks' },
      { to: '/blocks',        icon: '▣', label: 'Block Explorer',     sub: '10 windows' },
    ],
  },
  {
    section: 'Optimization',
    items: [
      { to: '/opportunities', icon: '⬡', label: 'Opportunity Engine', sub: 'Combinations' },
      { to: '/optimizer',     icon: '⊙', label: 'Plan Optimizer',     sub: 'Live re-run' },
    ],
  },
  {
    section: 'Scenarios',
    items: [
      { to: '/whatif',        icon: '⟳', label: 'What-If Simulator',  sub: 'Field overrides' },
      { to: '/replan',        icon: '⚡', label: 'Dynamic Re-planning', sub: 'Inject & adapt' },
    ],
  },
  {
    section: 'Planning',
    items: [
      { to: '/weekly',  icon: '📅', label: 'Weekly Horizon',  sub: '7-day view' },
      { to: '/monthly', icon: '📆', label: 'Monthly Horizon', sub: '30-day view' },
    ],
  },
];


function Ticker({ trains }) {
  // Build dynamic train alert items from live data
  const trainItems = (trains || []).slice(0, 12).map(t => {
    const status = t.operational_status || 'ON_TIME';
    const icon = status === 'DELAYED' ? '⚠️' : status === 'CANCELLED' ? '🚫' : '🚂';
    return `${icon} ${t.train_name} (${t.train_id}) · ${t.section} · Dep ${t.departure_time?.slice(11,16)} · ${status.replace('_',' ')}`;
  });

  const fallbackItems = [
    '🚂 12001 Bhopal Rajdhani · DLI-MTJ · Dep 20:25 · ON TIME',
    '🚂 22691 Rajdhani Express · SBC-YPR · Dep 21:00 · ON TIME',
    '🚂 12028 KSR Bengaluru Shatabdi · MAS-SBC · Dep 05:30 · ON TIME',
    '⚠️ 12006 Kalka Mail DN · DLI-MTJ · 02:00–01:55 · CONFLICT WINDOW',
    '🚂 12657 KSR Bengaluru Express · SBC-MAS · Dep 23:30 · ON TIME',
    '🚂 12210 Garib Rath · MTJ-GWL · Dep 03:00 · ON TIME',
    '⚠️ 16022 Kaveri Express · SBC-MYS · 01:30–02:00 · CONFLICT WINDOW',
    '🚂 12028 Shatabdi · AGB-JHS · Dep 22:00 · ON TIME',
    '🚂 12658 Chennai Express · MAS-SBC · Dep 07:00 · ON TIME',
    '🚂 22415 Andhra Pradesh AC · DLI-CNB · Dep 21:25 · ON TIME',
    '⚠️ Safety Buffer: 10 min enforced around all train windows',
    '🟠 Block BLK001: DLI-MTJ · 02:00–03:30 · Engineering Block Active',
    '🟠 Block BLK007: SBC-MYS · 01:00–03:00 · Engineering Block Active',
    '🔵 24 active train movements tracked across all corridors',
  ];

  const items = trainItems.length >= 6 ? trainItems : fallbackItems;
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
  const [trains, setTrains] = useState(null);
  const [banner, setBanner] = useState(true);
  const location = useLocation();

  useEffect(() => {
    api.trains().then(setTrains).catch(() => {});
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
      <Ticker trains={trains} />

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
            {NAV_GROUPS.map(({ section, items }) => (
              <div key={section}>
                <div className="sidebar-section">{section}</div>
                {items.map(({ to, icon, label, sub }, i) => (
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
              </div>
            ))}
          </nav>

          {/* Footer — team only, no API status */}
          <div className="sidebar-footer">
            <div style={{ fontSize: 11, color: 'var(--text-5)' }}>Runtime Rebels · SIH 2026</div>
            <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 2 }}>PS ID: SIH26027</div>
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
