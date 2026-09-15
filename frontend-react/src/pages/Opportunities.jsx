import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { Loading, ErrorBox, Card, Badge, Tag, Bar, debtColor, flexColor } from '../components/UI';

const PAGE = { padding:'28px 32px', maxWidth:1400, animation:'fadeUp 0.25s ease' };
const H1   = { fontSize:24, fontWeight:800, background:'linear-gradient(135deg,#f1f5f9,#94a3b8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-0.5px', marginBottom:4 };

export default function Opportunities() {
  const [selected, setSelected] = useState(null);
  const { data: opps, loading, error } = useApi(() => api.opportunities());

  if (loading) return <div style={PAGE}><Loading text="Analyzing opportunity graph…" /></div>;
  if (error)   return <div style={PAGE}><ErrorBox message={error} /></div>;

  const best = (opps || []).filter(o => o.best_combination);
  const totalFeasible = (opps || []).reduce((s, o) => s + (o.feasible_tasks?.length || 0), 0);
  const totalCombos   = (opps || []).reduce((s, o) => s + (o.compatible_combinations?.length || 0), 0);
  const zeroPoss      = (opps || []).filter(o => o.best_combination?.zero_possession).length;

  return (
    <div style={PAGE}>
      <div style={{ marginBottom:24 }}>
        <h1 style={H1}>⚡ Opportunity Engine</h1>
        <p style={{ fontSize:14, color:'var(--text-3)' }}>Analyzes each maintenance block to find optimal task combinations using the compatibility graph</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Blocks Analyzed',      val: (opps||[]).length,  color:'var(--cyan)'   },
          { label:'Total Feasible Tasks', val: totalFeasible,      color:'var(--text-1)' },
          { label:'Compatible Combos',    val: totalCombos,        color:'var(--purple)' },
          { label:'Zero-Possession Best', val: zeroPoss,           color:'var(--green)'  },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20 }}>
        {/* Block List */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>Select a Block</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {(opps||[]).map(o => {
              const hasBest = !!o.best_combination;
              const isSelected = selected === o.block_id;
              return (
                <button key={o.block_id} id={`opp-block-${o.block_id}`}
                  onClick={() => setSelected(isSelected ? null : o.block_id)}
                  style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'10px 14px', borderRadius:8, textAlign:'left',
                    background: isSelected ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
                    border: `1px solid ${isSelected ? '#6366f1' : 'var(--border)'}`,
                    color:'var(--text-1)', cursor:'pointer', transition:'all 0.15s',
                  }}
                >
                  <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--accent)', fontWeight:600, flex:1 }}>{o.block_id}</span>
                  <Badge color={hasBest ? '#10b981' : '#475569'}>{hasBest ? `${o.feasible_tasks.length} tasks` : 'Empty'}</Badge>
                  {o.best_combination?.zero_possession && <span title="Zero possession" style={{ fontSize:14 }}>🟢</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div>
          {!selected
            ? <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'48px 24px', textAlign:'center', color:'var(--text-3)' }}>
                <div style={{ fontSize:36, marginBottom:12 }}>⚡</div>
                <div style={{ fontSize:15, color:'var(--text-2)', marginBottom:6 }}>Select a block to explore its opportunity graph</div>
                <div style={{ fontSize:13 }}>The Opportunity Engine analyzes task compatibility and block capacity to find the best combination</div>
              </div>
            : <OppDetail opp={(opps||[]).find(o => o.block_id === selected)} />
          }
        </div>
      </div>
    </div>
  );
}

function OppDetail({ opp }) {
  if (!opp) return null;
  const combos   = opp.compatible_combinations || [];
  const feasible = opp.feasible_tasks || [];
  const infeas   = opp.infeasible_tasks || [];
  const best     = opp.best_combination;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'18px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:'var(--mono)', fontSize:16, fontWeight:700, color:'var(--accent)' }}>{opp.block_id}</div>
            <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{opp.section} · {opp.block_duration} min block</div>
          </div>
          {best
            ? <Badge color="#10b981">{best.zero_possession ? '✓ Zero Possession' : `+${best.additional_possession} min possession`}</Badge>
            : <Badge color="#475569">No feasible tasks</Badge>}
        </div>

        {/* Graph Nodes */}
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>Opportunity Graph</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom: infeas.length ? 10 : 0 }}>
          {feasible.map(tid => {
            const inBest = best?.tasks?.includes(tid);
            return (
              <span key={tid} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, background: inBest ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)', border:`1px solid ${inBest ? '#10b981' : 'rgba(99,102,241,0.3)'}`, color: inBest ? '#10b981' : '#a5b4fc', transition:'all 0.15s' }}>
                {inBest ? '★ ' : ''}{tid}
              </span>
            );
          })}
        </div>
        {infeas.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
            <div style={{ width:'100%', fontSize:11, color:'var(--text-3)', marginBottom:4 }}>Infeasible ({infeas.length})</div>
            {infeas.map(i => (
              <span key={i.task_id} title={i.reason} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', opacity:0.75 }}>✕ {i.task_id}</span>
            ))}
          </div>
        )}
      </div>

      {/* Best Combination */}
      {best && (
        <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:12, padding:'18px 20px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#10b981', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:12 }}>★ Best Combination</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
            {best.tasks.map(t => <Tag key={t}>{t}</Tag>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              ['Adjusted Value', best.adjusted_value?.toFixed(2)],
              ['Total Duration', `${best.total_duration} min`],
              ['Remaining After', `${best.remaining_after} min`],
            ].map(([l,v]) => (
              <div key={l}>
                <div style={{ fontSize:10, color:'var(--text-3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:16, fontWeight:800, color:'var(--text-1)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Combos */}
      {combos.length > 0 && (
        <Card title="All Compatible Combinations" badge={`${combos.length}`}>
          {combos.slice(0,8).map((c,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0', borderBottom:'1px solid var(--border-subtle)' }}>
              <span style={{ fontSize:11, color:'var(--text-3)', width:18 }}>#{i+1}</span>
              <div style={{ flex:1, display:'flex', gap:5, flexWrap:'wrap' }}>{c.tasks.map(t => <Tag key={t}>{t}</Tag>)}</div>
              <div style={{ textAlign:'right', minWidth:110 }}>
                <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:14, color:'var(--text-1)' }}>{c.adjusted_value?.toFixed(1)}</div>
                <div style={{ fontSize:10, color:c.zero_possession ? '#10b981' : '#f59e0b' }}>
                  {c.zero_possession ? '✓ zero poss.' : `+${c.additional_possession}m`}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
