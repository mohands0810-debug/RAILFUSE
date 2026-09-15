import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

/* Real Opportunity API fields:
   block_id, section, duration, remaining_capacity,
   feasible_tasks: string[],      ← task IDs only
   infeasible_tasks: [{task_id, reason}],
   opportunity_graph: { nodes:[{task_id,department,duration,maintenance_debt,flexibility_score}], edges:[] }
   compatible_combinations: [{tasks:[], total_duration, remaining_after,
     additional_possession, base_value, adjusted_value, zero_possession}]
   best_combination: {...}
   explanations: { [task_id]: string }
*/

const C = {
  brand:'#FF6E8F', purple:'#c084fc', cyan:'#67e8f9',
  green:'#34d399', amber:'#fbbf24', red:'#f87171', blue:'#60a5fa',
};
const COLORS=[C.brand,C.purple,C.cyan,C.green,C.amber,C.red,C.blue];

function GraphNode({ taskId, nodeData, index, isHighlighted, onClick }) {
  const c=COLORS[index%COLORS.length];
  const debt=nodeData?.maintenance_debt||0;
  const flex=nodeData?.flexibility_score||0;
  const dept=nodeData?.department||'';
  const dur=nodeData?.duration||0;
  return (
    <div className="graph-node" onClick={onClick} style={{
      borderColor:c, color:c, background:isHighlighted?`${c}25`:`${c}0d`,
      boxShadow:isHighlighted?`0 0 16px ${c}40`:'none',
      transform:isHighlighted?'scale(1.1)':'scale(1)',
      animationDelay:`${index*0.05}s`, minWidth:90, textAlign:'center',
    }}>
      <div style={{ fontSize:13, fontWeight:800 }}>{taskId}</div>
      {dept && <div style={{ fontSize:9.5, opacity:0.7, marginTop:2 }}>{dept}</div>}
      {dur>0 && <div style={{ fontSize:9, opacity:0.55, fontFamily:'var(--mono)', marginTop:1 }}>{dur}m</div>}
      {debt>0 && <div style={{ fontSize:9, color:debt>=40?C.red:debt>=25?C.amber:C.green,
        fontWeight:800, fontFamily:'var(--mono)', marginTop:2 }}>D:{debt.toFixed(0)}</div>}
    </div>
  );
}

export default function Opportunities() {
  const { data: opps,  loading:oLoad } = useApi(()=>api.opportunities());
  const [blockId, setBlockId]   = useState('');
  const [hoveredNode, setHovered]= useState(null);

  if (oLoad) return (
    <div className="page">
      <div className="skeleton" style={{ height:120, borderRadius:16, marginBottom:16 }}/>
      <div className="skeleton" style={{ height:260, borderRadius:16 }}/>
    </div>
  );

  const blocks = [...new Set((opps||[]).map(o=>o.block_id))].sort();
  const activeId = blockId||blocks[0]||'';
  const sel = (opps||[]).find(o=>o.block_id===activeId);

  // feasible_tasks: string[]
  const feasibleIds  = sel?.feasible_tasks||[];
  // nodes with full data from opportunity_graph
  const graphNodes   = sel?.opportunity_graph?.nodes||[];
  const combos       = sel?.compatible_combinations||[];
  const best         = sel?.best_combination;
  const explanations = sel?.explanations||{};
  const infeasible   = sel?.infeasible_tasks||[];

  // Map task IDs to their node data
  const nodeMap={};
  graphNodes.forEach(n=>{ nodeMap[n.task_id]=n; });

  return (
    <div className="page">
      <div className="page-header anim-blur">
        <div className="page-eyebrow" style={{ color:C.brand }}>Combinatorial Analysis</div>
        <h1 className="page-title" style={{ background:`linear-gradient(135deg,${C.brand},${C.purple},${C.cyan})`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
          Opportunity Engine
        </h1>
        <p className="page-subtitle">
          {opps?.length||0} blocks analysed · {combos.length} compatible combinations for {activeId}
        </p>
      </div>

      {/* Block tabs */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:18, alignItems:'center' }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase',
          letterSpacing:'0.8px', marginRight:4 }}>Block:</span>
        {blocks.map(id=>(
          <button key={id}
            onClick={()=>setBlockId(id)}
            style={{ padding:'6px 14px', borderRadius:100, fontSize:12, fontWeight:600, cursor:'pointer',
              border:`1px solid ${activeId===id?C.brand:'var(--border)'}`,
              background:activeId===id?`${C.brand}18`:'transparent',
              color:activeId===id?C.brand:'var(--text-2)',
              transition:'all var(--t-fast)' }}>
            {id}
          </button>
        ))}
      </div>

      {/* Stats strip */}
      {sel && (
        <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
          {[
            { l:'Feasible Tasks',    v:feasibleIds.length,  c:C.brand  },
            { l:'Combinations',      v:combos.length,       c:C.green  },
            { l:'Infeasible Tasks',  v:infeasible.length,   c:C.red    },
            { l:'Block Duration',    v:`${sel.duration||0} min`, c:C.cyan },
            { l:'Remaining Cap.',    v:`${sel.remaining_capacity??sel.duration??0} min`, c:C.amber },
          ].map(item=>(
            <div key={item.l} className="anim-blur-up"
              style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
                borderRadius:'var(--r-md)', padding:'10px 16px', display:'flex', gap:10, alignItems:'center',
                transition:'all var(--t-mid)' }}>
              <div style={{ width:4, height:30, background:item.c, borderRadius:2 }}/>
              <div>
                <div style={{ fontSize:18, fontWeight:800, fontFamily:'var(--mono)', color:item.c }}>{item.v}</div>
                <div style={{ fontSize:10.5, color:'var(--text-3)' }}>{item.l}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.3fr', gap:20 }}>

        {/* Left: graph */}
        <div className="panel anim-blur-up d2">
          <div className="panel-header">
            <div className="panel-title">
              <div style={{ width:7, height:7, borderRadius:'50%', background:C.brand, animation:'pulse 2.5s ease infinite', flexShrink:0 }}/>
              Feasible Task Graph — {activeId}
            </div>
            <span style={{ fontSize:11, color:C.brand, background:`${C.brand}15`,
              padding:'3px 10px', borderRadius:100, border:`1px solid ${C.brand}25`, fontWeight:600 }}>
              {feasibleIds.length} nodes
            </span>
          </div>

          {feasibleIds.length===0
            ? <div className="empty-state"><div className="empty-icon">🌐</div>
                <div className="empty-text">No feasible tasks for this block</div></div>
            : (
              <div className="opp-graph" style={{ minHeight:120 }}>
                {feasibleIds.map((tid,i)=>(
                  <GraphNode key={tid} taskId={tid} nodeData={nodeMap[tid]} index={i}
                    isHighlighted={hoveredNode===tid}
                    onClick={()=>setHovered(p=>p===tid?null:tid)}/>
                ))}
              </div>
            )
          }

          {/* Task detail table */}
          {feasibleIds.length>0 && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.8px', color:'var(--text-3)', marginBottom:8 }}>Task Details</div>
              {feasibleIds.map(tid=>{
                const n=nodeMap[tid];
                return (
                  <div key={tid} style={{ display:'flex', gap:8, padding:'8px 0',
                    borderBottom:'1px solid var(--border-subtle)', fontSize:12,
                    background:hoveredNode===tid?`${C.brand}08`:'transparent',
                    transition:'background var(--t-fast)', borderRadius:4, paddingLeft:4 }}>
                    <span style={{ fontFamily:'var(--mono)', color:C.cyan, fontWeight:700, minWidth:52 }}>{tid}</span>
                    {n ? (
                      <>
                        <span style={{ flex:1, color:'var(--text-2)' }}>{n.department||'—'}</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-3)', minWidth:36 }}>{n.duration||0}m</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700,
                          color:n.maintenance_debt>=40?C.red:n.maintenance_debt>=25?C.amber:C.green,
                          minWidth:30 }}>D:{(n.maintenance_debt||0).toFixed(0)}</span>
                      </>
                    ) : (
                      <span style={{ color:'var(--text-3)' }}>—</span>
                    )}
                    {explanations[tid] && (
                      <div title={explanations[tid]} style={{ fontSize:10, color:C.green,
                        cursor:'help', marginLeft:'auto' }}>ℹ</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: combinations */}
        <div className="anim-blur-up d3">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:C.green, animation:'pulse 2.5s ease infinite' }}/>
              Compatible Combinations
            </div>
            <span style={{ fontSize:11, color:C.green, background:`${C.green}15`,
              padding:'3px 10px', borderRadius:100, border:`1px solid ${C.green}25`, fontWeight:600 }}>
              {combos.length} found
            </span>
          </div>

          {/* Best combination highlight */}
          {best && (
            <div style={{ marginBottom:12, padding:'12px 14px', borderRadius:'var(--r-md)',
              background:`linear-gradient(90deg,${C.green}12,${C.cyan}08)`,
              border:`1px solid ${C.green}30` }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.green, textTransform:'uppercase',
                letterSpacing:'0.8px', marginBottom:6 }}>⭐ Best Combination</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
                {(best.tasks||[]).map(tid=>(
                  <span key={tid} style={{ fontSize:12, fontWeight:800, color:C.green,
                    fontFamily:'var(--mono)', background:`${C.green}18`,
                    padding:'3px 9px', borderRadius:6, border:`1px solid ${C.green}30` }}>{tid}</span>
                ))}
              </div>
              <div style={{ display:'flex', gap:16, fontSize:11, color:'var(--text-3)' }}>
                <span>Value: <b style={{ color:C.green, fontFamily:'var(--mono)' }}>{(best.adjusted_value||0).toFixed(2)}</b></span>
                <span>Duration: <b style={{ color:'var(--text-2)', fontFamily:'var(--mono)' }}>{best.total_duration||0}m</b></span>
                {best.zero_possession && <span style={{ color:C.green }}>✓ Zero Possession</span>}
              </div>
            </div>
          )}

          {combos.length===0
            ? <div className="empty-state panel">
                <div className="empty-icon">🧩</div>
                <div className="empty-text">No compatible combinations for this block</div>
              </div>
            : combos.map((combo,i)=>{
                const tids=combo.tasks||[];
                const isBest=JSON.stringify(tids)===JSON.stringify(best?.tasks||[]);
                return (
                  <div key={i} className="anim-blur-up" style={{
                    animationDelay:`${i*0.05}s`,
                    padding:'12px 14px', borderRadius:'var(--r-md)',
                    background:'var(--bg-card)', border:`1px solid ${isBest?C.green:'var(--border)'}`,
                    marginBottom:8, transition:'all var(--t-mid)',
                  }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.brand; e.currentTarget.style.transform='translateX(4px)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor=isBest?C.green:'var(--border)'; e.currentTarget.style.transform='none'; }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <span style={{ fontSize:11, fontWeight:800, color:'var(--text-4)',
                        minWidth:22, fontFamily:'var(--mono)' }}>#{i+1}</span>
                      <div style={{ flex:1, display:'flex', gap:5, flexWrap:'wrap' }}>
                        {tids.map(tid=>(
                          <span key={tid} style={{ fontSize:12, fontWeight:700, color:C.cyan,
                            fontFamily:'var(--mono)', background:`${C.cyan}12`,
                            padding:'2px 8px', borderRadius:5, border:`1px solid ${C.cyan}25` }}>{tid}</span>
                        ))}
                      </div>
                      <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:800,
                        color:(combo.adjusted_value||0)>=0?C.green:C.red }}>
                        {(combo.adjusted_value||0).toFixed(1)}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--text-3)' }}>
                      <span>{combo.total_duration||0}m total</span>
                      <span>{combo.remaining_after||0}m spare</span>
                      {combo.additional_possession>0 && (
                        <span style={{ color:C.amber }}>+{combo.additional_possession}m possession</span>
                      )}
                      {combo.zero_possession && <span style={{ color:C.green }}>✓ ZP</span>}
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}
