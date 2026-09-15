/* ============================================================
   RAILFUSE — Dashboard Page
   Smart India Hackathon 2026 | PS ID: SIH26027
   ============================================================ */
async function renderDashboard() {
  const root = document.getElementById('page-root');
  root.innerHTML = loading();

  let stats, plan;
  try {
    [stats, plan] = await Promise.all([API.stats(), API.optimizedPlan().catch(() => null)]);
  } catch (e) {
    root.innerHTML = errorBox('Failed to load dashboard: ' + e.message);
    return;
  }

  const summary = plan?.summary || {};
  const planId = plan?.plan_id || '—';
  const genAt = plan?.generated_at ? fmtDateTime(plan.generated_at) : '—';

  root.innerHTML = `
<div class="page">
  <div class="page-header">
    <h1 class="page-title">🚆 Command Center</h1>
    <p class="page-subtitle">Real-time overview · Optimization: <span class="mono">${planId}</span> · Generated: ${genAt}</p>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Tasks</div>
      <div class="stat-value">${stats.total_tasks}</div>
      <div class="stat-sub">in planning horizon</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Planned ✓</div>
      <div class="stat-value green">${stats.planned_tasks}</div>
      <div class="stat-sub">assigned to blocks</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Deferred ⟳</div>
      <div class="stat-value amber">${stats.deferred_tasks}</div>
      <div class="stat-sub">rescheduled</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Protected ⊙</div>
      <div class="stat-value purple">${stats.protected_tasks}</div>
      <div class="stat-sub">look-ahead reserved</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Available Blocks</div>
      <div class="stat-value cyan">${stats.available_blocks}</div>
      <div class="stat-sub">planning windows</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg Debt Score</div>
      <div class="stat-value ${debtColor(stats.avg_maintenance_debt)}">${stats.avg_maintenance_debt.toFixed(1)}</div>
      <div class="stat-sub">maintenance urgency</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Block Utilisation</div>
      <div class="stat-value">${stats.block_utilization_pct.toFixed(1)}%</div>
      <div class="stat-sub">capacity used</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Train Movements</div>
      <div class="stat-value">${stats.train_movements_total}</div>
      <div class="stat-sub">conflict-checked</div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <div class="card-title">
        📊 Task Status Distribution
        <span class="card-title-badge">${stats.total_tasks} tasks</span>
      </div>
      ${renderStatusChart(stats)}
    </div>
    <div class="card">
      <div class="card-title">
        🎯 Optimization Metrics
        <span class="card-title-badge">live</span>
      </div>
      ${renderOptMetrics(stats, summary)}
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <div class="card-title">⚠️ High Debt Tasks <span class="card-title-badge">${stats.high_debt_tasks} critical</span></div>
      <div id="high-debt-list">${loading()}</div>
    </div>
    <div class="card">
      <div class="card-title">🔒 Low Flexibility Tasks <span class="card-title-badge">${stats.low_flexibility_tasks} at risk</span></div>
      <div id="low-flex-list">${loading()}</div>
    </div>
  </div>

  ${plan ? renderBlockSummaryCards(plan) : ''}
</div>`;

  // Load high debt and low flex tasks async
  loadHighDebtTasks();
  loadLowFlexTasks();
}

function renderStatusChart(stats) {
  const total = stats.total_tasks || 1;
  const items = [
    { label: 'Planned',   val: stats.planned_tasks,   color: 'green',  pct: (stats.planned_tasks / total * 100).toFixed(1) },
    { label: 'Deferred',  val: stats.deferred_tasks,  color: 'amber',  pct: (stats.deferred_tasks / total * 100).toFixed(1) },
    { label: 'Protected', val: stats.protected_tasks, color: 'purple', pct: (stats.protected_tasks / total * 100).toFixed(1) },
    { label: 'Pending',   val: stats.pending_tasks,   color: 'blue',   pct: (stats.pending_tasks / total * 100).toFixed(1) },
  ];
  return items.map(i => `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
        <span style="color:var(--text-secondary);font-weight:600">${i.label}</span>
        <span style="font-family:var(--font-mono);color:var(--text-muted)">${i.val} (${i.pct}%)</span>
      </div>
      ${scoreBar(i.val, total, i.color)}
    </div>`).join('');
}

function renderOptMetrics(stats, summary) {
  const metrics = [
    { label: 'Avg Flexibility Score', val: stats.avg_flexibility_score.toFixed(3), sub: 'task scheduling options', bar: scoreBar(stats.avg_flexibility_score, 1, flexColor(stats.avg_flexibility_score)) },
    { label: 'Zero-Possession Blocks', val: summary.zero_possession_blocks ?? '—', sub: 'no additional possession', bar: scoreBar(summary.zero_possession_blocks || 0, stats.available_blocks, 'green') },
    { label: 'Total Block Value', val: summary.total_block_value?.toFixed(1) ?? '—', sub: 'optimization score', bar: null },
    { label: 'Avg Block Utilisation', val: (summary.avg_block_utilization ?? 0) + '%', sub: 'capacity used', bar: scoreBar(summary.avg_block_utilization || 0, 100, 'brand') },
  ];
  return metrics.map(m => `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
        <span style="color:var(--text-secondary);font-weight:600">${m.label}</span>
        <span style="font-family:var(--font-mono);color:var(--text-primary);font-weight:700">${m.val}</span>
      </div>
      ${m.bar || ''}
      <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${m.sub}</div>
    </div>`).join('');
}

function renderBlockSummaryCards(plan) {
  const blocks = plan.block_assignments.filter(b => b.selected_tasks.length > 0);
  if (!blocks.length) return '';
  return `
  <div class="card">
    <div class="card-title">📦 Block Assignments <span class="card-title-badge">${blocks.length} blocks with tasks</span></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Block</th><th>Assigned Tasks</th><th>Block Value</th><th>Additional Possession</th><th>Zero Possession</th></tr></thead>
        <tbody>
        ${blocks.map(b => `
          <tr>
            <td class="td-id">${b.block_id}</td>
            <td>${b.selected_tasks.map(t => `<span class="combo-task-tag">${t}</span>`).join(' ')}</td>
            <td style="font-family:var(--font-mono);font-weight:700;color:var(--text-primary)">${b.block_value.toFixed(1)}</td>
            <td>${b.additional_possession > 0
              ? `<span class="badge badge-amber">${b.additional_possession} min</span>`
              : '<span class="badge badge-gray">0 min</span>'}</td>
            <td>${b.zero_possession
              ? '<span class="badge badge-green">✓ Zero</span>'
              : '<span class="badge badge-amber">Extended</span>'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

async function loadHighDebtTasks() {
  const el = document.getElementById('high-debt-list');
  if (!el) return;
  try {
    const tasks = await API.tasks({ min_severity: 4 });
    const sorted = tasks.filter(t => t.maintenance_debt >= 25)
      .sort((a, b) => b.maintenance_debt - a.maintenance_debt)
      .slice(0, 6);
    if (!sorted.length) { el.innerHTML = empty('✅', 'No critical debt tasks'); return; }
    el.innerHTML = sorted.map(t => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
        <span class="td-id" style="min-width:52px">${t.task_id}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);truncate">${t.task_type}</div>
          <div style="font-size:11px;color:var(--text-muted)">${t.section} · ${t.department}</div>
        </div>
        <span class="badge ${debtBadge(t.maintenance_debt)}">${debtLabel(t.maintenance_debt)} ${t.maintenance_debt.toFixed(1)}</span>
      </div>`).join('');
  } catch(e) { el.innerHTML = errorBox(e.message); }
}

async function loadLowFlexTasks() {
  const el = document.getElementById('low-flex-list');
  if (!el) return;
  try {
    const tasks = await API.tasks();
    const sorted = tasks.filter(t => t.flexibility_score <= 0.3)
      .sort((a, b) => a.flexibility_score - b.flexibility_score)
      .slice(0, 6);
    if (!sorted.length) { el.innerHTML = empty('✅', 'No low-flexibility tasks'); return; }
    el.innerHTML = sorted.map(t => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
        <span class="td-id" style="min-width:52px">${t.task_id}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary)">${t.task_type}</div>
          <div style="font-size:11px;color:var(--text-muted)">${t.section} · ${t.department}</div>
        </div>
        <span class="badge badge-${flexColor(t.flexibility_score)}" style="font-family:var(--font-mono)">${t.flexibility_score.toFixed(2)}</span>
      </div>`).join('');
  } catch(e) { el.innerHTML = errorBox(e.message); }
}
