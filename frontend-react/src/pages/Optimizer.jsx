import { useState, useCallback } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../api/client';
import { Loading, ErrorBox, Card, Badge, StatusBadge, Tag, Btn, ReasoningBox, Bar as ProgressBar, debtColor } from '../components/UI';

const PAGE = { padding:'28px 32px', maxWidth:1400, animation:'fadeUp 0.25s ease' };
const H1   = { fontSize:24, fontWeight:800, background:'linear-gradient(135deg,#f1f5f9,#94a3b8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-0.5px', marginBottom:4 };
const inp  = { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text-1)', fontSize:13, outline:'none', width:'100%' };

export default function Optimizer() {
  const [wMaint,  setWMaint]  = useState(2.0);
  const [wPoss,   setWPoss]   = useState(1.5);
  const [wDebt,   setWDebt]   = useState(3.0);
  const [wFlex,   setWFlex]   = useState(1.0);
  const [seed,    setSeed]    = useState(42);
  const [plan,    setPlan]    = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);

  const { data: initPlan } = useApi(() => api.optimizedPlan().catch(() => null));
  const currentPlan = plan || initPlan;

  const { mutate: runOpt, loading: running, error: runErr } = useMutation(
    useCallback(() => api.optimize({ w_maintenance: wMaint, w_possession: wPoss, w_debt: wDebt, w_flexibility: wFlex, random_seed: seed }), [wMaint, wPoss, wDebt, wFlex, seed])
  );

  async function handleOptimize() {
    try { const p = await runOpt(); setPlan(p); }
    catch {}
  }

  const decisions = currentPlan?.task_decisions || {};
  const summary   = currentPlan?.summary || {};
  const taskList  = Object.entries(decisions);
  const selected  = taskList.filter(([,d]) => d.status === 'SELECTED');
  const deferred  = taskList.filter(([,d]) => d.status === 'DEFERRED');
  const rejected  = taskList.filter(([,d]) => d.status === 'REJECTED');
  const protected_ = taskList.filter(([,d]) => d.status === 'PROTECTED');

  const radarData = [
    { metric:'Maintenance\nBenefit', value: wMaint * 10 },
    { metric:'Debt\nUrgency',        value: wDebt  * 10 },
    { metric:'Flexibility',          value: wFlex  * 10 },
    { metric:'Possession\nPenalty',  value: (3 - wPoss) * 10 },
  ];

  const slider = (label, val, setter, min, max, step) => (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
        <span style={{ color:'var(--text-2)', fontWeight:600 }}>{label}</span>
        <span style={{ fontFamily:'var(--mono)', color:'var(--text-1)', fontWeight:700 }}>{val.toFixed(1)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => setter(parseFloat(e.target.value))}
        style={{ width:'100%', accentColor:'#6366f1' }}
      />
    </div>
  );

  return (
    <div style={PAGE}>
      <div style={{ marginBottom:24 }}>
        <h1 style={H1}>🎯 Plan Optimizer</h1>
        <p style={{ fontSize:14, color:'var(--text-3)' }}>Configure scoring weights and run the Opportunity-Aware Adaptive Block Planner</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:20 }}>
        {/* Config Panel */}
        <div>
          <Card title="⚙️ Scoring Weights">
            {slider('Maintenance Benefit', wMaint, setWMaint, 0.5, 5, 0.5)}
            {slider('Debt Urgency',        wDebt,  setWDebt,  0.5, 5, 0.5)}
            {slider('Flexibility',         wFlex,  setWFlex,  0.5, 5, 0.5)}
            {slider('Possession Penalty',  wPoss,  setWPoss,  0.5, 5, 0.5)}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:6 }}>Random Seed</div>
              <input id="opt-seed" type="number" style={inp} value={seed} onChange={e => setSeed(parseInt(e.target.value)||42)} min={0} max={9999} />
            </div>
            {runErr && <div style={{ color:'var(--red)', fontSize:12, marginBottom:10 }}>Error: {runErr}</div>}
            <Btn id="btn-run-optimizer" onClick={handleOptimize} loading={running} style={{ width:'100%' }}>
              {running ? 'Optimizing…' : '▶ Run Optimizer'}
            </Btn>
          </Card>

          {/* Radar Chart */}
          <Card title="📡 Weight Radar" style={{ marginTop:16 }}>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize:10, fill:'#475569' }} />
                <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} dot />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Results */}
        <div>
          {!currentPlan
            ? <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'60px 24px', textAlign:'center', color:'var(--text-3)' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🎯</div>
                <div style={{ fontSize:15, color:'var(--text-2)', marginBottom:6 }}>Configure weights and run the optimizer</div>
                <div style={{ fontSize:13 }}>The heuristic planner evaluates all feasible task-block combinations using the Opportunity Engine</div>
              </div>
            : <>
              {/* Summary Cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                {[
                  {l:'Planned',    v:summary.planned_tasks,         c:'#10b981'},
                  {l:'Deferred',   v:summary.deferred_tasks,        c:'#f59e0b'},
                  {l:'Protected',  v:summary.protected_tasks,       c:'#8b5cf6'},
                  {l:'Block Value',v:summary.total_block_value?.toFixed(1), c:'var(--accent)'},
                ].map(s => (
                  <div key={s.l} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:4 }}>{s.l}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Plan ID */}
              <div style={{ fontSize:12, color:'var(--text-3)', fontFamily:'var(--mono)', marginBottom:16 }}>
                Plan: <span style={{ color:'var(--accent)' }}>{currentPlan.plan_id}</span>
              </div>

              {/* Block Assignments */}
              <Card title="📦 Block Assignments" badge={`${currentPlan.block_assignments?.filter(b=>b.selected_tasks.length>0).length} blocks`} style={{ marginBottom:16 }}>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid var(--border)' }}>
                        {['Block','Tasks','Value','Add. Possession','Zero Poss'].map(h => (
                          <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', color:'var(--text-3)', letterSpacing:'0.6px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(currentPlan.block_assignments||[]).filter(b=>b.selected_tasks.length>0).map(b => (
                        <tr key={b.block_id} style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                          <td style={{ padding:'8px 12px', fontFamily:'var(--mono)', fontSize:12, color:'var(--accent)' }}>{b.block_id}</td>
                          <td style={{ padding:'8px 12px' }}>{b.selected_tasks.map(t=><Tag key={t}>{t}</Tag>)}</td>
                          <td style={{ padding:'8px 12px', fontFamily:'var(--mono)', fontWeight:700 }}>{b.block_value.toFixed(1)}</td>
                          <td style={{ padding:'8px 12px' }}>
                            {b.additional_possession > 0 ? <Badge color="#f59e0b">{b.additional_possession} min</Badge> : <Badge color="#475569">0 min</Badge>}
                          </td>
                          <td style={{ padding:'8px 12px' }}>
                            {b.zero_possession ? <Badge color="#10b981">✓ Yes</Badge> : <Badge color="#f59e0b">No</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Task Decisions */}
              <Card title="📋 Task Decisions">
                {['SELECTED','DEFERRED','PROTECTED','REJECTED'].map(status => {
                  const group = taskList.filter(([,d]) => d.status === status);
                  if (!group.length) return null;
                  const c = {SELECTED:'#10b981',DEFERRED:'#f59e0b',PROTECTED:'#8b5cf6',REJECTED:'#ef4444'}[status];
                  const lbl = {SELECTED:'✓ Planned',DEFERRED:'⟳ Deferred',PROTECTED:'⊙ Protected',REJECTED:'✕ Rejected'}[status];
                  return (
                    <div key={status} style={{ marginBottom:16 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:c, marginBottom:8 }}>{lbl} ({group.length})</div>
                      {group.map(([tid, dec]) => (
                        <div key={tid} style={{ marginBottom:6, padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:8, borderLeft:`3px solid ${c}`, cursor:'pointer' }}
                          onClick={() => setExpandedTask(expandedTask === tid ? null : tid)}>
                          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom: expandedTask===tid ? 8 : 0 }}>
                            <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600, color:'var(--accent)' }}>{tid}</span>
                            {dec.assigned_block && <span style={{ fontSize:11, color:'var(--text-3)' }}>→ {dec.assigned_block}</span>}
                            <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-3)' }}>{expandedTask===tid ? '▲' : '▼'}</span>
                          </div>
                          {expandedTask === tid && <div style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.6 }}>{dec.reason}</div>}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </Card>
            </>
          }
        </div>
      </div>
    </div>
  );
}
