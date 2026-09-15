import { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

const C = {
  orange: '#f97316', green: '#22c55e', amber: '#f59e0b',
  red: '#ef4444', blue: '#3b82f6', purple: '#a855f7',
};

const DEFAULT_WEIGHTS = {
  debt_weight: 0.35, flexibility_weight: 0.25, safety_weight: 0.20,
  opportunity_cost_weight: 0.10, resource_efficiency_weight: 0.10,
};

const OVERRIDE_FIELDS = [
  { value: 'maintenance_debt',  label: 'Maintenance Debt (0–60)' },
  { value: 'flexibility_score', label: 'Flexibility Score (0–1)' },
  { value: 'severity',          label: 'Severity (1–5)' },
  { value: 'days_overdue',      label: 'Days Overdue' },
];

function parseSummary(res) {
  if (!res) return null;
  const s = res.summary || {};
  return {
    planned:  s.planned_tasks  ?? 0,
    deferred: s.deferred_tasks ?? 0,
    rejected: s.rejected_tasks ?? 0,
    blockValue: (s.total_block_value || 0).toFixed(1),
    blocksUsed: s.blocks_with_assignments || 0,
  };
}

function ScenarioPanel({ plan, accentColor, loading }) {
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 300, gap: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%',
        border: `2px solid var(--border-2)`, borderTopColor: accentColor,
        animation: 'spin 0.7s linear infinite' }} />
      <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Running scenario…</div>
    </div>
  );
  if (!plan) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 300, gap: 10, opacity: 0.3 }}>
      <div style={{ fontSize: 36 }}>⟳</div>
      <div style={{ fontSize: 12 }}>Run to see results</div>
    </div>
  );

  const sm = parseSummary(plan);
  const assigns = (plan.block_assignments || []).filter(
    a => a.combination_details?.combination?.tasks?.length > 0
  );
  const decisions = plan.decisions ? Object.values(plan.decisions) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { l: 'Planned',  v: sm.planned,  c: C.green },
          { l: 'Deferred', v: sm.deferred, c: C.amber },
          { l: 'Rejected', v: sm.rejected, c: C.red   },
        ].map(s => (
          <div key={s.l} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderTop: `2px solid ${s.c}`, borderRadius: 'var(--r-md)', padding: '10px 12px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--mono)',
              letterSpacing: '-0.03em', color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Block assignments */}
      {assigns.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: 10 }}>Block Assignments</div>
          {assigns.map(a => {
            const tasks = a.combination_details?.combination?.tasks || [];
            return (
              <div key={a.block_id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: accentColor, minWidth: 56 }}>{a.block_id}</span>
                <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {tasks.map(t => (
                    <span key={t} style={{ fontSize: 10.5, fontFamily: 'var(--mono)',
                      background: `${accentColor}12`, color: accentColor,
                      padding: '1px 6px', borderRadius: 4, border: `1px solid ${accentColor}25` }}>{t}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decisions */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', padding: '12px 14px', maxHeight: 260, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: 8 }}>
          Task Decisions ({decisions.length})
        </div>
        {decisions.map(d => {
          const s = (d.status || '').toUpperCase();
          const c = { SELECTED: C.green, PLANNED: C.green, PENDING: C.blue,
            DEFERRED: C.amber, REJECTED: C.red, PROTECTED: C.purple }[s] || 'var(--text-4)';
          return (
            <div key={d.task_id} style={{ display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-2)', fontWeight: 700, minWidth: 40 }}>{d.task_id}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: c, minWidth: 66 }}>{s}</span>
              <span style={{ fontSize: 11, color: 'var(--text-4)', flex: 1, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(d.reason || '').substring(0, 70)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeltaBadge({ base, mod }) {
  if (base == null || mod == null) return null;
  const diff = mod - base;
  if (diff === 0) return <span className="badge badge-gray">same</span>;
  return <span className={`badge ${diff > 0 ? 'badge-green' : 'badge-red'}`}>{diff > 0 ? '▲' : '▼'} {Math.abs(diff)}</span>;
}

export default function WhatIf() {
  const { data: tasks } = useApi(() => api.tasks());

  const [mods,     setMods]    = useState([]);
  const [newMod,   setNewMod]  = useState({ task_id: '', field: 'maintenance_debt', value: '' });
  const [hasRun,   setHasRun]  = useState(false);
  const [baseRes,  setBaseRes] = useState(null);
  const [modRes,   setModRes]  = useState(null);
  const [bLoading, setBLoad]   = useState(false);
  const [mLoading, setMLoad]   = useState(false);

  const addMod = () => {
    if (!newMod.task_id || newMod.value === '') return;
    setMods(p => [
      ...p.filter(m => !(m.task_id === newMod.task_id && m.field === newMod.field)),
      { ...newMod, value: parseFloat(newMod.value) },
    ]);
    setNewMod(p => ({ ...p, value: '' }));
  };

  const removeMod = i => setMods(p => p.filter((_, j) => j !== i));

  const handleRun = useCallback(async () => {
    setHasRun(true); setBaseRes(null); setModRes(null);
    setBLoad(true); setMLoad(true);
    const [bRes, mRes] = await Promise.allSettled([
      api.optimize({ weights: DEFAULT_WEIGHTS }),
      api.optimize({ weights: DEFAULT_WEIGHTS, task_overrides: mods }),
    ]);
    setBaseRes(bRes.status === 'fulfilled' ? bRes.value : null);
    setModRes (mRes.status === 'fulfilled' ? mRes.value : null);
    setBLoad(false); setMLoad(false);
  }, [mods]);

  const bs = parseSummary(baseRes);
  const ms = parseSummary(modRes);
  const running = bLoading || mLoading;

  return (
    <div className="page">
      <div className="ob-fade-up">
        <div className="page-eyebrow">Scenario Analysis</div>
        <h1 className="page-title">What-If Simulator</h1>
        <p className="page-subtitle">Override task parameters and compare baseline vs modified plan side-by-side</p>
      </div>

      {/* Override builder */}
      <div className="panel ob-fade-up d1" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="panel-title">
            <div className="panel-dot" />
            Task Overrides
          </div>
          {mods.length > 0 && (
            <span className="badge badge-orange">{mods.length} override{mods.length > 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Add row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: 4 }}>Task ID</div>
            <select className="rf-select" style={{ width: '100%' }}
              value={newMod.task_id} onChange={e => setNewMod(p => ({ ...p, task_id: e.target.value }))}>
              <option value="">Select task…</option>
              {(tasks || []).map(t => (
                <option key={t.task_id} value={t.task_id}>
                  {t.task_id} — {t.task_type} ({t.section})
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: 4 }}>Field</div>
            <select className="rf-select" style={{ width: '100%' }}
              value={newMod.field} onChange={e => setNewMod(p => ({ ...p, field: e.target.value }))}>
              {OVERRIDE_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 110px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: 4 }}>New Value</div>
            <input
              type="number" value={newMod.value}
              onChange={e => setNewMod(p => ({ ...p, value: e.target.value }))}
              placeholder="e.g. 55"
              className="rf-input"
              onFocus={e => e.target.style.borderColor = 'rgba(249,115,22,0.4)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-2)'}
            />
          </div>
          <button onClick={addMod} className="btn btn-primary" style={{ height: 36, padding: '0 18px', flexShrink: 0 }}>
            + Add
          </button>
        </div>

        {/* Override tags */}
        {mods.length > 0 && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
            {mods.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--bg-2)', border: '1px solid var(--orange-border)',
                borderRadius: 8, padding: '4px 10px', fontSize: 12 }}>
                <span style={{ fontFamily: 'var(--mono)', color: C.orange, fontWeight: 700 }}>{m.task_id}</span>
                <span style={{ color: 'var(--text-4)' }}>·</span>
                <span style={{ color: 'var(--text-3)' }}>{m.field}</span>
                <span style={{ color: 'var(--text-4)' }}>→</span>
                <span style={{ fontFamily: 'var(--mono)', color: C.amber, fontWeight: 700 }}>{m.value}</span>
                <button onClick={() => removeMod(i)}
                  style={{ color: 'var(--text-4)', fontSize: 14, lineHeight: 1, marginLeft: 2,
                    transition: 'color var(--t-fast)', border: 'none', background: 'none',
                    cursor: 'pointer', padding: 0 }}
                  onMouseEnter={e => e.target.style.color = C.red}
                  onMouseLeave={e => e.target.style.color = 'var(--text-4)'}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={handleRun}
            disabled={running}
            className={running ? 'btn btn-running' : 'btn btn-primary'}
            style={{ padding: '10px 24px' }}
          >
            {running
              ? <><span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>⟳</span> Running…</>
              : '▶  Run Comparison'}
          </button>
          {mods.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
              Add overrides above — without them, both plans will be identical
            </span>
          )}
        </div>
      </div>

      {/* Delta bar */}
      {hasRun && bs && ms && (
        <div className="ob-scale-in" style={{ marginBottom: 18, padding: '12px 16px',
          background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.15)',
          borderRadius: 'var(--r-md)', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.orange, textTransform: 'uppercase',
            letterSpacing: '0.1em' }}>Δ Plan Delta</span>
          {[
            { l: 'Planned',  base: bs.planned,  mod: ms.planned  },
            { l: 'Deferred', base: bs.deferred, mod: ms.deferred },
            { l: 'Rejected', base: bs.rejected, mod: ms.rejected },
          ].map(item => (
            <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{item.l}:</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{item.base}</span>
              <span style={{ color: 'var(--text-5)' }}>→</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{item.mod}</span>
              <DeltaBadge base={item.base} mod={item.mod} />
            </div>
          ))}
        </div>
      )}

      {/* Side-by-side */}
      {hasRun ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: C.blue }} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>Baseline Plan</span>
              <span className="badge badge-gray">No overrides</span>
            </div>
            <ScenarioPanel plan={baseRes} accentColor={C.blue} loading={bLoading} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: C.green }} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>Modified Plan</span>
              <span className="badge badge-orange">{mods.length} override{mods.length !== 1 ? 's' : ''}</span>
            </div>
            <ScenarioPanel plan={modRes} accentColor={C.green} loading={mLoading} />
          </div>
        </div>
      ) : (
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 280, gap: 14 }}>
          <div style={{ fontSize: 36, opacity: 0.1 }}>⟳</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Configure & Compare</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', maxWidth: 360, lineHeight: 1.7 }}>
            Add task overrides above (e.g. set T001 maintenance_debt to 55), then click Run Comparison to see how the plan changes
          </div>
        </div>
      )}
    </div>
  );
}
