import { useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, ResponsiveContainer } from 'recharts';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

/* ── Luminous Labs palette ───────────────────────────────────── */
const C = {
  brand:  '#FF6E8F',
  brand2: '#FF93A5',
  purple: '#c084fc',
  cyan:   '#67e8f9',
  green:  '#34d399',
  amber:  '#fbbf24',
  red:    '#f87171',
  blue:   '#60a5fa',
};

const debtColor  = d => d >= 40 ? C.red : d >= 25 ? C.amber : d >= 15 ? C.purple : C.green;
const flexColor  = f => f <= 0.2 ? C.red : f <= 0.4 ? C.amber : f <= 0.7 ? C.purple : C.green;

const fmtDT = s => s ? new Date(s).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}) : '—';

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-elevated)', border:`1px solid rgba(255,110,143,0.25)`,
      borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'var(--shadow-lg)' }}>
      <div style={{ color:'var(--text-3)', marginBottom:4, fontWeight:600 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color||p.fill, fontWeight:700, fontFamily:'var(--mono)' }}>
          {p.name}: {typeof p.value==='number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
};

function StatCard({ label, value, sub, accent=C.brand, delay=0, icon }) {
  return (
    <div className="stat-card anim-blur-up" style={{ '--card-accent':accent, animationDelay:`${delay}s` }}>
      <div className="stat-label">
        {icon && <span style={{ fontSize:14 }}>{icon}</span>}
        {label}
      </div>
      <div className="stat-value" style={{ color:accent }}>{value??'—'}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function MiniTask({ task, rank }) {
  const debt = task.maintenance_debt ?? 0;
  const pct  = Math.min((debt/60)*100, 100);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0',
      borderBottom:'1px solid var(--border-subtle)' }}>
      <div style={{ width:22, height:22, borderRadius:6, background:'var(--bg-elevated)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:10, fontWeight:800, color:'var(--text-3)', flexShrink:0 }}>{rank}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {task.task_id} — {task.task_type}
        </div>
        <div style={{ fontSize:10.5, color:'var(--text-3)', marginTop:1 }}>{task.section}</div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
        <div style={{ width:60, height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:debtColor(debt), borderRadius:2,
            transition:'width 0.8s var(--ease-snap)' }} />
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:debtColor(debt),
          fontFamily:'var(--mono)', minWidth:28, textAlign:'right' }}>{debt.toFixed(0)}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, loading: sLoad } = useApi(() => api.stats());
  const { data: plan,  loading: pLoad } = useApi(() => api.optimizedPlan().catch(()=>null));
  const { data: tasks, loading: tLoad } = useApi(() => api.tasks());

  if (sLoad||pLoad||tLoad) return (
    <div className="page">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
        {[...Array(8)].map((_,i)=><div key={i} className="stat-card skeleton" style={{ height:90 }}/>)}
      </div>
    </div>
  );

  const s = stats||{};
  const planId = plan?.plan_id||'—';
  // decisions is a dict keyed by task_id
  const decisions = plan?.decisions ? Object.values(plan.decisions) : [];
  const assigns   = (plan?.block_assignments||[]).filter(a =>
    a.combination_details?.combination?.tasks?.length > 0
  );

  const statusData = [
    { name:'Planned',  value:s.planned_tasks   ||0, color:C.green },
    { name:'Deferred', value:s.deferred_tasks  ||0, color:C.amber },
    { name:'Protected',value:s.protected_tasks ||0, color:C.purple },
    { name:'Pending',  value:s.pending_tasks   ||0, color:C.blue },
  ].filter(d=>d.value>0);

  // Block values from assigns
  const blockData = assigns.map(a=>({
    name: a.block_id,
    value: parseFloat((a.combination_details?.combination?.adjusted_value||0).toFixed(1)),
  }));

  // Dept breakdown from tasks
  const deptMap = {};
  (tasks||[]).forEach(t=>{ deptMap[t.department]=(deptMap[t.department]||0)+1; });
  const deptData = Object.entries(deptMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  const DEPT_COLORS = [C.brand,C.purple,C.cyan,C.green,C.amber,C.red];

  const highDebt = [...(tasks||[])].sort((a,b)=>(b.maintenance_debt||0)-(a.maintenance_debt||0)).slice(0,5);
  const lowFlex  = [...(tasks||[])].sort((a,b)=>(a.flexibility_score||0)-(b.flexibility_score||0)).slice(0,5);

  return (
    <div className="page">
      <div className="page-header anim-blur">
        <div className="page-eyebrow">Command Center</div>
        <h1 className="page-title" style={{ background:`linear-gradient(135deg,${C.brand},${C.purple},${C.cyan})`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
          Adaptive Block Planning Dashboard
        </h1>
        <p className="page-subtitle">
          Plan <span style={{ fontFamily:'var(--mono)', color:C.cyan }}>{planId}</span>
          {plan&&<> · {fmtDT(plan.generated_at)}</>} · Synthetic demonstration data
        </p>
      </div>

      <div className="stats-grid">
        <StatCard icon="📋" label="Total Tasks"     value={s.total_tasks}     sub="in planning horizon"  delay={0.00} />
        <StatCard icon="✅" label="Planned"         value={s.planned_tasks}   sub="assigned to blocks"   accent={C.green}  delay={0.05}/>
        <StatCard icon="⟳" label="Deferred"        value={s.deferred_tasks}  sub="rescheduled"          accent={C.amber}  delay={0.10}/>
        <StatCard icon="⊙" label="Protected"       value={s.protected_tasks} sub="look-ahead reserved"  accent={C.purple} delay={0.15}/>
        <StatCard icon="📦" label="Blocks"          value={s.available_blocks}sub="planning windows"     accent={C.cyan}   delay={0.20}/>
        <StatCard icon="🔥" label="Avg Debt"        value={s.avg_maintenance_debt?.toFixed(1)} sub="urgency metric" accent={debtColor(s.avg_maintenance_debt||0)} delay={0.25}/>
        <StatCard icon="⚡" label="High-Debt Tasks" value={s.high_debt_tasks} sub="≥40 debt score"       accent={C.red}    delay={0.30}/>
        <StatCard icon="🛡" label="Low-Flex Tasks"  value={s.low_flexibility_tasks} sub="need protection" accent={C.brand} delay={0.35}/>
      </div>

      <div className="grid-2 mb-6">
        <div className="panel anim-blur-up d2">
          <div className="panel-header">
            <div className="panel-title"><div className="panel-title-dot" style={{ background:C.brand }} />Task Status Distribution</div>
            <span className="badge" style={{ background:`${C.brand}18`, color:C.brand, border:`1px solid ${C.brand}30` }}>{s.total_tasks} tasks</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={52} outerRadius={80} paddingAngle={3} animationBegin={200} animationDuration={900}>
                {statusData.map((d,i)=><Cell key={i} fill={d.color} stroke="transparent"/>)}
              </Pie>
              <Tooltip content={<ChartTip/>}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 16px', marginTop:8 }}>
            {statusData.map(d=>(
              <div key={d.name} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:d.color }}/>
                <span style={{ color:'var(--text-2)' }}>{d.name}</span>
                <span style={{ fontWeight:700, fontFamily:'var(--mono)', color:d.color }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel anim-blur-up d3">
          <div className="panel-header">
            <div className="panel-title"><div className="panel-title-dot" style={{ background:C.purple }} />Block Values (Planned)</div>
            <span className="badge" style={{ background:`${C.purple}18`, color:C.purple, border:`1px solid ${C.purple}30` }}>{blockData.length} active</span>
          </div>
          {blockData.length===0
            ? <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-text">Run optimizer to see block values</div></div>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={blockData} margin={{top:4,right:4,bottom:0,left:-20}} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-3)' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Bar dataKey="value" name="Block Value" radius={[4,4,0,0]}>
                    {blockData.map((d,i)=><Cell key={i} fill={d.value>=0?C.brand:C.red} fillOpacity={0.9}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
        <div className="panel anim-blur-up d3">
          <div className="panel-header"><div className="panel-title"><div className="panel-title-dot" style={{ background:C.cyan }}/>Tasks by Department</div></div>
          {deptData.map((d,i)=>{
            const pct=Math.round((d.value/(s.total_tasks||1))*100);
            return (
              <div key={d.name} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                  <span style={{ color:'var(--text-2)' }}>{d.name}</span>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:DEPT_COLORS[i%DEPT_COLORS.length] }}>{d.value}</span>
                </div>
                <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:DEPT_COLORS[i%DEPT_COLORS.length],
                    borderRadius:3, transition:'width 1s var(--ease-snap)', transitionDelay:`${i*0.07}s` }}/>
                </div>
              </div>
            );
          })}
        </div>
        <div className="panel anim-blur-up d4">
          <div className="panel-header"><div className="panel-title"><div className="panel-title-dot" style={{ background:C.red }}/>🔥 Highest Debt</div><span className="badge badge-gray">top 5</span></div>
          {highDebt.map((t,i)=><MiniTask key={t.task_id} task={t} rank={i+1}/>)}
        </div>
        <div className="panel anim-blur-up d5">
          <div className="panel-header"><div className="panel-title"><div className="panel-title-dot" style={{ background:C.amber }}/>🛡 Lowest Flexibility</div><span className="badge badge-gray">top 5</span></div>
          {lowFlex.map((t,i)=>(
            <div key={t.task_id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border-subtle)' }}>
              <div style={{ width:22, height:22, borderRadius:6, background:'var(--bg-elevated)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:10, fontWeight:800, color:'var(--text-3)', flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {t.task_id} — {t.task_type}</div>
                <div style={{ fontSize:10.5, color:'var(--text-3)', marginTop:1 }}>{t.section}</div>
              </div>
              <div style={{ flexShrink:0, textAlign:'right' }}>
                <div style={{ fontSize:12, fontWeight:800, color:flexColor(t.flexibility_score||0), fontFamily:'var(--mono)' }}>
                  {((t.flexibility_score||0)*100).toFixed(0)}%</div>
                <div style={{ fontSize:10, color:'var(--text-3)' }}>flex</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
