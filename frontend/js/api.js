/* ============================================================
   RAILFUSE — API Client
   Smart India Hackathon 2026 | PS ID: SIH26027
   ============================================================ */
const API_BASE = 'http://localhost:8000';

const API = {
  async _request(path, opts = {}) {
    const resp = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || `HTTP ${resp.status}`);
    }
    return resp.json();
  },

  // Health
  health()                    { return this._request('/'); },

  // Data
  tasks(params = {})          { return this._request('/tasks?' + new URLSearchParams(params)); },
  task(id)                    { return this._request(`/tasks/${id}`); },
  blocks(params = {})         { return this._request('/blocks?' + new URLSearchParams(params)); },
  block(id)                   { return this._request(`/block/${id}`); },
  trains(params = {})         { return this._request('/trains?' + new URLSearchParams(params)); },
  resources(params = {})      { return this._request('/resources?' + new URLSearchParams(params)); },
  compatibilityRules()        { return this._request('/compatibility-rules'); },
  stats()                     { return this._request('/stats'); },

  // Optimization
  optimize(config = null)     {
    return this._request('/optimize', {
      method: 'POST',
      body: config ? JSON.stringify(config) : null,
    });
  },
  optimizedPlan()             { return this._request('/optimized-plan'); },
  opportunities(blockId)      {
    const q = blockId ? `?block_id=${blockId}` : '';
    return this._request('/opportunities' + q);
  },
  whatIf(payload)             {
    return this._request('/what-if', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
