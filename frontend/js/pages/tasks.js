/* ============================================================
   RAILFUSE — Tasks Page
   Smart India Hackathon 2026 | PS ID: SIH26027
   ============================================================ */
let allTasks = [];
let taskFilters = { status: '', department: '', section: '', search: '' };
let expandedTaskId = null;
let taskPlanDecisions = {};

async function renderTasksPage() {
  const root = document.getElementById('page-root');
  root.innerHTML = loading();

  try {
    const [tasks, plan] = await Promise.all([API.tasks(), API.optimizedPlan().catch(() => null)]);
    allTasks = tasks;
    if (plan) {
      taskPlanDecisions = plan.task_decisions || {};
      // Apply statuses from plan
      allTasks = allTasks.map(t => {
        if (taskPlanDecisions[t.task_id]) {
          return { ...t, status: taskPlanDecisions[t.task_id].status };
        }
        return t;
      });
    }
  } catch (e) {
    root.innerHTML = errorBox('Failed to load tasks: ' + e.message);
    return;
  }

  root.innerHTML = `
<div class="page">
  <div class="page-header">
    <h1 class="page-title">🔧 Maintenance Tasks</h1>
    <p class="page-subtitle">${allTasks.length} tasks · Click any row to view scoring details and explanation</p>
  </div>

  <div class="actions-bar">
    <input id="task-search" class="form-input" style="max-width:220px" placeholder="🔍 Search task ID / type…" />
    <select id="task-filter-status" class="form-select" style="max-width:160px">
      <option value="">All Statuses</option>
      <option value="SELECTED">Planned</option>
      <option value="PENDING">Pending</option>
      <option value="DEFERRED">Deferred</option>
      <option value="REJECTED">Rejected</option>
      <option value="PROTECTED">Protected</option>
    </select>
    <select id="task-filter-dept" class="form-select" style="max-width:180px">
      <option value="">All Departments</option>
      ${[...new Set(allTasks.map(t => t.department))].sort().map(d => `<option value="${d}">${d}</option>`).join('')}
    </select>
    <select id="task-filter-section" class="form-select" style="max-width:160px">
      <option value="">All Sections</option>
      ${[...new Set(allTasks.map(t => t.section))].sort().map(s => `<option value="${s}">${s}</option>`).join('')}
    </select>
    <div class="actions-bar-right">
      <span id="task-count-label" class="text-muted text-sm"></span>
    </div>
  </div>

  <div class="card" style="padding:0;overflow:hidden">
    <div class="table-wrap">
      <table id="tasks-table">
        <thead>
          <tr>
            <th>Task ID</th>
            <th>Type</th>
            <th>Section</th>
            <th>Department</th>
            <th>Duration</th>
            <th>Severity</th>
            <th>Debt Score</th>
            <th>Flexibility</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="tasks-tbody"></tbody>
      </table>
    </div>
  </div>
  <div id="task-detail-panel"></div>
</div>`;

  renderTasksTable();
  bindTaskFilters();
}

function renderTasksTable() {
  const tbody = document.getElementById('tasks-tbody');
  const label = document.getElementById('task-count-label');
  if (!tbody) return;

  const filtered = allTasks.filter(t => {
    if (taskFilters.status && t.status?.toUpperCase() !== taskFilters.status) return false;
    if (taskFilters.department && t.department !== taskFilters.department) return false;
    if (taskFilters.section && t.section !== taskFilters.section) return false;
    if (taskFilters.search) {
      const q = taskFilters.search.toLowerCase();
      if (!t.task_id.toLowerCase().includes(q) && !t.task_type.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (label) label.textContent = `Showing ${filtered.length} of ${allTasks.length}`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9">${empty('🔍', 'No tasks match filters', 'Try adjusting your filters')}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const debtPct = Math.min(100, (t.maintenance_debt / 60) * 100);
    const flexPct = t.flexibility_score * 100;
    return `
    <tr id="row-${t.task_id}" class="task-row${expandedTaskId === t.task_id ? ' flash' : ''}"
        data-task="${t.task_id}" style="cursor:pointer">
      <td class="td-id">${t.task_id}</td>
      <td style="color:var(--text-primary);font-weight:500;max-width:160px" class="truncate">${t.task_type}</td>
      <td style="font-size:12px">${t.section}</td>
      <td style="font-size:12px">${t.department}</td>
      <td style="font-family:var(--font-mono);font-size:12px">${t.duration} min</td>
      <td><span class="badge ${severityBadge(t.severity)}">${t.severity}/5</span></td>
      <td style="min-width:120px">
        <div style="display:flex;align-items:center;gap:6px">
          ${debtBar(t.maintenance_debt)}
          <span class="mono" style="color:var(--text-primary);font-weight:700;min-width:30px">${t.maintenance_debt.toFixed(0)}</span>
        </div>
      </td>
      <td style="min-width:110px">
        <div style="display:flex;align-items:center;gap:6px">
          <div class="progress-bar-wrap"><div class="progress-bar ${flexColor(t.flexibility_score)}" style="width:${flexPct.toFixed(0)}%"></div></div>
          <span class="mono" style="min-width:30px;font-size:11px">${t.flexibility_score.toFixed(2)}</span>
        </div>
      </td>
      <td><span class="badge ${statusBadge(t.status)}">${statusLabel(t.status)}</span></td>
    </tr>
    <tr id="detail-row-${t.task_id}" class="detail-row" style="display:${expandedTaskId === t.task_id ? '' : 'none'}">
      <td colspan="9" style="padding:0">
        <div id="inline-detail-${t.task_id}"></div>
      </td>
    </tr>`;
  }).join('');

  // Bind row clicks
  tbody.querySelectorAll('.task-row').forEach(row => {
    row.addEventListener('click', () => toggleTaskDetail(row.dataset.task));
  });

  // Re-render open detail if still visible
  if (expandedTaskId) {
    renderInlineTaskDetail(expandedTaskId);
  }
}

function toggleTaskDetail(taskId) {
  if (expandedTaskId === taskId) {
    expandedTaskId = null;
    document.querySelectorAll('.detail-row').forEach(r => r.style.display = 'none');
    return;
  }
  document.querySelectorAll('.detail-row').forEach(r => r.style.display = 'none');
  expandedTaskId = taskId;
  const row = document.getElementById(`detail-row-${taskId}`);
  if (row) row.style.display = '';
  renderInlineTaskDetail(taskId);
}

function renderInlineTaskDetail(taskId) {
  const container = document.getElementById(`inline-detail-${taskId}`);
  if (!container) return;

  const task = allTasks.find(t => t.task_id === taskId);
  if (!task) return;

  const decision = taskPlanDecisions[taskId];

  container.innerHTML = `
  <div style="padding:16px 20px;background:var(--bg-surface);border-top:1px solid var(--border)">
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-item-label">Asset ID</div><div class="detail-item-value mono">${task.asset_id}</div></div>
      <div class="detail-item"><div class="detail-item-label">Asset Type</div><div class="detail-item-value">${task.asset_type}</div></div>
      <div class="detail-item"><div class="detail-item-label">Corridor</div><div class="detail-item-value">${task.corridor}</div></div>
      <div class="detail-item"><div class="detail-item-label">Location</div><div class="detail-item-value">${task.location}</div></div>
      <div class="detail-item"><div class="detail-item-label">Due Date</div><div class="detail-item-value">${task.due_date}</div></div>
      <div class="detail-item"><div class="detail-item-label">Days Overdue</div><div class="detail-item-value" style="color:${task.days_overdue > 0 ? 'var(--red)' : 'var(--green)'}">${task.days_overdue} days</div></div>
      <div class="detail-item"><div class="detail-item-label">Previous Deferrals</div><div class="detail-item-value">${task.previous_deferrals}</div></div>
      <div class="detail-item"><div class="detail-item-label">Criticality</div><div class="detail-item-value">${task.criticality}/5</div></div>
      <div class="detail-item"><div class="detail-item-label">Required Resources</div><div class="detail-item-value">${task.required_resources.join(', ') || '—'}</div></div>
      <div class="detail-item"><div class="detail-item-label">Time Window</div><div class="detail-item-value mono">${task.preferred_time_window}</div></div>
      ${decision?.assigned_block ? `<div class="detail-item"><div class="detail-item-label">Assigned Block</div><div class="detail-item-value" style="color:var(--green)">${decision.assigned_block}</div></div>` : ''}
    </div>
    ${decision?.reason ? `
      <div class="reasoning-box">
        <div class="reasoning-label">🤖 Algorithm Explanation</div>
        ${decision.reason}
      </div>` : ''}
  </div>`;
}

function bindTaskFilters() {
  document.getElementById('task-search')?.addEventListener('input', e => {
    taskFilters.search = e.target.value;
    renderTasksTable();
  });
  document.getElementById('task-filter-status')?.addEventListener('change', e => {
    taskFilters.status = e.target.value;
    renderTasksTable();
  });
  document.getElementById('task-filter-dept')?.addEventListener('change', e => {
    taskFilters.department = e.target.value;
    renderTasksTable();
  });
  document.getElementById('task-filter-section')?.addEventListener('change', e => {
    taskFilters.section = e.target.value;
    renderTasksTable();
  });
}
