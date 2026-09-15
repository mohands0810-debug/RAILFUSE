import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, ResponsiveContainer, Legend } from 'recharts';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { StatCard, Card, Loading, ErrorBox, DebtBar, Bar as ProgressBar, debtColor, flexColor, StatusBadge, fmtDT, Tag } from '../components/UI';

const PAGE = { padding:'28px 32px', maxWidth:1400, animation:'fadeUp 0.25s ease' };
const H1   = { fontSize:24, fontWeight:800, background:'linear-gradient(135deg,#f1f5f9,#94a3b8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-0.5px', marginBottom:4 };
const SUB  = { fontSize:14, color:'var(--text-3)' };
const GRID = { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:16, marginBottom:28 };
const TWO  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 };

export default function Dashboard() {
  const { data: stats, loading: sLoad, error: sErr } = useApi(() => api.stats());
  const { data: plan,  loading: pLoad, error: pErr  } = useApi(() => api.optimizedPlan().catch(() => null));

  if (sLoad || pLoad) return <div style={PAGE}><Loading text="Loading command center…" /></div>;
  if (sErr) return <div style={PAGE}><ErrorBox message={sErr} /></div>;

  const s = stats;
  const summary = plan?.summary || {};
  const planId = plan?.plan_id || '—';

  // Status chart data
  const statusData = [
    { name: 'Planned',   value: s.planned_tasks,   color: '#10b981' },
    { name: 'Deferred',  value: s.deferred_tasks,  color: '#f59e0b' },
    { name: 'Protected', value: s.protected_tasks, color: '#8b5cf6' },
    { name: 'Pending',   value: s.pending_tasks,   color: '#3b82f6' },
  ].filter(d => d.value > 0);

  // Block value chart
  const blockData = (plan?.block_assignments || [])
    .filter(b => b.selected_tasks.length > 0)
    .map(b => ({ name: b.block_id, value: parseFloat(b.block_value.toFixed(1)), zp: b.zero_possession }));

  return (
    <div style={PAGE}>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={H1}>🚆 Command Center</h1>
        <p style={SUB}>Plan: <span style={{ fontFamily:'var(--mono)', color:'var(--accent)' }}>{planId}</span> · Generated: {plan ? fmtDT(plan.generated_at) : '—'}</p>
      </div>

      {/* Stat Cards */}
      <div style={GRID}>
        <StatCard icon="📋" label="Total Tasks"       value={s.total_tasks}           sub="in planning horizon"     />
        <StatCard icon="✅" label="Planned"           value={s.planned_tasks}         sub="assigned to blocks"      color="var(--green)"  />
        <StatCard icon="⟳" label="Deferred"          value={s.deferred_tasks}        sub="rescheduled"             color="var(--amber)"  />
        <StatCard icon="⊙" label="Protected"         value={s.protected_tasks}       sub="look-ahead reserved"     color="var(--purple)" />
        <StatCard icon="📦" label="Blocks Available"  value={s.available_blocks}      sub="planning windows"        color="var(--cyan)"   />
        <StatCard icon="⚠" label="Avg Debt Score"    value={s.avg_maintenance_debt?.toFixed(1)}  sub="urgency metric" color={debtColor(s.avg_maintenance_debt)}/>
        <StatCard icon="📈" label="Block Utilisation" value={`${s.block_utilization_pct?.toFixed(1)}%`} sub="capacity used" />
        <StatCard icon="🚂" label="Train Movements"   value={s.train_movements_total} sub="conflict-checked"        />
      </div>

      <div style={TWO}>
        {/* Pie Chart */}
        <Card title="📊 Task Status Distribution" badge={`${s.total_tasks} tasks`}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-1)', fontSize:12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Metrics */}
        <Card title="🎯 Optimization Metrics" badge="live">
          {[
            { label:'Avg Flexibility Score',   val: s.avg_flexibility_score?.toFixed(3),   bar: <ProgressBar value={s.avg_flexibility_score||0} max={1} color={flexColor(s.avg_flexibility_score||0)} /> },
            { label:'Zero-Possession Blocks',  val: summary.zero_possession_blocks ?? '—', bar: <ProgressBar value={summary.zero_possession_blocks||0} max={s.available_blocks} color="#10b981" /> },
            { label:'Total Block Value',       val: summary.total_block_value?.toFixed(1) ?? '—', bar: null },
            { label:'Avg Block Utilisation',   val: `${summary.avg_block_utilization ?? 0}%`, bar: <ProgressBar value={summary.avg_block_utilization||0} max={100} color="#6366f1" /> },
          ].map(m => (
            <div key={m.label} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                <span style={{ color:'var(--text-2)', fontWeight:600 }}>{m.label}</span>
                <span style={{ fontFamily:'var(--mono)', color:'var(--text-1)', fontWeight:700 }}>{m.val}</span>
              </div>
              {m.bar}
            </div>
          ))}
        </Card>
      </div>

      {/* Block Value Chart */}
      {blockData.length > 0 && (
        <Card title="📦 Block Value by Assignment" badge={`${blockData.length} blocks`} style={{ marginBottom:20 }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={blockData} margin={{ top:5, right:5, bottom:5, left:0 }}>
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'#475569' }} />
              <YAxis tick={{ fontSize:11, fill:'#475569' }} />
              <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-1)', fontSize:12 }} />
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {blockData.map((e,i) => <Cell key={i} fill={e.zp ? '#10b981' : '#6366f1'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', gap:16, fontSize:11, color:'var(--text-3)', marginTop:8 }}>
            <span>🟢 Zero possession</span><span>🔵 Additional possession</span>
          </div>
        </Card>
      )}

      {/* High Debt + Low Flex */}
      <div style={TWO}>
        <HighDebtList stats={s} />
        <LowFlexList stats={s} />
      </div>
    </div>
  );
}

function HighDebtList({ stats }) {
  const { data: tasks, loading, error } = useApi(() => api.tasks({ min_severity: 4 }));
  const sorted = (tasks || []).filter(t => t.maintenance_debt >= 25).sort((a,b) => b.maintenance_debt - a.maintenance_debt).slice(0,6);
  return (
    <Card title={`⚠️ High Debt Tasks`} badge={`${stats.high_debt_tasks} critical`}>
      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : !sorted.length ? <div style={{color:'var(--text-3)',fontSize:13}}>No critical debt tasks ✅</div> :
        sorted.map(t => (
          <div key={t.task_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-subtle)' }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600, color:'var(--accent)', minWidth:50 }}>{t.task_id}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.task_type}</div>
              <div style={{ fontSize:11, color:'var(--text-3)' }}>{t.section} · {t.department}</div>
            </div>
            <div style={{ minWidth:80 }}><DebtBar debt={t.maintenance_debt} /></div>
            <span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:12, color:debtColor(t.maintenance_debt), minWidth:28 }}>{t.maintenance_debt.toFixed(0)}</span>
          </div>
        ))}
    </Card>
  );
}

function LowFlexList({ stats }) {
  const { data: tasks, loading, error } = useApi(() => api.tasks());
  const sorted = (tasks || []).filter(t => t.flexibility_score <= 0.3).sort((a,b) => a.flexibility_score - b.flexibility_score).slice(0,6);
  return (
    <Card title="🔒 Low Flexibility Tasks" badge={`${stats.low_flexibility_tasks} at risk`}>
      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : !sorted.length ? <div style={{color:'var(--text-3)',fontSize:13}}>No low-flexibility tasks ✅</div> :
        sorted.map(t => (
          <div key={t.task_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-subtle)' }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600, color:'var(--accent)', minWidth:50 }}>{t.task_id}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.task_type}</div>
              <div style={{ fontSize:11, color:'var(--text-3)' }}>{t.section} · {t.department}</div>
            </div>
            <ProgressBar value={t.flexibility_score} max={1} color={flexColor(t.flexibility_score)} />
            <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:flexColor(t.flexibility_score), minWidth:32 }}>{t.flexibility_score.toFixed(2)}</span>
          </div>
        ))}
    </Card>
  );
}
