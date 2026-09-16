import { useState, useEffect } from 'react';
import { api } from '../api/client';

const C = {
  orange: '#f97316', green: '#22c55e', amber: '#f59e0b',
  red: '#ef4444', blue: '#3b82f6', purple: '#a855f7',
};

const DEPT_COLOR = {
  'Engineering': C.orange, 'S&T': C.blue, 'TRD': C.purple,
  'Civil': C.green, 'Telecom': C.amber,
};

function UtilBar({ pct }) {
  const color = pct >= 70 ? C.green : pct >= 40 ? C.amber : 'var(--text-5)';
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5,
        color: 'var(--text-4)', marginBottom: 3 }}>
        <span>Utilization</span>
        <span style={{ fontFamily: 'var(--mono)', color }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--border)',
        overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%',
          width: `${Math.min(pct, 100)}%`, background: color,
          borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function DayCard({ day, expanded, onToggle, tasks, taskMap }) {
  const hasWork = day.planned_tasks.length > 0;
  const dayAccent = hasWork ? C.orange : 'var(--text-5)';

  return (
    <div className="ob-fade-up card-hover"
      style={{ background: 'var(--bg-card)', border: `1px solid ${hasWork ? 'rgba(249,115,22,0.18)' : 'var(--border)'}`,
        borderRadius: 'var(--r-md)', overflow: 'hidden',
        transition: 'all var(--t-fast)', marginBottom: 8 }}>
      {/* Day header */}
      <div onClick={onToggle} style={{ padding: '12px 16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12, userSelect: 'none' }}>
        {/* Date pill */}
        <div style={{ minWidth: 80, textAlign: 'center', padding: '6px 10px',
          borderRadius: 'var(--r-pill)', background: hasWork ? 'rgba(249,115,22,0.08)' : 'var(--bg-card-hover)',
          border: `1px solid ${hasWork ? 'rgba(249,115,22,0.2)' : 'var(--border)'}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: dayAccent,
            textTransform: 'uppercase', letterSpacing: '0.08em' }}>{day.day_name.slice(0, 3)}</div>
          <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'var(--mono)',
            color: hasWork ? 'var(--text-1)' : 'var(--text-4)', lineHeight: 1.1 }}>
            {day.date.split('-')[2]}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-5)', fontFamily: 'var(--mono)' }}>
            {day.date.slice(0, 7)}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            {[
              { label: 'Blocks', val: day.blocks.length },
              { label: 'Planned', val: day.planned_tasks.length, color: C.green },
              { label: 'Deferred', val: day.deferred_tasks.length, color: C.amber },
              { label: `${day.total_capacity_minutes}m cap`, val: null },
            ].map(({ label, val, color }) => (
              <span key={label} style={{ fontSize: 11, color: val !== null && val > 0 && color ? color : 'var(--text-4)' }}>
                {val !== null ? <b style={{ fontFamily: 'var(--mono)', marginRight: 3 }}>{val}</b> : null}
                {label}
              </span>
            ))}
          </div>
          <UtilBar pct={day.block_utilization_pct} />
        </div>

        {/* Dept badges */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 160, justifyContent: 'flex-end' }}>
          {day.departments_covered.map(d => (
            <span key={d} style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px',
              borderRadius: 'var(--r-pill)', color: DEPT_COLOR[d] || 'var(--text-3)',
              background: `${DEPT_COLOR[d] || '#888'}18`,
              border: `1px solid ${DEPT_COLOR[d] || '#888'}30` }}>{d}</span>
          ))}
          {day.departments_covered.length === 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-5)' }}>No work</span>
          )}
        </div>

        <div style={{ fontSize: 14, color: 'var(--text-5)',
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform var(--t-fast)' }}>▼</div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
          {/* Blocks row */}
          <div style={{ paddingTop: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--text-5)', marginBottom: 6 }}>Blocks</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {day.blocks.map(bid => (
                <span key={bid} style={{ fontFamily: 'var(--mono)', fontSize: 10.5,
                  padding: '3px 8px', borderRadius: 5,
                  background: 'rgba(249,115,22,0.06)',
                  border: '1px solid rgba(249,115,22,0.15)',
                  color: C.orange }}>{bid}</span>
              ))}
            </div>
          </div>

          {/* Tasks grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {day.planned_tasks.length > 0 && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: C.green, marginBottom: 6 }}>
                  Planned ({day.planned_tasks.length})
                </div>
                {day.planned_tasks.map(tid => {
                  const t = taskMap[tid];
                  return (
                    <div key={tid} style={{ display: 'flex', alignItems: 'center', gap: 8,
                      padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 11.5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--mono)', color: C.orange }}>{tid}</span>
                      {t && <span style={{ color: 'var(--text-4)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.task_type}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {day.deferred_tasks.length > 0 && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: C.amber, marginBottom: 6 }}>
                  Deferred ({day.deferred_tasks.length})
                </div>
                {day.deferred_tasks.slice(0, 8).map(tid => {
                  const t = taskMap[tid];
                  return (
                    <div key={tid} style={{ display: 'flex', alignItems: 'center', gap: 8,
                      padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 11.5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-4)' }}>{tid}</span>
                      {t && <span style={{ color: 'var(--text-5)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.task_type}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {day.planned_tasks.length === 0 && day.deferred_tasks.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px 0',
                fontSize: 13, color: 'var(--text-5)' }}>
                No maintenance blocks scheduled for this day.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WeeklyPlan() {
  const [plan, setPlan]       = useState(null);
  const [taskMap, setTaskMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    Promise.all([api.weeklyPlan(), api.tasks()])
      .then(([p, tasks]) => {
        setPlan(p);
        const tm = {};
        tasks.forEach(t => tm[t.task_id] = t);
        setTaskMap(tm);
        // Auto-expand days with planned tasks
        const exp = {};
        p.days.forEach(d => { if (d.planned_tasks.length > 0) exp[d.date] = true; });
        setExpanded(exp);
      })
      .catch(e => setError(e.message || 'Failed to load weekly plan'))
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (date) => setExpanded(p => ({ ...p, [date]: !p[date] }));

  const totalDays = plan?.days?.length ?? 0;
  const activeDays = plan?.days?.filter(d => d.planned_tasks.length > 0).length ?? 0;

  return (
    <div className="page">
      <div className="ob-fade-up">
        <div className="page-eyebrow">Horizon View</div>
        <h1 className="page-title">Weekly Planning</h1>
        <p className="page-subtitle">
          Full 7-day maintenance horizon. Optimization is run across all blocks — same engine, same explainability.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" />
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-4)' }}>Running weekly optimization…</div>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: C.red }}>
          {error}
        </div>
      )}

      {plan && !loading && (
        <>
          {/* Disclaimer */}
          <div className="ob-fade-up d1" style={{ padding: '8px 14px',
            background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: 8, fontSize: 11.5, color: 'var(--text-4)', marginBottom: 18 }}>
            {plan.disclaimer}
          </div>

          {/* Summary row */}
          <div className="ob-fade-up d2 stats-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Days in Horizon', val: totalDays, color: 'var(--text-1)' },
              { label: 'Active Days', val: activeDays, color: C.orange },
              { label: 'Tasks Planned', val: plan.total_tasks_planned, color: C.green },
              { label: 'Tasks Deferred', val: plan.total_tasks_deferred, color: C.amber },
              { label: 'Avg Utilization', val: `${plan.total_block_utilization_pct.toFixed(1)}%`, color: C.blue },
              { label: 'Addl. Possession', val: `${plan.total_additional_possession}m`, color: C.red },
            ].map(({ label, val, color }) => (
              <div key={label} className="stat-card">
                <div className="stat-label">{label}</div>
                <div className="stat-value" style={{ color }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Weekly bar chart */}
          <div className="ob-fade-up d3 panel" style={{ marginBottom: 24 }}>
            <div className="panel-title" style={{ marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: C.orange, marginRight: 8 }} />
              Block Utilization by Day
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
              {plan.days.map(day => {
                const pct = day.block_utilization_pct;
                const color = pct >= 70 ? C.green : pct >= 40 ? C.amber : 'var(--text-5)';
                return (
                  <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 }}>
                    <div style={{ fontSize: 9, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>
                      {pct > 0 ? `${pct.toFixed(0)}%` : '–'}
                    </div>
                    <div style={{ width: '70%', background: color, borderRadius: '3px 3px 0 0',
                      height: `${Math.max(pct, 2)}%`, transition: 'height 0.8s ease',
                      opacity: pct > 0 ? 1 : 0.2 }} />
                    <div style={{ fontSize: 9, color: 'var(--text-5)', fontFamily: 'var(--mono)' }}>
                      {day.day_name.slice(0, 3)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day cards */}
          <div className="ob-fade-up d4">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--text-4)', marginBottom: 12 }}>
              Day-by-Day Breakdown
            </div>
            {plan.days.map(day => (
              <DayCard
                key={day.date}
                day={day}
                expanded={!!expanded[day.date]}
                onToggle={() => toggleDay(day.date)}
                taskMap={taskMap}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
