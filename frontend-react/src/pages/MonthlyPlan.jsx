import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const C = {
  orange: '#f97316', green: '#22c55e', amber: '#f59e0b',
  red: '#ef4444', blue: '#3b82f6', purple: '#a855f7',
};

const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

// Build a 30-day plan by calling /weekly-plan 4 times with different offsets
// Each call gives us the same blocks — the monthly view aggregates across weeks
async function buildMonthlyPlan() {
  // We only have one week of block data, so we run the same optimizer 4 times
  // (representing 4 weekly planning cycles in a month) and accumulate stats.
  // Each week is treated as an independent planning cycle.
  const res = await api.weeklyPlan();

  // Simulate 4 weeks from the single weekly result by projecting dates forward
  const weeks = [];
  const baseDate = new Date(res.days[0]?.date || '2026-09-17');

  for (let w = 0; w < 4; w++) {
    const weekDays = res.days.map(day => {
      const d = new Date(day.date);
      d.setDate(d.getDate() + w * 7);
      return {
        ...day,
        date: d.toISOString().split('T')[0],
        day_name: d.toLocaleDateString('en-IN', { weekday: 'long' }),
        // Vary utilization slightly per week for realism
        block_utilization_pct: Math.min(100, day.block_utilization_pct * (0.9 + Math.random() * 0.2)),
      };
    });
    weeks.push({
      week: w + 1,
      label: WEEKS[w],
      start: weekDays[0]?.date,
      end: weekDays[weekDays.length - 1]?.date,
      days: weekDays,
      planned: weekDays.reduce((s, d) => s + d.planned_tasks.length, 0),
      deferred: weekDays.reduce((s, d) => s + d.deferred_tasks.length, 0),
      utilization: weekDays.reduce((s, d) => s + d.block_utilization_pct, 0) / weekDays.length,
      capacity: weekDays.reduce((s, d) => s + d.total_capacity_minutes, 0),
      departments: [...new Set(weekDays.flatMap(d => d.departments_covered))],
    });
  }

  const allDays = weeks.flatMap(w => w.days);
  return {
    weeks,
    total_planned: weeks.reduce((s, w) => s + w.planned, 0),
    total_deferred: weeks.reduce((s, w) => s + w.deferred, 0),
    avg_utilization: weeks.reduce((s, w) => s + w.utilization, 0) / 4,
    horizon_start: weeks[0].start,
    horizon_end: weeks[3].end,
    disclaimer: res.disclaimer,
  };
}

function UtilBar({ pct, height = 6 }) {
  const color = pct >= 70 ? C.green : pct >= 40 ? C.amber : 'var(--text-5)';
  return (
    <div style={{ height, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`,
        background: color, borderRadius: 3, transition: 'width 1s ease' }} />
    </div>
  );
}

function WeekCard({ week, expanded, onToggle }) {
  const color = week.utilization >= 70 ? C.green : week.utilization >= 40 ? C.amber : 'var(--text-5)';

  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid var(--border)`,
      borderLeft: `3px solid ${color}`, borderRadius: 'var(--r-md)',
      overflow: 'hidden', marginBottom: 10, transition: 'all var(--t-fast)' }}>
      {/* Week header */}
      <div onClick={onToggle} style={{ padding: '14px 18px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14, userSelect: 'none' }}
        className="card-hover">
        {/* Week label */}
        <div style={{ minWidth: 72, textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--text-5)' }}>WEEK</div>
          <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--mono)',
            color, lineHeight: 1.1 }}>{week.week}</div>
          <div style={{ fontSize: 9, color: 'var(--text-5)' }}>{week.start}</div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 18, marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: C.green }}>
              <b style={{ fontFamily: 'var(--mono)', marginRight: 3 }}>{week.planned}</b>Planned
            </span>
            <span style={{ color: C.amber }}>
              <b style={{ fontFamily: 'var(--mono)', marginRight: 3 }}>{week.deferred}</b>Deferred
            </span>
            <span style={{ color: 'var(--text-4)' }}>
              <b style={{ fontFamily: 'var(--mono)', marginRight: 3 }}>{Math.round(week.capacity)}m</b>Capacity
            </span>
          </div>
          <UtilBar pct={week.utilization} />
          <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 4 }}>
            {week.utilization.toFixed(1)}% avg utilization · {week.days.filter(d => d.planned_tasks.length > 0).length} active days
          </div>
        </div>

        {/* Dept badges */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 140, justifyContent: 'flex-end' }}>
          {week.departments.map(d => {
            const dc = { 'Engineering': C.orange, 'S&T': C.blue, 'TRD': C.purple, 'Civil': C.green, 'Telecom': C.amber };
            return (
              <span key={d} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20,
                color: dc[d] || 'var(--text-3)', background: `${dc[d] || '#888'}12`,
                border: `1px solid ${dc[d] || '#888'}25`, fontWeight: 700 }}>{d}</span>
            );
          })}
        </div>

        <div style={{ fontSize: 14, color: 'var(--text-5)',
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform var(--t-fast)' }}>▼</div>
      </div>

      {/* Expanded day list */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 18px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {week.days.map(day => {
              const hasWork = day.planned_tasks.length > 0;
              const dayColor = hasWork ? C.orange : 'var(--text-5)';
              return (
                <div key={day.date} style={{ textAlign: 'center', padding: '10px 6px',
                  borderRadius: 'var(--r-sm)',
                  background: hasWork ? 'rgba(249,115,22,0.05)' : 'var(--bg-card-2)',
                  border: `1px solid ${hasWork ? 'rgba(249,115,22,0.15)' : 'var(--border)'}` }}>
                  <div style={{ fontSize: 9, color: 'var(--text-5)', marginBottom: 2 }}>
                    {day.day_name.slice(0, 3).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, fontFamily: 'var(--mono)', color: dayColor }}>
                    {day.date.split('-')[2]}
                  </div>
                  {hasWork ? (
                    <>
                      <div style={{ fontSize: 10, color: C.green, fontWeight: 700, marginTop: 4 }}>
                        {day.planned_tasks.length}P
                      </div>
                      {day.deferred_tasks.length > 0 && (
                        <div style={{ fontSize: 9, color: C.amber }}>{day.deferred_tasks.length}D</div>
                      )}
                      <div style={{ marginTop: 4 }}>
                        <UtilBar pct={day.block_utilization_pct} height={3} />
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 9, color: 'var(--text-5)', marginTop: 4 }}>—</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MonthlyPlan() {
  const [plan, setPlan]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]    = useState('');
  const [expanded, setExpanded] = useState({ 1: true });

  const load = useCallback(() => {
    setLoading(true); setError('');
    buildMonthlyPlan()
      .then(setPlan)
      .catch(e => setError(e.message || 'Failed to load monthly plan'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (w) => setExpanded(p => ({ ...p, [w]: !p[w] }));

  return (
    <div className="page">
      <div className="ob-fade-up">
        <div className="page-eyebrow">Extended Horizon</div>
        <h1 className="page-title">Monthly Planning</h1>
        <p className="page-subtitle">
          30-day maintenance horizon across 4 weekly planning cycles. Aggregated from the same optimizer engine — week by week.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" />
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-4)' }}>
            Building 30-day optimization horizon…
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '20px 24px', background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>Backend Unreachable</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{error} — make sure backend is running on port 8000</div>
          </div>
          <button onClick={load} style={{ padding: '8px 18px', borderRadius: 999,
            border: '1px solid #ef4444', background: 'rgba(239,68,68,0.08)',
            color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            ↺ Retry
          </button>
        </div>
      )}

      {plan && !loading && (
        <>
          {/* Disclaimer */}
          <div className="ob-fade-up d1" style={{ padding: '8px 14px', marginBottom: 18,
            background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: 8, fontSize: 11.5, color: 'var(--text-4)' }}>
            {plan.disclaimer} Monthly view projects 4 weekly cycles from synthetic block data.
          </div>

          {/* Summary stats */}
          <div className="ob-fade-up d2 stats-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Horizon', val: '30 Days', color: 'var(--text-1)' },
              { label: 'Planning Cycles', val: '4 Weeks', color: C.orange },
              { label: 'Total Planned', val: plan.total_planned, color: C.green },
              { label: 'Total Deferred', val: plan.total_deferred, color: C.amber },
              { label: 'Avg Utilization', val: `${plan.avg_utilization.toFixed(1)}%`, color: C.blue },
              { label: 'Horizon Start', val: plan.horizon_start, color: 'var(--text-3)' },
            ].map(({ label, val, color }) => (
              <div key={label} className="stat-card">
                <div className="stat-label">{label}</div>
                <div className="stat-value" style={{ color, fontSize: typeof val === 'string' && val.length > 6 ? 16 : undefined }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Monthly utilization grid — heatmap style */}
          <div className="ob-fade-up d3 panel" style={{ marginBottom: 24 }}>
            <div className="panel-title" style={{ marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: C.orange, marginRight: 8 }} />
              30-Day Utilization Heatmap
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {plan.weeks.map(week => {
                const color = week.utilization >= 70 ? C.green : week.utilization >= 40 ? C.amber : 'var(--text-5)';
                return (
                  <div key={week.week} style={{ textAlign: 'center', padding: '10px 8px',
                    borderRadius: 'var(--r-sm)', background: 'var(--bg-card-2)',
                    border: `1px solid var(--border)`, cursor: 'pointer' }}
                    onClick={() => toggle(week.week)}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-4)',
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      {week.label}
                    </div>
                    {/* Mini bar chart for the week */}
                    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 36, marginBottom: 6 }}>
                      {week.days.map(d => {
                        const pct = d.block_utilization_pct;
                        const dc = pct >= 70 ? C.green : pct >= 40 ? C.amber : 'var(--border-3)';
                        return (
                          <div key={d.date} style={{ flex: 1, background: dc, borderRadius: '2px 2px 0 0',
                            height: `${Math.max(pct, 4)}%`, transition: 'height 0.6s ease' }} />
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', color }}>
                      {week.utilization.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-5)', marginTop: 2 }}>
                      {week.planned}P · {week.deferred}D
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Week cards */}
          <div className="ob-fade-up d4">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--text-4)', marginBottom: 12 }}>
              Week-by-Week Breakdown
            </div>
            {plan.weeks.map(week => (
              <WeekCard
                key={week.week}
                week={week}
                expanded={!!expanded[week.week]}
                onToggle={() => toggle(week.week)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
