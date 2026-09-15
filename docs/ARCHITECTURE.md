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
│  │           Next.js / React Frontend                   │   │
│  │  ├── Command Center Dashboard                        │   │
│  │  ├── Maintenance Tasks View                          │   │
│  │  ├── Available Blocks View                           │   │
│  │  ├── Opportunity Engine (HERO SCREEN)                │   │
│  │  ├── Optimized Plan (Gantt)                          │   │
│  │  └── What-If Analysis                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Descriptions

### 1. Data Layer

**Location:** `backend/models/`

**Purpose:** Defines and validates all data structures using Pydantic models.

**Files:**
- `task.py` — MaintenanceTask model
- `block.py` — MaintenanceBlock model
- `train.py` — TrainMovement model
- `resource.py` — Resource model
- `compatibility.py` — CompatibilityRule model
- `optimization.py` — OptimizationConfig and results

**Key Design Decision:** Pydantic is used for data validation and serialization. All timestamps are stored as ISO strings for JSON compatibility. All IDs are string-typed.

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

### 8. Next.js Frontend

**Location:** `frontend/`

**Purpose:** Interactive prototype UI for SIH demonstration.

**Design:**
- Server-side rendering disabled for simplicity (client-side React)
- All API calls via `lib/api.ts` abstraction layer
- Recharts for Gantt and analytics charts
- Tailwind CSS for styling
- Professional, data-dense, railway-operations aesthetic (no excessive decorations)

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
├── docs/                        ← Documentation
│   ├── PROJECT_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── ALGORITHM.md
│   ├── DATASET.md
│   ├── API.md
│   ├── DEVELOPMENT.md
│   ├── DEMO_GUIDE.md
│   ├── RESEARCH_AND_ASSUMPTIONS.md
│   ├── TESTING.md
│   └── FINAL_VERIFICATION.md
│
├── data/                        ← Synthetic data files
│   ├── synthetic/
│   │   ├── tasks.json
│   │   ├── blocks.json
│   │   ├── trains.json
│   │   ├── resources.json
│   │   └── compatibility_rules.json
│   └── schemas/
│       └── schema.md
│
├── backend/                     ← Python FastAPI backend
│   ├── main.py
│   ├── requirements.txt
│   ├── config.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── task.py
│   │   ├── block.py
│   │   ├── train.py
│   │   ├── resource.py
│   │   ├── compatibility.py
│   │   └── optimization.py
│   ├── optimization/
│   │   ├── __init__.py
│   │   ├── intelligence.py
│   │   ├── conflicts.py
│   │   ├── opportunity_graph.py
│   │   ├── optimizer.py
│   │   └── explainability.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py
│   └── tests/
│       ├── __init__.py
│       ├── test_intelligence.py
│       ├── test_conflicts.py
│       ├── test_opportunity_graph.py
│       ├── test_optimizer.py
│       └── test_api.py
│
├── frontend/                    ← Next.js frontend
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── public/
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   └── globals.css
│       ├── components/
│       │   ├── layout/
│       │   ├── dashboard/
│       │   ├── tasks/
│       │   ├── blocks/
│       │   ├── opportunity/
│       │   ├── gantt/
│       │   └── whatif/
│       └── lib/
│           ├── api.ts
│           └── types.ts
│
└── scripts/
    ├── generate_dataset.py      ← Dataset generation script
    └── seed_data.py             ← Data seeding script
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend framework | FastAPI | Type-safe, async, auto-docs, lightweight |
| Data validation | Pydantic | Native FastAPI integration, schema enforcement |
| Optimization | Custom heuristic + optional OR-Tools | Explainability requirement; heuristic is transparent |
| Frontend | Next.js + React | Industry standard, good TypeScript support |
| Styling | Tailwind CSS | Rapid prototyping, utility-first |
| Charts | Recharts | React-native, good Gantt support |
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
