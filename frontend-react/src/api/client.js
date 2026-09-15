// RAILFUSE API Client — Smart India Hackathon 2026
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  health:             ()        => req('/'),
  stats:              ()        => req('/stats'),
  tasks:              (p = {})  => req('/tasks?' + new URLSearchParams(p)),
  task:               (id)      => req(`/tasks/${id}`),
  blocks:             (p = {})  => req('/blocks?' + new URLSearchParams(p)),
  blockDetail:        (id)      => req(`/block/${id}`),
  trains:             (p = {})  => req('/trains?' + new URLSearchParams(p)),
  resources:          (p = {})  => req('/resources?' + new URLSearchParams(p)),
  compatibilityRules: ()        => req('/compatibility-rules'),
  optimize:           (cfg)     => req('/optimize', { method: 'POST', body: cfg ? JSON.stringify(cfg) : null }),
  optimizedPlan:      ()        => req('/optimized-plan'),
  opportunities:      (bid)     => req('/opportunities' + (bid ? `?block_id=${bid}` : '')),
  whatIf:             (payload) => req('/what-if', { method: 'POST', body: JSON.stringify(payload) }),
};
