# RAILFUSE — Opportunity-Aware Adaptive Block Planner

> **Smart India Hackathon 2026 | PS ID: SIH26027 | Team: Runtime Rebels**
>
> **Theme:** Transportation & Logistics | **Category:** Software

---

## ⚠️ Prototype Disclaimer

> RAILFUSE is a prototype decision-support system using **synthetic demonstration data**. It is not connected to live Indian Railways operational systems. Final maintenance execution and block approval require authorized railway operational and safety procedures. All dataset values are synthetic and are not operational Indian Railways data.

---

## Problem Statement

**"AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways"**

Railway maintenance requires temporary possession of track ("blocks"). Poorly planned blocks waste maintenance opportunities, create unnecessary train disruptions, and accumulate maintenance debt. The challenge is to intelligently determine which maintenance tasks to schedule, in which blocks, how to safely combine compatible tasks, and how to maximize maintenance value without incurring unnecessary additional possession.

---

## Proposed Solution: RAILFUSE

RAILFUSE is an **Opportunity-Aware Adaptive Block Planner** — an intelligent decision-support layer for railway maintenance block planning.

**Tagline:** *"Fuse every opportunity. Maximize every block."*

Instead of the traditional approach (assigning tasks to blocks one-by-one), RAILFUSE asks:

> **"What maximum useful maintenance can be safely accomplished using this already available block?"**

---

## Core Innovation

RAILFUSE introduces **Opportunity-Aware Adaptive Block Planning**:

1. **Opportunity Graph** — Tasks are represented as nodes; compatible task combinations are edges
2. **Maintenance Debt Scoring** — Repeated postponement increases effective priority
3. **Flexibility Scoring** — Tasks with fewer future opportunities receive protection
4. **Zero-Additional-Possession Preference** — Maximize maintenance within existing blocks before extending possession
5. **Future Block Protection** — Look-ahead prevents short-sighted decisions that damage future scheduling
6. **Opportunity Cost Analysis** — Every decision is explained relative to alternatives
7. **Dynamic Explainability** — Every scheduling decision is explained from actual algorithm results

---

## Features

| Feature | Status |
|---------|--------|
| Synthetic Railway Dataset (20+ tasks, 8+ blocks) | ✅ Implemented |
| Maintenance Debt Algorithm | ✅ Implemented |
| Task Flexibility Scoring | ✅ Implemented |
| Feasibility Checking (train, resource, spatial) | ✅ Implemented |
| Opportunity Graph Construction | ✅ Implemented |
| Compatible Task Combination | ✅ Implemented |
| Zero-Additional-Possession Optimizer | ✅ Implemented |
| Future Block Protection (Look-ahead) | ✅ Implemented |
| Opportunity Cost Analysis | ✅ Implemented |
| Dynamic Explainability Engine | ✅ Implemented |
| FastAPI Backend | ✅ Implemented |
| Next.js + React Frontend | ✅ Implemented |
| Command Center Dashboard | ✅ Implemented |
| Maintenance Tasks View | ✅ Implemented |
| Available Blocks View | ✅ Implemented |
| Opportunity Engine Screen | ✅ Implemented |
| Optimized Plan / Gantt | ✅ Implemented |
| What-If Scenario Analysis | ✅ Implemented |
| Automated Tests | ✅ Implemented |

---

## Architecture

```
Synthetic Data Sources
(Tasks, Blocks, Trains, Resources)
          │
          ▼
    Data Layer (Pydantic Models)
          │
          ▼
  Maintenance Intelligence
  ├── Priority Scoring
  ├── Maintenance Debt
  └── Flexibility Score
          │
          ▼
  Conflict Detection
  ├── Train Conflict Check
  ├── Resource Conflict Check
  └── Spatial Constraint Check
          │
          ▼
  Opportunity Graph Engine
  ├── Compatibility Rules
  └── Compatible Combinations
          │
          ▼
  Optimization Engine
  ├── Block Value Calculator
  ├── Zero-Possession Preference
  ├── Future Block Protection
  └── Opportunity Cost Analysis
          │
          ▼
  Explainability Engine
  (Dynamic per-decision explanations)
          │
          ▼
  FastAPI Backend (REST API)
          │
          ▼
  Next.js Frontend
  ├── Command Center
  ├── Maintenance Tasks
  ├── Available Blocks
  ├── Opportunity Engine ← HERO SCREEN
  ├── Optimized Plan (Gantt)
  └── What-If Analysis
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | Python 3.12, FastAPI, Uvicorn |
| Optimization | OR-Tools CP-SAT / Custom Heuristic |
| Data Processing | Pandas, Pydantic |
| Charts | Recharts |
| Database | SQLite (dev) / PostgreSQL (production) |
| Testing | pytest, httpx |

---

## Algorithm Overview

See [`docs/ALGORITHM.md`](docs/ALGORITHM.md) for complete documentation.

**Pipeline:**
1. Load dataset (tasks, blocks, trains, resources)
2. Calculate maintenance debt scores
3. Calculate flexibility scores
4. Run feasibility checks (train conflicts, resource conflicts, spatial)
5. Build opportunity graph
6. Generate feasible task combinations
7. Apply zero-possession preference
8. Calculate block values
9. Apply future block protection (bounded look-ahead)
10. Select optimal assignment
11. Generate dynamic explanations

**Block Value Formula (configurable):**
```
Block Value = (maintenance_benefit × w_maint)
            + (risk_reduction × w_risk)
            + (compatible_task_benefit × w_compat)
            - (train_disruption × w_disrupt)
            - (additional_possession × w_poss)
            - (resource_conflict_penalty × w_resource)
            - (future_opportunity_loss × w_future)
```

---

## Dataset

See [`docs/DATASET.md`](docs/DATASET.md) for complete documentation.

**Contents:**
- 25 synthetic maintenance tasks
- 10 available maintenance blocks
- 24 synthetic train movements
- 12 synthetic resources
- 8 compatibility rules
- 12 deliberate test scenarios

**⚠️ All data is synthetic demonstration data — not operational Indian Railways data.**

---

## Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

### Quick Start

```bash
# Clone the repository
git clone https://github.com/mohands0810-debug/RAILFUSE.git
cd RAILFUSE

# Backend Setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend Setup (new terminal)
cd frontend
npm install
npm run dev
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env as needed (defaults work for local development)
```

---

## Running

| Component | Command | URL |
|-----------|---------|-----|
| Backend API | `cd backend && uvicorn main:app --reload` | http://localhost:8000 |
| API Docs | (auto) | http://localhost:8000/docs |
| Frontend | `cd frontend && npm run dev` | http://localhost:3000 |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | List all maintenance tasks |
| GET | `/blocks` | List all available blocks |
| GET | `/trains` | List all train movements |
| GET | `/resources` | List all resources |
| POST | `/optimize` | Run optimization engine |
| GET | `/optimized-plan` | Get latest optimized plan |
| GET | `/opportunities` | Get opportunity analysis |
| GET | `/block/{id}` | Get block details with analysis |
| POST | `/what-if` | Run what-if scenario |

See [`docs/API.md`](docs/API.md) for complete documentation.

---

## Demo Instructions

See [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md) for the complete SIH judge demonstration guide.

**Quick Demo Flow:**
1. Open Command Center → Review metrics
2. Open Maintenance Tasks → Review debt/flexibility scores
3. Open Available Blocks → Review capacity
4. Click **"Run Optimization"** → Watch dynamic results
5. Open Opportunity Engine → Select a block → See compatibility analysis
6. Open Optimized Plan → Review Gantt chart
7. Use What-If → Change a task → Re-run → Confirm results change

---

## Testing

```bash
cd backend
python -m pytest tests/ -v
```

See [`docs/TESTING.md`](docs/TESTING.md) for complete test documentation.

---

## Limitations

- Prototype uses synthetic data (not connected to live TMS/SMMS)
- Optimization covers a single planning horizon (not global network)
- Look-ahead depth is bounded (default: 3 blocks)
- No real-time data ingestion
- UI is a functional prototype, not a production-hardened application

---

## Future Scope

- Integration with actual TMS/SMMS/TDMS data feeds
- Global network optimization (multi-corridor, multi-zone)
- Machine learning for maintenance prediction
- Mobile interface for field engineers
- Real-time conflict alerting
- Integration with SCADA and asset health monitoring

---

## Repository Structure

```
RAILFUSE/
├── README.md
├── .gitignore
├── .env.example
├── docs/
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
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── models/
│   ├── optimization/
│   ├── api/
│   └── tests/
├── data/
│   ├── synthetic/
│   └── schemas/
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── public/
└── scripts/
    ├── generate_dataset.py
    └── seed_data.py
```

---

## License

This prototype was developed for Smart India Hackathon 2026 (PS ID: SIH26027) by Team Runtime Rebels.

---

*RAILFUSE — "Fuse every opportunity. Maximize every block."*
