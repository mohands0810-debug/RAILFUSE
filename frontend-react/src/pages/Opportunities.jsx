import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#3b82f6'];

function GraphNode({ task, index, isHighlighted, onClick }) {
  const c = COLORS[index % COLORS.length];
  return (
    <div
      className="graph-node"
      onClick={onClick}
      style={{
        borderColor: c, color: c,
        background: isHighlighted ? `${c}22` : `${c}0d`,
        boxShadow: isHighlighted ? `0 0 16px ${c}40` : 'none',
        transform: isHighlighted ? 'scale(1.08)' : 'scale(1)',
        animationDelay:`${index*0.05}s`,
        minWidth:80, textAlign:'center',
      }}
    >
      <div style={{ fontSize:12, fontWeight:800 }}>{task.task_id}</div>
      <div style={{ fontSize:9.5, opacity:0.75, marginTop:2 }}>{task.task_type?.split(' ')[0]}</div>
      <div style={{ fontSize:9, opacity:0.5, marginTop:1, fontFamily:'var(--mono)' }}>{task.duration_hours}h</div>
    </div>
  );
}

function CombCard({ combo, rank, tasks }) {
  const taskList = Array.isArray(combo) ? combo : (combo.tasks || [combo]);
  const taskObjs = taskList.map(id => {
    const tid = typeof id === 'string' ? id : id.task_id;
    return tasks?.find(t => t.task_id === tid) || { task_id: tid };
  });
  const totalDur = taskObjs.reduce((s,t) => s+(t.duration_hours||0), 0);
  const topDebt  = Math.max(...taskObjs.map(t => t.maintenance_debt||0));

  return (
    <div className="panel anim-blur-up" style={{
      padding:'14px 16px', marginBottom:10, cursor:'default',
      transition:'all var(--t-mid)',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-bright)'; e.currentTarget.style.transform='translateX(4px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none'; }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
        <div style={{ width:26, height:26, borderRadius:8, background:'var(--bg-elevated)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, fontWeight:800, color:'var(--brand)', flexShrink:0 }}>
          #{rank}
        </div>
        <div style={{ flex:1, display:'flex', gap:6, flexWrap:'wrap' }}>
          {taskList.map(id => {
            const tid = typeof id==='string' ? id : id.task_id;
            const i = COLORS.length > 1 ? (parseInt(tid.replace(/\D/g,''))||0) % COLORS.length : 0;
            return (
              <span key={tid} style={{ fontSize:12, fontWeight:800, color:COLORS[i],
                fontFamily:'var(--mono)', background:`${COLORS[i]}15`,
                padding:'3px 8px', borderRadius:6, border:`1px solid ${COLORS[i]}30` }}>
                {tid}
              </span>
            );
          })}
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:11, fontFamily:'var(--mono)', fontWeight:700, color:'var(--cyan)' }}>{totalDur}h</div>
          <div style={{ fontSize:9.5, color:'var(--text-4)' }}>total</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:'12px 20px', flexWrap:'wrap' }}>
        {taskObjs.map(t => t.task_type && (
          <div key={t.task_id} style={{ fontSize:11, color:'var(--text-3)' }}>
            {t.task_id}: <span style={{ color:'var(--text-2)' }}>{t.task_type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Opportunities() {
  const { data: opps,  loading: oLoad } = useApi(() => api.opportunities());
  const { data: tasks, loading: tLoad } = useApi(() => api.tasks());
  const [blockId, setBlockId] = useState('');
  const [hoveredNode, setHoveredNode] = useState(null);

  if (oLoad || tLoad) return (
    <div className="page">
      <div className="skeleton" style={{ height:120, borderRadius:16, marginBottom:16 }} />
      <div className="skeleton" style={{ height:200, borderRadius:16 }} />
    </div>
  );

  const blocks = [...new Set((opps||[]).map(o => o.block_id))].sort();
  const activeId = blockId || blocks[0];
  const sel = (opps||[]).find(o => o.block_id === activeId);

  const taskList    = sel?.feasible_tasks || [];
  const combos      = sel?.combinations   || [];

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header anim-blur">
        <div className="page-eyebrow">Combinatorial Analysis</div>
        <h1 className="page-title gradient-text">Opportunity Engine</h1>
        <p className="page-subtitle">
          Compatible task combinations per maintenance block · {opps?.length || 0} blocks analysed
        </p>
      </div>

      {/* Block selector */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20, alignItems:'center' }}>
        <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase',
          letterSpacing:'0.6px' }}>Select Block:</span>
        {blocks.map(id => (
          <button key={id}
            className={`filter-chip${activeId===id?' active':''}`}
            onClick={() => setBlockId(id)}
          >{id}</button>
        ))}
      </div>

      {/* Stats strip for selected block */}
      {sel && (
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { label:'Feasible Tasks',   value:taskList.length,  accent:'var(--brand)' },
            { label:'Combinations',     value:combos.length,    accent:'var(--green)' },
            { label:'Block Capacity',   value:`${sel.block?.capacity_minutes ?? '—'} min`, accent:'var(--cyan)' },
          ].map(item => (
            <div key={item.label} className="anim-blur-up" style={{
              background:'var(--bg-card)', border:'1px solid var(--border)',
              borderRadius:'var(--r-md)', padding:'10px 16px', display:'flex', gap:10, alignItems:'center',
              transition:'all var(--t-mid)',
            }}>
              <div style={{ width:4, height:30, background:item.accent, borderRadius:2 }} />
              <div>
                <div style={{ fontSize:18, fontWeight:800, fontFamily:'var(--mono)', color:item.accent }}>{item.value}</div>
                <div style={{ fontSize:10.5, color:'var(--text-3)' }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:20 }}>

        {/* Left: graph */}
        <div className="panel anim-blur-up d2">
          <div className="panel-header">
            <div className="panel-title">
              <div className="panel-title-dot" />
              Feasible Task Nodes — {activeId}
            </div>
            <span className="badge badge-blue">{taskList.length} nodes</span>
          </div>

          {taskList.length === 0
            ? <div className="empty-state"><div className="empty-icon">🌐</div><div className="empty-text">No feasible tasks for this block</div></div>
            : (
              <div className="opp-graph" style={{ minHeight:160 }}>
                {taskList.map((t, i) => (
                  <GraphNode key={t.task_id} task={t} index={i}
                    isHighlighted={hoveredNode === t.task_id}
                    onClick={() => setHoveredNode(prev => prev===t.task_id ? null : t.task_id)}
                  />
                ))}
              </div>
            )
          }

          {taskList.length > 0 && (
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.8px', color:'var(--text-3)', marginBottom:10 }}>
                Task Details
              </div>
              {taskList.map(t => {
                const full = (tasks||[]).find(x => x.task_id === t.task_id);
                const dept = full?.department || t.department || '—';
                const debt = full?.maintenance_debt || 0;
                return (
                  <div key={t.task_id} style={{ display:'flex', gap:10, padding:'8px 0',
                    borderBottom:'1px solid var(--border-subtle)', fontSize:12 }}>
                    <span style={{ fontFamily:'var(--mono)', color:'var(--accent)', fontWeight:700, minWidth:60 }}>{t.task_id}</span>
                    <span style={{ flex:1, color:'var(--text-2)' }}>{t.task_type}</span>
                    <span className="chip">{dept}</span>
                    <span style={{ color: debt>=40?'#ef4444':debt>=25?'#f59e0b':'#10b981',
                      fontFamily:'var(--mono)', fontWeight:700, fontSize:11 }}>{debt.toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: combinations */}
        <div className="anim-blur-up d3">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div className="panel-title">
              <div className="panel-title-dot" style={{ background:'var(--green)' }} />
              Compatible Combinations
            </div>
            <span className="badge badge-green">{combos.length} found</span>
          </div>

          {combos.length === 0
            ? <div className="empty-state panel">
                <div className="empty-icon">🧩</div>
                <div className="empty-text">No combinations found for this block</div>
              </div>
            : combos.map((combo, i) => (
                <CombCard key={i} combo={combo} rank={i+1} tasks={tasks} />
              ))
          }
        </div>
      </div>
    </div>
  );
}
