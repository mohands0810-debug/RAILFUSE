/* ============================================================
   RAILFUSE — Utility Functions
   Smart India Hackathon 2026 | PS ID: SIH26027
   ============================================================ */

function debtColor(debt) {
  if (debt >= 40) return 'red';
  if (debt >= 25) return 'amber';
  if (debt >= 15) return 'purple';
  return 'cyan';
}
function debtBadge(debt) {
  if (debt >= 40) return 'badge-red';
  if (debt >= 25) return 'badge-amber';
  if (debt >= 15) return 'badge-purple';
  return 'badge-cyan';
}
function debtLabel(debt) {
  if (debt >= 40) return 'Critical';
  if (debt >= 25) return 'High';
  if (debt >= 15) return 'Moderate';
  return 'Low';
}
function flexColor(f) {
  if (f <= 0.2) return 'red';
  if (f <= 0.4) return 'amber';
  if (f <= 0.7) return 'purple';
  return 'green';
}
function statusBadge(status) {
  const map = {
    SELECTED: 'badge-green',
    PLANNED:  'badge-green',
    PENDING:  'badge-blue',
    DEFERRED: 'badge-amber',
    REJECTED: 'badge-red',
    PROTECTED:'badge-purple',
  };
  return map[status?.toUpperCase()] || 'badge-gray';
}
function statusLabel(status) {
  const map = {
    SELECTED: '✓ Planned',
    PLANNED:  '✓ Planned',
    PENDING:  '◌ Pending',
    DEFERRED: '⟳ Deferred',
    REJECTED: '✕ Rejected',
    PROTECTED:'⊙ Protected',
  };
  return map[status?.toUpperCase()] || status;
}
function severityBadge(s) {
  if (s >= 5) return 'badge-red';
  if (s >= 4) return 'badge-amber';
  if (s >= 3) return 'badge-purple';
  return 'badge-cyan';
}
function fmtTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}
function fmtDateTime(isoStr) {
  if (!isoStr) return '—';
  return `${fmtDate(isoStr)} ${fmtTime(isoStr)}`;
}
function scoreBar(val, max = 1, colorClass = 'brand') {
  const pct = Math.min(100, (val / max) * 100);
  return `<div class="progress-bar-wrap"><div class="progress-bar ${colorClass}" style="width:${pct.toFixed(1)}%"></div></div>`;
}
function debtBar(debt) {
  const pct = Math.min(100, (debt / 60) * 100);
  const c = debtColor(debt);
  return `<div class="progress-bar-wrap"><div class="progress-bar ${c}" style="width:${pct.toFixed(1)}%"></div></div>`;
}
function el(tag, cls, html = '') {
  return `<${tag} class="${cls}">${html}</${tag}>`;
}
function loading() {
  return `<div class="loading-wrap"><div class="spinner"></div><span class="loading-text">Loading…</span></div>`;
}
function errorBox(msg) {
  return `<div class="alert alert-error"><span>⚠</span><span>${msg}</span></div>`;
}
function empty(icon, msg, sub = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-msg">${msg}</div><div class="empty-sub">${sub}</div></div>`;
}
function deltaClass(n) {
  if (n > 0) return 'delta-positive';
  if (n < 0) return 'delta-negative';
  return 'delta-neutral';
}
function deltaStr(n, unit = '') {
  const sign = n > 0 ? '+' : '';
  return `<span class="${deltaClass(n)}">${sign}${n}${unit}</span>`;
}
