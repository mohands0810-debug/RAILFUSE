import { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

/* ── Palette (orange only, like OpenBox) ───────────────────── */
const C = {
  orange: '#f97316',
  green:  '#22c55e',
  amber:  '#f59e0b',
  red:    '#ef4444',
  blue:   '#3b82f6',
  purple: '#a855f7',
  cyan:   '#06b6d4',
};

const WEIGHTS_META = [
  { key: 'debt_weight',                label: 'Maintenance Debt',      desc: 'Prioritise high-debt backlog tasks',          color: C.red    },
  { key: 'flexibility_weight',         label: 'Flexibility Protection', desc: 'Reserve slots for low-flexibility tasks',     color: C.amber  },
  { key: 'safety_weight',              label: 'Safety Criticality',     desc: 'Elevate tasks with safety requirements',      color: C.orange },
  { key: 'opportunity_cost_weight',    label: 'Opportunity Cost',       desc: 'Penalise missing high-value blocks',          color: C.blue   },
  { key: 'resource_efficiency_weight', label: 'Resource Efficiency',    desc: 'Maximise crew & equipment utilisation',       color: C.green  },
];

const DEFAULT_WEIGHTS = {
  debt_weight: 0.35,
  flexibility_weight: 0.25,
  safety_weight: 0.20,
  opportunity_cost_weight: 0.10,
  resource_efficiency_weight: 0.10,
};

/* Status color map */
const statusColor = s => ({ SELECTED:'var(--green)', PLANNED:'var(--green)',
  DEFERRED:'var(--amber)', REJECTED:'var(--red)', PROTECTED:'var(--purple)',
  PENDING:'var(--blue)' })[(s||'').toUpperCase()] || 'var(--text-3)';

const statusBg = s => ({ SELECTED:'var(--green-dim)', PLANNED:'var(--green-dim)',
  DEFERRED:'var(--amber-dim)', REJECTED:'var(--red-dim)', PROTECTED:'var(--purple-dim)',
  PENDING:'var(--blue-dim)' })[(s||'').toUpperCase()] || 'rgba(255,255,255,0.04)';

export default function Optimizer() {
  const { data: cached } = useApi(() => api.optimizedPlan().catch(() => null));

  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [running, setRunning] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [hasRun,  setHasRun]  = useState(false);

  const setW = (key, val) => setWeights(p => ({ ...p, [key]: val }));

  const handleRun = useCallback(async () => {
    setRunning(true); setError(null); setHasRun(true);
    try {
      const res = await api.optimize({ weights });
      setResult(res);
    } catch (e) {
      setError(e.message || 'Optimizer failed');
    } finally {
      setRunning(false);
    }
  }, [weights]);

  const displayed  = result || cached;
  const summary    = displayed?.summary || {};
  const decisions  = displayed?.decisions ? Object.values(displayed.decisions) : [];
  const assigns    = (displayed?.block_assignments || []).filter(
    a => a.combination_details?.combination?.tasks?.length > 0
  );

  return (
    <div className="page">

      {/* Header */}
      <div className="ob-fade-up">
        <div className="page-eyebrow">Optimization Engine</div>
        <h1 className="page-title">Plan Optimizer</h1>
        <p className="page-subtitle">
          Tune scoring weights and re-run the heuristic. Deterministic seed 42 — same inputs always produce the same plan.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: Weight panel ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="panel ob-fade-up d1">
            <div className="panel-header">
              <div className="panel-title">
                <div className="panel-dot" />
                Weight Configuration
              </div>
              <button
                onClick={() => setWeights(DEFAULT_WEIGHTS)}
                style={{ fontSize: 11, color: 'var(--text-4)', padding: '3px 8px',
                  borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)',
                  background: 'none', cursor: 'pointer', transition: 'color var(--t-fast)', fontFamily: 'var(--font)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}
              >
                Reset
              </button>
            </div>

            {WEIGHTS_META.map(({ key, label, desc, color }, i) => {
              const pct = Math.round(weights[key] * 100);
              return (
                <div key={key} style={{ marginBottom: i < WEIGHTS_META.length - 1 ? 22 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{desc}</div>
                    </div>
                    <div style={{
                      fontSize: 16, fontWeight: 900, fontFamily: 'var(--mono)',
                      color, minWidth: 36, textAlign: 'right', letterSpacing: '-0.02em',
                    }}>
                      {pct}
                    </div>
                  </div>
                  {/* Track with fill */}
                  <div style={{ position: 'relative', height: 4, background: 'var(--border-2)', borderRadius: 2 }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0, height: '100%',
                      width: `${pct}%`, background: color, borderRadius: 2,
                      transition: 'width 0.15s var(--ease)',
                    }} />
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={weights[key]}
                      onChange={e => setW(key, parseFloat(e.target.value))}
                      className="rf-slider"
                      style={{
                        position: 'absolute', top: '50%', left: 0,
                        transform: 'translateY(-50%)', width: '100%',
                        background: 'transparent', margin: 0,
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3,
                    fontSize: 10, color: 'var(--text-5)' }}>
                    <span>0</span><span>100</span>
                  </div>
                </div>
              );
            })}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 18 }}>
              {error && (
                <div style={{ padding: '9px 12px', borderRadius: 'var(--r-md)',
                  background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>
                  ⚠ {error}
                </div>
              )}
              <button
                onClick={handleRun}
                disabled={running}
                className={running ? 'btn btn-running' : 'btn btn-primary'}
                style={{ width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: 13 }}
              >
                {running
                  ? <><span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>⟳</span> Running…</>
                  : '▶  Run Optimizer'
                }
              </button>
            </div>
          </div>

          {/* Weight summary bar chart (minimal) */}
          <div className="panel ob-fade-up d2">
            <div className="panel-header" style={{ marginBottom: 14 }}>
              <div className="panel-title">Weight Profile</div>
            </div>
            {WEIGHTS_META.map(({ key, label, color }) => {
              const pct = Math.round(weights[key] * 100);
              const short = label.split(' ')[0];
              return (
                <div key={key} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: 11.5, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text-3)' }}>{short}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color }}>{pct}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--border-2)', borderRadius: 2 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color,
                      borderRadius: 2, transition: 'width 0.3s var(--ease)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Results ─────────────────────────────── */}
        <div>
          {!hasRun && !displayed ? (
            <div className="panel" style={{ display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', minHeight: 420, gap: 16 }}>
              <div style={{ fontSize: 40, opacity: 0.15 }}>⊙</div>
              <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.02em' }}>Ready to optimize</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center',
                maxWidth: 300, lineHeight: 1.7 }}>
                Set scoring weights on the left, then click Run Optimizer to generate a plan.
              </div>
            </div>
          ) : running ? (
            <div className="panel" style={{ display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', minHeight: 420, gap: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%',
                border: '2px solid var(--border-2)', borderTopColor: 'var(--orange)',
                animation: 'spin 0.7s linear infinite' }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Running heuristic…</div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
                25 tasks × 10 blocks · seed 42
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Summary strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { label: 'Planned',      value: summary.planned_tasks   || 0, c: C.green  },
                  { label: 'Deferred',     value: summary.deferred_tasks  || 0, c: C.amber  },
                  { label: 'Rejected',     value: summary.rejected_tasks  || 0, c: C.red    },
                  { label: 'Blocks Used',  value: summary.blocks_with_assignments || assigns.length, c: C.orange },
                ].map(s => (
                  <div key={s.label} className="stat-card ob-scale-in"
                    style={{ padding: '14px 16px', borderTop: `2px solid ${s.c}` }}>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color: s.c, fontSize: 28 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Extra metrics row */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { l: 'Total Block Value',      v: (summary.total_block_value || 0).toFixed(1), c: C.orange },
                  { l: 'Zero-Possession Blocks', v: summary.zero_possession_blocks || 0, c: C.green },
                  { l: 'Avg Utilization',        v: `${(summary.avg_block_utilization || 0).toFixed(1)}%`, c: C.blue },
                  { l: 'Extra Possession (min)', v: summary.total_additional_possession || 0, c: C.amber },
                ].map(s => (
                  <div key={s.l} style={{ display: 'flex', gap: 10, alignItems: 'center',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)', padding: '8px 14px' }}>
                    <div style={{ width: 3, height: 22, background: s.c, borderRadius: 1.5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 900, fontFamily: 'var(--mono)',
                        letterSpacing: '-0.02em', color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{s.l}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Block assignments table */}
              {assigns.length > 0 && (
                <div className="panel ob-fade-up d2">
                  <div className="panel-header">
                    <div className="panel-title">
                      <div className="panel-dot" style={{ background: C.green }} />
                      Block Assignments ({assigns.length})
                    </div>
                  </div>
                  <table className="rf-table">
                    <thead>
                      <tr>
                        <th>Block</th>
                        <th>Section</th>
                        <th>Tasks</th>
                        <th>Value</th>
                        <th>Duration</th>
                        <th>Zero Possession</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assigns.map(a => {
                        const combo = a.combination_details?.combination || {};
                        return (
                          <tr key={a.block_id}>
                            <td>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5,
                                fontWeight: 700, color: 'var(--orange)' }}>{a.block_id}</span>
                            </td>
                            <td><span style={{ color: 'var(--text-2)', fontSize: 12 }}>{a.section || '—'}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                {(combo.tasks || []).map(t => (
                                  <span key={t} style={{ fontSize: 11, fontFamily: 'var(--mono)',
                                    color: 'var(--orange)', background: 'var(--orange-dim)',
                                    padding: '2px 7px', borderRadius: 5,
                                    border: '1px solid var(--orange-border)' }}>{t}</span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13,
                                color: (combo.adjusted_value || 0) >= 0 ? C.green : C.red }}>
                                {(combo.adjusted_value || 0).toFixed(1)}
                              </span>
                            </td>
                            <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{combo.total_duration || 0}m</span></td>
                            <td>
                              <span className={`badge ${combo.zero_possession ? 'badge-green' : 'badge-gray'}`}>
                                {combo.zero_possession ? '✓ Yes' : '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Task decisions */}
              {decisions.length > 0 && (
                <div className="panel ob-fade-up d3">
                  <div className="panel-header">
                    <div className="panel-title">
                      <div className="panel-dot" style={{ background: C.blue }} />
                      Task Decisions ({decisions.length})
                    </div>
                  </div>
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    <table className="rf-table">
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Status</th>
                          <th>Block</th>
                          <th>Score</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {decisions.map(d => (
                          <tr key={d.task_id} style={{ cursor: 'default' }}>
                            <td>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                                color: 'var(--text-2)' }}>{d.task_id}</span>
                            </td>
                            <td>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '3px 9px', borderRadius: 'var(--r-pill)',
                                fontSize: 10.5, fontWeight: 600,
                                background: statusBg(d.status),
                                color: statusColor(d.status),
                                border: `1px solid ${statusColor(d.status)}30`,
                              }}>
                                {(d.status || '').toUpperCase()}
                              </span>
                            </td>
                            <td><span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-4)' }}>{d.assigned_block || '—'}</span></td>
                            <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>{d.score?.toFixed(1) ?? '—'}</span></td>
                            <td style={{ maxWidth: 280 }}>
                              <span style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
                                {(d.reason || '').substring(0, 130)}{(d.reason || '').length > 130 ? '…' : ''}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
