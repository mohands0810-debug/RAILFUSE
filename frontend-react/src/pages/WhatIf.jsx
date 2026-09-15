import { useState } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../api/client';

const DEFAULT_WEIGHTS = {
  debt_weight: 0.35,
  flexibility_weight: 0.25,
  safety_weight: 0.20,
  opportunity_cost_weight: 0.10,
  resource_efficiency_weight: 0.10,
};

function DeltaBadge({ base, modified }) {
  if (base === undefined || modified === undefined) return null;
  const diff = modified - base;
  if (diff === 0) return <span className="badge badge-gray">→ Same</span>;
  return (
    <span className={`badge ${diff > 0 ? 'badge-green' : 'badge-red'}`}>
      {diff > 0 ? '▲' : '▼'} {Math.abs(diff)} {diff > 0 ? 'more' : 'fewer'}
    </span>
  );
}

function ScenarioPanel({ title, plan, accentColor, loading, empty }) {
  const summary   = plan?.summary || {};
  const decisions = plan?.task_decisions || [];
  const assigns   = plan?.block_assignments || [];

  if (loading) return (
    <div className="panel" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', minHeight:400, gap:16 }}>
      <div style={{ width:48, height:48, borderRadius:'50%',
        border:`3px solid ${accentColor}30`, borderTop:`3px solid ${accentColor}`,
        animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13, color:'var(--text-2)' }}>Running scenario…</div>
    </div>
  );

  if (empty) return (
    <div className="panel" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', minHeight:400, gap:12, opacity:0.5 }}>
      <div style={{ fontSize:40, animation:'float 3s ease infinite' }}>⟳</div>
      <div style={{ fontSize:14, color:'var(--text-3)' }}>Run to see results</div>
    </div>
  );

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {[
          { l:'Planned',  v:summary.tasks_planned  || 0, c:'#10b981' },
          { l:'Deferred', v:summary.tasks_deferred || 0, c:'#f59e0b' },
          { l:'Rejected', v:summary.tasks_rejected || 0, c:'#ef4444' },
        ].map(s => (
          <div key={s.l} className="stat-card anim-scale" style={{ padding:'10px 12px', '--card-accent':s.c }}>
            <div className="stat-label" style={{ fontSize:10 }}>{s.l}</div>
            <div className="stat-value" style={{ color:s.c, fontSize:24 }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Block assignments */}
      <div className="panel anim-blur-up" style={{ padding:'14px' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
          letterSpacing:'0.8px', color:'var(--text-3)', marginBottom:10 }}>
          Block Assignments
        </div>
        {assigns.filter(a => (a.selected_tasks||[]).length > 0).map(a => (
          <div key={a.block_id} style={{ display:'flex', alignItems:'center', gap:8,
            padding:'7px 0', borderBottom:'1px solid var(--border-subtle)' }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700,
              color:accentColor, minWidth:60 }}>{a.block_id}</span>
            <div style={{ flex:1, display:'flex', gap:4, flexWrap:'wrap' }}>
              {(a.selected_tasks||[]).map(t => (
                <span key={t} style={{ fontSize:10.5, fontFamily:'var(--mono)',
                  background:`${accentColor}15`, color:accentColor,
                  padding:'1px 6px', borderRadius:4, border:`1px solid ${accentColor}25` }}>{t}</span>
              ))}
            </div>
            <span className={`badge ${a.zero_possession?'badge-green':'badge-gray'}`} style={{ fontSize:10 }}>
              {a.zero_possession ? 'ZP' : '—'}
            </span>
          </div>
        ))}
        {assigns.filter(a => (a.selected_tasks||[]).length > 0).length === 0 && (
          <div style={{ fontSize:12, color:'var(--text-3)', padding:'12px 0', textAlign:'center' }}>No assignments</div>
        )}
      </div>
    </div>
  );
}

export default function WhatIf() {
  const { data: tasks } = useApi(() => api.tasks());
  const { mutate: runBase,     loading: bRunning, data: baseResult }     = useMutation(cfg => api.optimize(cfg));
  const { mutate: runModified, loading: mRunning, data: modifiedResult } = useMutation(cfg => api.optimize(cfg));

  const [mods,    setMods]    = useState([]);
  const [newMod,  setNewMod]  = useState({ task_id:'', field:'severity', value:'' });
  const [hasRun,  setHasRun]  = useState(false);

  const FIELDS = [
    { value:'severity',             label:'Severity Level (1-5)' },
    { value:'maintenance_debt',     label:'Maintenance Debt (0-60)' },
    { value:'flexibility_score',    label:'Flexibility Score (0-1)' },
    { value:'duration_hours',       label:'Duration (hours)' },
  ];

  const addMod = () => {
    if (!newMod.task_id || !newMod.value) return;
    setMods(prev => [...prev.filter(m => !(m.task_id===newMod.task_id&&m.field===newMod.field)),
      { ...newMod, value: parseFloat(newMod.value) }]);
    setNewMod(prev => ({ ...prev, value:'' }));
  };

  const removeMod = (i) => setMods(prev => prev.filter((_,j) => j !== i));

  const handleRun = () => {
    setHasRun(true);
    const baseCfg = { weights: DEFAULT_WEIGHTS };
    const modCfg  = { weights: DEFAULT_WEIGHTS, task_overrides: mods };
    runBase(baseCfg);
    runModified(modCfg);
  };

  const bs = baseResult?.summary || {};
  const ms = modifiedResult?.summary || {};

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header anim-blur">
        <div className="page-eyebrow">Scenario Analysis</div>
        <h1 className="page-title gradient-text">What-If Simulator</h1>
        <p className="page-subtitle">
          Override task parameters and see how the plan changes · side-by-side comparison
        </p>
      </div>

      {/* Modification builder */}
      <div className="panel anim-blur-up mb-4" style={{ marginBottom:20 }}>
        <div className="panel-header">
          <div className="panel-title"><div className="panel-title-dot" />Task Overrides</div>
          {mods.length > 0 && <span className="badge badge-purple">{mods.length} override{mods.length>1?'s':''}</span>}
        </div>

        {/* Add row */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end', marginBottom:16 }}>
          <div style={{ flex:'1 1 160px' }}>
            <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-3)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.6px' }}>Task ID</div>
            <select className="rf-select" style={{ width:'100%' }}
              value={newMod.task_id} onChange={e => setNewMod(p=>({...p,task_id:e.target.value}))}>
              <option value="">Select task…</option>
              {(tasks||[]).map(t => <option key={t.task_id} value={t.task_id}>{t.task_id} — {t.task_type}</option>)}
            </select>
          </div>
          <div style={{ flex:'1 1 200px' }}>
            <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-3)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.6px' }}>Field</div>
            <select className="rf-select" style={{ width:'100%' }}
              value={newMod.field} onChange={e => setNewMod(p=>({...p,field:e.target.value}))}>
              {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div style={{ flex:'0 0 100px' }}>
            <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-3)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.6px' }}>New Value</div>
            <input type="number" value={newMod.value}
              onChange={e => setNewMod(p=>({...p,value:e.target.value}))}
              placeholder="e.g. 5"
              style={{ width:'100%', padding:'7px 10px', background:'var(--bg-elevated)',
                border:'1px solid var(--border)', borderRadius:'var(--r-md)',
                color:'var(--text-1)', fontSize:13, outline:'none',
                transition:'border-color var(--t-fast)' }}
              onFocus={e=>e.target.style.borderColor='var(--border-bright)'}
              onBlur={e=>e.target.style.borderColor='var(--border)'}
            />
          </div>
          <button className="btn btn-primary" onClick={addMod} style={{ padding:'8px 16px', height:36 }}>
            + Add
          </button>
        </div>

        {/* Override list */}
        {mods.length > 0 && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            {mods.map((m,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:6,
                background:'var(--bg-elevated)', border:'1px solid var(--border-bright)',
                borderRadius:8, padding:'5px 10px', fontSize:12, animation:'scaleIn 0.25s var(--ease-spring)' }}>
                <span style={{ fontFamily:'var(--mono)', color:'var(--accent)', fontWeight:700 }}>{m.task_id}</span>
                <span style={{ color:'var(--text-3)' }}>·</span>
                <span style={{ color:'var(--text-2)' }}>{m.field}</span>
                <span style={{ color:'var(--text-3)' }}>→</span>
                <span style={{ fontFamily:'var(--mono)', color:'var(--amber)', fontWeight:700 }}>{m.value}</span>
                <button onClick={() => removeMod(i)} style={{ color:'var(--text-3)', fontSize:14,
                  marginLeft:2, transition:'color var(--t-fast)', lineHeight:1 }}
                  onMouseEnter={e=>e.target.style.color='#ef4444'}
                  onMouseLeave={e=>e.target.style.color='var(--text-3)'}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <button className="btn btn-primary" onClick={handleRun}
            disabled={bRunning||mRunning}
            style={{ padding:'9px 24px', fontSize:13 }}>
            {(bRunning||mRunning)
              ? <><span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</span> Running both scenarios…</>
              : '▶ Run Comparison'
            }
          </button>
          {mods.length === 0 && (
            <span style={{ fontSize:12, color:'var(--text-3)' }}>
              No overrides — both scenarios will be identical (add overrides above)
            </span>
          )}
        </div>
      </div>

      {/* Delta summary */}
      {hasRun && baseResult && modifiedResult && (
        <div className="panel anim-scale" style={{ marginBottom:20,
          background:'linear-gradient(90deg,rgba(99,102,241,0.06),rgba(139,92,246,0.04))' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--brand)', textTransform:'uppercase',
            letterSpacing:'0.8px', marginBottom:10 }}>Δ Plan Delta</div>
          <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
            {[
              { label:'Planned',  base:bs.tasks_planned,  mod:ms.tasks_planned  },
              { label:'Deferred', base:bs.tasks_deferred, mod:ms.tasks_deferred },
              { label:'Rejected', base:bs.tasks_rejected, mod:ms.tasks_rejected },
            ].map(item => (
              <div key={item.label} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
                <span style={{ color:'var(--text-2)' }}>{item.label}:</span>
                <span style={{ fontFamily:'var(--mono)', fontWeight:700 }}>{item.base}</span>
                <span style={{ color:'var(--text-3)' }}>→</span>
                <span style={{ fontFamily:'var(--mono)', fontWeight:700 }}>{item.mod}</span>
                <DeltaBadge base={item.base} modified={item.mod} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-side */}
      {hasRun && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* Baseline */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:12, height:12, borderRadius:3, background:'#6366f1' }} />
              <span style={{ fontSize:14, fontWeight:700 }}>Baseline Plan</span>
              <span className="badge badge-blue">No overrides</span>
            </div>
            <ScenarioPanel title="Baseline" plan={baseResult} accentColor="#6366f1"
              loading={bRunning} empty={!baseResult} />
          </div>
          {/* Modified */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:12, height:12, borderRadius:3, background:'#10b981' }} />
              <span style={{ fontSize:14, fontWeight:700 }}>Modified Plan</span>
              <span className="badge badge-green">{mods.length} override{mods.length!==1?'s':''}</span>
            </div>
            <ScenarioPanel title="Modified" plan={modifiedResult} accentColor="#10b981"
              loading={mRunning} empty={!modifiedResult} />
          </div>
        </div>
      )}

      {!hasRun && (
        <div className="panel" style={{ display:'flex', flexDirection:'column', alignItems:'center',
          justifyContent:'center', minHeight:300, gap:16 }}>
          <div style={{ fontSize:48, animation:'float 3s ease infinite' }}>⟳</div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text-2)' }}>Configure & Compare</div>
          <div style={{ fontSize:13, color:'var(--text-3)', textAlign:'center', maxWidth:360, lineHeight:1.7 }}>
            Add task overrides above (e.g. increase T015 severity to 5), then click Run Comparison to see baseline vs modified side-by-side
          </div>
        </div>
      )}
    </div>
  );
}
