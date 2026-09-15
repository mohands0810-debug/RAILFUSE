import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import {
  Loading, ErrorBox, Card, Table, Badge, StatusBadge, SeverityBadge,
  DebtBar, Bar, ReasoningBox, Tag, debtColor, flexColor, fmtDate
} from '../components/UI';

const PAGE = { padding:'28px 32px', maxWidth:1400, animation:'fadeUp 0.25s ease' };
const H1   = { fontSize:24, fontWeight:800, background:'linear-gradient(135deg,#f1f5f9,#94a3b8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-0.5px', marginBottom:4 };

export default function Tasks() {
  const [search, setSearch]   = useState('');
  const [dept, setDept]       = useState('');
  const [section, setSection] = useState('');
  const [status, setStatus]   = useState('');
  const [expanded, setExpanded] = useState(null);

  const { data: tasks, loading, error } = useApi(() => api.tasks());
  const { data: plan }                  = useApi(() => api.optimizedPlan().catch(() => null));

  if (loading) return <div style={PAGE}><Loading text="Loading maintenance tasks…" /></div>;
  if (error)   return <div style={PAGE}><ErrorBox message={error} /></div>;

  // Enrich tasks with plan decisions
  const decisions = plan?.task_decisions || {};
  const enriched = (tasks || []).map(t => ({
    ...t,
    status: decisions[t.task_id]?.status || t.status,
    reason: decisions[t.task_id]?.reason || '',
    assigned_block: decisions[t.task_id]?.assigned_block || null,
  }));

  // Unique filter options
  const depts    = [...new Set(enriched.map(t => t.department))].sort();
  const sections = [...new Set(enriched.map(t => t.section))].sort();

  // Apply filters
  const filtered = enriched.filter(t => {
    if (status  && t.status?.toUpperCase() !== status) return false;
    if (dept    && t.department !== dept) return false;
    if (section && t.section !== section) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.task_id.toLowerCase().includes(q) && !t.task_type.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const inp = { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text-1)', fontSize:13, outline:'none' };
  const sel = { ...inp, cursor:'pointer' };

  return (
    <div style={PAGE}>
      <div style={{ marginBottom:24 }}>
        <h1 style={H1}>🔧 Maintenance Tasks</h1>
        <p style={{ fontSize:14, color:'var(--text-3)' }}>{enriched.length} tasks · click any row to view debt analysis &amp; algorithm explanation</p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <input id="task-search" style={{ ...inp, minWidth:210 }} placeholder="🔍 Search task ID or type…" value={search} onChange={e => setSearch(e.target.value)} />
        <select id="task-filter-status" style={{ ...sel, minWidth:150 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['SELECTED','PENDING','DEFERRED','REJECTED','PROTECTED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select id="task-filter-dept" style={{ ...sel, minWidth:170 }} value={dept} onChange={e => setDept(e.target.value)}>
          <option value="">All Departments</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select id="task-filter-section" style={{ ...sel, minWidth:150 }} value={section} onChange={e => setSection(e.target.value)}>
          <option value="">All Sections</option>
          {sections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text-3)' }}>Showing {filtered.length} of {enriched.length}</span>
      </div>

      {/* Table */}
      <Card style={{ padding:0, overflow:'hidden' }}>
        {!filtered.length
          ? <div style={{ padding:32, textAlign:'center', color:'var(--text-3)' }}>No tasks match your filters.</div>
          : <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--bg-elevated)', borderBottom:'1px solid var(--border)' }}>
                  {['Task ID','Type','Section','Department','Duration','Severity','Debt Score','Flexibility','Status'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:'var(--text-3)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <>
                    <tr key={t.task_id} id={`task-row-${t.task_id}`}
                      onClick={() => setExpanded(expanded === t.task_id ? null : t.task_id)}
                      style={{ borderBottom:'1px solid var(--border-subtle)', cursor:'pointer', transition:'background 0.12s', background: expanded === t.task_id ? 'rgba(99,102,241,0.06)' : '' }}
                      onMouseEnter={e => expanded !== t.task_id && (e.currentTarget.style.background='rgba(99,102,241,0.03)')}
                      onMouseLeave={e => expanded !== t.task_id && (e.currentTarget.style.background='')}
                    >
                      <td style={{ padding:'10px 14px', fontFamily:'var(--mono)', fontSize:12, fontWeight:600, color:'var(--accent)' }}>{t.task_id}</td>
                      <td style={{ padding:'10px 14px', fontWeight:500, color:'var(--text-1)', maxWidth:170, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.task_type}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-2)' }}>{t.section}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-2)' }}>{t.department}</td>
                      <td style={{ padding:'10px 14px', fontFamily:'var(--mono)', fontSize:12 }}>{t.duration} min</td>
                      <td style={{ padding:'10px 14px' }}><SeverityBadge s={t.severity} /></td>
                      <td style={{ padding:'10px 14px', minWidth:130 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ flex:1 }}><DebtBar debt={t.maintenance_debt} /></div>
                          <span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:12, color:debtColor(t.maintenance_debt), minWidth:26 }}>{t.maintenance_debt.toFixed(0)}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px', minWidth:120 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ flex:1 }}><Bar value={t.flexibility_score} max={1} color={flexColor(t.flexibility_score)} /></div>
                          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:flexColor(t.flexibility_score), minWidth:30 }}>{t.flexibility_score.toFixed(2)}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px' }}><StatusBadge status={t.status} /></td>
                    </tr>

                    {/* Expanded Detail */}
                    {expanded === t.task_id && (
                      <tr key={`detail-${t.task_id}`}>
                        <td colSpan={9} style={{ padding:0 }}>
                          <div style={{ background:'var(--bg-surface)', borderTop:'1px solid var(--border)', padding:'18px 20px', animation:'slideDown 0.2s ease' }}>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:14, marginBottom:16 }}>
                              {[
                                ['Asset ID',          t.asset_id],
                                ['Asset Type',        t.asset_type],
                                ['Corridor',          t.corridor],
                                ['Location',          t.location],
                                ['Due Date',          fmtDate(t.due_date)],
                                ['Days Overdue',      <span style={{color: t.days_overdue > 0 ? 'var(--red)' : 'var(--green)'}}>{t.days_overdue}</span>],
                                ['Prev Deferrals',    t.previous_deferrals],
                                ['Criticality',       `${t.criticality}/5`],
                                ['Time Window',       <span style={{fontFamily:'var(--mono)'}}>{t.preferred_time_window}</span>],
                                ['Resources',         t.required_resources.join(', ') || '—'],
                                ...(t.assigned_block ? [['Assigned Block', <span style={{color:'var(--green)',fontWeight:700}}>{t.assigned_block}</span>]] : []),
                              ].map(([lbl, val]) => (
                                <div key={lbl}>
                                  <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:4 }}>{lbl}</div>
                                  <div style={{ fontSize:14, color:'var(--text-1)', fontWeight:500 }}>{val}</div>
                                </div>
                              ))}
                            </div>
                            {t.reason && <ReasoningBox text={t.reason} />}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        }
      </Card>
    </div>
  );
}
