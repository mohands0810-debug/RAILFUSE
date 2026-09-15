import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

const C = {
  orange: '#f97316', green: '#22c55e', amber: '#f59e0b',
  red: '#ef4444', blue: '#3b82f6', purple: '#a855f7',
};
const COLORS = [C.orange, C.blue, C.green, C.amber, C.red, C.purple];

export default function Opportunities() {
  const { data: opps, loading } = useApi(() => api.opportunities());
  const [blockId, setBlockId]   = useState('');
  const [hovered, setHovered]   = useState(null);

  if (loading) return (
    <div className="page">
      <div className="skeleton" style={{ height: 48, borderRadius: 'var(--r-pill)', marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 280, borderRadius: 'var(--r-lg)' }} />
    </div>
  );

  const blocks  = [...new Set((opps || []).map(o => o.block_id))].sort();
  const activeId = blockId || blocks[0] || '';
  const sel      = (opps || []).find(o => o.block_id === activeId);

  const feasibleIds  = sel?.feasible_tasks || [];
  const graphNodes   = sel?.opportunity_graph?.nodes || [];
  const combos       = sel?.compatible_combinations || [];
  const best         = sel?.best_combination;
  const infeasible   = sel?.infeasible_tasks || [];
  const explanations = sel?.explanations || {};

  const nodeMap = {};
  graphNodes.forEach(n => { nodeMap[n.task_id] = n; });

  return (
    <div className="page">
      <div className="ob-fade-up">
        <div className="page-eyebrow">Combinatorial Analysis</div>
        <h1 className="page-title">Opportunity Engine</h1>
        <p className="page-subtitle">
          {opps?.length || 0} blocks · {feasibleIds.length} feasible tasks · {combos.length} combinations for {activeId}
        </p>
      </div>

      {/* Block tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: 'var(--text-4)', marginRight: 4 }}>Block:</span>
        {blocks.map(id => (
          <button
            key={id}
            onClick={() => setBlockId(id)}
            style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', border: `1px solid ${activeId === id ? C.orange : 'var(--border-2)'}`,
              background: activeId === id ? 'var(--orange-dim)' : 'transparent',
              color: activeId === id ? C.orange : 'var(--text-3)',
              fontFamily: 'var(--font)', transition: 'all var(--t-fast)' }}
          >
            {id}
          </button>
        ))}
      </div>

      {/* Stats strip */}
      {sel && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          {[
            { l: 'Feasible Tasks',   v: feasibleIds.length,   c: C.orange },
            { l: 'Combinations',     v: combos.length,        c: C.green  },
            { l: 'Infeasible Tasks', v: infeasible.length,    c: C.red    },
            { l: 'Block Duration',   v: `${sel.duration || 0} min`, c: C.blue },
            { l: 'Remaining Cap.',   v: `${sel.remaining_capacity ?? sel.duration ?? 0} min`, c: C.amber },
          ].map(item => (
            <div key={item.l} style={{ display: 'flex', gap: 10, alignItems: 'center',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', padding: '8px 14px' }}>
              <div style={{ width: 3, height: 22, background: item.c, borderRadius: 1.5, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'var(--mono)',
                  letterSpacing: '-0.02em', color: item.c }}>{item.v}</div>
                <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{item.l}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 18 }}>
        {/* Left: graph */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="panel ob-fade-up d2">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--text-4)', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.orange,
                animation: 'ob-dot-pulse 2s ease infinite' }} />
              Feasible Task Graph — {activeId}
            </div>
            {feasibleIds.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🌐</div><div className="empty-text">No feasible tasks for this block</div></div>
            ) : (
              <div className="opp-graph">
                {feasibleIds.map((tid, i) => {
                  const c = COLORS[i % COLORS.length];
                  const n = nodeMap[tid];
                  return (
                    <div key={tid} className="graph-node ob-scale-in"
                      style={{ animationDelay: `${i * 0.05}s`,
                        borderColor: c, color: c,
                        background: hovered === tid ? `${c}20` : `${c}0c`,
                        boxShadow: hovered === tid ? `0 0 14px ${c}30` : 'none',
                        transform: hovered === tid ? 'scale(1.07)' : 'scale(1)',
                        textAlign: 'center', minWidth: 80 }}
                      onClick={() => setHovered(p => p === tid ? null : tid)}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{tid}</div>
                      {n?.department && <div style={{ fontSize: 9.5, opacity: 0.65, marginTop: 2 }}>{n.department}</div>}
                      {n?.duration   && <div style={{ fontSize: 9.5, fontFamily: 'var(--mono)', opacity: 0.5, marginTop: 1 }}>{n.duration}m</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Task detail list */}
          {feasibleIds.length > 0 && (
            <div className="panel ob-fade-up d3">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--text-4)', marginBottom: 10 }}>Task Details</div>
              {feasibleIds.map(tid => {
                const n = nodeMap[tid];
                const dc = n?.maintenance_debt >= 40 ? C.red : n?.maintenance_debt >= 25 ? C.amber : C.green;
                return (
                  <div key={tid}
                    style={{ display: 'flex', gap: 8, padding: '8px 0',
                      borderBottom: '1px solid var(--border)', fontSize: 12,
                      background: hovered === tid ? 'rgba(249,115,22,0.04)' : 'transparent',
                      transition: 'background var(--t-fast)', borderRadius: 4 }}
                    onClick={() => setHovered(p => p === tid ? null : tid)}>
                    <span style={{ fontFamily: 'var(--mono)', color: C.orange, fontWeight: 700, minWidth: 48 }}>{tid}</span>
                    {n ? (
                      <>
                        <span style={{ flex: 1, color: 'var(--text-3)' }}>{n.department}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-4)', minWidth: 34 }}>{n.duration || 0}m</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: dc, minWidth: 36 }}>
                          D:{(n.maintenance_debt || 0).toFixed(0)}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-4)' }}>—</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: combinations */}
        <div>
          {/* Best highlight */}
          {best && (
            <div className="ob-scale-in" style={{ marginBottom: 12, padding: '14px 16px', borderRadius: 'var(--r-lg)',
              background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: C.green, textTransform: 'uppercase',
                letterSpacing: '0.1em', marginBottom: 8 }}>⭐ Best Combination</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {(best.tasks || []).map(t => (
                  <span key={t} style={{ fontSize: 12.5, fontWeight: 700, color: C.green,
                    fontFamily: 'var(--mono)', background: 'rgba(34,197,94,0.1)',
                    padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.25)' }}>{t}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-3)' }}>
                <span>Value: <b style={{ color: C.green, fontFamily: 'var(--mono)' }}>{(best.adjusted_value || 0).toFixed(2)}</b></span>
                <span>Duration: <b style={{ fontFamily: 'var(--mono)' }}>{best.total_duration || 0}m</b></span>
                {best.zero_possession && <span style={{ color: C.green, fontWeight: 700 }}>✓ Zero Possession</span>}
              </div>
            </div>
          )}

          <div className="panel ob-fade-up d2">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--text-4)', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green,
                animation: 'ob-dot-pulse 2s ease infinite' }} />
              Compatible Combinations ({combos.length})
            </div>
            {combos.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🧩</div><div className="empty-text">No compatible combinations</div></div>
            ) : (
              combos.map((combo, i) => {
                const tasks = combo.tasks || [];
                const isBest = JSON.stringify(tasks) === JSON.stringify(best?.tasks || []);
                return (
                  <div key={i} className="card-hover ob-fade-up"
                    style={{ animationDelay: `${i * 0.04}s`,
                      padding: '11px 14px', borderRadius: 10,
                      background: 'var(--bg-2)',
                      border: `1px solid ${isBest ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                      marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-5)',
                        minWidth: 22, fontFamily: 'var(--mono)' }}>#{i + 1}</span>
                      <div style={{ flex: 1, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {tasks.map(t => (
                          <span key={t} style={{ fontSize: 12, fontWeight: 700, color: C.orange,
                            fontFamily: 'var(--mono)', background: 'var(--orange-dim)',
                            padding: '2px 7px', borderRadius: 5, border: '1px solid var(--orange-border)' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)',
                          color: (combo.adjusted_value || 0) >= 0 ? C.green : C.red }}>
                          {(combo.adjusted_value || 0).toFixed(1)}
                        </div>
                        {combo.zero_possession && (
                          <span style={{ fontSize: 9.5, color: C.green, display: 'block', marginTop: 2 }}>ZP ✓</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-4)', marginTop: 7, marginLeft: 32 }}>
                      <span>{combo.total_duration || 0}m total</span>
                      <span>{combo.remaining_after || 0}m spare</span>
                      {combo.additional_possession > 0 && (
                        <span style={{ color: C.amber }}>+{combo.additional_possession}m possession</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
