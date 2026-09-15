import { useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, ResponsiveContainer, Sector } from 'recharts';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { debtColor, flexColor, statusColor, statusLabel } from '../components/UI';

/* ── helpers ─────────────────────────────────────────────────── */
const fmtDT = s => s ? new Date(s).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' }) : '—';

/* ── custom tooltip ──────────────────────────────────────────── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10,
      padding:'10px 14px', fontSize:12, boxShadow:'var(--shadow-lg)' }}>
      <div style={{ color:'var(--text-3)', marginBottom:4, fontWeight:600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill, fontWeight:700, fontFamily:'var(--mono)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
};

/* ── stat card ───────────────────────────────────────────────── */
function StatCard({ label, value, sub, accent = 'var(--brand)', delay = 0, icon }) {
  return (
    <div className="stat-card anim-blur-up" style={{ '--card-accent': accent, '--card-glow': accent.replace(')', ',0.07)').replace('rgb', 'rgba'), animationDelay: `${delay}s` }}>
      <div className="stat-label">
        {icon && <span style={{ fontSize:14 }}>{icon}</span>}
        {label}
      </div>
      <div className="stat-value" style={{ color: accent }}>{value ?? '—'}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

/* ── mini task row ───────────────────────────────────────────── */
function MiniTask({ task, rank }) {
  const debt = task.maintenance_debt ?? 0;
  const pct  = Math.min((debt / 60) * 100, 100);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0',
      borderBottom:'1px solid var(--border-subtle)', transition:'background var(--t-fast)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ width:22, height:22, borderRadius:6, background:'var(--bg-elevated)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:10, fontWeight:800, color:'var(--text-3)', flexShrink:0 }}>
        {rank}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, truncate:true, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {task.task_id} — {task.task_type}
        </div>
        <div style={{ fontSize:10.5, color:'var(--text-3)', marginTop:1 }}>{task.section}</div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
        <div style={{ width:60, height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:debtColor(debt), borderRadius:2,
            transition:'width 0.8s var(--ease-snap)' }} />
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:debtColor(debt), fontFamily:'var(--mono)', minWidth:28, textAlign:'right' }}>
          {debt.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

/* ── section header ──────────────────────────────────────────── */
function SectionHead({ children, badge }) {
  return (
    <div className="panel-header">
      <div className="panel-title">
        <div className="panel-title-dot" />
        {children}
      </div>
      {badge && <span className="badge badge-gray">{badge}</span>}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, loading: sLoad } = useApi(() => api.stats());
  const { data: plan,  loading: pLoad  } = useApi(() => api.optimizedPlan().catch(() => null));
  const { data: tasks, loading: tLoad  } = useApi(() => api.tasks());

  if (sLoad || pLoad || tLoad) return (
    <div className="page">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
        {[...Array(8)].map((_,i) => (
          <div key={i} className="stat-card skeleton" style={{ height:90 }} />
        ))}
      </div>
    </div>
  );

  const s = stats || {};
  const planId = plan?.plan_id || '—';
  const assignments = plan?.block_assignments || [];

  const statusData = [
    { name:'Planned',  value: s.planned_tasks   || 0, color:'#10b981' },
    { name:'Deferred', value: s.deferred_tasks  || 0, color:'#f59e0b' },
    { name:'Protected',value: s.protected_tasks || 0, color:'#8b5cf6' },
    { name:'Pending',  value: s.pending_tasks   || 0, color:'#3b82f6' },
  ].filter(d => d.value > 0);

  const blockData = assignments
    .filter(b => (b.selected_tasks || []).length > 0)
    .map(b => ({ name: b.block_id, value: parseFloat((b.block_value||0).toFixed(1)), tasks: (b.selected_tasks||[]).length }));

  // Dept breakdown
  const deptMap = {};
  (tasks || []).forEach(t => {
    deptMap[t.department] = (deptMap[t.department]||0) + 1;
  });
  const deptData = Object.entries(deptMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a,b) => b.value - a.value);

  const DEPT_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];

  // High-debt tasks
  const highDebt = [...(tasks||[])].sort((a,b) => (b.maintenance_debt||0)-(a.maintenance_debt||0)).slice(0,5);
  // Low-flex tasks
  const lowFlex  = [...(tasks||[])].sort((a,b) => (a.flexibility_score||0)-(b.flexibility_score||0)).slice(0,5);

  return (
    <div className="page">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="page-header anim-blur">
        <div className="page-eyebrow">Command Center</div>
        <h1 className="page-title gradient-text">Adaptive Block Planning Dashboard</h1>
        <p className="page-subtitle">
          Plan <span style={{ fontFamily:'var(--mono)', color:'var(--accent)' }}>{planId}</span>
          {plan && <> · Generated: {fmtDT(plan.generated_at)}</>}
           · Real-time optimization intelligence · Synthetic demonstration data
        </p>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────── */}
      <div className="stats-grid">
        <StatCard icon="📋" label="Total Tasks"      value={s.total_tasks}      sub="in planning horizon"  delay={0.00} />
        <StatCard icon="✅" label="Planned"          value={s.planned_tasks}    sub="assigned to blocks"   accent="var(--green)"  delay={0.05} />
        <StatCard icon="⟳" label="Deferred"         value={s.deferred_tasks}   sub="rescheduled"          accent="var(--amber)"  delay={0.10} />
        <StatCard icon="⊙" label="Protected"        value={s.protected_tasks}  sub="look-ahead reserved"  accent="var(--purple)" delay={0.15} />
        <StatCard icon="📦" label="Blocks"           value={s.available_blocks} sub="planning windows"     accent="var(--cyan)"   delay={0.20} />
        <StatCard icon="🔥" label="Avg Debt Score"  value={s.avg_maintenance_debt?.toFixed(1)} sub="urgency metric" accent={debtColor(s.avg_maintenance_debt||0)} delay={0.25} />
        <StatCard icon="⚡" label="High-Debt Tasks" value={s.high_debt_tasks}  sub="≥40 debt score"       accent="var(--red)"    delay={0.30} />
        <StatCard icon="🛡" label="Low-Flex Tasks"  value={s.low_flexibility_tasks} sub="need protection" accent="var(--brand)"  delay={0.35} />
      </div>

      {/* ── Charts Row ──────────────────────────────────────── */}
      <div className="grid-2 mb-6">

        {/* Pie: Task Status */}
        <div className="panel anim-blur-up d2">
          <SectionHead badge={`${s.total_tasks} tasks`}>Task Status Distribution</SectionHead>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={52} outerRadius={80} paddingAngle={3}
                animationBegin={200} animationDuration={800}>
                {statusData.map((d, i) => (
                  <Cell key={i} fill={d.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 16px', marginTop:8 }}>
            {statusData.map(d => (
              <div key={d.name} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:d.color, flexShrink:0 }} />
                <span style={{ color:'var(--text-2)' }}>{d.name}</span>
                <span style={{ fontWeight:700, fontFamily:'var(--mono)', color:d.color }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar: Block Values */}
        <div className="panel anim-blur-up d3">
          <SectionHead badge={`${blockData.length} active`}>Block Values (Planned Only)</SectionHead>
          {blockData.length === 0
            ? <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-text">Run optimizer to see block values</div></div>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={blockData} margin={{ top:4, right:4, bottom:0, left:-20 }}
                  barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="value" name="Block Value" radius={[4,4,0,0]}>
                    {blockData.map((d, i) => (
                      <Cell key={i} fill={d.value >= 0 ? '#6366f1' : '#ef4444'}
                        fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* ── Dept Breakdown + High Debt + Low Flex ─────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>

        {/* Dept bar */}
        <div className="panel anim-blur-up d3">
          <SectionHead>Tasks by Department</SectionHead>
          {deptData.map((d, i) => {
            const pct = Math.round((d.value / (s.total_tasks||1)) * 100);
            return (
              <div key={d.name} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                  <span style={{ color:'var(--text-2)' }}>{d.name}</span>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:DEPT_COLORS[i % DEPT_COLORS.length] }}>{d.value}</span>
                </div>
                <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:DEPT_COLORS[i % DEPT_COLORS.length],
                    borderRadius:3, transition:'width 1s var(--ease-snap)', transitionDelay:`${i*0.07}s` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* High Debt */}
        <div className="panel anim-blur-up d4">
          <SectionHead badge="top 5">🔥 Highest Debt Tasks</SectionHead>
          {highDebt.map((t, i) => <MiniTask key={t.task_id} task={t} rank={i+1} />)}
        </div>

        {/* Low Flex */}
        <div className="panel anim-blur-up d5">
          <SectionHead badge="top 5">🛡 Lowest Flexibility Tasks</SectionHead>
          {lowFlex.map((t, i) => (
            <div key={t.task_id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0',
              borderBottom:'1px solid var(--border-subtle)' }}>
              <div style={{ width:22, height:22, borderRadius:6, background:'var(--bg-elevated)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:10, fontWeight:800, color:'var(--text-3)', flexShrink:0 }}>
                {i+1}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {t.task_id} — {t.task_type}
                </div>
                <div style={{ fontSize:10.5, color:'var(--text-3)', marginTop:1 }}>{t.section}</div>
              </div>
              <div style={{ flexShrink:0, textAlign:'right' }}>
                <div style={{ fontSize:12, fontWeight:800, color:flexColor(t.flexibility_score||0), fontFamily:'var(--mono)' }}>
                  {((t.flexibility_score||0)*100).toFixed(0)}%
                </div>
                <div style={{ fontSize:10, color:'var(--text-3)' }}>flex</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
