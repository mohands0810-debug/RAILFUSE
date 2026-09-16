import { useState, useCallback } from 'react';
import { api } from '../api/client';

const C = {
  orange: '#f97316', green: '#22c55e', amber: '#f59e0b',
  red: '#ef4444', blue: '#3b82f6', purple: '#a855f7',
};

const SECTIONS  = ['DLI-MTJ', 'MTJ-AGB', 'AGB-JHS', 'JHS-BPL', 'BPL-NGP'];
const DEPTS     = ['Engineering', 'S&T', 'TRD', 'Civil', 'Telecom'];
const TASK_TYPES = [
  'Emergency Track Defect Repair', 'Rail Fracture Repair',
  'OHE Wire Replacement', 'Signal Failure Repair',
  'Bridge Inspection Emergency', 'Tunnel Safety Check',
  'Track Geometry Correction', 'Traction Power Failure',
  'Level Crossing Failure', 'Culvert Emergency',
];

const DEFAULT_FORM = {
  task_id: '', corridor: 'C17-DLI-MTJ', section: 'DLI-MTJ',
  department: 'Engineering', task_type: 'Emergency Track Defect Repair',
  duration: 45, severity: 5, criticality: 5, days_overdue: 0,
  previous_deferrals: 0, notes: 'Critical defect discovered — immediate action required',
};

function StatusBadge({ s }) {
  const map = { SELECTED: 'badge-green', DEFERRED: 'badge-amber', REJECTED: 'badge-red', PROTECTED: 'badge-purple', NOT_IN_PLAN: 'badge-gray' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
}

function SummaryCard({ label, before, after, color }) {
  const diff = after - before;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderTop: `2px solid ${color}`, borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-5)', marginBottom: 2 }}>Before</div>
          <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>{before}</div>
        </div>
        <div style={{ fontSize: 18, color: 'var(--text-5)' }}>→</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-5)', marginBottom: 2 }}>After</div>
          <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--mono)', color }}>{after}</div>
        </div>
        {diff !== 0 && (
          <span className={`badge ${diff > 0 ? 'badge-green' : 'badge-red'}`} style={{ marginLeft: 4 }}>
            {diff > 0 ? `+${diff}` : diff}
          </span>
        )}
      </div>
    </div>
  );
}

function DecisionTable({ decisions, title, accent }) {
  if (!decisions || Object.keys(decisions).length === 0) return null;
  const rows = Object.values(decisions);
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: 10 }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)',
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: accent || 'var(--text-4)',
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%',
          background: accent || 'var(--text-4)',
          animation: 'ob-dot-pulse 2s ease infinite' }} />
        {title} ({rows.length})
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {rows.slice(0, 20).map(d => (
          <div key={d.task_id} style={{ display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 14px', borderBottom: '1px solid var(--border)',
            fontSize: 12 }}>
            <span style={{ fontFamily: 'var(--mono)', color: C.orange, fontWeight: 700, minWidth: 52 }}>{d.task_id}</span>
            <StatusBadge s={d.status} />
            {d.assigned_block && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: C.blue,
                background: 'rgba(59,130,246,0.08)', padding: '1px 6px', borderRadius: 4 }}>
                {d.assigned_block}
              </span>
            )}
            <span style={{ flex: 1, fontSize: 11, color: 'var(--text-4)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangedList({ changed }) {
  if (!changed?.length) return (
    <div className="empty-state" style={{ padding: '18px 0' }}>
      <div className="empty-icon" style={{ fontSize: 22 }}>✓</div>
      <div className="empty-text">No decisions changed — new task was integrated without displacing existing plan</div>
    </div>
  );
  return (
    <div>
      {changed.map(c => {
        const bColor = { SELECTED: C.green, DEFERRED: C.amber, REJECTED: C.red, PROTECTED: C.purple }[c.before_status] || 'var(--text-4)';
        const aColor = { SELECTED: C.green, DEFERRED: C.amber, REJECTED: C.red, PROTECTED: C.purple }[c.after_status] || 'var(--text-4)';
        return (
          <div key={c.task_id} className="ob-fade-up card-hover"
            style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <span style={{ fontFamily: 'var(--mono)', color: C.orange, fontWeight: 700, minWidth: 52 }}>{c.task_id}</span>
            <span style={{ color: bColor, fontWeight: 600, minWidth: 70 }}>{c.before_status}</span>
            <span style={{ color: 'var(--text-5)' }}>→</span>
            <span style={{ color: aColor, fontWeight: 700, minWidth: 70 }}>{c.after_status}</span>
            <span style={{ flex: 1, fontSize: 11, color: 'var(--text-4)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.after_reason || c.before_reason}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Replan() {
  const [form, setForm]       = useState({ ...DEFAULT_FORM });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg]   = useState('');

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleReplan = useCallback(async () => {
    if (!form.task_id.trim()) {
      setError('Task ID is required');
      return;
    }
    setError(''); setLoading(true); setResult(null);
    try {
      const payload = { ...form, duration: Number(form.duration), severity: Number(form.severity),
        criticality: Number(form.criticality), days_overdue: Number(form.days_overdue),
        previous_deferrals: Number(form.previous_deferrals) };
      const res = await api.replan(payload);
      setResult(res);
    } catch (e) {
      setError(e.message || 'Replanning failed');
    } finally {
      setLoading(false);
    }
  }, [form]);

  const handleReset = useCallback(async () => {
    setResetting(true); setResetMsg('');
    try {
      await api.resetDemo();
      setResult(null);
      setResetMsg('Dataset restored to original 25 tasks.');
      setForm({ ...DEFAULT_FORM });
    } catch (e) {
      setResetMsg('Reset failed: ' + e.message);
    } finally {
      setResetting(false);
    }
  }, []);

  const bs = result?.before_plan?.summary;
  const as_ = result?.after_plan?.summary;

  return (
    <div className="page">
      {/* Header */}
      <div className="ob-fade-up">
        <div className="page-eyebrow">Scenario Engine</div>
        <h1 className="page-title">Dynamic Re-planning</h1>
        <p className="page-subtitle">
          Inject a new critical maintenance task and re-optimize the entire plan. Before and after comparison is computed live.
        </p>
      </div>

      {/* Flow diagram */}
      <div className="ob-fade-up d1" style={{ display: 'flex', alignItems: 'center', gap: 0,
        overflowX: 'auto', padding: '14px 0', marginBottom: 22 }}>
        {['Current Plan', 'New Critical Defect', 'Re-Optimize', 'New Plan', 'Explanation'].map((step, i, arr) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', padding: '8px 16px', borderRadius: 'var(--r-pill)',
              background: i === 1 ? 'rgba(239,68,68,0.09)' : i === 4 ? 'rgba(34,197,94,0.09)' : 'var(--bg-card)',
              border: `1px solid ${i === 1 ? 'rgba(239,68,68,0.3)' : i === 4 ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
              color: i === 1 ? C.red : i === 4 ? C.green : 'var(--text-2)',
              fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {step}
            </div>
            {i < arr.length - 1 && (
              <div style={{ color: 'var(--text-5)', fontSize: 18, padding: '0 8px' }}>→</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left: form */}
        <div>
          <div className="panel ob-fade-up d2">
            <div className="panel-title" style={{ marginBottom: 18 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: C.red, marginRight: 8 }} />
              New Critical Task
            </div>

            {[
              { label: 'Task ID', key: 'task_id', type: 'text', placeholder: 'e.g. CRIT-C17-001' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} value={form[f.key]} placeholder={f.placeholder}
                  className="rf-input" style={{ width: '100%', boxSizing: 'border-box' }}
                  onChange={e => setField(f.key, e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'rgba(249,115,22,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-2)'}
                />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[
                { label: 'Section', key: 'section', options: SECTIONS },
                { label: 'Department', key: 'department', options: DEPTS },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <select className="rf-select" style={{ width: '100%' }}
                    value={form[f.key]} onChange={e => setField(f.key, e.target.value)}>
                    {f.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>Task Type</label>
              <select className="rf-select" style={{ width: '100%' }}
                value={form.task_type} onChange={e => setField('task_type', e.target.value)}>
                {TASK_TYPES.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Severity', key: 'severity', min: 1, max: 5 },
                { label: 'Criticality', key: 'criticality', min: 1, max: 5 },
                { label: 'Duration (min)', key: 'duration', min: 5, max: 300 },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type="number" min={f.min} max={f.max} value={form[f.key]}
                    className="rf-input"
                    onChange={e => setField(f.key, e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'rgba(249,115,22,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-2)'}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Days Overdue', key: 'days_overdue', min: 0 },
                { label: 'Prev. Deferrals', key: 'previous_deferrals', min: 0 },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type="number" min={f.min} value={form[f.key]}
                    className="rf-input"
                    onChange={e => setField(f.key, e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'rgba(249,115,22,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-2)'}
                  />
                </div>
              ))}
            </div>

            {/* Severity indicators */}
            <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.red,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Estimated Impact</div>
              <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-3)' }}>
                <span>Severity: <b style={{ color: form.severity >= 4 ? C.red : C.amber, fontFamily: 'var(--mono)' }}>{form.severity}/5</b></span>
                <span>Criticality: <b style={{ color: form.criticality >= 4 ? C.red : C.amber, fontFamily: 'var(--mono)' }}>{form.criticality}/5</b></span>
                <span>Duration: <b style={{ fontFamily: 'var(--mono)' }}>{form.duration}m</b></span>
              </div>
            </div>

            {error && (
              <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8,
                color: C.red, fontSize: 12.5, marginBottom: 12 }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleReplan} disabled={loading}
                className={loading ? 'btn btn-running' : 'btn btn-primary'}
                style={{ flex: 1, padding: '11px 0' }}>
                {loading
                  ? <><span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>⟳</span> Re-planning…</>
                  : '▶  Inject & Re-optimize'}
              </button>
              <button onClick={handleReset} disabled={resetting}
                style={{ padding: '11px 14px', borderRadius: 'var(--r-pill)',
                  border: '1px solid var(--border-2)', background: 'transparent',
                  color: 'var(--text-4)', fontSize: 12.5, cursor: 'pointer',
                  transition: 'all var(--t-fast)', fontFamily: 'var(--font)' }}
                onMouseEnter={e => { e.target.style.borderColor = C.amber; e.target.style.color = C.amber; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.color = 'var(--text-4)'; }}>
                {resetting ? '⟳' : '↺'}
              </button>
            </div>
            {resetMsg && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: C.green, textAlign: 'center' }}>{resetMsg}</div>
            )}
          </div>
        </div>

        {/* Right: results */}
        {!result ? (
          <div className="panel" style={{ display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 14 }}>
            <div style={{ fontSize: 42, opacity: 0.06 }}>⟳</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Configure & Inject</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', maxWidth: 380, lineHeight: 1.75 }}>
              Fill in the new critical task details and click Inject & Re-optimize.<br />
              The system will compute the full before/after plan comparison.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Narrative */}
            <div className="ob-scale-in" style={{ padding: '14px 16px',
              background: 'rgba(249,115,22,0.04)',
              border: '1px solid rgba(249,115,22,0.2)', borderRadius: 'var(--r-md)' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: C.orange,
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                Re-planning Narrative
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75 }}>{result.narrative}</div>
            </div>

            {/* New task card */}
            <div className="ob-scale-in" style={{ padding: '12px 16px', borderRadius: 'var(--r-md)',
              background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: C.red,
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                Injected Task: {result.added_task.task_id}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, marginBottom: 8 }}>
                {[
                  ['Department', result.added_task.department],
                  ['Duration', `${result.added_task.duration}m`],
                  ['Severity', `${result.added_task.severity}/5`],
                  ['Criticality', `${result.added_task.criticality}/5`],
                  ['Debt Score', result.added_task.maintenance_debt?.toFixed(1)],
                  ['Flexibility', `${(result.added_task.flexibility_score * 100).toFixed(0)}%`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 9.5, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text-2)', marginTop: 1 }}>{v}</div>
                  </div>
                ))}
              </div>
              {result.new_task_decision && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Decision:</span>
                  <StatusBadge s={result.new_task_decision.status} />
                  {result.new_task_decision.assigned_block && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5,
                      color: C.blue, background: 'rgba(59,130,246,0.08)',
                      padding: '2px 8px', borderRadius: 5 }}>
                      {result.new_task_decision.assigned_block}
                    </span>
                  )}
                  <span style={{ fontSize: 11.5, color: 'var(--text-4)', flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {result.new_task_decision.reason}
                  </span>
                </div>
              )}
            </div>

            {/* Summary comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <SummaryCard label="Tasks Planned" before={bs?.planned_tasks ?? 0} after={as_?.planned_tasks ?? 0} color={C.green} />
              <SummaryCard label="Tasks Deferred" before={bs?.deferred_tasks ?? 0} after={as_?.deferred_tasks ?? 0} color={C.amber} />
              <SummaryCard label="Block Value" before={+(bs?.total_block_value ?? 0).toFixed(1)} after={+(as_?.total_block_value ?? 0).toFixed(1)} color={C.blue} />
            </div>

            {/* Changed decisions */}
            <div className="panel ob-fade-up d2">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: C.amber, marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber,
                  animation: 'ob-dot-pulse 2s ease infinite' }} />
                Changed Decisions ({result.changed_decisions?.length ?? 0})
              </div>
              <ChangedList changed={result.changed_decisions} />
            </div>

            {/* Before / After decisions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.blue,
                  marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: C.blue }} />
                  Before Plan
                </div>
                <DecisionTable decisions={result.before_plan.task_decisions} title="All Decisions" accent={C.blue} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.orange,
                  marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: C.orange }} />
                  After Plan (Re-optimized)
                </div>
                <DecisionTable decisions={result.after_plan.task_decisions} title="All Decisions" accent={C.orange} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
