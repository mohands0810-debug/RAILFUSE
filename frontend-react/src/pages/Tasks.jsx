import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { debtColor, flexColor, statusColor, statusLabel } from '../components/UI';

const DEPTS = ['All','Track','OHE','Signal','Bridge','Tunnel','Telecom'];
const STATUSES = ['All','PENDING','PLANNED','DEFERRED','REJECTED','PROTECTED'];

function DebtBar({ value }) {
  const pct = Math.min((value / 60) * 100, 100);
  return (
    <div className="debt-bar-wrap">
      <div className="debt-bar-track">
        <div className="debt-bar-fill" style={{ width:`${pct}%`, background:debtColor(value) }} />
      </div>
      <span className="debt-val" style={{ color:debtColor(value) }}>{value.toFixed(0)}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status||'').toUpperCase();
  const cls = { PLANNED:'badge-green', SELECTED:'badge-green', PENDING:'badge-blue',
    DEFERRED:'badge-amber', REJECTED:'badge-red', PROTECTED:'badge-purple' }[s] || 'badge-gray';
  return (
    <span className={`badge ${cls}`}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:'currentColor', display:'inline-block', flexShrink:0 }} />
      {statusLabel(s)}
    </span>
  );
}

function ExpandedRow({ task }) {
  return (
    <div className="accordion-body open expanded-row">
      <div className="accordion-inner">
        <div style={{ padding:'16px 14px 14px 56px',
          background:'linear-gradient(90deg,rgba(99,102,241,0.06),transparent)',
          borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'10px 24px', marginBottom:12 }}>
            {[
              ['Task Type',        task.task_type],
              ['Department',       task.department],
              ['Section',          task.section],
              ['Duration',         `${task.duration_hours}h`],
              ['Priority',         task.priority],
              ['Overdue Days',     task.overdue_days ?? '—'],
              ['Crew Required',    task.crew_required ?? '—'],
              ['Safety Level',     task.safety_criticality_level ?? '—'],
              ['Last Maint.',      task.last_maintenance_date ? new Date(task.last_maintenance_date).toLocaleDateString('en-IN') : '—'],
            ].map(([k,v]) => (
              <div key={k}>
                <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px', color:'var(--text-3)', marginBottom:2 }}>{k}</div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--text-2)' }}>{v}</div>
              </div>
            ))}
          </div>
          {task.description && (
            <div style={{ padding:'10px 12px', background:'rgba(0,0,0,0.25)', borderRadius:8,
              fontSize:12.5, color:'var(--text-2)', lineHeight:1.65, borderLeft:'2px solid var(--border-bright)' }}>
              {task.description}
            </div>
          )}
          <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap' }}>
            {(task.required_equipment || []).map(eq => (
              <span key={eq} className="chip">🔧 {eq}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { data: tasks, loading, error } = useApi(() => api.tasks());
  const [dept,   setDept]   = useState('All');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [sort,   setSort]   = useState('debt_desc');
  const [expanded, setExpanded] = useState(null);

  if (loading) return (
    <div className="page">
      <div className="page-header"><div className="skeleton" style={{ height:32, width:280, marginBottom:8 }} /></div>
      {[...Array(8)].map((_,i) => <div key={i} className="skeleton" style={{ height:52, marginBottom:4, borderRadius:8 }} />)}
    </div>
  );
  if (error) return <div className="page"><div style={{ color:'var(--red)', padding:20 }}>Error: {error}</div></div>;

  let rows = [...(tasks||[])];

  if (dept   !== 'All') rows = rows.filter(t => t.department === dept);
  if (status !== 'All') rows = rows.filter(t => (t.status||'').toUpperCase() === status);
  if (search.trim())    rows = rows.filter(t =>
    t.task_id.toLowerCase().includes(search.toLowerCase()) ||
    (t.task_type||'').toLowerCase().includes(search.toLowerCase()) ||
    (t.section||'').toLowerCase().includes(search.toLowerCase())
  );

  rows.sort((a,b) => {
    if (sort === 'debt_desc') return (b.maintenance_debt||0) - (a.maintenance_debt||0);
    if (sort === 'debt_asc')  return (a.maintenance_debt||0) - (b.maintenance_debt||0);
    if (sort === 'flex_asc')  return (a.flexibility_score||0) - (b.flexibility_score||0);
    if (sort === 'dur_desc')  return (b.duration_hours||0) - (a.duration_hours||0);
    return 0;
  });

  const toggle = id => setExpanded(prev => prev === id ? null : id);

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header anim-blur">
        <div className="page-eyebrow">Planning Engine</div>
        <h1 className="page-title gradient-text">Maintenance Tasks</h1>
        <p className="page-subtitle">
          {rows.length} of {tasks?.length} tasks · sorted by {sort.replace('_',' ')} · click row to expand
        </p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', marginBottom:16 }}>
        {/* Search */}
        <div style={{ position:'relative', flex:'1 1 200px', maxWidth:280 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
            color:'var(--text-3)', fontSize:13, pointerEvents:'none' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search task ID, type, section…"
            style={{ width:'100%', padding:'7px 12px 7px 30px', background:'var(--bg-elevated)',
              border:'1px solid var(--border)', borderRadius:'var(--r-md)', color:'var(--text-1)',
              fontSize:13, transition:'border-color var(--t-fast)', outline:'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--border-bright)'}
            onBlur={e  => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Dept chips */}
        <div className="filter-row" style={{ margin:0 }}>
          {DEPTS.map(d => (
            <button key={d} className={`filter-chip${dept===d?' active':''}`} onClick={() => setDept(d)}>{d}</button>
          ))}
        </div>

        {/* Sort */}
        <select className="rf-select" value={sort} onChange={e => setSort(e.target.value)} style={{ marginLeft:'auto' }}>
          <option value="debt_desc">↓ Debt (highest)</option>
          <option value="debt_asc">↑ Debt (lowest)</option>
          <option value="flex_asc">↑ Flexibility (tightest)</option>
          <option value="dur_desc">↓ Duration (longest)</option>
        </select>
      </div>

      {/* Status chips */}
      <div className="filter-row">
        {STATUSES.map(s => (
          <button key={s} className={`filter-chip${status===s?' active':''}`} onClick={() => setStatus(s)}>{s}</button>
        ))}
      </div>

      {/* Table */}
      <div className="panel" style={{ padding:0, overflow:'hidden' }}>
        <table className="rf-table">
          <thead>
            <tr>
              <th style={{ width:28 }}></th>
              <th>Task ID</th>
              <th>Type</th>
              <th>Department</th>
              <th>Section</th>
              <th>Duration</th>
              <th>Debt Score</th>
              <th>Flexibility</th>
              <th>Status</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={10}>
                <div className="empty-state"><div className="empty-icon">🔍</div><div className="empty-text">No tasks match filters</div></div>
              </td></tr>
            )}
            {rows.map((t, i) => {
              const isOpen = expanded === t.task_id;
              return [
                <tr
                  key={t.task_id}
                  className={isOpen ? 'expanded' : ''}
                  onClick={() => toggle(t.task_id)}
                  style={{ animationDelay:`${Math.min(i*0.02,0.3)}s` }}
                >
                  <td style={{ textAlign:'center' }}>
                    <span style={{ fontSize:12, color:'var(--text-3)',
                      display:'inline-block', transition:'transform 0.3s var(--ease-snap)',
                      transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                  </td>
                  <td><span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:'var(--accent)' }}>{t.task_id}</span></td>
                  <td><span style={{ fontSize:12.5, fontWeight:500 }}>{t.task_type}</span></td>
                  <td><span className="chip">{t.department}</span></td>
                  <td><span style={{ fontSize:12, color:'var(--text-2)' }}>{t.section}</span></td>
                  <td><span style={{ fontFamily:'var(--mono)', fontSize:12 }}>{t.duration_hours}h</span></td>
                  <td><DebtBar value={t.maintenance_debt||0} /></td>
                  <td>
                    <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700,
                      color:flexColor(t.flexibility_score||0) }}>
                      {((t.flexibility_score||0)*100).toFixed(0)}%
                    </span>
                  </td>
                  <td><StatusBadge status={t.status||'PENDING'} /></td>
                  <td>
                    <span className={`badge ${t.priority==='CRITICAL'?'badge-red':t.priority==='HIGH'?'badge-amber':t.priority==='MEDIUM'?'badge-blue':'badge-gray'}`}>
                      {t.priority}
                    </span>
                  </td>
                </tr>,
                isOpen && (
                  <tr key={`${t.task_id}_exp`}>
                    <td colSpan={10} style={{ padding:0 }}>
                      <ExpandedRow task={t} />
                    </td>
                  </tr>
                )
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
