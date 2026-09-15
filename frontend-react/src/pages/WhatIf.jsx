import { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

const C = {
  brand:'#FF6E8F', purple:'#c084fc', cyan:'#67e8f9',
  green:'#34d399', amber:'#fbbf24', red:'#f87171', blue:'#60a5fa',
};

const DEFAULT_WEIGHTS = {
  debt_weight:0.35, flexibility_weight:0.25, safety_weight:0.20,
  opportunity_cost_weight:0.10, resource_efficiency_weight:0.10,
};

const OVERRIDE_FIELDS = [
  { value:'maintenance_debt',     label:'Maintenance Debt (0-60)' },
  { value:'flexibility_score',    label:'Flexibility Score (0-1)' },
  { value:'severity',             label:'Severity (1-5)' },
  { value:'days_overdue',         label:'Days Overdue' },
];

/* parse /optimize response to get planned/deferred/rejected counts */
function parseSummary(res) {
  if (!res) return null;
  const s=res.summary||{};
  return {
    planned:  s.planned_tasks  ??0,
    deferred: s.deferred_tasks ??0,
    rejected: s.rejected_tasks ??0,
    total:    s.total_tasks    ??0,
    blockValue:(s.total_block_value||0).toFixed(1),
    blocksUsed: s.blocks_with_assignments||0,
  };
}

/* parse block assignments */
function parseAssigns(res) {
  if (!res) return [];
  return (res.block_assignments||[]).filter(a=>
    a.combination_details?.combination?.tasks?.length>0
  );
}

function ScenarioPanel({ plan, accentColor, loading }) {
  if (loading) return (
    <div className="panel" style={{ flex:1, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', minHeight:360, gap:16 }}>
      <div style={{ width:44, height:44, borderRadius:'50%',
        border:`3px solid ${accentColor}30`, borderTop:`3px solid ${accentColor}`,
        animation:'spin 0.8s linear infinite' }}/>
      <div style={{ fontSize:13, color:'var(--text-2)' }}>Running scenario…</div>
    </div>
  );
  if (!plan) return (
    <div className="panel" style={{ flex:1, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', minHeight:360, gap:12, opacity:0.4 }}>
      <div style={{ fontSize:40, animation:'float 3s ease infinite' }}>⟳</div>
      <div style={{ fontSize:13, color:'var(--text-3)' }}>Run to see results</div>
    </div>
  );

  const sm=parseSummary(plan);
  const assigns=parseAssigns(plan);
  const decisions=plan.decisions?Object.values(plan.decisions):[];

  return (
    <div style={{ flex:1 }}>
      {/* Mini stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
        {[
          { l:'Planned',  v:sm.planned,  c:C.green },
          { l:'Deferred', v:sm.deferred, c:C.amber },
          { l:'Rejected', v:sm.rejected, c:C.red   },
        ].map(s=>(
          <div key={s.l} style={{ background:'var(--bg-card)', border:`1px solid ${s.c}25`,
            borderRadius:'var(--r-md)', padding:'10px 12px',
            borderTop:`2px solid ${s.c}` }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase',
              letterSpacing:'0.6px', color:'var(--text-3)', marginBottom:4 }}>{s.l}</div>
            <div style={{ fontSize:22, fontWeight:800, fontFamily:'var(--mono)', color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Extra */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        {[
          { l:'Block Value',  v:sm.blockValue, c:accentColor },
          { l:'Blocks Used',  v:sm.blocksUsed, c:accentColor },
        ].map(s=>(
          <div key={s.l} style={{ display:'flex', gap:6, alignItems:'center',
            background:'var(--bg-card)', border:'1px solid var(--border)',
            borderRadius:'var(--r-md)', padding:'6px 12px' }}>
            <span style={{ fontSize:14, fontWeight:800, fontFamily:'var(--mono)', color:s.c }}>{s.v}</span>
            <span style={{ fontSize:10.5, color:'var(--text-3)' }}>{s.l}</span>
          </div>
        ))}
      </div>

      {/* Assignments */}
      {assigns.length>0 && (
        <div className="panel" style={{ marginBottom:12, padding:'12px 14px' }}>
          <div style={{ fontSize:10.5, fontWeight:700, textTransform:'uppercase',
            letterSpacing:'0.8px', color:'var(--text-3)', marginBottom:10 }}>Block Assignments</div>
          {assigns.map(a=>{
            const tasks=a.combination_details?.combination?.tasks||[];
            return (
              <div key={a.block_id} style={{ display:'flex', alignItems:'center', gap:8,
                padding:'7px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700,
                  color:accentColor, minWidth:60 }}>{a.block_id}</span>
                <div style={{ flex:1, display:'flex', gap:4, flexWrap:'wrap' }}>
                  {tasks.map(t=>(
                    <span key={t} style={{ fontSize:10.5, fontFamily:'var(--mono)',
                      background:`${accentColor}15`, color:accentColor,
                      padding:'1px 6px', borderRadius:4, border:`1px solid ${accentColor}25` }}>{t}</span>
                  ))}
                </div>
                {a.combination_details?.combination?.zero_possession && (
                  <span style={{ fontSize:10, color:C.green }}>ZP ✓</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decisions summary */}
      <div className="panel" style={{ padding:'12px 14px', maxHeight:280, overflowY:'auto' }}>
        <div style={{ fontSize:10.5, fontWeight:700, textTransform:'uppercase',
          letterSpacing:'0.8px', color:'var(--text-3)', marginBottom:8 }}>
          Task Decisions ({decisions.length})
        </div>
        {decisions.map(d=>{
          const s=(d.status||'').toUpperCase();
          const c={SELECTED:C.green,PLANNED:C.green,PENDING:C.blue,
            DEFERRED:C.amber,REJECTED:C.red,PROTECTED:C.purple}[s]||'var(--text-3)';
          return (
            <div key={d.task_id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0',
              borderBottom:'1px solid var(--border-subtle)', fontSize:12 }}>
              <span style={{ fontFamily:'var(--mono)', color:C.cyan, fontWeight:700, minWidth:44 }}>{d.task_id}</span>
              <span style={{ fontSize:11, fontWeight:600, color:c, minWidth:70 }}>{s}</span>
              <span style={{ fontSize:11, color:'var(--text-3)', flex:1, overflow:'hidden',
                textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.reason?.substring(0,80)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeltaBadge({ base, mod }) {
  if (base==null||mod==null) return null;
  const diff=mod-base;
  if (diff===0) return <span className="badge badge-gray">same</span>;
  return <span className={`badge ${diff>0?'badge-green':'badge-red'}`}>{diff>0?'▲':'▼'} {Math.abs(diff)}</span>;
}

export default function WhatIf() {
  const { data: tasks } = useApi(()=>api.tasks());

  const [mods,     setMods]    = useState([]);
  const [newMod,   setNewMod]  = useState({ task_id:'', field:'maintenance_debt', value:'' });
  const [hasRun,   setHasRun]  = useState(false);
  const [baseRes,  setBaseRes] = useState(null);
  const [modRes,   setModRes]  = useState(null);
  const [bRunning, setBRun]    = useState(false);
  const [mRunning, setMRun]    = useState(false);

  const addMod = () => {
    if (!newMod.task_id||newMod.value==='') return;
    setMods(p=>[...p.filter(m=>!(m.task_id===newMod.task_id&&m.field===newMod.field)),
      { ...newMod, value:parseFloat(newMod.value) }]);
    setNewMod(p=>({...p,value:''}));
  };
  const removeMod = i => setMods(p=>p.filter((_,j)=>j!==i));

  const handleRun = useCallback(async()=>{
    setHasRun(true); setBaseRes(null); setModRes(null);
    setBRun(true); setMRun(true);

    // Run both concurrently
    const [bRes,mRes] = await Promise.allSettled([
      api.optimize({ weights:DEFAULT_WEIGHTS }),
      api.optimize({ weights:DEFAULT_WEIGHTS, task_overrides:mods }),
    ]);

    setBaseRes(bRes.status==='fulfilled'?bRes.value:null);
    setModRes (mRes.status==='fulfilled'?mRes.value:null);
    setBRun(false); setMRun(false);
  },[mods]);

  const bs=parseSummary(baseRes);
  const ms=parseSummary(modRes);

  return (
    <div className="page">
      <div className="page-header anim-blur">
        <div className="page-eyebrow" style={{ color:C.brand }}>Scenario Analysis</div>
        <h1 className="page-title" style={{ background:`linear-gradient(135deg,${C.brand},${C.purple})`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
          What-If Simulator
        </h1>
        <p className="page-subtitle">Override task parameters and compare baseline vs modified plan side-by-side</p>
      </div>

      {/* Override builder */}
      <div className="panel anim-blur-up" style={{ marginBottom:20 }}>
        <div className="panel-header">
          <div className="panel-title">
            <div style={{ width:7,height:7,borderRadius:'50%',background:C.brand,animation:'pulse 2.5s ease infinite' }}/>
            Task Overrides
          </div>
          {mods.length>0 && (
            <span style={{ fontSize:11, color:C.purple, background:`${C.purple}15`,
              padding:'3px 10px', borderRadius:100, border:`1px solid ${C.purple}25`, fontWeight:600 }}>
              {mods.length} override{mods.length>1?'s':''}
            </span>
          )}
        </div>

        {/* Add row */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end', marginBottom:14 }}>
          <div style={{ flex:'1 1 180px' }}>
            <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase',
              letterSpacing:'0.6px', marginBottom:4 }}>Task ID</div>
            <select className="rf-select" style={{ width:'100%' }}
              value={newMod.task_id} onChange={e=>setNewMod(p=>({...p,task_id:e.target.value}))}>
              <option value="">Select task…</option>
              {(tasks||[]).map(t=>(
                <option key={t.task_id} value={t.task_id}>
                  {t.task_id} — {t.task_type} ({t.section})
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex:'1 1 200px' }}>
            <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase',
              letterSpacing:'0.6px', marginBottom:4 }}>Field to Override</div>
            <select className="rf-select" style={{ width:'100%' }}
              value={newMod.field} onChange={e=>setNewMod(p=>({...p,field:e.target.value}))}>
              {OVERRIDE_FIELDS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div style={{ flex:'0 0 110px' }}>
            <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase',
              letterSpacing:'0.6px', marginBottom:4 }}>New Value</div>
            <input type="number" value={newMod.value} onChange={e=>setNewMod(p=>({...p,value:e.target.value}))}
              placeholder="e.g. 55"
              style={{ width:'100%', padding:'7px 10px', background:'var(--bg-elevated)',
                border:'1px solid var(--border)', borderRadius:'var(--r-md)',
                color:'var(--text-1)', fontSize:13, outline:'none',
                transition:'border-color var(--t-fast)' }}
              onFocus={e=>e.target.style.borderColor=C.brand}
              onBlur={e=>e.target.style.borderColor='var(--border)'}/>
          </div>
          <button onClick={addMod}
            style={{ padding:'8px 18px', borderRadius:'var(--r-md)', height:36,
              background:`linear-gradient(135deg,${C.brand},${C.purple})`,
              color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
            + Add
          </button>
        </div>

        {/* Tag list */}
        {mods.length>0 && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
            {mods.map((m,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:6,
                background:'var(--bg-elevated)', border:`1px solid ${C.brand}30`,
                borderRadius:8, padding:'5px 10px', fontSize:12, animation:'scaleIn 0.25s var(--ease-spring)' }}>
                <span style={{ fontFamily:'var(--mono)', color:C.cyan, fontWeight:700 }}>{m.task_id}</span>
                <span style={{ color:'var(--text-3)' }}>·</span>
                <span style={{ color:'var(--text-2)' }}>{m.field}</span>
                <span style={{ color:'var(--text-3)' }}>→</span>
                <span style={{ fontFamily:'var(--mono)', color:C.amber, fontWeight:700 }}>{m.value}</span>
                <button onClick={()=>removeMod(i)}
                  style={{ color:'var(--text-3)', fontSize:14, marginLeft:2,
                    transition:'color var(--t-fast)', lineHeight:1, border:'none',
                    background:'none', cursor:'pointer' }}
                  onMouseEnter={e=>e.target.style.color=C.red}
                  onMouseLeave={e=>e.target.style.color='var(--text-3)'}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <button onClick={handleRun} disabled={bRunning||mRunning}
            style={{ padding:'10px 28px', borderRadius:'var(--r-md)',
              background:(bRunning||mRunning)?`${C.green}80`:`linear-gradient(135deg,${C.brand},${C.purple})`,
              color:'white', fontWeight:700, fontSize:13, border:'none',
              cursor:(bRunning||mRunning)?'not-allowed':'pointer',
              boxShadow:(bRunning||mRunning)?'none':`0 4px 20px ${C.brand}40`,
              display:'flex', alignItems:'center', gap:8 }}>
            {(bRunning||mRunning)
              ? <><span style={{ animation:'spin 0.8s linear infinite', display:'inline-block' }}>⟳</span> Running…</>
              : '▶ Run Comparison'}
          </button>
          {mods.length===0 && (
            <span style={{ fontSize:12, color:'var(--text-3)' }}>
              ℹ Add overrides above to see a difference (without overrides both plans will be identical)
            </span>
          )}
        </div>
      </div>

      {/* Delta summary */}
      {hasRun && bs && ms && (
        <div className="panel anim-scale" style={{ marginBottom:20,
          background:`linear-gradient(90deg,${C.brand}08,${C.purple}05)`,
          border:`1px solid ${C.brand}25` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.brand, textTransform:'uppercase',
            letterSpacing:'0.8px', marginBottom:10 }}>Δ Plan Delta (Baseline → Modified)</div>
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            {[
              { l:'Planned',  base:bs.planned,  mod:ms.planned  },
              { l:'Deferred', base:bs.deferred, mod:ms.deferred },
              { l:'Rejected', base:bs.rejected, mod:ms.rejected },
            ].map(item=>(
              <div key={item.l} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
                <span style={{ color:'var(--text-2)', fontWeight:600 }}>{item.l}:</span>
                <span style={{ fontFamily:'var(--mono)', fontWeight:700 }}>{item.base}</span>
                <span style={{ color:'var(--text-3)' }}>→</span>
                <span style={{ fontFamily:'var(--mono)', fontWeight:700 }}>{item.mod}</span>
                <DeltaBadge base={item.base} mod={item.mod}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-side */}
      {hasRun ? (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:12, height:12, borderRadius:3, background:C.blue }}/>
              <span style={{ fontSize:14, fontWeight:700 }}>Baseline Plan</span>
              <span style={{ fontSize:11, color:C.blue, background:`${C.blue}15`,
                padding:'3px 10px', borderRadius:100, border:`1px solid ${C.blue}25`, fontWeight:600 }}>
                No overrides
              </span>
            </div>
            <ScenarioPanel plan={baseRes} accentColor={C.blue} loading={bRunning}/>
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:12, height:12, borderRadius:3, background:C.green }}/>
              <span style={{ fontSize:14, fontWeight:700 }}>Modified Plan</span>
              <span style={{ fontSize:11, color:C.green, background:`${C.green}15`,
                padding:'3px 10px', borderRadius:100, border:`1px solid ${C.green}25`, fontWeight:600 }}>
                {mods.length} override{mods.length!==1?'s':''}
              </span>
            </div>
            <ScenarioPanel plan={modRes} accentColor={C.green} loading={mRunning}/>
          </div>
        </div>
      ) : (
        <div className="panel" style={{ display:'flex', flexDirection:'column', alignItems:'center',
          justifyContent:'center', minHeight:300, gap:16 }}>
          <div style={{ fontSize:48, animation:'float 3s ease infinite' }}>⟳</div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text-2)' }}>Configure & Compare</div>
          <div style={{ fontSize:13, color:'var(--text-3)', textAlign:'center', maxWidth:380, lineHeight:1.7 }}>
            Add task overrides above (e.g. increase T001 maintenance_debt to 55), then click Run Comparison
          </div>
        </div>
      )}
    </div>
  );
}
