/* Shared UI Components — RAILFUSE */
import styles from './UI.module.css';

// ── Helpers ──────────────────────────────────────────────────
export const debtColor = d => d >= 40 ? '#ef4444' : d >= 25 ? '#f59e0b' : d >= 15 ? '#8b5cf6' : '#06b6d4';
export const debtLabel = d => d >= 40 ? 'Critical' : d >= 25 ? 'High' : d >= 15 ? 'Moderate' : 'Low';
export const flexColor  = f => f <= 0.2 ? '#ef4444' : f <= 0.4 ? '#f59e0b' : f <= 0.7 ? '#8b5cf6' : '#10b981';
export const statusColor = s => ({
  SELECTED:'#10b981', PLANNED:'#10b981', PENDING:'#3b82f6',
  DEFERRED:'#f59e0b', REJECTED:'#ef4444', PROTECTED:'#8b5cf6',
}[s?.toUpperCase()] || '#475569');

export const statusLabel = s => ({
  SELECTED:'✓ Planned', PLANNED:'✓ Planned', PENDING:'◌ Pending',
  DEFERRED:'⟳ Deferred', REJECTED:'✕ Rejected', PROTECTED:'⊙ Protected',
}[s?.toUpperCase()] || s);

export const fmtDT = iso => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) + ' ' +
         d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false});
};
export const fmtDate = iso => { if(!iso) return '—'; return new Date(iso).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}); };

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 32 }) {
  return <div style={{
    width: size, height: size, borderRadius: '50%',
    border: '2.5px solid rgba(99,102,241,0.2)',
    borderTopColor: '#6366f1',
    animation: 'spin 0.75s linear infinite',
  }} />;
}

// ── Loading ───────────────────────────────────────────────────
export function Loading({ text = 'Loading…' }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 24px', gap:16 }}>
      <Spinner size={36} />
      <span style={{ color:'var(--text-3)', fontSize:14 }}>{text}</span>
    </div>
  );
}

// ── Error ─────────────────────────────────────────────────────
export function ErrorBox({ message }) {
  return (
    <div style={{ padding:'12px 16px', borderRadius:8, background:'var(--red-bg)', border:'1px solid rgba(239,68,68,0.25)', color:'#fca5a5', fontSize:13, display:'flex', gap:10, alignItems:'flex-start', margin:'8px 0' }}>
      <span>⚠</span><span>{message}</span>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ children, color = '#6366f1' }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center',
      fontSize:11, fontWeight:700,
      padding:'3px 10px', borderRadius:20,
      background: color + '22',
      color,
      whiteSpace:'nowrap',
    }}>{children}</span>
  );
}

export function StatusBadge({ status }) {
  const c = statusColor(status);
  return <Badge color={c}>{statusLabel(status)}</Badge>;
}

// ── Progress Bar ──────────────────────────────────────────────
export function Bar({ value, max = 1, color = '#6366f1', height = 5 }) {
  const pct = Math.min(100, (value / (max || 1)) * 100);
  return (
    <div style={{ width:'100%', background:'rgba(255,255,255,0.06)', borderRadius:4, height, overflow:'hidden' }}>
      <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4, transition:'width 0.5s ease' }} />
    </div>
  );
}

export function DebtBar({ debt }) {
  return <Bar value={debt} max={60} color={debtColor(debt)} />;
}

// ── Stat Card ─────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'var(--text-1)', icon }) {
  return (
    <div style={{
      background:'var(--bg-card)', border:'1px solid var(--border)',
      borderRadius:'var(--r-md)', padding:'18px 20px',
      position:'relative', overflow:'hidden',
      transition:'transform 0.15s ease, border-color 0.15s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor='var(--border-bright)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.borderColor='var(--border)'; }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,#6366f1,#8b5cf6)', opacity:0.4 }} />
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
        {icon && <span>{icon}</span>}{label}
      </div>
      <div style={{ fontSize:28, fontWeight:800, lineHeight:1, color, fontVariantNumeric:'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:'var(--text-3)', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, title, badge, style }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:'20px 22px', ...style }}>
      {title && (
        <div style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
          {title}
          {badge && <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:12, background:'rgba(99,102,241,0.15)', color:'#818cf8' }}>{badge}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────
export function Table({ heads, rows, onRowClick }) {
  return (
    <div style={{ overflowX:'auto', borderRadius:8 }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr>
            {heads.map((h,i) => (
              <th key={i} style={{ background:'var(--bg-elevated)', padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:'var(--text-3)', whiteSpace:'nowrap', borderBottom:'1px solid var(--border)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}
              onClick={() => onRowClick?.(row, ri)}
              style={{ borderBottom:'1px solid var(--border-subtle)', cursor: onRowClick ? 'pointer' : 'default', transition:'background 0.12s ease' }}
              onMouseEnter={e => onRowClick && (e.currentTarget.style.background='rgba(99,102,241,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background='')}
            >
              {row.cells.map((cell, ci) => (
                <td key={ci} style={{ padding:'10px 14px', color:'var(--text-2)', verticalAlign:'middle', ...row.cellStyles?.[ci] }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Reasoning Box ─────────────────────────────────────────────
export function ReasoningBox({ text, label = '🤖 Algorithm Explanation' }) {
  if (!text) return null;
  return (
    <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.18)', borderLeft:'3px solid #6366f1', borderRadius:8, padding:'12px 14px', fontSize:13, lineHeight:1.7, color:'var(--text-2)', marginTop:12 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#818cf8', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>{label}</div>
      {text}
    </div>
  );
}

// ── Btn ───────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, loading: isLoading, id }) {
  const base = {
    display:'inline-flex', alignItems:'center', gap:7,
    borderRadius:8, fontWeight:600, border:'1px solid transparent',
    transition:'all 0.15s ease', cursor:'pointer',
    padding: size === 'sm' ? '6px 12px' : '9px 18px',
    fontSize: size === 'sm' ? 12 : 13,
    opacity: disabled || isLoading ? 0.55 : 1,
    pointerEvents: disabled || isLoading ? 'none' : 'auto',
  };
  const variants = {
    primary: { background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', boxShadow:'0 0 20px rgba(99,102,241,0.25)' },
    secondary: { background:'var(--bg-elevated)', borderColor:'var(--border)', color:'var(--text-2)' },
    danger: { background:'var(--red-bg)', borderColor:'rgba(239,68,68,0.3)', color:'var(--red)' },
  };
  return (
    <button id={id} style={{ ...base, ...variants[variant] }} onClick={onClick}
      onMouseEnter={e => { if(variant==='primary') { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(99,102,241,0.4)'; }}}
      onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=variants[variant].boxShadow||''; }}
    >
      {isLoading && <Spinner size={14} />}
      {children}
    </button>
  );
}

// ── Tag ───────────────────────────────────────────────────────
export function Tag({ children }) {
  return <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:600, background:'rgba(99,102,241,0.12)', color:'#818cf8', padding:'3px 8px', borderRadius:4, display:'inline-block' }}>{children}</span>;
}

// ── Empty ─────────────────────────────────────────────────────
export function Empty({ icon = '📭', msg, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-3)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:15, color:'var(--text-2)', marginBottom:6 }}>{msg}</div>
      {sub && <div style={{ fontSize:13 }}>{sub}</div>}
    </div>
  );
}

// ── Alert ─────────────────────────────────────────────────────
export function Alert({ type = 'info', children }) {
  const c = { info:'#3b82f6', success:'#10b981', warning:'#f59e0b', error:'#ef4444' }[type];
  return (
    <div style={{ padding:'12px 16px', borderRadius:8, background:c+'18', border:`1px solid ${c}30`, color:c+'ee', fontSize:13, display:'flex', gap:10, alignItems:'flex-start', margin:'8px 0' }}>
      {children}
    </div>
  );
}

// ── SeverityBadge ─────────────────────────────────────────────
export function SeverityBadge({ s }) {
  const c = s >= 5 ? '#ef4444' : s >= 4 ? '#f59e0b' : s >= 3 ? '#8b5cf6' : '#06b6d4';
  return <Badge color={c}>{s}/5</Badge>;
}
