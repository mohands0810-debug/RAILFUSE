/* ============================================================
   RAILFUSE — Block Explorer Page
   Smart India Hackathon 2026 | PS ID: SIH26027
   ============================================================ */
let allBlocks = [];
let blockPlan = null;
let expandedBlockId = null;

async function renderBlocksPage() {
  const root = document.getElementById('page-root');
  root.innerHTML = loading();

  try {
    [allBlocks, blockPlan] = await Promise.all([API.blocks(), API.optimizedPlan().catch(() => null)]);
  } catch (e) {
    root.innerHTML = errorBox('Failed to load blocks: ' + e.message);
    return;
  }

  root.innerHTML = `
<div class="page">
  <div class="page-header">
    <h1 class="page-title">📦 Block Explorer</h1>
    <p class="page-subtitle">${allBlocks.length} planning windows · Click any block to view opportunity analysis</p>
  </div>

  <div class="stats-grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr));margin-bottom:20px">
    <div class="stat-card">
      <div class="stat-label">Total Blocks</div>
      <div class="stat-value">${allBlocks.length}</div>
      <div class="stat-sub">planning windows</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">With Assignments</div>
      <div class="stat-value green">${blockPlan ? blockPlan.block_assignments.filter(b => b.selected_tasks.length > 0).length : '—'}</div>
      <div class="stat-sub">tasks assigned</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Zero Possession</div>
      <div class="stat-value cyan">${blockPlan ? blockPlan.summary.zero_possession_blocks : '—'}</div>
      <div class="stat-sub">no extension needed</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Duration</div>
      <div class="stat-value">${allBlocks.reduce((s, b) => s + b.duration, 0)}</div>
      <div class="stat-sub">minutes available</div>
    </div>
  </div>

  <div class="card" style="padding:0;overflow:hidden">
    <div class="table-wrap">
      <table id="blocks-table">
        <thead>
          <tr>
            <th>Block ID</th>
            <th>Section</th>
            <th>Start Time</th>
            <th>Duration</th>
            <th>Remaining Cap.</th>
            <th>Block Type</th>
            <th>Assigned Tasks</th>
            <th>Block Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="blocks-tbody"></tbody>
      </table>
    </div>
  </div>
  <div id="block-detail-area"></div>
</div>`;

  renderBlocksTable();
}

function getBlockAssignment(blockId) {
  if (!blockPlan) return null;
  return blockPlan.block_assignments.find(b => b.block_id === blockId) || null;
}

function renderBlocksTable() {
  const tbody = document.getElementById('blocks-tbody');
  if (!tbody) return;

  tbody.innerHTML = allBlocks.map(b => {
    const asgn = getBlockAssignment(b.block_id);
    const hasTasks = asgn && asgn.selected_tasks.length > 0;
    const utilPct = b.duration > 0 ? Math.min(100, ((b.duration - b.remaining_capacity) / b.duration) * 100) : 0;

    return `
    <tr class="block-row${expandedBlockId === b.block_id ? ' flash' : ''}"
        data-block="${b.block_id}" style="cursor:pointer">
      <td class="td-id">${b.block_id}</td>
      <td style="font-weight:600;color:var(--text-primary)">${b.section}</td>
      <td style="font-family:var(--font-mono);font-size:12px">${fmtDateTime(b.start_time)}</td>
      <td style="font-family:var(--font-mono);font-size:12px">${b.duration} min</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          ${scoreBar(b.remaining_capacity, b.duration, b.remaining_capacity < 30 ? 'amber' : 'brand')}
          <span class="mono" style="font-size:11px;min-width:40px">${b.remaining_capacity}m</span>
        </div>
      </td>
      <td style="font-size:12px;color:var(--text-muted)">${b.block_type}</td>
      <td>
        ${hasTasks
          ? asgn.selected_tasks.map(t => `<span class="combo-task-tag">${t}</span>`).join(' ')
          : '<span style="color:var(--text-dim);font-size:12px">—</span>'}
      </td>
      <td style="font-family:var(--font-mono);font-weight:700;color:var(--text-primary)">
        ${asgn ? asgn.block_value.toFixed(1) : '—'}
      </td>
      <td>
        ${hasTasks
          ? asgn.zero_possession
            ? '<span class="badge badge-green">✓ Assigned</span>'
            : '<span class="badge badge-amber">Extended</span>'
          : '<span class="badge badge-gray">Empty</span>'}
      </td>
    </tr>
    <tr id="block-detail-row-${b.block_id}" style="display:${expandedBlockId === b.block_id ? '' : 'none'}">
      <td colspan="9" style="padding:0">
        <div id="inline-block-detail-${b.block_id}" class="loading-wrap"><div class="spinner"></div></div>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.block-row').forEach(row => {
    row.addEventListener('click', () => toggleBlockDetail(row.dataset.block));
  });

  if (expandedBlockId) loadBlockDetailInline(expandedBlockId);
}

async function toggleBlockDetail(blockId) {
  if (expandedBlockId === blockId) {
    expandedBlockId = null;
    document.querySelectorAll('[id^="block-detail-row-"]').forEach(r => r.style.display = 'none');
    return;
  }
  document.querySelectorAll('[id^="block-detail-row-"]').forEach(r => r.style.display = 'none');
  expandedBlockId = blockId;
  const detailRow = document.getElementById(`block-detail-row-${blockId}`);
  if (detailRow) detailRow.style.display = '';
  await loadBlockDetailInline(blockId);
}

async function loadBlockDetailInline(blockId) {
  const container = document.getElementById(`inline-block-detail-${blockId}`);
  if (!container) return;

  let detail;
  try {
    detail = await API.block(blockId);
  } catch (e) {
    container.innerHTML = errorBox('Failed to load block detail: ' + e.message);
    return;
  }

  const block = detail.block;
  const analysis = detail.opportunity_analysis;
  const planAsgn = detail.plan_assignment;

  const feasibleTasks = analysis.feasible_tasks || [];
  const infeasibleTasks = analysis.infeasible_tasks || [];
  const combinations = analysis.compatible_combinations || [];
  const best = analysis.best_combination;

  container.innerHTML = `
  <div style="padding:20px;background:var(--bg-surface);border-top:1px solid var(--border)">
    <div class="two-col" style="margin-bottom:16px">
      <div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-item-label">Start</div><div class="detail-item-value mono">${fmtDateTime(block.start_time)}</div></div>
          <div class="detail-item"><div class="detail-item-label">End</div><div class="detail-item-value mono">${fmtDateTime(block.end_time)}</div></div>
          <div class="detail-item"><div class="detail-item-label">Duration</div><div class="detail-item-value">${block.duration} min</div></div>
          <div class="detail-item"><div class="detail-item-label">Remaining</div><div class="detail-item-value">${block.remaining_capacity} min</div></div>
          <div class="detail-item"><div class="detail-item-label">Track</div><div class="detail-item-value">${block.affected_track}</div></div>
          <div class="detail-item"><div class="detail-item-label">Resources</div><div class="detail-item-value" style="font-size:12px">${block.available_resources.join(', ') || '—'}</div></div>
        </div>
      </div>
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.6px">Opportunity Graph</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">
          <div style="font-size:11px;color:var(--text-muted);width:100%;margin-bottom:4px">Feasible Tasks (${feasibleTasks.length})</div>
          ${feasibleTasks.map(tid => {
            const isSelected = best && best.tasks.includes(tid);
            return `<span class="graph-node ${isSelected ? 'selected' : 'feasible'}">${isSelected ? '✓ ' : ''}${tid}</span>`;
          }).join('')}
          ${infeasibleTasks.length ? `
            <div style="font-size:11px;color:var(--text-muted);width:100%;margin-top:8px;margin-bottom:4px">Infeasible Tasks (${infeasibleTasks.length})</div>
            ${infeasibleTasks.map(i => `<span class="graph-node infeasible" data-tip="${i.reason.slice(0,80)}…">${i.task_id}</span>`).join('')}
          ` : ''}
        </div>
      </div>
    </div>

    ${combinations.length ? `
    <div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.6px">Compatible Combinations (${combinations.length})</div>
    ${combinations.slice(0, 5).map((c, i) => `
      <div class="combo-card ${i === 0 ? 'best' : ''}">
        <div class="combo-header">
          <div class="combo-tasks">
            ${i === 0 ? '<span style="font-size:10px;font-weight:700;color:var(--green);margin-right:4px">★ BEST</span>' : ''}
            ${c.tasks.map(t => `<span class="combo-task-tag">${t}</span>`).join('')}
          </div>
          <span style="font-family:var(--font-mono);font-weight:800;font-size:14px;color:var(--text-primary)">${c.adjusted_value.toFixed(1)}</span>
        </div>
        <div class="combo-meta">
          <span>⏱ ${c.total_duration} min total</span>
          <span>📐 ${c.remaining_after} min remaining</span>
          ${c.zero_possession ? '<span style="color:var(--green)">✓ Zero possession</span>' : `<span style="color:var(--amber)">+${c.additional_possession} min possession</span>`}
        </div>
      </div>`).join('')}
    ` : empty('📭', 'No compatible combinations', 'No feasible tasks for this block')}

    ${planAsgn?.explanations ? `
    <div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.6px;margin-top:16px">Algorithm Decisions</div>
    ${Object.entries(planAsgn.explanations).map(([tid, dec]) => `
      <div style="margin-bottom:10px;padding:10px 12px;background:var(--bg-elevated);border-radius:8px;border-left:3px solid var(--${dec.status === 'SELECTED' ? 'green' : dec.status === 'DEFERRED' ? 'amber' : dec.status === 'PROTECTED' ? 'purple' : 'red'})">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <span class="td-id">${tid}</span>
          <span class="badge ${statusBadge(dec.status)}">${statusLabel(dec.status)}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6">${dec.reason}</div>
      </div>`).join('')}
    ` : ''}
  </div>`;
}
