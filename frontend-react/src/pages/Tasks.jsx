import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

/* Real field names from API:
   task_id, task_type, department, section, duration (minutes), severity,
   criticality, due_date, days_overdue, previous_deferrals, maintenance_debt,
   flexibility_score, required_resources[], compatible_departments[],
   safety_requirements[], preferred_time_window, status, notes,
   asset_id, asset_type, corridor, location
*/

const C = {
  brand:'#FF6E8F', brand2:'#FF93A5', purple:'#c084fc',
  cyan:'#67e8f9', green:'#34d399', amber:'#fbbf24', red:'#f87171', blue:'#60a5fa',
};
const debtColor  = d => d>=40?C.red:d>=25?C.amber:d>=15?C.purple:C.green;
const flexColor  = f => f<=0.2?C.red:f<=0.4?C.amber:f<=0.7?C.purple:C.green;

const DEPTS   = ['All','Engineering','TRD','S&T','Civil','Telecom'];
const STATUSES= ['All','PENDING','SELECTED','DEFERRED','REJECTED','PROTECTED'];

function DebtBar({ value }) {
  const pct = Math.min((value/60)*100, 100);
  return (
    <div className="debt-bar-wrap">
      <div className="debt-bar-track">
        <div className="debt-bar-fill" style={{ width:`${pct}%`, background:debtColor(value) }}/>
      </div>
      <span className="debt-val" style={{ color:debtColor(value) }}>{value.toFixed(0)}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const s=(status||'').toUpperCase();
  const map={SELECTED:'badge-green',PLANNED:'badge-green',PENDING:'badge-blue',
    DEFERRED:'badge-amber',REJECTED:'badge-red',PROTECTED:'badge-purple'};
  return (
    <span className={`badge ${map[s]||'badge-gray'}`}>
      <span style={{ width:5,height:5,borderRadius:'50%',background:'currentColor',display:'inline-block',flexShrink:0 }}/>
      {s}
    </span>
  );
}

function PriorityBadge({ severity, criticality }) {
  const score = Math.max(severity||0, criticality||0);
  if (score>=5) return <span className="badge badge-red">CRITICAL</span>;
  if (score>=4) return <span className="badge badge-amber">HIGH</span>;
  if (score>=3) return <span className="badge badge-blue">MEDIUM</span>;
  return <span className="badge badge-gray">LOW</span>;
}

function ExpandedRow({ task }) {
  const durH = task.duration ? (task.duration/60).toFixed(1)+'h' : '—';
  return (
    <div style={{ padding:'16px 14px 14px 50px',
      background:'linear-gradient(90deg,rgba(255,110,143,0.05),transparent)',
      borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:'10px 24px', marginBottom:14 }}>
        {[
          ['Task Type',         task.task_type],
          ['Asset ID',          task.asset_id],
          ['Asset Type',        task.asset_type],
          ['Corridor',          task.corridor],
          ['Location',          task.location],
          ['Department',        task.department],
          ['Section',           task.section],
          ['Duration',          durH],
          ['Severity',          `${task.severity||'—'}/5`],
          ['Criticality',       `${task.criticality||'—'}/5`],
          ['Days Overdue',      task.days_overdue!=null ? `${task.days_overdue} days` : '—'],
          ['Prev. Deferrals',   task.previous_deferrals!=null ? task.previous_deferrals : '—'],
          ['Preferred Window',  task.preferred_time_window||'—'],
          ['Due Date',          task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN') : '—'],
        ].map(([k,v])=>(
          <div key={k}>
            <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase',
              letterSpacing:'0.6px', color:'var(--text-3)', marginBottom:2 }}>{k}</div>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--text-2)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Safety requirements */}
      {task.safety_requirements?.length>0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px',
            color:'var(--text-3)', marginBottom:6 }}>Safety Requirements</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {task.safety_requirements.map(r=>(
              <span key={r} style={{ fontSize:11.5, fontWeight:600, color:C.amber,
                background:`${C.amber}12`, padding:'3px 10px', borderRadius:6,
                border:`1px solid ${C.amber}25` }}>⚠ {r.replace(/_/g,' ')}</span>
            ))}
          </div>
        </div>
      )}

      {/* Resources */}
      {task.required_resources?.length>0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px',
            color:'var(--text-3)', marginBottom:6 }}>Required Resources</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {task.required_resources.map(r=>(
              <span key={r} className="chip">🔧 {r}</span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {task.notes && (
        <div style={{ padding:'10px 12px', background:'rgba(0,0,0,0.25)', borderRadius:8,
          fontSize:12.5, color:'var(--text-2)', lineHeight:1.65,
          borderLeft:`2px solid ${C.brand}50` }}>
          {task.notes}
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  const { data: tasks, loading, error } = useApi(()=>api.tasks());
  const [dept,     setDept]     = useState('All');
  const [status,   setStatus]   = useState('All');
  const [search,   setSearch]   = useState('');
  const [sort,     setSort]     = useState('debt_desc');
  const [expanded, setExpanded] = useState(null);

  if (loading) return (
    <div className="page">
      <div className="skeleton" style={{ height:36, width:300, borderRadius:8, marginBottom:24 }}/>
      {[...Array(8)].map((_,i)=><div key={i} className="skeleton" style={{ height:52, marginBottom:4, borderRadius:8 }}/>)}
    </div>
  );
  if (error) return <div className="page"><div style={{ color:C.red, padding:20 }}>Error: {error}</div></div>;

  let rows=[...(tasks||[])];
  if (dept!=='All')   rows=rows.filter(t=>t.department===dept);
  if (status!=='All') rows=rows.filter(t=>(t.status||'PENDING').toUpperCase()===status);
  if (search.trim())  rows=rows.filter(t=>
    t.task_id?.toLowerCase().includes(search.toLowerCase())||
    (t.task_type||'').toLowerCase().includes(search.toLowerCase())||
    (t.section||'').toLowerCase().includes(search.toLowerCase())
  );
  rows.sort((a,b)=>{
    if (sort==='debt_desc') return (b.maintenance_debt||0)-(a.maintenance_debt||0);
    if (sort==='debt_asc')  return (a.maintenance_debt||0)-(b.maintenance_debt||0);
    if (sort==='flex_asc')  return (a.flexibility_score||0)-(b.flexibility_score||0);
    if (sort==='dur_desc')  return (b.duration||0)-(a.duration||0);
    return 0;
  });

  const toggle = id => setExpanded(p=>p===id?null:id);

  return (
    <div className="page">
      <div className="page-header anim-blur">
        <div className="page-eyebrow" style={{ color:C.brand }}>Planning Engine</div>
        <h1 className="page-title" style={{ background:`linear-gradient(135deg,${C.brand},${C.purple})`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
          Maintenance Tasks
        </h1>
        <p className="page-subtitle">
          {rows.length} of {tasks?.length} tasks · sorted by {sort.replace('_',' ')} · click row to expand
        </p>
      </div>

      {/* Filters row */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', marginBottom:14 }}>
        <div style={{ position:'relative', flex:'1 1 200px', maxWidth:280 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
            color:'var(--text-3)', fontSize:13, pointerEvents:'none' }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search task ID, type, section…"
            style={{ width:'100%', padding:'7px 12px 7px 30px', background:'var(--bg-elevated)',
              border:'1px solid var(--border)', borderRadius:'var(--r-md)', color:'var(--text-1)',
              fontSize:13, transition:'border-color var(--t-fast)', outline:'none' }}
            onFocus={e=>e.target.style.borderColor=C.brand}
            onBlur={e=>e.target.style.borderColor='var(--border)'}/>
        </div>
        <div className="filter-row" style={{ margin:0, flex:1 }}>
          {DEPTS.map(d=>(
            <button key={d} className={`filter-chip${dept===d?' active':''}`}
              style={dept===d?{ background:`${C.brand}18`, borderColor:C.brand, color:C.brand }:{}}
              onClick={()=>setDept(d)}>{d}</button>
          ))}
        </div>
        <select className="rf-select" value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="debt_desc">↓ Debt (highest)</option>
          <option value="debt_asc">↑ Debt (lowest)</option>
          <option value="flex_asc">↑ Flexibility (tightest)</option>
          <option value="dur_desc">↓ Duration (longest)</option>
        </select>
      </div>

      <div className="filter-row" style={{ marginBottom:14 }}>
        {STATUSES.map(s=>(
          <button key={s} className={`filter-chip${status===s?' active':''}`}
            style={status===s?{ background:`${C.brand}18`, borderColor:C.brand, color:C.brand }:{}}
            onClick={()=>setStatus(s)}>{s}</button>
        ))}
      </div>

      <div className="panel" style={{ padding:0, overflow:'hidden' }}>
        <table className="rf-table">
          <thead>
            <tr>
              <th style={{ width:28 }}></th>
              <th>Task ID</th>
              <th>Type</th>
              <th>Dept</th>
              <th>Section</th>
              <th>Duration</th>
              <th>Debt Score</th>
              <th>Flexibility</th>
              <th>Days Overdue</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length===0 && (
              <tr><td colSpan={11}>
                <div className="empty-state"><div className="empty-icon">🔍</div><div className="empty-text">No tasks match filters</div></div>
              </td></tr>
            )}
            {rows.map((t,i)=>{
              const isOpen=expanded===t.task_id;
              const durMin=t.duration||0;
              const durH=durMin>=60?`${(durMin/60).toFixed(1)}h`:`${durMin}m`;
              return [
                <tr key={t.task_id} className={isOpen?'expanded':''} onClick={()=>toggle(t.task_id)}>
                  <td style={{ textAlign:'center' }}>
                    <span style={{ fontSize:11, color:'var(--text-3)', display:'inline-block',
                      transition:'transform 0.3s var(--ease-snap)',
                      transform:isOpen?'rotate(90deg)':'none' }}>▶</span>
                  </td>
                  <td><span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:C.cyan }}>{t.task_id}</span></td>
                  <td><span style={{ fontSize:12.5, fontWeight:500 }}>{t.task_type}</span></td>
                  <td><span className="chip">{t.department}</span></td>
                  <td><span style={{ fontSize:12, color:'var(--text-2)' }}>{t.section}</span></td>
                  <td><span style={{ fontFamily:'var(--mono)', fontSize:12 }}>{durH}</span></td>
                  <td><DebtBar value={t.maintenance_debt||0}/></td>
                  <td>
                    <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700,
                      color:flexColor(t.flexibility_score||0) }}>
                      {((t.flexibility_score||0)*100).toFixed(0)}%
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600,
                      color:(t.days_overdue||0)>7?C.red:(t.days_overdue||0)>3?C.amber:C.green }}>
                      {t.days_overdue!=null?`${t.days_overdue}d`:'—'}
                    </span>
                  </td>
                  <td><PriorityBadge severity={t.severity} criticality={t.criticality}/></td>
                  <td><StatusBadge status={t.status||'PENDING'}/></td>
                </tr>,
                isOpen && (
                  <tr key={`${t.task_id}_exp`}>
                    <td colSpan={11} style={{ padding:0 }}>
                      <ExpandedRow task={t}/>
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
