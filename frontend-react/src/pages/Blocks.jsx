import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

/* Real Block fields from API:
   block_id, corridor, section, start_time, end_time, duration (minutes),
   block_type, available_resources[], affected_track, safety_constraints[],
   existing_tasks[], remaining_capacity, notes
   
   Real Opportunity fields:
   block_id, section, duration, remaining_capacity,
   feasible_tasks: string[], (task IDs)
   compatible_combinations: [{ tasks:[], total_duration, remaining_after,
     additional_possession, base_value, adjusted_value, zero_possession }]
*/

const C = {
  brand:'#FF6E8F', purple:'#c084fc', cyan:'#67e8f9',
  green:'#34d399', amber:'#fbbf24', red:'#f87171', blue:'#60a5fa',
};

const fmtTime = s => s ? s.substring(11,16) : '—';
const fmtDate = s => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—';

function CapacityRing({ used, total }) {
  const pct = total>0 ? Math.min((used/total)*100,100) : 0;
  const r=22, circ=2*Math.PI*r;
  const dash=(pct/100)*circ;
  const color=pct>=90?C.red:pct>=70?C.amber:pct<=30?C.green:C.brand;
  return (
    <svg width={54} height={54} viewBox="0 0 54 54" style={{ flexShrink:0 }}>
      <circle cx={27} cy={27} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5}/>
      <circle cx={27} cy={27} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={circ*0.25} strokeLinecap="round"
        style={{ transition:'stroke-dasharray 1s var(--ease-snap)' }}/>
      <text x={27} y={27} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={10} fontWeight={800} fontFamily="var(--mono)">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function BlockCard({ block, isSelected, onClick }) {
  // capacity = duration minutes (the full block), utilized = duration - remaining_capacity
  const cap     = block.duration || block.remaining_capacity || 0;
  const remain  = block.remaining_capacity ?? cap;
  const utilized= cap - remain;
  const startDt = block.start_time;
  const endDt   = block.end_time;

  return (
    <div onClick={onClick} style={{
      background:'var(--bg-card)', border:`1px solid ${isSelected?C.brand:'var(--border)'}`,
      borderRadius:'var(--r-lg)', padding:'16px', cursor:'pointer',
      boxShadow:isSelected?`0 0 0 2px ${C.brand}40, 0 0 24px ${C.brand}20`:'none',
      transform:isSelected?'translateY(-2px)':'none',
      transition:'all 0.25s var(--ease-out)',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:800, fontFamily:'var(--mono)',
            color:isSelected?C.brand:'var(--text-1)' }}>{block.block_id}</div>
          <div style={{ fontSize:10.5, color:'var(--text-3)', marginTop:2 }}>{block.section}</div>
          {block.block_type && (
            <div style={{ fontSize:10, color:C.cyan, marginTop:2, fontWeight:600 }}>{block.block_type}</div>
          )}
        </div>
        <CapacityRing used={utilized} total={cap}/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 10px', marginBottom:10 }}>
        {[
          ['⏱ Capacity', `${cap} min`],
          ['📅 Date',    fmtDate(startDt)],
          ['🕐 Start',   fmtTime(startDt)],
          ['🕑 End',     fmtTime(endDt)],
          ['🛤 Track',   block.affected_track||'—'],
          ['🚇 Corridor',block.corridor ? block.corridor.split('-')[0] : '—'],
        ].map(([k,v])=>(
          <div key={k}>
            <div style={{ fontSize:9.5, color:'var(--text-4)', marginBottom:1 }}>{k}</div>
            <div style={{ fontSize:11.5, fontWeight:600, color:'var(--text-2)' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ height:3, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:`${Math.min((utilized/cap)*100,100)}%`, height:'100%',
          background:utilized/cap>=0.9?C.red:utilized/cap>=0.7?C.amber:C.brand,
          borderRadius:2, transition:'width 0.8s var(--ease-snap)' }}/>
      </div>

      {block.safety_constraints?.length>0 && (
        <div style={{ marginTop:8, display:'flex', gap:4, flexWrap:'wrap' }}>
          {block.safety_constraints.slice(0,3).map(s=>(
            <span key={s} style={{ fontSize:9.5, color:C.amber, background:`${C.amber}12`,
              padding:'2px 6px', borderRadius:4, border:`1px solid ${C.amber}25` }}>
              {s.replace(/_/g,' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Blocks() {
  const { data: blocks, loading: bLoad } = useApi(()=>api.blocks());
  const { data: opps,   loading: oLoad } = useApi(()=>api.opportunities());
  const [selected, setSelected] = useState(null);

  if (bLoad||oLoad) return (
    <div className="page">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:12 }}>
        {[...Array(6)].map((_,i)=><div key={i} className="skeleton" style={{ height:200 }}/>)}
      </div>
    </div>
  );

  const selBlock = (blocks||[]).find(b=>b.block_id===selected);
  const selOpps  = (opps||[]).find(o=>o.block_id===selected);

  // feasible_tasks is an array of task ID strings
  const feasible = selOpps?.feasible_tasks || [];
  // compatible_combinations is an array of combo objects
  const combos   = selOpps?.compatible_combinations || selOpps?.combinations || [];

  const COLORS=[C.brand,C.purple,C.cyan,C.green,C.amber,C.red,C.blue];

  return (
    <div className="page">
      <div className="page-header anim-blur">
        <div className="page-eyebrow" style={{ color:C.brand }}>Maintenance Windows</div>
        <h1 className="page-title" style={{ background:`linear-gradient(135deg,${C.brand},${C.purple})`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
          Block Explorer
        </h1>
        <p className="page-subtitle">{blocks?.length||0} maintenance windows · Click a block to reveal opportunities</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Left: block cards */}
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {(blocks||[]).map((b,i)=>(
              <div key={b.block_id} className="anim-blur-up" style={{ animationDelay:`${i*0.04}s` }}>
                <BlockCard block={b} isSelected={selected===b.block_id}
                  onClick={()=>setSelected(p=>p===b.block_id?null:b.block_id)}/>
              </div>
            ))}
          </div>
        </div>

        {/* Right: opportunity panel */}
        <div>
          {!selected ? (
            <div className="panel" style={{ display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', minHeight:340, gap:16 }}>
              <div style={{ fontSize:48, animation:'float 3s ease infinite' }}>⬡</div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text-2)' }}>Select a Block</div>
              <div style={{ fontSize:13, color:'var(--text-3)', textAlign:'center', maxWidth:280, lineHeight:1.6 }}>
                Click any block card to reveal its feasible tasks and compatible combinations
              </div>
            </div>
          ) : (
            <div className="panel anim-blur-up">
              {/* Block summary */}
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:13, fontWeight:800, fontFamily:'var(--mono)',
                    color:C.brand, background:`${C.brand}15`, padding:'4px 12px',
                    borderRadius:6, border:`1px solid ${C.brand}30` }}>{selected}</span>
                  <span style={{ fontSize:11, color:'var(--text-3)' }}>
                    {feasible.length} feasible · {combos.length} combinations
                  </span>
                </div>
                {selBlock && (
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                    {[
                      ['Capacity',  `${selBlock.duration||0} min`],
                      ['Remaining', `${selBlock.remaining_capacity??selBlock.duration??0} min`],
                      ['Type',      selBlock.block_type||'—'],
                      ['Track',     selBlock.affected_track||'—'],
                    ].map(([k,v])=>(
                      <div key={k}>
                        <div style={{ fontSize:9.5, color:'var(--text-4)' }}>{k}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-2)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feasible tasks */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px',
                  color:'var(--text-3)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:C.brand, animation:'pulse 2.5s ease infinite' }}/>
                  Feasible Tasks ({feasible.length})
                </div>
                {feasible.length===0
                  ? <div className="empty-state" style={{ padding:'20px 0' }}>
                      <div className="empty-icon" style={{ fontSize:28 }}>🚫</div>
                      <div className="empty-text">No feasible tasks for this block</div>
                    </div>
                  : <div className="opp-graph" style={{ minHeight:80 }}>
                      {feasible.map((tid,i)=>{
                        const c=COLORS[i%COLORS.length];
                        return (
                          <div key={tid} className="graph-node anim-blur-up"
                            style={{ borderColor:c, color:c, background:`${c}12`,
                              animationDelay:`${i*0.05}s`, minWidth:72, textAlign:'center' }}>
                            <div style={{ fontSize:12, fontWeight:800 }}>{tid}</div>
                          </div>
                        );
                      })}
                    </div>
                }
              </div>

              {/* Compatible combinations */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px',
                  color:'var(--text-3)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:C.green, animation:'pulse 2.5s ease infinite' }}/>
                  Compatible Combinations ({combos.length})
                </div>
                {combos.length===0
                  ? <div className="empty-state" style={{ padding:'16px 0' }}>
                      <div className="empty-icon" style={{ fontSize:24 }}>📭</div>
                      <div className="empty-text">No compatible combinations</div>
                    </div>
                  : combos.map((combo,i)=>{
                      const tids=combo.tasks||[];
                      return (
                        <div key={i} className="anim-blur-up"
                          style={{ animationDelay:`${i*0.05}s`,
                            display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                            borderRadius:10, background:'var(--bg-base)', border:'1px solid var(--border)',
                            marginBottom:6, transition:'all var(--t-mid)',
                          }}
                          onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.brand; e.currentTarget.style.transform='translateX(3px)'; }}
                          onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none'; }}
                        >
                          <span style={{ fontSize:10, fontWeight:800, color:'var(--text-4)',
                            minWidth:20, fontFamily:'var(--mono)' }}>#{i+1}</span>
                          <div style={{ flex:1, display:'flex', gap:5, flexWrap:'wrap' }}>
                            {tids.map(tid=>(
                              <span key={tid} style={{ fontSize:11.5, fontWeight:700, color:C.cyan,
                                fontFamily:'var(--mono)', background:`${C.cyan}12`,
                                padding:'2px 8px', borderRadius:5, border:`1px solid ${C.cyan}25` }}>
                                {tid}
                              </span>
                            ))}
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:C.green, fontFamily:'var(--mono)' }}>
                              {(combo.adjusted_value||combo.base_value||0).toFixed(1)}
                            </div>
                            <div style={{ fontSize:9.5, color:'var(--text-4)' }}>value</div>
                            {combo.zero_possession && (
                              <span style={{ fontSize:9, color:C.green, background:`${C.green}12`,
                                padding:'1px 5px', borderRadius:4, border:`1px solid ${C.green}25`,
                                display:'block', marginTop:2 }}>ZP ✓</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
