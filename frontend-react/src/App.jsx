import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from './api/client';

const NAV = [
  { to: '/',            icon: '⬛', label: 'Command Center'    },
  { to: '/tasks',       icon: '🔧', label: 'Maintenance Tasks'  },
  { to: '/blocks',      icon: '📦', label: 'Block Explorer'     },
  { to: '/opportunities',icon: '⚡', label: 'Opportunity Engine' },
  { to: '/optimizer',   icon: '🎯', label: 'Plan Optimizer'     },
  { to: '/whatif',      icon: '🔬', label: 'What-If Simulator'  },
];

export default function App() {
  const [apiOk, setApiOk] = useState(null);
  const [banner, setBanner] = useState(true);

  useEffect(() => {
    api.health()
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false));
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      {/* Disclaimer */}
      {banner && (
        <div style={{
          background:'linear-gradient(90deg,rgba(245,158,11,0.12),rgba(239,68,68,0.08))',
          borderBottom:'1px solid rgba(245,158,11,0.25)',
          display:'flex', alignItems:'center', gap:10,
          padding:'7px 20px', fontSize:12, color:'#fde68a', flexShrink:0,
        }}>
          <span>⚠️</span>
          <span style={{ flex:1 }}>PROTOTYPE — SYNTHETIC DEMONSTRATION DATA ONLY. Not connected to live Indian Railways operational systems. | SIH 2026 · PS ID: SIH26027 · Team: Runtime Rebels</span>
          <button onClick={() => setBanner(false)} style={{ color:'#fde68a', opacity:0.7, fontSize:16 }}>✕</button>
        </div>
      )}

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Sidebar */}
        <aside style={{
          width:240, flexShrink:0,
          background:'var(--bg-surface)',
          borderRight:'1px solid var(--border)',
          display:'flex', flexDirection:'column',
          padding:'18px 0',
          height: banner ? 'calc(100vh - 37px)' : '100vh',
          position:'sticky', top: banner ? 37 : 0,
        }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'0 18px 18px', borderBottom:'1px solid var(--border-subtle)', marginBottom:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 0 16px rgba(99,102,241,0.35)', flexShrink:0 }}>🚆</div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, background:'linear-gradient(135deg,#a5b4fc,#c4b5fd)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-0.3px' }}>RAILFUSE</div>
              <div style={{ fontSize:10, color:'var(--text-3)', letterSpacing:'0.4px', marginTop:1 }}>SIH 2026 · SIH26027</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex:1, padding:'0 10px', overflowY:'auto' }}>
            {NAV.map(({ to, icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                style={({ isActive }) => ({
                  display:'flex', alignItems:'center', gap:10,
                  padding:'9px 10px', borderRadius:8,
                  color: isActive ? '#a5b4fc' : 'var(--text-2)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize:13.5,
                  background: isActive ? 'linear-gradient(90deg,rgba(99,102,241,0.18),rgba(139,92,246,0.08))' : 'transparent',
                  marginBottom:2, transition:'all 0.14s ease',
                  borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                  position:'relative',
                })}
              >
                <span style={{ fontSize:15 }}>{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ padding:'14px 18px 0', borderTop:'1px solid var(--border-subtle)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text-3)', marginBottom:4 }}>
              <div style={{
                width:7, height:7, borderRadius:'50%',
                background: apiOk === null ? '#475569' : apiOk ? '#10b981' : '#ef4444',
                boxShadow: apiOk ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none',
                animation: apiOk === null ? 'pulse 2s infinite' : 'none',
              }} />
              {apiOk === null ? 'Connecting…' : apiOk ? 'API Online' : 'API Offline'}
            </div>
            <div style={{ fontSize:11, color:'var(--text-4)', fontStyle:'italic' }}>Team: Runtime Rebels</div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex:1, overflowY:'auto', height: banner ? 'calc(100vh - 37px)' : '100vh' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
