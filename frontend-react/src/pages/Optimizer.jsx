import { useState } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../api/client';

const DEFAULT_WEIGHTS = {
  debt_weight:        0.35,
  flexibility_weight: 0.25,
  safety_weight:      0.20,
  opportunity_cost_weight: 0.10,
  resource_efficiency_weight: 0.10,
};

const WEIGHT_LABELS = {
  debt_weight:        { label:'Debt Weight',        desc:'Prioritise high maintenance debt tasks', icon:'🔥', color:'#ef4444' },
  flexibility_weight: { label:'Flexibility Weight', desc:'Protect low-flexibility urgent tasks',   icon:'🛡', color:'#8b5cf6' },
  safety_weight:      { label:'Safety Weight',      desc:'Elevate safety-critical tasks',          icon:'⚠️', color:'#f59e0b' },
  opportunity_cost_weight: { label:'Opportunity Cost', desc:'Penalise missed high-value blocks',  icon:'💎', color:'#06b6d4' },
  resource_efficiency_weight: { label:'Resource Efficiency', desc:'Maximise crew & equipment use',icon:'⚙️', color:'#10b981' },
};

function WeightSlider({ name, value, onChange }) {
  const meta = WEIGHT_LABELS[name];
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>{meta.icon}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{meta.label}</div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{meta.desc}</div>
          </div>
        </div>
        <div style={{ fontFamily:'var(--mono)', fontSize:16, fontWeight:800,
          color:meta.color, minWidth:42, textAlign:'right' }}>
          {Math.round(value * 100)}
        </div>
      </div>
      <input
        type="range" min={0} max={1} step={0.01}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="rf-slider"
        style={{ '--fill-pct': `${value*100}%` }}
      />
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9.5,
        color:'var(--text-4)', marginTop:3 }}>
        <span>0</span><span>100</span>
      </div>
    </div>
  );
}

function DecisionBadge({ decision }) {
  const d = (decision||'').toUpperCase();
  const map = {
    PLANNED:'badge-green', SELECTED:'badge-green',
    DEFERRED:'badge-amber', REJECTED:'badge-red',
    PROTECTED:'badge-purple', PENDING:'badge-blue',
  };
  return <span className={`badge ${map[d]||'badge-gray'}`}>{d}</span>;
}

export default function Optimizer() {
  const { data: plan, loading: pLoad } = useApi(() => api.optimizedPlan().catch(() => null));
  const { mutate: runOpt, loading: running, data: result } = useMutation(
    (cfg) => api.optimize(cfg)
  );

  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [ranOnce, setRanOnce] = useState(false);

  const displayed = result || plan;
  const summary   = displayed?.summary || {};
  const decisions = displayed?.task_decisions || [];
  const assigns   = displayed?.block_assignments || [];

  const setW = (key, val) => setWeights(prev => ({ ...prev, [key]: val }));

  const handleRun = () => {
    setRanOnce(true);
    runOpt({ weights });
  };

  // Radar chart data
  const radarData = Object.entries(weights).map(([k, v]) => ({
    weight: WEIGHT_LABELS[k]?.label?.split(' ')[0] || k,
    value:  Math.round(v * 100),
    fullMark: 100,
  }));

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header anim-blur">
        <div className="page-eyebrow">Optimization Engine</div>
        <h1 className="page-title gradient-text">Plan Optimizer</h1>
        <p className="page-subtitle">
          Tune weights, re-run the heuristic in real time · Deterministic seed 42 · Results update instantly
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:20 }}>

        {/* ── Left: Controls ─────────────────────────────────── */}
        <div>
          <div className="panel anim-blur-up d1" style={{ marginBottom:16 }}>
            <div className="panel-header">
              <div className="panel-title"><div className="panel-title-dot" />Weight Configuration</div>
            </div>
            {Object.entries(weights).map(([k, v]) => (
              <WeightSlider key={k} name={k} value={v} onChange={val => setW(k, val)} />
            ))}

            <button
              className={`btn btn-primary${running?' btn-running':''}`}
              onClick={handleRun}
              disabled={running}
              style={{ width:'100%', justifyContent:'center', marginTop:4, fontSize:14, padding:'11px 0' }}
            >
              {running
                ? <><span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</span> Running…</>
                : '▶ Run Optimizer'
              }
            </button>
          </div>

          {/* Radar chart */}
          <div className="panel anim-blur-up d2">
            <div className="panel-header">
              <div className="panel-title"><div className="panel-title-dot" />Weight Profile</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} margin={{ top:10, right:20, bottom:10, left:20 }}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="weight" tick={{ fontSize:10, fill:'var(--text-3)' }} />
                <Radar dataKey="value" name="Weight" fill="#6366f1" fillOpacity={0.25}
                  stroke="#6366f1" strokeWidth={2} dot={{ r:3, fill:'#a5b4fc' }} />
                <Tooltip
                  contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border)',
                    borderRadius:10, fontSize:12 }}
                  formatter={v => [`${v}%`, 'Weight']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Right: Results ─────────────────────────────────── */}
        <div>
          {!displayed && !running ? (
            <div className="panel" style={{ display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', minHeight:400, gap:16 }}>
              <div style={{ fontSize:56, animation:'float 3s ease infinite' }}>⬟</div>
              <div style={{ fontSize:18, fontWeight:700, color:'var(--text-2)' }}>Ready to Optimize</div>
              <div style={{ fontSize:13.5, color:'var(--text-3)', textAlign:'center', maxWidth:300, lineHeight:1.7 }}>
                Configure weights on the left, then click Run Optimizer to see the plan
              </div>
            </div>
          ) : running ? (
            <div className="panel" style={{ display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', minHeight:400, gap:20 }}>
              <div style={{ width:60, height:60, borderRadius:'50%', border:'3px solid var(--border)',
                borderTop:'3px solid var(--brand)', animation:'spin 0.8s linear infinite' }} />
              <div style={{ fontSize:14, color:'var(--text-2)' }}>Running optimization engine…</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>25 tasks × 10 blocks × 24 trains</div>
            </div>
          ) : (
            <>
              {/* Summary strip */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { label:'Planned',       value:summary.tasks_planned   || 0, accent:'#10b981' },
                  { label:'Deferred',      value:summary.tasks_deferred  || 0, accent:'#f59e0b' },
                  { label:'Rejected',      value:summary.tasks_rejected  || 0, accent:'#ef4444' },
                  { label:'Blocks Used',   value:summary.blocks_used     || assigns.filter(a=>(a.selected_tasks||[]).length>0).length, accent:'var(--brand)' },
                ].map(s => (
                  <div key={s.label} className="stat-card anim-scale" style={{ '--card-accent':s.accent, padding:'12px 14px' }}>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color:s.accent, fontSize:28 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Block assignments */}
              {assigns.filter(a => (a.selected_tasks||[]).length > 0).length > 0 && (
                <div className="panel anim-blur-up mb-4" style={{ marginBottom:16 }}>
                  <div className="panel-header">
                    <div className="panel-title"><div className="panel-title-dot" />Block Assignments</div>
                  </div>
                  <table className="rf-table">
                    <thead>
                      <tr>
                        <th>Block</th>
                        <th>Tasks Assigned</th>
                        <th>Block Value</th>
                        <th>Zero-Possession</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assigns.filter(a => (a.selected_tasks||[]).length > 0).map(a => (
                        <tr key={a.block_id}>
                          <td><span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:'var(--cyan)' }}>{a.block_id}</span></td>
                          <td>
                            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                              {(a.selected_tasks||[]).map(t => (
                                <span key={t} style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--accent)',
                                  background:'var(--cyan-bg)', padding:'2px 7px', borderRadius:4 }}>{t}</span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:13,
                              color:(a.block_value||0)>=0?'#10b981':'#ef4444' }}>
                              {(a.block_value||0).toFixed(2)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${a.zero_possession?'badge-green':'badge-amber'}`}>
                              {a.zero_possession ? '✓ Yes' : '⊘ No'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Task decisions */}
              <div className="panel anim-blur-up d2">
                <div className="panel-header">
                  <div className="panel-title"><div className="panel-title-dot" />Task Decisions ({decisions.length})</div>
                </div>
                <div style={{ maxHeight:360, overflowY:'auto' }}>
                  <table className="rf-table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Decision</th>
                        <th>Block</th>
                        <th>Score</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisions.map(d => (
                        <tr key={d.task_id}>
                          <td><span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:'var(--accent)' }}>{d.task_id}</span></td>
                          <td><DecisionBadge decision={d.decision} /></td>
                          <td><span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-3)' }}>{d.assigned_block || '—'}</span></td>
                          <td><span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700 }}>{d.score?.toFixed(2) ?? '—'}</span></td>
                          <td style={{ maxWidth:220 }}>
                            <span style={{ fontSize:11.5, color:'var(--text-2)', lineHeight:1.5 }}>{d.reason || '—'}</span>
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
