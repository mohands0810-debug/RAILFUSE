import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

const fmtTime = s => s ? s.substring(11,16) : '—';
const fmtDate = s => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—';

function CapacityRing({ used, total }) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const r   = 22;
  const circ = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
  return (
    <svg width={54} height={54} viewBox="0 0 54 54" style={{ flexShrink:0 }}>
      <circle cx={27} cy={27} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5} />
      <circle cx={27} cy={27} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition:'stroke-dasharray 1s var(--ease-snap)' }} />
      <text x={27} y={27} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={10} fontWeight={800} fontFamily="var(--mono)">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function OpportunityNode({ task, index, total }) {
  const colors = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#3b82f6'];
  const c = colors[index % colors.length];
  return (
    <div className="graph-node anim-blur-up" style={{
      borderColor: c, color: c,
      background: `${c}12`,
      animationDelay:`${index*0.05}s`,
    }}>
      <div style={{ fontSize:11, fontWeight:800 }}>{task.task_id}</div>
      <div style={{ fontSize:10, opacity:0.75, marginTop:2 }}>{task.task_type}</div>
      <div style={{ fontSize:9.5, opacity:0.55, marginTop:1 }}>{task.duration_hours}h</div>
    </div>
  );
}

function BlockCard({ block, isSelected, onClick }) {
  const trains = (block.conflicting_trains || []).length;
  const pct = block.capacity_minutes > 0
    ? Math.min(((block.utilized_minutes||0) / block.capacity_minutes)*100, 100)
    : 0;
  return (
    <div
      className={`glass-card anim-blur-up${isSelected ? ' selected-block' : ''}`}
      onClick={onClick}
      style={{
        padding:'16px', cursor:'pointer',
        borderColor: isSelected ? 'var(--brand)' : 'var(--border)',
        boxShadow: isSelected ? '0 0 0 2px rgba(99,102,241,0.4), var(--shadow-brand)' : 'none',
        transform: isSelected ? 'translateY(-2px)' : 'none',
        transition:'all 0.25s var(--ease-out)',
      }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:800, fontFamily:'var(--mono)', color: isSelected ? 'var(--brand)' : 'var(--text-1)' }}>
            {block.block_id}
          </div>
          <div style={{ fontSize:10.5, color:'var(--text-3)', marginTop:2 }}>{block.section}</div>
        </div>
        <CapacityRing used={block.utilized_minutes||0} total={block.capacity_minutes||1} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 10px', marginBottom:10 }}>
        {[
          ['⏱ Capacity', `${block.capacity_minutes} min`],
          ['📅 Date',     fmtDate(block.start_time)],
          ['🕐 Start',   fmtTime(block.start_time)],
          ['🕑 End',     fmtTime(block.end_time)],
          ['🚂 Trains',  trains > 0 ? `${trains} conflict${trains>1?'s':''}` : 'Clear'],
          ['📍 Zone',    block.railway_zone || '—'],
        ].map(([k,v]) => (
          <div key={k}>
            <div style={{ fontSize:9.5, color:'var(--text-4)', marginBottom:1 }}>{k}</div>
            <div style={{ fontSize:11.5, fontWeight:600, color:'var(--text-2)' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ height:3, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%',
          background: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : 'var(--brand)',
          borderRadius:2, transition:'width 0.8s var(--ease-snap)' }} />
      </div>
    </div>
  );
}

export default function Blocks() {
  const { data: blocks, loading: bLoad } = useApi(() => api.blocks());
  const { data: opps,   loading: oLoad } = useApi(() => api.opportunities());
  const [selected, setSelected] = useState(null);

  if (bLoad || oLoad) return (
    <div className="page">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:12 }}>
        {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height:180 }} />)}
      </div>
    </div>
  );

  const selBlock = (blocks||[]).find(b => b.block_id === selected);
  const selOpps  = (opps||[]).find(o => o.block_id === selected);

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header anim-blur">
        <div className="page-eyebrow">Maintenance Windows</div>
        <h1 className="page-title gradient-text">Block Explorer</h1>
        <p className="page-subtitle">
          {blocks?.length || 0} maintenance windows · Click a block to reveal opportunity graph
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* Left — Block cards */}
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {(blocks||[]).map((b,i) => (
              <div key={b.block_id} style={{ animationDelay:`${i*0.04}s` }}>
                <BlockCard
                  block={b}
                  isSelected={selected === b.block_id}
                  onClick={() => setSelected(prev => prev === b.block_id ? null : b.block_id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right — Opportunity panel */}
        <div>
          {!selected ? (
            <div className="panel" style={{ display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', minHeight:320, gap:16 }}>
              <div style={{ fontSize:48, animation:'float 3s ease infinite' }}>⬡</div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text-2)' }}>Select a Block</div>
              <div style={{ fontSize:13, color:'var(--text-3)', textAlign:'center', maxWidth:280, lineHeight:1.6 }}>
                Click any block card on the left to reveal its opportunity graph and compatible task combinations
              </div>
            </div>
          ) : (
            <div className="panel anim-blur-up">
              {/* Block header */}
              <div style={{ marginBottom:18 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:12, fontWeight:800, fontFamily:'var(--mono)',
                    color:'var(--brand)', background:'var(--purple-bg)', padding:'4px 10px',
                    borderRadius:6, border:'1px solid var(--border-bright)' }}>
                    {selected}
                  </span>
                  <span className="badge badge-cyan">
                    {selOpps?.feasible_tasks?.length || 0} feasible tasks
                  </span>
                </div>
                {selBlock && (
                  <div style={{ fontSize:12.5, color:'var(--text-2)' }}>
                    {selBlock.capacity_minutes} min capacity · {selBlock.section}
                  </div>
                )}
              </div>

              {/* Opportunity graph nodes */}
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px',
                  color:'var(--text-3)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                  <div className="panel-title-dot" style={{ width:6, height:6 }} />
                  Feasible Tasks
                </div>
                <div className="opp-graph">
                  {!(selOpps?.feasible_tasks?.length) ? (
                    <div className="empty-state" style={{ width:'100%', padding:'20px 0' }}>
                      <div className="empty-icon" style={{ fontSize:28 }}>🚫</div>
                      <div className="empty-text">No feasible tasks for this block</div>
                    </div>
                  ) : selOpps.feasible_tasks.map((t, i) => (
                    <OpportunityNode key={t.task_id} task={t} index={i} total={selOpps.feasible_tasks.length} />
                  ))}
                </div>
              </div>

              {/* Combinations */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px',
                  color:'var(--text-3)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                  <div className="panel-title-dot" style={{ width:6, height:6, background:'var(--green)' }} />
                  Compatible Combinations ({selOpps?.combinations?.length || 0})
                </div>
                {!(selOpps?.combinations?.length) ? (
                  <div className="empty-state" style={{ padding:'20px 0' }}>
                    <div className="empty-icon" style={{ fontSize:28 }}>📭</div>
                    <div className="empty-text">No compatible combinations</div>
                  </div>
                ) : (selOpps.combinations||[]).slice(0,8).map((combo, i) => (
                  <div key={i} className="anim-blur-up" style={{
                    animationDelay:`${i*0.05}s`,
                    display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                    borderRadius:10, background:'var(--bg-base)', border:'1px solid var(--border)',
                    marginBottom:6, transition:'all var(--t-mid)',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-bright)'; e.currentTarget.style.transform='translateX(3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none'; }}
                  >
                    <span style={{ fontSize:11, fontWeight:800, color:'var(--text-4)',
                      minWidth:18, fontFamily:'var(--mono)' }}>#{i+1}</span>
                    <div style={{ flex:1, display:'flex', gap:6, flexWrap:'wrap' }}>
                      {(Array.isArray(combo) ? combo : (combo.tasks || [combo])).map(tid => (
                        <span key={typeof tid==='string'?tid:tid.task_id}
                          style={{ fontSize:11.5, fontWeight:700, color:'var(--cyan)',
                            fontFamily:'var(--mono)', background:'var(--cyan-bg)',
                            padding:'2px 8px', borderRadius:5 }}>
                          {typeof tid==='string' ? tid : tid.task_id}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize:11, color:'var(--text-3)' }}>
                      {Array.isArray(combo) ? combo.length : (combo.tasks||[combo]).length} task{(Array.isArray(combo)?combo.length:(combo.tasks||[combo]).length)>1?'s':''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
