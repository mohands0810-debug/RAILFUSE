import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, ResponsiveContainer } from 'recharts';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

const C = {
  orange: '#f97316', green: '#22c55e', amber: '#f59e0b',
  red: '#ef4444', blue: '#3b82f6', purple: '#a855f7', cyan: '#06b6d4',
};

const debtColor = d => d >= 40 ? C.red : d >= 25 ? C.amber : d >= 15 ? C.orange : C.green;
const flexColor = f => f <= 0.2 ? C.red : f <= 0.4 ? C.amber : f <= 0.7 ? C.blue : C.green;

const fmtDT = s => s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--border-2)',
      borderRadius: 10, padding: '9px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill || p.color, fontWeight: 700, fontFamily: 'var(--mono)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
};

const DEPT_COLORS = [C.orange, C.blue, C.green, C.amber, C.red, C.purple];

function DebtRow({ task, rank }) {
  const debt = task.maintenance_debt || 0;
  const pct = Math.min((debt / 60) * 100, 100);
  const c = debtColor(debt);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--text-4)',
        flexShrink: 0 }}>{rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.task_id} — {task.task_type}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-4)', marginTop: 1 }}>{task.section}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 60, height: 3, background: 'var(--border-2)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: c, fontFamily: 'var(--mono)', minWidth: 26 }}>
          {debt.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent = C.orange, delay = 0 }) {
  return (
    <div className="stat-card ob-fade-up" style={{ animationDelay: `${delay}s`,
      borderTop: `2px solid ${accent}` }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: accent }}>{value ?? '—'}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, loading: sLoad } = useApi(() => api.stats());
  const { data: plan }                  = useApi(() => api.optimizedPlan().catch(() => null));
  const { data: tasks }                 = useApi(() => api.tasks());

  if (sLoad) return (
    <div className="page">
      <div className="stats-grid">
        {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 90 }} />)}
      </div>
    </div>
  );

  const s = stats || {};
  const planId = plan?.plan_id || '—';
  const decisions = plan?.decisions ? Object.values(plan.decisions) : [];
  const assigns = (plan?.block_assignments || []).filter(
    a => a.combination_details?.combination?.tasks?.length > 0
  );

  const statusData = [
    { name: 'Planned',  value: s.planned_tasks   || 0, color: C.green  },
    { name: 'Deferred', value: s.deferred_tasks  || 0, color: C.amber  },
    { name: 'Protected',value: s.protected_tasks || 0, color: C.purple },
    { name: 'Pending',  value: s.pending_tasks   || 0, color: C.blue   },
  ].filter(d => d.value > 0);

  const blockData = assigns.map(a => ({
    name: a.block_id,
    value: parseFloat((a.combination_details?.combination?.adjusted_value || 0).toFixed(1)),
  }));

  const deptMap = {};
  (tasks || []).forEach(t => { deptMap[t.department] = (deptMap[t.department] || 0) + 1; });
  const deptData = Object.entries(deptMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const highDebt = [...(tasks || [])].sort((a, b) => (b.maintenance_debt || 0) - (a.maintenance_debt || 0)).slice(0, 5);
  const lowFlex  = [...(tasks || [])].sort((a, b) => (a.flexibility_score || 0) - (b.flexibility_score || 0)).slice(0, 5);

  return (
    <div className="page">
      {/* Header */}
      <div className="ob-fade-up">
        <div className="page-eyebrow">Command Center</div>
        <h1 className="page-title">Adaptive Block Planning Dashboard</h1>
        <p className="page-subtitle">
          Plan <span style={{ fontFamily: 'var(--mono)', color: C.orange }}>{planId}</span>
          {plan && <> · {fmtDT(plan.generated_at)}</>} · Synthetic demonstration data only
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard label="Total Tasks"      value={s.total_tasks}           sub="in planning horizon"    accent={C.orange}  delay={0.00} />
        <StatCard label="Planned"          value={s.planned_tasks}         sub="assigned to blocks"     accent={C.green}   delay={0.04} />
        <StatCard label="Deferred"         value={s.deferred_tasks}        sub="rescheduled"            accent={C.amber}   delay={0.08} />
        <StatCard label="Protected"        value={s.protected_tasks}       sub="look-ahead reserved"    accent={C.purple}  delay={0.12} />
        <StatCard label="Blocks"           value={s.available_blocks}      sub="planning windows"       accent={C.blue}    delay={0.16} />
        <StatCard label="Avg Debt"         value={s.avg_maintenance_debt?.toFixed(1)} sub="urgency metric" accent={debtColor(s.avg_maintenance_debt || 0)} delay={0.20} />
        <StatCard label="High-Debt Tasks"  value={s.high_debt_tasks}       sub="debt ≥ 40"              accent={C.red}     delay={0.24} />
        <StatCard label="Low-Flex Tasks"   value={s.low_flexibility_tasks} sub="flexibility ≤ 0.2"      accent={C.orange}  delay={0.28} />
      </div>

      {/* Charts row */}
      <div className="grid-2 mb-6">
        <div className="panel ob-fade-up d2">
          <div className="panel-header">
            <div className="panel-title">
              <div className="panel-dot" />
              Task Status Distribution
            </div>
            <span className="badge badge-orange">{s.total_tasks} tasks</span>
          </div>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={50} outerRadius={76} paddingAngle={3}
                    animationBegin={200} animationDuration={800}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
                {statusData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: d.color }} />
                    <span style={{ color: 'var(--text-3)' }}>{d.name}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--mono)', color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-text">Run the optimizer to see status distribution</div></div>
          )}
        </div>

        <div className="panel ob-fade-up d3">
          <div className="panel-header">
            <div className="panel-title">
              <div className="panel-dot" style={{ background: C.green }} />
              Block Values (Planned)
            </div>
            <span className="badge badge-gray">{blockData.length} blocks</span>
          </div>
          {blockData.length === 0
            ? <div className="empty-state"><div className="empty-icon">📦</div><div className="empty-text">Run optimizer to see block values</div></div>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={blockData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="value" name="Block Value" radius={[3, 3, 0, 0]}>
                    {blockData.map((d, i) => <Cell key={i} fill={d.value >= 0 ? C.orange : C.red} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Bottom 3-col */}
      <div className="grid-3">
        {/* Dept breakdown */}
        <div className="panel ob-fade-up d3">
          <div className="panel-header">
            <div className="panel-title"><div className="panel-dot" style={{ background: C.cyan }} />By Department</div>
          </div>
          {deptData.map((d, i) => {
            const pct = Math.round((d.value / (s.total_tasks || 1)) * 100);
            const c = DEPT_COLORS[i % DEPT_COLORS.length];
            return (
              <div key={d.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: 'var(--text-2)' }}>{d.name}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: c }}>{d.value}</span>
                </div>
                <div style={{ height: 3, background: 'var(--border-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 2,
                    transition: `width 0.8s var(--ease) ${i * 0.06}s` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* High Debt */}
        <div className="panel ob-fade-up d4">
          <div className="panel-header">
            <div className="panel-title"><div className="panel-dot" style={{ background: C.red }} />Highest Debt</div>
            <span className="badge badge-gray">top 5</span>
          </div>
          {highDebt.map((t, i) => <DebtRow key={t.task_id} task={t} rank={i + 1} />)}
        </div>

        {/* Low Flex */}
        <div className="panel ob-fade-up d5">
          <div className="panel-header">
            <div className="panel-title"><div className="panel-dot" style={{ background: C.amber }} />Lowest Flexibility</div>
            <span className="badge badge-gray">top 5</span>
          </div>
          {lowFlex.map((t, i) => {
            const f = t.flexibility_score || 0;
            const c = flexColor(f);
            return (
              <div key={t.task_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--text-4)',
                  flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.task_id} — {t.task_type}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-4)', marginTop: 1 }}>{t.section}</div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: c, fontFamily: 'var(--mono)' }}>
                    {(f * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-5)' }}>flex</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
