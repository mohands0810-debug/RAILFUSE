import { useState, useCallback } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../api/client';
import { Loading, ErrorBox, Card, Badge, StatusBadge, Tag, Btn, ReasoningBox } from '../components/UI';

const PAGE = { padding:'28px 32px', maxWidth:1400, animation:'fadeUp 0.25s ease' };
const H1   = { fontSize:24, fontWeight:800, background:'linear-gradient(135deg,#f1f5f9,#94a3b8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-0.5px', marginBottom:4 };
const inp  = { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text-1)', fontSize:13, outline:'none', width:'100%' };

const EMPTY_SCENARIO = { scenario_name: 'My Scenario', task_modifications: [], block_modifications: [] };

export default function WhatIf() {
  const [scenario, setScenario] = useState({ ...EMPTY_SCENARIO });
  const [result,   setResult]   = useState(null);

  // Add a task modification
  const [modTaskId,    setModTaskId]    = useState('T015');
  const [modField,     setModField]     = useState('severity');
  const [modValue,     setModValue]     = useState('5');

  const { data: tasks } = useApi(() => api.tasks());

  const { mutate: runWhatIf, loading, error } = useMutation(
    useCallback(() => api.whatIf(scenario), [scenario])
  );

  async function handleRun() {
    try { const r = await runWhatIf(); setResult(r); }
    catch {}
  }

  function addMod() {
    const numVal = !isNaN(modValue) ? parseFloat(modValue) : modValue;
    setScenario(s => ({
      ...s,
      task_modifications: [
        ...s.task_modifications.filter(m => !(m.task_id === modTaskId && m.field === modField)),
        { task_id: modTaskId, field: modField, value: numVal },
      ],
    }));
  }

  function removeMod(idx) {
    setScenario(s => ({ ...s, task_modifications: s.task_modifications.filter((_,i)=>i!==idx) }));
  }

  const taskIds = (tasks||[]).map(t => t.task_id).sort();
  const FIELDS = ['severity','days_overdue','previous_deferrals','duration','criticality'];

  const sel = { ...inp, cursor:'pointer' };
  const smallInp = { ...inp, padding:'6px 10px', fontSize:12 };

  return (
    <div style={PAGE}>
      <div style={{ marginBottom:24 }}>
        <h1 style={H1}>🔬 What-If Simulator</h1>
        <p style={{ fontSize:14, color:'var(--text-3)' }}>Modify task parameters and instantly see how the optimizer's decisions change</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:20 }}>
        {/* Config */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Card title="📝 Scenario Setup">
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:6 }}>Scenario Name</div>
              <input id="whatif-name" style={inp} value={scenario.scenario_name}
                onChange={e => setScenario(s => ({ ...s, scenario_name: e.target.value }))} />
            </div>

            {/* Add modification */}
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>Add Task Modification</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 80px', gap:8, marginBottom:10 }}>
              <div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>Task ID</div>
                <select id="whatif-task-select" style={{ ...sel, padding:'6px 10px', fontSize:12 }} value={modTaskId} onChange={e => setModTaskId(e.target.value)}>
                  {taskIds.map(id => <option key={id} value={id}>{id}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>Field</div>
                <select id="whatif-field-select" style={{ ...sel, padding:'6px 10px', fontSize:12 }} value={modField} onChange={e => setModField(e.target.value)}>
                  {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>Value</div>
                <input id="whatif-value-input" style={smallInp} value={modValue} onChange={e => setModValue(e.target.value)} />
              </div>
            </div>
            <Btn id="btn-add-modification" onClick={addMod} variant="secondary" size="sm">+ Add Modification</Btn>

            {/* Applied modifications */}
            {scenario.task_modifications.length > 0 && (
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>Applied ({scenario.task_modifications.length})</div>
                {scenario.task_modifications.map((m,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'var(--bg-elevated)', borderRadius:6, marginBottom:5 }}>
                    <Tag>{m.task_id}</Tag>
                    <span style={{ fontSize:12, color:'var(--text-3)' }}>{m.field}</span>
                    <span style={{ fontSize:12, color:'var(--accent)', fontFamily:'var(--mono)', fontWeight:700, marginLeft:'auto' }}>{String(m.value)}</span>
                    <button onClick={() => removeMod(i)} style={{ color:'var(--red)', fontSize:14, opacity:0.7 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {error && <div style={{ color:'var(--red)', fontSize:12 }}>Error: {error}</div>}
          <Btn id="btn-run-whatif" onClick={handleRun} loading={loading}>
            {loading ? 'Running…' : '▶ Run Scenario'}
          </Btn>
        </div>

        {/* Results */}
        <div>
          {!result
            ? <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'60px 24px', textAlign:'center', color:'var(--text-3)' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🔬</div>
                <div style={{ fontSize:15, color:'var(--text-2)', marginBottom:6 }}>Configure modifications and run a scenario</div>
                <div style={{ fontSize:13 }}>The What-If simulator re-runs the full optimizer with your changes and shows a side-by-side comparison</div>
              </div>
            : <WhatIfResults result={result} />
          }
        </div>
      </div>
    </div>
  );
}

function WhatIfResults({ result }) {
  const { baseline_plan, modified_plan, summary_delta, modifications_applied } = result;
  const bSum = baseline_plan?.summary || {};
  const mSum = modified_plan?.summary || {};

  const delta = (a, b) => {
    const d = b - a;
    if (d === 0) return <span style={{ color:'var(--text-3)' }}>±0</span>;
    const sign = d > 0 ? '+' : '';
    return <span style={{ color: d > 0 ? 'var(--green)' : 'var(--red)', fontWeight:700 }}>{sign}{d}</span>;
  };

  // Find tasks whose decisions changed
  const bDec = baseline_plan?.task_decisions || {};
  const mDec = modified_plan?.task_decisions || {};
  const changed = Object.keys(bDec).filter(tid => bDec[tid]?.status !== mDec[tid]?.status);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Modifications Applied */}
      {modifications_applied?.length > 0 && (
        <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10, padding:'12px 16px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>Modifications Applied</div>
          {modifications_applied.map((m,i) => (
            <div key={i} style={{ fontSize:12, color:'var(--text-2)', marginBottom:4 }}>
              <Tag>{m.task_id}</Tag> <span style={{ color:'var(--text-3)' }}>{m.field}:</span> <span style={{ fontFamily:'var(--mono)', color:'var(--amber)' }}>{String(m.old_value)}</span> <span style={{ color:'var(--text-3)' }}>→</span> <span style={{ fontFamily:'var(--mono)', color:'var(--green)', fontWeight:700 }}>{String(m.new_value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Side-by-side Summary */}
      <Card title="📊 Plan Comparison">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 60px 1fr', gap:8, alignItems:'center' }}>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--text-2)', marginBottom:10 }}>Baseline</div>
          <div style={{ textAlign:'center', fontSize:11, color:'var(--text-3)', fontWeight:600 }}>Δ</div>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--text-2)', marginBottom:10 }}>Modified</div>

          {[
            ['Planned Tasks',   bSum.planned_tasks,   mSum.planned_tasks,   true  ],
            ['Deferred Tasks',  bSum.deferred_tasks,  mSum.deferred_tasks,  false ],
            ['Protected Tasks', bSum.protected_tasks, mSum.protected_tasks, false ],
            ['Block Value',     bSum.total_block_value?.toFixed(1), mSum.total_block_value?.toFixed(1), true],
          ].map(([lbl,bv,mv,positiveIsGood]) => (
            <>
              <div key={lbl+'b'} style={{ padding:'8px 12px', background:'var(--bg-elevated)', borderRadius:6 }}>
                <div style={{ fontSize:10, color:'var(--text-3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{lbl}</div>
                <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:18, color:'var(--text-1)' }}>{bv ?? '—'}</div>
              </div>
              <div key={lbl+'d'} style={{ textAlign:'center' }}>
                {typeof bv === 'number' && typeof mv === 'number' ? delta(bv, mv) : '—'}
              </div>
              <div key={lbl+'m'} style={{ padding:'8px 12px', background:'rgba(99,102,241,0.08)', border:'1px solid var(--border-bright)', borderRadius:6 }}>
                <div style={{ fontSize:10, color:'var(--text-3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{lbl}</div>
                <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:18, color:'var(--accent)' }}>{mv ?? '—'}</div>
              </div>
            </>
          ))}
        </div>
      </Card>

      {/* Changed Decisions */}
      {changed.length > 0 ? (
        <Card title="🔄 Changed Decisions" badge={`${changed.length} tasks`}>
          {changed.map(tid => (
            <div key={tid} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border-subtle)' }}>
              <Tag>{tid}</Tag>
              <StatusBadge status={bDec[tid]?.status} />
              <span style={{ color:'var(--text-3)', fontSize:16 }}>→</span>
              <StatusBadge status={mDec[tid]?.status} />
              <div style={{ flex:1, fontSize:11, color:'var(--text-3)', marginLeft:8 }}>{mDec[tid]?.reason?.slice(0,120)}</div>
            </div>
          ))}
        </Card>
      ) : (
        <div style={{ background:'var(--green-bg)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:10, padding:'14px 16px', fontSize:13, color:'#6ee7b7' }}>
          ✅ No task decisions changed under this scenario.
        </div>
      )}
    </div>
  );
}
