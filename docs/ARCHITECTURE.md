# RAILFUSE — System Architecture

**Smart India Hackathon 2026 | PS ID: SIH26027**

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RAILFUSE PROTOTYPE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              SYNTHETIC DATA SOURCES                  │   │
│  │  Tasks │ Blocks │ Trains │ Resources │ Rules         │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │               DATA LAYER (Pydantic)                  │   │
│  │  MaintenanceTask │ Block │ TrainMovement │ Resource   │   │
│  │  CompatibilityRule │ OptimizationConfig               │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │           MAINTENANCE INTELLIGENCE                   │   │
│  │  ├── Priority Score Calculator                       │   │
│  │  ├── Maintenance Debt Engine                         │   │
│  │  └── Flexibility Score Engine                        │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │              CONFLICT DETECTION                      │   │
│  │  ├── Train Conflict Checker                          │   │
│  │  ├── Resource Conflict Checker                       │   │
│  │  └── Spatial Constraint Checker                      │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │            OPPORTUNITY GRAPH ENGINE                  │   │
│  │  ├── Node: MaintenanceTask                           │   │
│  │  ├── Edge: CompatiblePair                            │   │
│  │  └── Compatible Combination Generator               │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │            OPTIMIZATION ENGINE                       │   │
│  │  ├── Block Value Calculator                          │   │
│  │  ├── Zero-Possession Preference                      │   │
│  │  ├── Future Block Protection (Look-ahead)            │   │
│  │  ├── Opportunity Cost Analysis                       │   │
│  │  └── Plan Selector                                   │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │           EXPLAINABILITY ENGINE                      │   │
│  │  Dynamic per-decision explanations                   │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │              FastAPI REST API                        │   │
│  │  /tasks │ /blocks │ /optimize │ /opportunities       │   │
│  │  /trains │ /resources │ /block/{id} │ /what-if       │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │           Vite + React SPA (frontend-react/)            │   │
│  │  ├── Command Center Dashboard (live Recharts)            │   │
│  │  ├── Maintenance Tasks (filterable + expandable rows)    │   │
│  │  ├── Block Explorer (inline opportunity graph)           │   │
│  │  ├── Opportunity Engine (HERO SCREEN)                    │   │
│  │  ├── Plan Optimizer (weight sliders, live re-run)        │   │
│  │  └── What-If Simulator (side-by-side comparison)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Descriptions

### 1. Data Layer

**Location:** `backend/models/`

**Purpose:** Defines and validates all data structures using Pydantic v2 models.

**File:** `backend/models/__init__.py` — all models in one file:
- `MaintenanceTask` — task with debt/flexibility scores
- `MaintenanceBlock` — block with capacity and timing
- `TrainMovement` — train arrival/departure windows
- `Resource` — equipment availability
- `CompatibilityRule` — department pair rules
- `OptimizationConfig` — configurable weights
- `OptimizedPlan`, `BlockAssignment`, `TaskDecision` — result models

**Key Design Decision:** Pydantic v2 is used for data validation and serialization. All timestamps are ISO strings for JSON compatibility.

---

### 2. Maintenance Intelligence

**Location:** `backend/optimization/intelligence.py`

**Purpose:** Calculates derived scores for each maintenance task.

**Inputs:** Raw task data (days_overdue, deferrals, criticality, future_blocks)
**Outputs:** maintenance_debt score, flexibility_score, effective_priority

**Key Design Decision:** All formulas are transparent and configurable. Weights are not claimed to be official railway values.

---

### 3. Conflict Detection

**Location:** `backend/optimization/conflicts.py`

**Purpose:** Determines whether a task can feasibly be assigned to a block.

**Checks:**
- Train conflict: Does any train traverse this section during the block window?
- Resource conflict: Are required resources available during the block?
- Spatial conflict: Is the task in the same or adjacent section as the block?
- Duration conflict: Does the task fit within remaining block capacity?

---

### 4. Opportunity Graph Engine

**Location:** `backend/optimization/opportunity_graph.py`

**Purpose:** Constructs a graph of tasks and identifies compatible combinations.

**Design:**
- Nodes: Maintenance tasks feasible for a given block
- Edges: Pairs of tasks that are mutually compatible (department, safety, resource)
- Output: List of feasible task combinations (subsets that can co-exist in a block)

**Algorithm:**
- Build adjacency matrix from compatibility rules
- Use clique enumeration or greedy subset search for combinations
- Filter combinations by total duration ≤ remaining block capacity

---

### 5. Optimization Engine

**Location:** `backend/optimization/optimizer.py`

**Purpose:** Selects the best assignment of tasks to blocks.

**Algorithm:** Deterministic heuristic with look-ahead
1. For each block, enumerate feasible task combinations
2. Calculate block value for each combination
3. Apply zero-possession preference (prefer combinations that don't extend block)
4. Apply future block protection (check if assigning now damages later blocks)
5. Select the combination with the highest adjusted value
6. Record opportunity cost (value of next-best alternative)

**Determinism:** Fixed random seed (42) for any tie-breaking. Same input always produces same output.

---

### 6. Explainability Engine

**Location:** `backend/optimization/explainability.py`

**Purpose:** Generates natural-language explanations for every scheduling decision.

**Design:**
- Explanations are generated from actual algorithm results, not hardcoded
- Each task gets a status (SELECTED, REJECTED, DEFERRED, PROTECTED)
- Each status has a specific reason drawn from the actual conflict/scoring data
- Reasons include concrete values (e.g., "duration 75 min exceeds remaining capacity 60 min")

---

### 7. FastAPI Backend

**Location:** `backend/main.py`

**Purpose:** REST API connecting optimization to frontend.

**Design:**
- Auto-generated OpenAPI/Swagger docs at `/docs`
- CORS enabled for localhost development
- Results cached between calls (optimization is re-run on explicit `/optimize` POST)
- Async where appropriate

---

### 8. Vite + React Frontend

**Location:** `frontend-react/`

**Purpose:** Interactive prototype SPA for SIH demonstration.

**Design:**
- Single Page Application (SPA) with React Router v7 — 6 pages
- All API calls via `src/api/client.js` typed API client
- Recharts for bar, pie, and radar charts
- Vanilla CSS with custom CSS variables (`src/index.css`) — dark theme design system
- Vite dev server proxies `/api` → `http://localhost:8000` (no CORS issues in dev)
- `useApi` and `useMutation` hooks for all data fetching

---

## Data Flow

```
1. Application starts
2. Backend loads synthetic dataset from JSON files (data/synthetic/)
3. Backend runs initial optimization on startup
4. Frontend connects to backend API
5. Dashboard displays live calculated values

When user clicks "Run Optimization":
6. Frontend POSTs to /optimize
7. Backend runs full optimization pipeline
8. Returns optimized plan with explanations
9. Frontend renders results

When user changes what-if scenario:
10. Frontend POSTs to /what-if with modified parameters
11. Backend re-runs optimization with modified data
12. Returns new plan
13. Frontend shows before/after comparison
```

---

## Directory Structure

```
RAILFUSE/
├── README.md
├── .gitignore
├── .env.example
│
├── docs/                        ← Documentation (9 files)
│
├── data/                        ← Synthetic data files
│   └── synthetic/
│       ├── tasks.json           ← 25 maintenance tasks
│       ├── blocks.json          ← 10 maintenance blocks
│       ├── trains.json          ← 24 train movements
│       ├── resources.json       ← 12 resources
│       └── compatibility_rules.json ← 8 department rules
│
├── backend/                     ← Python FastAPI backend
│   ├── main.py                  ← FastAPI app with lifespan startup
│   ├── config.py                ← Path config and env vars
│   ├── data_loader.py           ← JSON → Pydantic loader
│   ├── requirements.txt
│   ├── models/
│   │   └── __init__.py          ← All Pydantic models
│   ├── optimization/
│   │   ├── __init__.py
│   │   ├── intelligence.py      ← Debt + flexibility scoring
│   │   ├── conflicts.py         ← Train/resource/spatial checks
│   │   ├── opportunity_graph.py ← Graph + combination generator
│   │   ├── optimizer.py         ← Main optimization pipeline
│   │   └── explainability.py    ← Per-decision explanation engine
│   └── tests/
│       ├── conftest.py          ← Shared fixtures
│       ├── test_intelligence.py ← 12 tests
│       ├── test_conflicts.py    ← 14 tests
│       ├── test_optimizer.py    ← 38 tests
│       └── test_api.py          ← 15 tests
│
├── frontend-react/              ← Vite + React SPA (Node.js 24)
│   ├── index.html
│   ├── vite.config.js           ← Proxy /api → :8000
│   ├── package.json
│   └── src/
│       ├── main.jsx             ← Router entry point
│       ├── App.jsx              ← Sidebar layout + nav
│       ├── index.css            ← CSS variables + global styles
│       ├── api/client.js        ← Typed API client
│       ├── hooks/useApi.js      ← useApi + useMutation hooks
│       ├── components/UI.jsx    ← Shared components
│       └── pages/
│           ├── Dashboard.jsx
│           ├── Tasks.jsx
│           ├── Blocks.jsx
│           ├── Opportunities.jsx
│           ├── Optimizer.jsx
│           └── WhatIf.jsx
│
└── scripts/
    └── generate_dataset.py      ← Synthetic dataset generator
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend framework | FastAPI | Type-safe, async, auto-docs, lightweight |
| Data validation | Pydantic v2 | Native FastAPI integration, schema enforcement |
| Optimization | Custom deterministic heuristic | Explainability requirement; fully transparent, no external solver |
| Frontend | Vite + React 19 | Fast HMR, component architecture, no SSR complexity |
| Styling | CSS custom properties (vanilla CSS) | Full control, dark theme system, no framework dependency |
| Charts | Recharts | React-native, good bar/pie/radar support |
| Testing | pytest + httpx | Standard Python testing stack |

---

## Security Architecture

- No production secrets in codebase
- `.env.example` only — never `.env` committed
- CORS restricted to localhost in development
- No authentication in prototype (add before production)
- All synthetic data — no PII

---

*Architecture version: 1.0.0 — Implemented*
