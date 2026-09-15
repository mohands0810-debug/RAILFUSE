import { useState, useCallback } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

/* Real /optimize response shape:
   {
     plan_id, generated_at,
     block_assignments: [{
       block_id, section, decisions:{[task_id]:{task_id,status,assigned_block,reason,score}},
       combination_details: { combination:{tasks[],total_duration,adjusted_value,zero_possession}, explanation }
     }],
     decisions: { [task_id]: {task_id,status,assigned_block,reason,score,additional_possession} },
     summary: { total_tasks, planned_tasks, deferred_tasks, rejected_tasks, protected_tasks,
                total_additional_possession, total_block_value, zero_possession_blocks,
                blocks_with_assignments, avg_block_utilization }
   }
*/

const C = {
  brand:'#FF6E8F', purple:'#c084fc', cyan:'#67e8f9',
  green:'#34d399', amber:'#fbbf24', red:'#f87171', blue:'#60a5fa',
};

const WEIGHT_META = {
  debt_weight:               { label:'Debt Weight',          desc:'Prioritise high maintenance debt tasks', icon:'🔥', color:C.red    },
  flexibility_weight:        { label:'Flexibility Weight',   desc:'Protect low-flexibility urgent tasks',   icon:'🛡', color:C.purple },
  safety_weight:             { label:'Safety Weight',        desc:'Elevate safety-critical tasks',          icon:'⚠️', color:C.amber  },
  opportunity_cost_weight:   { label:'Opportunity Cost',     desc:'Penalise missed high-value blocks',      icon:'💎', color:C.cyan   },
  resource_efficiency_weight:{ label:'Resource Efficiency',  desc:'Maximise crew & equipment use',          icon:'⚙️', color:C.green  },
};

const DEFAULT_WEIGHTS = {
  debt_weight:0.35, flexibility_weight:0.25, safety_weight:0.20,
  opportunity_cost_weight:0.10, resource_efficiency_weight:0.10,
};

function DecisionBadge({ status }) {
  const s=(status||'').toUpperCase();
  const map={SELECTED:'badge-green',PLANNED:'badge-green',PENDING:'badge-blue',
    DEFERRED:'badge-amber',REJECTED:'badge-red',PROTECTED:'badge-purple'};
  return <span className={`badge ${map[s]||'badge-gray'}`}>{s}</span>;
}

function WeightSlider({ name, value, onChange }) {
  const m=WEIGHT_META[name];
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>{m.icon}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600 }}>{m.label}</div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{m.desc}</div>
          </div>
        </div>
        <div style={{ fontFamily:'var(--mono)', fontSize:16, fontWeight:800, color:m.color, minWidth:44, textAlign:'right' }}>
          {Math.round(value*100)}
        </div>
      </div>
      <input type="range" min={0} max={1} step={0.01} value={value}
        onChange={e=>onChange(parseFloat(e.target.value))}
        className="rf-slider"
        style={{ '--thumb-color':m.color }}/>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9.5, color:'var(--text-4)', marginTop:3 }}>
        <span>0</span><span>100</span>
      </div>
    </div>
  );
}

export default function Optimizer() {
  const { data: existing } = useApi(()=>api.optimizedPlan().catch(()=>null));

  const [weights, setWeights]   = useState(DEFAULT_WEIGHTS);
  const [running, setRunning]   = useState(false);
  const [result,  setResult]    = useState(null);
  const [error,   setError]     = useState(null);
  const [hasRun,  setHasRun]    = useState(false);

  const handleRun = useCallback(async () => {
    setRunning(true); setError(null); setHasRun(true);
    try {
      const res = await api.optimize({ weights });
      setResult(res);
    } catch(e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }, [weights]);

  const setW = (key,val) => setWeights(p=>({...p,[key]:val}));

  const displayed = result || existing;
  const summary   = displayed?.summary||{};

  // decisions is a dict keyed by task_id → convert to array
  const decisions = displayed?.decisions
    ? Object.values(displayed.decisions)
    : [];

  // block_assignments: filter to those with a selected combination
  const assigns = (displayed?.block_assignments||[]).filter(a=>
    a.combination_details?.combination?.tasks?.length>0
  );

  const radarData = Object.entries(weights).map(([k,v])=>({
    weight: WEIGHT_META[k]?.label?.split(' ')[0]||k,
    value:  Math.round(v*100),
    fullMark:100,
  }));

  return (
    <div className="page">
      <div className="page-header anim-blur">
        <div className="page-eyebrow" style={{ color:C.brand }}>Optimization Engine</div>
        <h1 className="page-title" style={{ background:`linear-gradient(135deg,${C.brand},${C.purple},${C.cyan})`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
          Plan Optimizer
        </h1>
        <p className="page-subtitle">Tune weights, re-run the heuristic · Deterministic seed 42 · Results update live</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:20 }}>

        {/* ── Left: Controls ────────────────────────────── */}
        <div>
          <div className="panel anim-blur-up d1" style={{ marginBottom:16 }}>
            <div className="panel-header">
              <div className="panel-title">
                <div style={{ width:7,height:7,borderRadius:'50%',background:C.brand,animation:'pulse 2.5s ease infinite' }}/>
                Weight Configuration
              </div>
            </div>
            {Object.entries(weights).map(([k,v])=>(
              <WeightSlider key={k} name={k} value={v} onChange={val=>setW(k,val)}/>
            ))}
            {error && (
              <div style={{ marginBottom:12, padding:'10px 12px', background:`${C.red}12`,
                border:`1px solid ${C.red}30`, borderRadius:'var(--r-md)', fontSize:12, color:C.red }}>
                ⚠ {error}
              </div>
            )}
            <button onClick={handleRun} disabled={running}
              style={{ width:'100%', padding:'12px 0', borderRadius:'var(--r-md)',
                background:running?`${C.green}80`:`linear-gradient(135deg,${C.brand},${C.purple})`,
                color:'white', fontSize:14, fontWeight:700, cursor:running?'not-allowed':'pointer',
                border:'none', transition:'all var(--t-mid)', boxShadow:running?'none':`0 4px 20px ${C.brand}40`,
                display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              {running
                ? <><span style={{ animation:'spin 0.8s linear infinite', display:'inline-block', fontSize:18 }}>⟳</span> Running…</>
                : '▶ Run Optimizer'}
            </button>
          </div>

          {/* Radar */}
          <div className="panel anim-blur-up d2">
            <div className="panel-header">
              <div className="panel-title">
                <div style={{ width:7,height:7,borderRadius:'50%',background:C.purple,animation:'pulse 2.5s ease infinite' }}/>
                Weight Profile
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} margin={{top:10,right:20,bottom:10,left:20}}>
                <PolarGrid stroke="rgba(255,255,255,0.06)"/>
                <PolarAngleAxis dataKey="weight" tick={{ fontSize:10, fill:'var(--text-3)' }}/>
                <Radar dataKey="value" name="Weight" fill={C.brand} fillOpacity={0.2}
                  stroke={C.brand} strokeWidth={2} dot={{ r:3, fill:C.brand2 }}/>
                <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:`1px solid ${C.brand}30`,
                  borderRadius:10, fontSize:12 }} formatter={v=>[`${v}%`,'Weight']}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Right: Results ────────────────────────────── */}
        <div>
          {!hasRun && !displayed ? (
            <div className="panel" style={{ display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', minHeight:400, gap:16 }}>
              <div style={{ fontSize:56, animation:'float 3s ease infinite' }}>⬟</div>
              <div style={{ fontSize:18, fontWeight:700, color:'var(--text-2)' }}>Ready to Optimize</div>
              <div style={{ fontSize:13.5, color:'var(--text-3)', textAlign:'center', maxWidth:300, lineHeight:1.7 }}>
                Configure weights on the left, then click Run Optimizer
              </div>
            </div>
          ) : running ? (
            <div className="panel" style={{ display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', minHeight:400, gap:20 }}>
              <div style={{ width:60, height:60, borderRadius:'50%',
                border:`3px solid ${C.brand}30`, borderTop:`3px solid ${C.brand}`,
                animation:'spin 0.8s linear infinite' }}/>
              <div style={{ fontSize:14, color:'var(--text-2)' }}>Running optimization…</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>25 tasks × 10 blocks · heuristic seed 42</div>
            </div>
          ) : (
            <>
              {/* Summary strip */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { label:'Planned',      value:summary.planned_tasks  ||0, c:C.green  },
                  { label:'Deferred',     value:summary.deferred_tasks ||0, c:C.amber  },
                  { label:'Rejected',     value:summary.rejected_tasks ||0, c:C.red    },
                  { label:'Blocks Used',  value:summary.blocks_with_assignments||assigns.length, c:C.brand },
                ].map(s=>(
                  <div key={s.label} className="stat-card anim-scale"
                    style={{ '--card-accent':s.c, padding:'12px 14px' }}>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color:s.c, fontSize:26 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Extra stats */}
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
                {[
                  { l:'Total Block Value',       v:(summary.total_block_value||0).toFixed(1),       c:C.brand },
                  { l:'Zero-Possession Blocks',  v:summary.zero_possession_blocks||0,               c:C.green },
                  { l:'Avg Block Utilization',   v:`${(summary.avg_block_utilization||0).toFixed(1)}%`, c:C.purple },
                  { l:'Extra Possession (min)',  v:summary.total_additional_possession||0,           c:C.amber },
                ].map(s=>(
                  <div key={s.l} style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
                    borderRadius:'var(--r-md)', padding:'8px 14px',
                    display:'flex', gap:8, alignItems:'center' }}>
                    <div style={{ width:3, height:24, background:s.c, borderRadius:2 }}/>
                    <div>
                      <div style={{ fontSize:15, fontWeight:800, fontFamily:'var(--mono)', color:s.c }}>{s.v}</div>
                      <div style={{ fontSize:10, color:'var(--text-3)' }}>{s.l}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Block assignments */}
              {assigns.length>0 && (
                <div className="panel anim-blur-up" style={{ marginBottom:16 }}>
                  <div className="panel-header">
                    <div className="panel-title">
                      <div style={{ width:7,height:7,borderRadius:'50%',background:C.green,animation:'pulse 2.5s ease infinite' }}/>
                      Block Assignments ({assigns.length})
                    </div>
                  </div>
                  <table className="rf-table">
                    <thead>
                      <tr>
                        <th>Block</th>
                        <th>Section</th>
                        <th>Tasks Assigned</th>
                        <th>Adj. Value</th>
                        <th>Duration</th>
                        <th>Zero Possession</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assigns.map(a=>{
                        const combo=a.combination_details?.combination||{};
                        return (
                          <tr key={a.block_id}>
                            <td><span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:C.cyan }}>{a.block_id}</span></td>
                            <td><span style={{ fontSize:12, color:'var(--text-2)' }}>{a.section||'—'}</span></td>
                            <td>
                              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                                {(combo.tasks||[]).map(t=>(
                                  <span key={t} style={{ fontSize:11, fontFamily:'var(--mono)', color:C.brand,
                                    background:`${C.brand}12`, padding:'2px 7px', borderRadius:4,
                                    border:`1px solid ${C.brand}25` }}>{t}</span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:13,
                                color:(combo.adjusted_value||0)>=0?C.green:C.red }}>
                                {(combo.adjusted_value||0).toFixed(2)}
                              </span>
                            </td>
                            <td><span style={{ fontFamily:'var(--mono)', fontSize:12 }}>{combo.total_duration||0}m</span></td>
                            <td>
                              <span className={`badge ${combo.zero_possession?'badge-green':'badge-amber'}`}>
                                {combo.zero_possession?'✓ Yes':'⊘ No'}
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
              <div className="panel anim-blur-up d2">
                <div className="panel-header">
                  <div className="panel-title">
                    <div style={{ width:7,height:7,borderRadius:'50%',background:C.purple,animation:'pulse 2.5s ease infinite' }}/>
                    Task Decisions ({decisions.length})
                  </div>
                </div>
                <div style={{ maxHeight:380, overflowY:'auto' }}>
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
                      {decisions.map(d=>(
                        <tr key={d.task_id}>
                          <td><span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:C.cyan }}>{d.task_id}</span></td>
                          <td><DecisionBadge status={d.status}/></td>
                          <td><span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-3)' }}>{d.assigned_block||'—'}</span></td>
                          <td><span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700 }}>{d.score?.toFixed(1)??'—'}</span></td>
                          <td style={{ maxWidth:260 }}>
                            <span style={{ fontSize:11.5, color:'var(--text-2)', lineHeight:1.5 }}>
                              {d.reason?.substring(0,140)}{d.reason?.length>140?'…':''}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
