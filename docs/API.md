# RAILFUSE — API Documentation

**Smart India Hackathon 2026 | PS ID: SIH26027**

---

## Overview

The RAILFUSE backend exposes a REST API built with FastAPI. API documentation is also auto-generated at:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI JSON:** http://localhost:8000/openapi.json

**Base URL:** `http://localhost:8000`

---

## Authentication

The prototype API does not require authentication. In a production deployment, JWT or API key authentication should be implemented.

---

## Endpoints

---

### GET /

**Description:** Health check and API information.

**Response:**
```json
{
  "name": "RAILFUSE API",
  "version": "1.0.0",
  "status": "healthy",
  "disclaimer": "This API serves synthetic demonstration data only."
}
```

---

### GET /tasks

**Description:** List all maintenance tasks with calculated scores.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (PENDING, PLANNED, DEFERRED, PROTECTED) |
| `department` | string | Filter by department |
| `section` | string | Filter by section |
| `min_severity` | int | Minimum severity (1–5) |

**Response:**
```json
[
  {
    "task_id": "T001",
    "asset_id": "TRK-UP-001",
    "asset_type": "Track Geometry",
    "corridor": "Delhi-Mumbai Central",
    "section": "DLI-MTJ",
    "location": "Between km 12 and km 28",
    "department": "Engineering",
    "task_type": "Track Tamping",
    "duration": 70,
    "severity": 4,
    "criticality": 4,
    "due_date": "2026-09-10",
    "days_overdue": 6,
    "previous_deferrals": 2,
    "maintenance_debt": 28.5,
    "flexibility_score": 0.6,
    "required_resources": ["R001", "R003"],
    "compatible_departments": ["Engineering", "Civil"],
    "safety_requirements": ["flagman_deployed", "speed_restriction_imposed"],
    "preferred_time_window": "22:00-06:00",
    "status": "PENDING"
  }
]
```

---

### GET /blocks

**Description:** List all available maintenance blocks.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `section` | string | Filter by section |
| `date` | string | Filter by date (ISO format) |
| `min_capacity` | int | Minimum remaining capacity (minutes) |

**Response:**
```json
[
  {
    "block_id": "BLK001",
    "corridor": "Delhi-Mumbai Central",
    "section": "DLI-MTJ",
    "start_time": "2026-09-17T22:00:00",
    "end_time": "2026-09-17T23:30:00",
    "duration": 90,
    "block_type": "Engineering Block",
    "available_resources": ["R001", "R002", "R003"],
    "affected_track": "UP",
    "safety_constraints": ["flagman_required", "speed_restriction"],
    "existing_tasks": [],
    "remaining_capacity": 90
  }
]
```

---

### GET /trains

**Description:** List all train movements.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `section` | string | Filter by section |
| `date` | string | Filter by date |
| `train_type` | string | Filter by type |

**Response:**
```json
[
  {
    "train_id": "12001",
    "train_type": "Rajdhani Express",
    "corridor": "Delhi-Mumbai Central",
    "section": "DLI-MTJ",
    "arrival_time": "2026-09-17T23:45:00",
    "departure_time": "2026-09-17T23:55:00",
    "priority": 1,
    "operational_status": "ON_TIME"
  }
]
```

---

### GET /resources

**Description:** List all resources with availability.

**Response:**
```json
[
  {
    "resource_id": "R001",
    "resource_type": "Track Tamping Machine",
    "department": "Engineering",
    "availability": {
      "available": true,
      "available_from": "2026-09-17T20:00:00",
      "available_until": "2026-09-18T06:00:00"
    },
    "location": "DLI-MTJ Section",
    "capacity": 1
  }
]
```

---

### POST /optimize

**Description:** Run the RAILFUSE optimization engine. Returns the optimized block plan with per-task decisions and explanations.

**Request Body (optional — uses defaults if omitted):**
```json
{
  "config": {
    "w_maintenance": 2.0,
    "w_risk": 1.5,
    "w_possession": 0.5,
    "w_disruption": 3.0,
    "w_resource": 5.0,
    "w_future": 1.0,
    "zero_possession_bonus": 5.0,
    "lookahead_depth": 3,
    "flexibility_threshold": 0.3,
    "random_seed": 42
  }
}
```

**Response:**
```json
{
  "plan_id": "PLAN-20260917-001",
  "generated_at": "2026-09-17T01:15:00",
  "config": { ... },
  "block_assignments": [
    {
      "block_id": "BLK001",
      "selected_tasks": ["T001", "T002"],
      "rejected_tasks": ["T005"],
      "deferred_tasks": ["T004"],
      "protected_tasks": ["T018"],
      "block_value": 45.8,
      "additional_possession": 0,
      "opportunity_cost": 12.3,
      "explanations": {
        "T001": {
          "status": "SELECTED",
          "reason": "Selected for BLK001 (DLI-MTJ): fits within remaining capacity (70 min of 90 min available), no train conflicts, required resources available, compatible department."
        },
        "T005": {
          "status": "REJECTED",
          "reason": "Rejected for BLK001: task duration 95 min exceeds remaining block capacity of 90 min."
        }
      }
    }
  ],
  "summary": {
    "total_tasks": 25,
    "planned_tasks": 12,
    "deferred_tasks": 8,
    "protected_tasks": 2,
    "rejected_tasks": 3,
    "total_additional_possession": 15,
    "total_block_value": 287.5,
    "zero_possession_blocks": 7
  }
}
```

---

### GET /optimized-plan

**Description:** Get the most recently generated optimized plan (without re-running optimization).

**Response:** Same as POST /optimize response.

---

### GET /opportunities

**Description:** Get opportunity analysis for all blocks — which tasks can be combined in which blocks.

**Response:**
```json
[
  {
    "block_id": "BLK001",
    "feasible_tasks": ["T001", "T002", "T003"],
    "compatible_combinations": [
      {
        "tasks": ["T001"],
        "total_duration": 70,
        "remaining_after": 20,
        "additional_possession": 0,
        "value": 38.5
      },
      {
        "tasks": ["T001", "T002"],
        "total_duration": 85,
        "remaining_after": 5,
        "additional_possession": 0,
        "value": 45.8
      }
    ],
    "opportunity_graph": {
      "nodes": ["T001", "T002", "T003"],
      "edges": [
        {"source": "T001", "target": "T002", "compatible": true, "reason": "Same department, compatible duration"}
      ]
    }
  }
]
```

---

### GET /block/{block_id}

**Description:** Get detailed information and opportunity analysis for a specific block.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `block_id` | string | Block identifier |

**Response:**
```json
{
  "block": { ... },
  "feasible_tasks": [ ... ],
  "opportunity_graph": { ... },
  "best_combination": { ... },
  "all_combinations_ranked": [ ... ],
  "explanations": { ... }
}
```

---

### POST /what-if

**Description:** Run a what-if scenario. Modify task/block parameters and see how the optimization changes.

**Request Body:**
```json
{
  "scenario_name": "Add urgent track inspection",
  "task_modifications": [
    {
      "task_id": "T001",
      "field": "severity",
      "value": 5
    }
  ],
  "block_modifications": [],
  "config": null
}
```

**Response:**
```json
{
  "scenario_name": "Add urgent track inspection",
  "baseline_plan": { ... },
  "modified_plan": { ... },
  "comparison": {
    "changed_assignments": [
      {
        "block_id": "BLK001",
        "before_tasks": ["T002"],
        "after_tasks": ["T001", "T002"],
        "before_value": 22.3,
        "after_value": 45.8,
        "explanation": "T001's severity increase to 5 raised its effective priority, making the T001+T002 combination optimal."
      }
    ],
    "summary_delta": {
      "additional_possession_change": 0,
      "planned_tasks_change": +1,
      "total_value_change": +23.5
    }
  }
}
```

---

### GET /stats

**Description:** Get aggregate statistics for the command center dashboard.

**Response:**
```json
{
  "total_tasks": 25,
  "pending_tasks": 13,
  "planned_tasks": 12,
  "deferred_tasks": 8,
  "protected_tasks": 2,
  "available_blocks": 10,
  "avg_maintenance_debt": 22.4,
  "avg_flexibility_score": 0.52,
  "block_utilization_pct": 74.2,
  "additional_possession_avoided_minutes": 145,
  "train_movements_affected": 3,
  "high_debt_tasks": 5,
  "low_flexibility_tasks": 3
}
```

---

## Error Responses

```json
{
  "detail": "Block BLK999 not found",
  "status_code": 404
}
```

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request / invalid parameters |
| 404 | Resource not found |
| 422 | Validation error |
| 500 | Internal server error |

---

## New Endpoints (v1.1.0)

### POST /replan

**Description:** Dynamic Re-planning. Inject a new critical maintenance task and re-run the full optimizer. Returns before/after plan comparison with changed decisions and narrative.

**Request Body:**
```json
{
  "task_id": "CRIT-C17-001",
  "corridor": "C17-DLI-MTJ",
  "section": "DLI-MTJ",
  "department": "Engineering",
  "task_type": "Emergency Track Defect Repair",
  "duration": 45,
  "severity": 5,
  "criticality": 5,
  "days_overdue": 2,
  "previous_deferrals": 0
}
```

**Response:**
```json
{
  "replan_id": "REPLAN-20260916-045231",
  "generated_at": "2026-09-16T04:52:31",
  "added_task": { "task_id": "CRIT-C17-001", "maintenance_debt": 31.5, "flexibility_score": 0.2, "..." },
  "before_plan": { "plan_id": "...", "task_decisions": {}, "summary": {} },
  "after_plan":  { "plan_id": "...", "task_decisions": {}, "summary": {} },
  "changed_decisions": [
    { "task_id": "T004", "before_status": "SELECTED", "after_status": "DEFERRED", "..." }
  ],
  "new_task_decision": { "status": "SELECTED", "assigned_block": "BLK003", "reason": "..." },
  "summary_delta": { "planned_tasks_change": 1, "deferred_tasks_change": -1, "..." },
  "narrative": "New critical task CRIT-C17-001 (dept: Engineering, severity: 5/5, debt: 31.5) was injected..."
}
```

**Note:** This endpoint mutates in-memory state (adds the injected task). Call `POST /reset-demo` to restore original dataset.

---

### POST /reset-demo

**Description:** Resets the in-memory dataset to the original synthetic data. Use after replanning demos.

**Response:**
```json
{ "status": "reset", "tasks": 25, "message": "Dataset restored to original synthetic data." }
```

---

### GET /asset-availability

**Description:** Returns prototype-level asset availability estimates based on maintenance debt, critical tasks, and overdue days.

> **DISCLAIMER:** This is a RAILFUSE SIH 2026 prototype estimate. Formula: `availability_pct = max(0, 100 - debt*0.8 - critical_tasks*4)`. Not an official Indian Railways metric.

**Query Parameters:**
- `department` (optional): Filter by department name
- `min_risk` (optional): Filter by minimum risk level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)

**Response:** Array of `AssetAvailabilityEstimate` objects sorted by availability ascending (worst first).

```json
[
  {
    "asset_id": "TRK-UP-DLI-MTJ-001",
    "asset_type": "Track Geometry",
    "section": "DLI-MTJ",
    "department": "Engineering",
    "availability_pct": 42.3,
    "maintenance_debt": 28.5,
    "outstanding_critical_tasks": 2,
    "risk_level": "HIGH",
    "notes": "High cumulative debt (28.5). 2 critical/high-severity task(s) pending.",
    "disclaimer": "Prototype Asset Availability Estimate — RAILFUSE SIH 2026. Not an official Indian Railways metric."
  }
]
```

---

### GET /weekly-plan

**Description:** Generates an optimized maintenance plan across the full 7-day block horizon. Groups blocks by calendar day and runs the full optimizer. Returns day-by-day breakdown.

**Response:**
```json
{
  "plan_id": "WEEKLY-20260916-045231",
  "horizon_start": "2026-09-17",
  "horizon_end": "2026-09-23",
  "days": [
    {
      "date": "2026-09-17",
      "day_name": "Wednesday",
      "blocks": ["BLK001", "BLK002"],
      "planned_tasks": ["T001", "T004"],
      "deferred_tasks": ["T007"],
      "total_capacity_minutes": 180,
      "used_capacity_minutes": 105,
      "block_utilization_pct": 58.3,
      "additional_possession_minutes": 0,
      "zero_possession_blocks": 2,
      "departments_covered": ["Engineering", "S&T"],
      "block_value": 14.2
    }
  ],
  "total_tasks_planned": 9,
  "total_tasks_deferred": 6,
  "total_block_utilization_pct": 54.1,
  "disclaimer": "RAILFUSE Weekly Plan — Synthetic demonstration data only..."
}
```

---

## CORS

The API allows requests from:
- `http://localhost:3000` (Vite + React frontend)
- `http://localhost:3001`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`

---

*API version: 1.1.0 — Updated for Dynamic Re-planning, Weekly Planning, Asset Availability*

