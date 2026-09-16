import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

const C = {
  orange: '#f97316', green: '#22c55e', amber: '#f59e0b',
  red: '#ef4444', blue: '#3b82f6', purple: '#a855f7',
};

const fmtTime = s => s ? s.substring(11, 16) : '—';
const fmtDate = s => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

const COLORS = [C.orange, C.blue, C.green, C.amber, C.red, C.purple];

function BlockCard({ block, isSelected, onClick }) {
  const cap     = block.duration || 0;
  const remain  = block.remaining_capacity ?? cap;
  const utilized = cap - remain;
  const utilPct  = cap > 0 ? Math.min((utilized / cap) * 100, 100) : 0;
  const barColor = utilPct >= 90 ? C.red : utilPct >= 70 ? C.amber : C.orange;

  return (
    <div
      className="card-hover"
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isSelected ? C.orange : 'var(--border)'}`,
        borderTop: isSelected ? `2px solid ${C.orange}` : '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: 18,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, fontFamily: 'var(--mono)',
            letterSpacing: '-0.01em',
            color: isSelected ? C.orange : 'var(--text-1)' }}>{block.block_id}</div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{block.section}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)',
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
          padding: '2px 8px', borderRadius: 6 }}>{block.block_type?.split(' ')[0] || 'Block'}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 14px', marginBottom: 12 }}>
        {[
          ['Capacity',  `${cap} min`],
          ['Remaining', `${remain} min`],
          ['Date',      fmtDate(block.start_time)],
          ['Window',    `${fmtTime(block.start_time)}–${fmtTime(block.end_time)}`],
          ['Track',     block.affected_track || '—'],
          ['Corridor',  block.corridor?.split('-')[0] || '—'],
        ].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 9.5, color: 'var(--text-5)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 1 }}>{k}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Utilization bar */}
      <div style={{ marginBottom: block.safety_constraints?.length > 0 ? 10 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-5)', marginBottom: 4 }}>
          <span>Utilization</span>
          <span style={{ color: barColor, fontFamily: 'var(--mono)', fontWeight: 700 }}>{Math.round(utilPct)}%</span>
        </div>
        <div style={{ height: 3, background: 'var(--border-2)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${utilPct}%`, height: '100%', background: barColor, borderRadius: 2,
            transition: 'width 0.7s var(--ease)' }} />
        </div>
      </div>

      {block.safety_constraints?.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
          {block.safety_constraints.slice(0, 3).map(s => (
            <span key={s} style={{ fontSize: 9.5, color: C.amber, background: 'rgba(245,158,11,0.08)',
              padding: '2px 7px', borderRadius: 4, border: '1px solid rgba(245,158,11,0.18)' }}>
              {s.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Blocks() {
  const { data: blocks, loading: bLoad, error: bErr, reload: bReload } = useApi(() => api.blocks());
  const { data: opps,   loading: oLoad, error: oErr, reload: oReload } = useApi(() => api.opportunities());
  const [selected, setSelected] = useState(null);

  const err = bErr || oErr;
  if (err) return (
    <div className="page">
      <div className="ob-fade-up">
        <div className="page-eyebrow">Maintenance Windows</div>
        <h1 className="page-title">Block Explorer</h1>
      </div>
      <div style={{ padding: '20px 24px', background: 'rgba(239,68,68,0.06)',
        border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, marginTop: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>Backend Unreachable</div>
          <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{err} — make sure the backend is running on port 8000</div>
        </div>
        <button onClick={() => { bReload(); oReload(); }}
          style={{ padding: '8px 18px', borderRadius: 999, border: '1px solid #ef4444',
            background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
          ↺ Retry
        </button>
      </div>
    </div>
  );

  if (bLoad || oLoad) return (
    <div className="page">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 210 }} />)}
      </div>
    </div>
  );

  const selBlock = (blocks || []).find(b => b.block_id === selected);
  const selOpps  = (opps   || []).find(o => o.block_id === selected);
  const feasible = selOpps?.feasible_tasks || [];
  const combos   = selOpps?.compatible_combinations || [];

  return (
    <div className="page">
      <div className="ob-fade-up">
        <div className="page-eyebrow">Maintenance Windows</div>
        <h1 className="page-title">Block Explorer</h1>
        <p className="page-subtitle">{blocks?.length || 0} maintenance windows · select a block to see opportunities</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Block grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(blocks || []).map((b, i) => (
            <div key={b.block_id} className="ob-fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <BlockCard
                block={b}
                isSelected={selected === b.block_id}
                onClick={() => setSelected(p => p === b.block_id ? null : b.block_id)}
              />
            </div>
          ))}
        </div>

        {/* Opportunity detail */}
        {!selected ? (
          <div className="panel" style={{ display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', minHeight: 360, gap: 14 }}>
            <div style={{ fontSize: 36, opacity: 0.1 }}>▣</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Select a Block</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', maxWidth: 260, lineHeight: 1.7 }}>
              Click any block card to reveal its feasible tasks and compatible combinations
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Block summary */}
            <div className="panel ob-scale-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--mono)',
                    letterSpacing: '-0.02em', color: C.orange }}>{selected}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{selBlock?.section || '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="badge badge-orange">{feasible.length} feasible</span>
                  <span className="badge badge-gray">{combos.length} combos</span>
                </div>
              </div>
              {selBlock && (
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {[
                    ['Capacity',  `${selBlock.duration || 0} min`],
                    ['Remaining', `${selBlock.remaining_capacity ?? selBlock.duration ?? 0} min`],
                    ['Type',      selBlock.block_type || '—'],
                    ['Track',     selBlock.affected_track || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 9.5, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Feasible task nodes */}
            <div className="panel ob-scale-in" style={{ animationDelay: '0.05s' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--text-4)', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.orange,
                  animation: 'ob-dot-pulse 2s ease infinite' }} />
                Feasible Tasks ({feasible.length})
              </div>
              {feasible.length === 0 ? (
                <div className="empty-state" style={{ padding: '16px 0' }}>
                  <div className="empty-icon" style={{ fontSize: 24 }}>🚫</div>
                  <div className="empty-text">No feasible tasks for this block</div>
                </div>
              ) : (
                <div className="opp-graph">
                  {feasible.map((tid, i) => {
                    const c = COLORS[i % COLORS.length];
                    return (
                      <div key={tid} className="graph-node ob-scale-in"
                        style={{ borderColor: c, color: c, background: `${c}10`,
                          animationDelay: `${i * 0.04}s` }}>
                        {tid}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Compatible combinations */}
            <div className="panel ob-scale-in" style={{ animationDelay: '0.1s' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--text-4)', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green,
                  animation: 'ob-dot-pulse 2s ease infinite' }} />
                Compatible Combinations ({combos.length})
              </div>
              {combos.length === 0 ? (
                <div className="empty-state" style={{ padding: '16px 0' }}>
                  <div className="empty-icon" style={{ fontSize: 24 }}>📭</div>
                  <div className="empty-text">No compatible combinations</div>
                </div>
              ) : (
                combos.map((combo, i) => {
                  const tasks = combo.tasks || [];
                  return (
                    <div key={i} className="card-hover ob-fade-up"
                      style={{ animationDelay: `${i * 0.04}s`,
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 10,
                        background: 'var(--bg-2)', border: '1px solid var(--border)',
                        marginBottom: 7 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-5)',
                        minWidth: 22, fontFamily: 'var(--mono)' }}>#{i + 1}</span>
                      <div style={{ flex: 1, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {tasks.map(t => (
                          <span key={t} style={{ fontSize: 11.5, fontWeight: 700, color: C.orange,
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
                          <span style={{ fontSize: 9.5, color: C.green, background: 'rgba(34,197,94,0.08)',
                            padding: '1px 5px', borderRadius: 4, display: 'block', marginTop: 2,
                            border: '1px solid rgba(34,197,94,0.2)' }}>ZP</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
