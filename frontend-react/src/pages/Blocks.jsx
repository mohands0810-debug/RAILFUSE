import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { Loading, ErrorBox, Card, StatusBadge, Badge, Tag, Bar, ReasoningBox, fmtDT, debtColor } from '../components/UI';

const PAGE = { padding:'28px 32px', maxWidth:1400, animation:'fadeUp 0.25s ease' };
const H1   = { fontSize:24, fontWeight:800, background:'linear-gradient(135deg,#f1f5f9,#94a3b8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-0.5px', marginBottom:4 };

export default function Blocks() {
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail]     = useState({});
  const [detailLoading, setDL]  = useState({});

  const { data: blocks, loading, error } = useApi(() => api.blocks());
  const { data: plan }                   = useApi(() => api.optimizedPlan().catch(() => null));

  if (loading) return <div style={PAGE}><Loading text="Loading blocks…" /></div>;
  if (error)   return <div style={PAGE}><ErrorBox message={error} /></div>;

  const planByBlock = {};
  (plan?.block_assignments || []).forEach(b => { planByBlock[b.block_id] = b; });

  async function toggleBlock(blockId) {
    if (expanded === blockId) { setExpanded(null); return; }
    setExpanded(blockId);
    if (!detail[blockId]) {
      setDL(p => ({ ...p, [blockId]: true }));
      try {
        const d = await api.blockDetail(blockId);
        setDetail(p => ({ ...p, [blockId]: d }));
      } catch(e) {
        setDetail(p => ({ ...p, [blockId]: { error: e.message } }));
      } finally {
        setDL(p => ({ ...p, [blockId]: false }));
      }
    }
  }

  return (
    <div style={PAGE}>
      <div style={{ marginBottom:24 }}>
        <h1 style={H1}>📦 Block Explorer</h1>
        <p style={{ fontSize:14, color:'var(--text-3)' }}>{(blocks||[]).length} planning windows · click any row to see opportunity analysis</p>
      </div>

      {/* Summary stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Blocks',        val: (blocks||[]).length,                                                              color:'var(--cyan)'   },
          { label:'With Assignments',    val: Object.values(planByBlock).filter(b => b.selected_tasks.length > 0).length,      color:'var(--green)'  },
          { label:'Zero Possession',     val: plan?.summary?.zero_possession_blocks ?? '—',                                    color:'var(--accent)' },
          { label:'Total Duration',      val: `${(blocks||[]).reduce((s,b) => s+b.duration,0)} min`,                           color:'var(--text-1)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <Card style={{ padding:0, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--bg-elevated)', borderBottom:'1px solid var(--border)' }}>
                {['Block ID','Section','Start Time','Duration','Remaining','Assigned Tasks','Block Value','Status'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:'var(--text-3)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(blocks||[]).map(b => {
                const asgn = planByBlock[b.block_id];
                const hasTasks = asgn?.selected_tasks?.length > 0;
                const isExp = expanded === b.block_id;
                return (
                  <>
                    <tr key={b.block_id} id={`block-row-${b.block_id}`}
                      onClick={() => toggleBlock(b.block_id)}
                      style={{ borderBottom:'1px solid var(--border-subtle)', cursor:'pointer', background: isExp ? 'rgba(99,102,241,0.06)' : '', transition:'background 0.12s' }}
                      onMouseEnter={e => !isExp && (e.currentTarget.style.background='rgba(99,102,241,0.03)')}
                      onMouseLeave={e => !isExp && (e.currentTarget.style.background='')}
                    >
                      <td style={{ padding:'10px 14px', fontFamily:'var(--mono)', fontSize:12, fontWeight:600, color:'var(--accent)' }}>{b.block_id}</td>
                      <td style={{ padding:'10px 14px', fontWeight:600, color:'var(--text-1)' }}>{b.section}</td>
                      <td style={{ padding:'10px 14px', fontFamily:'var(--mono)', fontSize:12 }}>{fmtDT(b.start_time)}</td>
                      <td style={{ padding:'10px 14px', fontFamily:'var(--mono)', fontSize:12 }}>{b.duration} min</td>
                      <td style={{ padding:'10px 14px', minWidth:110 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ flex:1 }}><Bar value={b.remaining_capacity} max={b.duration} color={b.remaining_capacity < 30 ? '#f59e0b' : '#6366f1'} /></div>
                          <span style={{ fontFamily:'var(--mono)', fontSize:11, minWidth:38 }}>{b.remaining_capacity}m</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        {hasTasks ? asgn.selected_tasks.map(t => <Tag key={t}>{t}</Tag>) : <span style={{ color:'var(--text-4)', fontSize:12 }}>—</span>}
                      </td>
                      <td style={{ padding:'10px 14px', fontFamily:'var(--mono)', fontWeight:700, color:'var(--text-1)' }}>
                        {asgn ? asgn.block_value.toFixed(1) : '—'}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        {hasTasks
                          ? asgn.zero_possession
                            ? <Badge color="#10b981">✓ Assigned</Badge>
                            : <Badge color="#f59e0b">Extended</Badge>
                          : <Badge color="#475569">Empty</Badge>}
                      </td>
                    </tr>

                    {isExp && (
                      <tr key={`detail-${b.block_id}`}>
                        <td colSpan={8} style={{ padding:0 }}>
                          <BlockDetailPanel blockId={b.block_id} detail={detail[b.block_id]} loading={detailLoading[b.block_id]} planAsgn={asgn} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function BlockDetailPanel({ blockId, detail, loading, planAsgn }) {
  if (loading || !detail) return <div style={{ padding:24, background:'var(--bg-surface)', borderTop:'1px solid var(--border)' }}><Loading /></div>;
  if (detail.error) return <div style={{ padding:16, background:'var(--bg-surface)' }}><ErrorBox message={detail.error} /></div>;

  const { block, opportunity_analysis: oa, plan_assignment: pa } = detail;
  const feasible    = oa?.feasible_tasks || [];
  const infeasible  = oa?.infeasible_tasks || [];
  const combos      = oa?.compatible_combinations || [];
  const best        = oa?.best_combination;
  const decisions   = pa?.explanations || planAsgn?.explanations || {};

  return (
    <div style={{ background:'var(--bg-surface)', borderTop:'1px solid var(--border)', padding:'20px 24px', animation:'slideDown 0.2s ease' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:20 }}>
        {/* Block Info */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:12 }}>Block Details</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[['Section',block.section],['Type',block.block_type],['Track',block.affected_track],['Duration',`${block.duration} min`],['Remaining',`${block.remaining_capacity} min`],['Resources',block.available_resources.join(', ')||'—']].map(([l,v]) => (
              <div key={l}><div style={{ fontSize:10, color:'var(--text-3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>{l}</div><div style={{ fontSize:13, color:'var(--text-1)', fontWeight:500 }}>{v}</div></div>
            ))}
          </div>
        </div>

        {/* Opportunity Graph */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>Opportunity Graph ({feasible.length} feasible)</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
            {feasible.map(tid => {
              const isSelected = best?.tasks?.includes(tid);
              return (
                <span key={tid} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600, background: isSelected ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)', border:`1px solid ${isSelected ? '#10b981' : 'rgba(99,102,241,0.3)'}`, color: isSelected ? '#10b981' : '#a5b4fc' }}>
                  {isSelected ? '✓ ' : ''}{tid}
                </span>
              );
            })}
            {infeasible.map(i => (
              <span key={i.task_id} title={i.reason} style={{ display:'inline-flex', padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', opacity:0.8 }}>✕ {i.task_id}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Combinations */}
      {combos.length > 0 && (
        <>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>Compatible Combinations</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
            {combos.slice(0,5).map((c,i) => (
              <div key={i} style={{ background: i===0 ? 'rgba(16,185,129,0.06)' : 'var(--bg-elevated)', border:`1px solid ${i===0 ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, borderRadius:8, padding:'12px 14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                    {i===0 && <span style={{ fontSize:10, fontWeight:700, color:'#10b981' }}>★ BEST </span>}
                    {c.tasks.map(t => <Tag key={t}>{t}</Tag>)}
                  </div>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:15, color:'var(--text-1)' }}>{c.adjusted_value?.toFixed(1)}</span>
                </div>
                <div style={{ display:'flex', gap:16, fontSize:11, color:'var(--text-3)' }}>
                  <span>⏱ {c.total_duration} min</span>
                  <span>📐 {c.remaining_after} min left</span>
                  {c.zero_possession ? <span style={{color:'#10b981'}}>✓ Zero possession</span> : <span style={{color:'#f59e0b'}}>+{c.additional_possession} min</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Decisions */}
      {Object.entries(decisions).length > 0 && (
        <>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>Algorithm Decisions</div>
          {Object.entries(decisions).map(([tid, dec]) => {
            const c = { SELECTED:'#10b981', DEFERRED:'#f59e0b', REJECTED:'#ef4444', PROTECTED:'#8b5cf6' }[dec.status] || '#475569';
            return (
              <div key={tid} style={{ marginBottom:10, padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:8, borderLeft:`3px solid ${c}` }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600, color:'var(--accent)' }}>{tid}</span>
                  <StatusBadge status={dec.status} />
                </div>
                <div style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.6 }}>{dec.reason}</div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
