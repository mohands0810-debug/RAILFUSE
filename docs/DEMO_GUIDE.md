# RAILFUSE — Demo Guide
**Smart India Hackathon 2026 · PS ID: SIH26027 · Team: Runtime Rebels**

> ⚠️ All data shown is synthetic. No connection to live Indian Railways systems.

---

## Prerequisites

| Service  | URL                     | Start Command |
|----------|-------------------------|---------------|
| Backend  | http://localhost:8000   | `cd backend && python -m uvicorn main:app --port 8000 --reload` |
| Frontend | http://localhost:3000   | `cd frontend-react && npm run dev -- --port 3000` |

---

## 12-Step SIH Demo Flow

### Step 1 — Launch & Overview
- Open http://localhost:3000
- See: **Command Center** with live stats (25 tasks, 10 blocks, 24 trains)
- Note the disclaimer banner confirming synthetic data
- Observe the scrolling ticker showing real-time plan stats

### Step 2 — Maintenance Task Intelligence
- Navigate to **Maintenance Tasks**
- Show T001 (Track Tamping, DLI-MTJ, maintenance_debt=28.5)
- Explain the Maintenance Debt formula:
  `debt = (days_overdue × 0.5) + (deferrals × 2.0 × 1.5^(n-1)) + (severity × criticality × 1.0)`
- Explain Flexibility Score: fraction of future blocks this task can feasibly fit in

### Step 3 — Block Explorer
- Navigate to **Block Explorer**
- Show BLK001 (90-min Engineering Block, DLI-MTJ section)
- Point out: remaining capacity, start/end times, affected track, resource availability

### Step 4 — Opportunity Engine
- Navigate to **Opportunity Engine**
- Select block BLK001
- Show the **Opportunity Graph**: nodes = feasible tasks, edges = compatible pairs
- Show the **Multi-Department Fusion** step: Engineering + S&T compatible → fused in one block
- Show **Compatible Combinations** ranked by adjusted value

### Step 5 — Plan Optimizer (Core Innovation)
- Navigate to **Plan Optimizer**
- Click **Run Optimization** 
- Show decisions table: SELECTED (green), DEFERRED (amber), REJECTED (red), PROTECTED (purple)
- Key points:
  - Deterministic: same input → same output (seed 42)
  - Every decision has a transparent reason — no black box
  - Zero-possession bonus: tasks that fit within existing windows preferred
  - Future block protection: low-flex tasks protected for their best future window

### Step 6 — Explainability Drill-Down
- In the optimizer results, click any task
- Show the explanation: "Selected for BLK003: maintenance_debt=28.5, combined with T004 (S&T) — compatible departments, 45-min remaining capacity after assignment. Opportunity cost: 3.2"
- Show a rejected task: "Rejected: task duration 90 min exceeds block capacity of 60 min"
- Show a deferred task: "Deferred: 3 future windows available. BLK002 is a better fit — section match, more capacity"

### Step 7 — What-If Simulator
- Navigate to **What-If Simulator**
- Add override: Task T001, field `maintenance_debt`, value `55`
- Click **Run Comparison**
- Show baseline vs modified side-by-side
- Show **Changed Assignments** section: which blocks changed due to the higher-debt task
- Key message: the system automatically re-prioritizes — no manual rescheduling needed

### Step 8 — Dynamic Re-planning (Highlight Feature)
- Navigate to **Dynamic Re-planning**
- Fill in a new critical defect:
  - Task ID: `CRIT-C17-001`
  - Section: `DLI-MTJ`
  - Department: `Engineering`
  - Task Type: `Emergency Track Defect Repair`
  - Duration: `45`, Severity: `5`, Criticality: `5`, Days Overdue: `2`
- Click **Inject & Re-optimize**
- Show: Before plan → After plan comparison
- Show: Changed Decisions list (tasks displaced by the critical task)
- Show: Narrative explanation ("New critical task CRIT-C17-001 was SELECTED → assigned to BLK003. 2 decisions changed.")
- Key message: Traditional systems require manual rescheduling. RAILFUSE automatically recalculates the entire plan the moment a new defect is discovered.
- Click **↺** to reset the demo dataset

### Step 9 — Weekly Horizon View
- Navigate to **Weekly Horizon**
- Show the 7-day utilization bar chart
- Expand each day to show which tasks were planned vs deferred
- Point out: departments covered per day, zero-possession blocks
- Key message: The same optimizer, extended across the full planning horizon — no separate weekly algorithm needed

### Step 10 — Multi-Department Fusion
- Return to **Opportunity Engine**
- Select any block with multiple feasible tasks from different departments
- Show: "Engineering (T001, 60m) + S&T (T007, 15m) = 75m total — fits in 90m block. Compatible per rule CR_ENG_ST."
- Show: Without fusion = 2 separate possessions. With fusion = 1 possession, zero additional possession
- This is RAILFUSE's core operational innovation for Indian Railways efficiency

### Step 11 — Conflict Detection Demo
- In **Plan Optimizer**, explain the constraint checks:
  1. Duration feasibility: task_duration ≤ block.remaining_capacity
  2. Section match: task.section == block.section
  3. Train conflict: no active train in section within safety_buffer (10 min)
  4. Resource availability: all required resources available in block
  5. Department compatibility: must satisfy compatibility_rules
- These are the exact checks run for every task-block pair before considering combinations

### Step 12 — Scalability & Research Positioning
- Open http://localhost:8000/docs to show the full OpenAPI spec
- Point out: `/replan`, `/weekly-plan`, `/asset-availability`, `/what-if` endpoints
- Mention test suite: **103 tests pass**, all deterministic, all behaviour-based
- Research positioning: "Individual concepts (block scheduling, constraint optimization, explainability) are established. RAILFUSE's differentiation is the specific integrated workflow: real-time conflict detection + multi-department fusion + zero-possession optimization + dynamic replanning — applied together in a single system for Indian Railways maintenance planning."

---

## Quick Reset

If the demo state gets messy (extra tasks from replanning):
```bash
curl -X POST http://localhost:8000/reset-demo
```
Or click **↺** in the Dynamic Re-planning page.

---

## Architecture Quick Reference

```
backend/
  main.py                    — FastAPI app, all endpoints
  models/__init__.py         — Pydantic models (all data shapes)
  config.py                  — Config (optimizer seed, weights)
  data_loader.py             — Loads synthetic JSON dataset
  optimization/
    optimizer.py             — Core 10-step pipeline
    intelligence.py          — Debt, Flexibility, Effective Priority
    conflicts.py             — Train, Resource, Section, Duration checks
    opportunity_graph.py     — Compatibility graph + combinations
    explainability.py        — Human-readable per-task reasons
  data/synthetic/            — tasks.json, blocks.json, trains.json, etc.
  tests/                     — 103 tests (API, optimizer, replanning)

frontend-react/src/
  pages/
    Dashboard.jsx            — Command Center (live stats)
    Tasks.jsx                — Maintenance task list + filters
    Blocks.jsx               — Block explorer
    Opportunities.jsx        — Opportunity Engine + fusion visual
    Optimizer.jsx            — Plan optimizer + decisions
    WhatIf.jsx               — What-If scenario simulator
    Replan.jsx               — Dynamic re-planning (NEW)
    WeeklyPlan.jsx           — Weekly horizon view (NEW)
  api/client.js              — API client (all endpoints)
```

---

## Key Metrics (Synthetic Dataset)

| Metric | Value |
|--------|-------|
| Total Tasks | 25 |
| Maintenance Blocks | 10 |
| Train Movements | 24 |
| Resources | 12 |
| Compatibility Rules | 6 |
| Optimizer Seed | 42 (deterministic) |
| Typical Planned Tasks | 8–12 |
| Test Suite | 103 tests, all passing |

---

*RAILFUSE — Opportunity-Aware Adaptive Block Planning*  
*SIH 2026 · PS ID: SIH26027 · Team: Runtime Rebels*
