import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

const C = {
  orange: '#f97316', green: '#22c55e', amber: '#f59e0b',
  red: '#ef4444', blue: '#3b82f6', purple: '#a855f7',
};

const debtColor = d => d >= 40 ? C.red : d >= 25 ? C.amber : d >= 15 ? C.orange : C.green;
const flexColor = f => f <= 0.2 ? C.red : f <= 0.4 ? C.amber : f <= 0.7 ? C.blue : C.green;

const DEPTS    = ['All', 'Engineering', 'TRD', 'S&T', 'Civil', 'Telecom'];
const STATUSES = ['All', 'PENDING', 'SELECTED', 'DEFERRED', 'REJECTED', 'PROTECTED'];

function StatusBadge({ status }) {
  const s = (status || 'PENDING').toUpperCase();
  const map = {
    SELECTED: 'badge-green', PLANNED: 'badge-green', PENDING: 'badge-blue',
    DEFERRED: 'badge-amber', REJECTED: 'badge-red', PROTECTED: 'badge-purple',
  };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
}

function PriorityBadge({ severity, criticality }) {
  const score = Math.max(severity || 0, criticality || 0);
  if (score >= 5) return <span className="badge badge-red">CRITICAL</span>;
  if (score >= 4) return <span className="badge badge-amber">HIGH</span>;
  if (score >= 3) return <span className="badge badge-blue">MEDIUM</span>;
  return <span className="badge badge-gray">LOW</span>;
}

function ExpandedDetail({ task }) {
  const durH = task.duration ? (task.duration >= 60 ? `${(task.duration / 60).toFixed(1)}h` : `${task.duration}m`) : '—';
  return (
    <div style={{ padding: '16px 14px 16px 56px',
      background: 'rgba(249,115,22,0.025)', borderBottom: '1px solid var(--border)' }}>
      {/* Grid of fields */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '10px 24px', marginBottom: 14 }}>
        {[
          ['Task Type',        task.task_type],
          ['Asset ID',         task.asset_id],
          ['Asset Type',       task.asset_type],
          ['Corridor',         task.corridor],
          ['Location',         task.location],
          ['Section',          task.section],
          ['Duration',         durH],
          ['Severity',         `${task.severity || '—'} / 5`],
          ['Criticality',      `${task.criticality || '—'} / 5`],
          ['Days Overdue',     task.days_overdue != null ? `${task.days_overdue} days` : '—'],
          ['Prev. Deferrals',  task.previous_deferrals != null ? task.previous_deferrals : '—'],
          ['Pref. Window',     task.preferred_time_window || '—'],
          ['Due Date',         task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN') : '—'],
        ].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Safety reqs */}
      {task.safety_requirements?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: 6 }}>Safety Requirements</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {task.safety_requirements.map(r => (
              <span key={r} style={{ fontSize: 11.5, fontWeight: 600, color: C.amber,
                background: 'rgba(245,158,11,0.09)', padding: '3px 10px', borderRadius: 6,
                border: '1px solid rgba(245,158,11,0.2)' }}>
                {r.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Required resources */}
      {task.required_resources?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: 6 }}>Required Resources</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {task.required_resources.map(r => (
              <span key={r} className="chip">{r}</span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {task.notes && (
        <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 8,
          fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.65,
          borderLeft: '2px solid rgba(249,115,22,0.3)' }}>
          {task.notes}
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  const { data: tasks, loading, error } = useApi(() => api.tasks());
  const [dept,     setDept]    = useState('All');
  const [status,   setStatus]  = useState('All');
  const [search,   setSearch]  = useState('');
  const [sort,     setSort]    = useState('debt_desc');
  const [expanded, setExpanded]= useState(null);

  if (loading) return (
    <div className="page">
      {[...Array(10)].map((_, i) => <div key={i} className="skeleton" style={{ height: 50, marginBottom: 4, borderRadius: 8 }} />)}
    </div>
  );
  if (error) return <div className="page"><div style={{ color: C.red, padding: 20 }}>Error: {error}</div></div>;

  let rows = [...(tasks || [])];
  if (dept !== 'All')   rows = rows.filter(t => t.department === dept);
  if (status !== 'All') rows = rows.filter(t => (t.status || 'PENDING').toUpperCase() === status);
  if (search.trim())    rows = rows.filter(t =>
    (t.task_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.task_type || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.section || '').toLowerCase().includes(search.toLowerCase())
  );
  rows.sort((a, b) => {
    if (sort === 'debt_desc') return (b.maintenance_debt || 0) - (a.maintenance_debt || 0);
    if (sort === 'debt_asc')  return (a.maintenance_debt || 0) - (b.maintenance_debt || 0);
    if (sort === 'flex_asc')  return (a.flexibility_score || 0) - (b.flexibility_score || 0);
    if (sort === 'dur_desc')  return (b.duration || 0) - (a.duration || 0);
    return 0;
  });

  const toggle = id => setExpanded(p => p === id ? null : id);

  return (
    <div className="page">
      {/* Header */}
      <div className="ob-fade-up">
        <div className="page-eyebrow">Planning Engine</div>
        <h1 className="page-title">Maintenance Tasks</h1>
        <p className="page-subtitle">{rows.length} of {tasks?.length} tasks · click row to expand details</p>
      </div>

      {/* Search + sort */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 300 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-4)', fontSize: 13, pointerEvents: 'none' }}>⌕</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="rf-input"
            style={{ paddingLeft: 28 }}
            onFocus={e => e.target.style.borderColor = 'rgba(249,115,22,0.4)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-2)'}
          />
        </div>
        <select className="rf-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="debt_desc">↓ Debt (highest)</option>
          <option value="debt_asc">↑ Debt (lowest)</option>
          <option value="flex_asc">↑ Flexibility (tightest)</option>
          <option value="dur_desc">↓ Duration (longest)</option>
        </select>
      </div>

      {/* Dept filters */}
      <div className="filter-row">
        {DEPTS.map(d => (
          <button key={d} className={`filter-chip${dept === d ? ' active' : ''}`} onClick={() => setDept(d)}>{d}</button>
        ))}
      </div>

      {/* Status filters */}
      <div className="filter-row">
        {STATUSES.map(s => (
          <button key={s} className={`filter-chip${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>{s}</button>
        ))}
      </div>

      {/* Table */}
      <div className="panel ob-fade-up d2" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="rf-table">
          <thead>
            <tr>
              <th style={{ width: 30 }} />
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
            {rows.length === 0 && (
              <tr><td colSpan={11}>
                <div className="empty-state"><div className="empty-icon">🔍</div><div className="empty-text">No tasks match filters</div></div>
              </td></tr>
            )}
            {rows.map(t => {
              const isOpen = expanded === t.task_id;
              const dur = t.duration || 0;
              const durStr = dur >= 60 ? `${(dur / 60).toFixed(1)}h` : `${dur}m`;
              const debt = t.maintenance_debt || 0;
              const pct = Math.min((debt / 60) * 100, 100);
              const dc = debtColor(debt);
              const fc = flexColor(t.flexibility_score || 0);
              const oc = (t.days_overdue || 0) > 7 ? C.red : (t.days_overdue || 0) > 3 ? C.amber : C.green;
              return [
                <tr key={t.task_id} className={isOpen ? 'expanded' : ''} onClick={() => toggle(t.task_id)}>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-4)', display: 'inline-block',
                      transition: 'transform 0.25s var(--ease)',
                      transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                  </td>
                  <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 700, color: C.orange }}>{t.task_id}</span></td>
                  <td><span style={{ fontSize: 12.5 }}>{t.task_type}</span></td>
                  <td><span className="chip">{t.department}</span></td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-3)' }}>{t.section}</span></td>
                  <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{durStr}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                      <div style={{ flex: 1, height: 3, background: 'var(--border-2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: dc, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', color: dc, minWidth: 26 }}>
                        {debt.toFixed(0)}
                      </span>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: fc }}>
                    {((t.flexibility_score || 0) * 100).toFixed(0)}%
                  </span></td>
                  <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: oc }}>
                    {t.days_overdue != null ? `${t.days_overdue}d` : '—'}
                  </span></td>
                  <td><PriorityBadge severity={t.severity} criticality={t.criticality} /></td>
                  <td><StatusBadge status={t.status || 'PENDING'} /></td>
                </tr>,
                isOpen && (
                  <tr key={`${t.task_id}_exp`}>
                    <td colSpan={11} style={{ padding: 0 }}>
                      <ExpandedDetail task={t} />
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
