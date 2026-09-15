# RAILFUSE — Algorithm Documentation

**Smart India Hackathon 2026 | PS ID: SIH26027**

---

## Overview

The RAILFUSE optimization algorithm is a **deterministic multi-stage heuristic with look-ahead**. It is designed to be fully explainable — every decision can be traced to specific data values and algorithm steps.

The algorithm is implemented in `backend/optimization/` and is accessible via `POST /optimize`.

---

## 1. Priority Scoring

**File:** `backend/optimization/intelligence.py`

### Base Priority

Each maintenance task has a base priority derived from its severity and criticality:

```
base_priority = severity × criticality
```

Where:
- `severity` ∈ {1, 2, 3, 4, 5} (1=Low, 5=Critical)
- `criticality` ∈ {1, 2, 3, 4, 5} (1=Low, 5=Critical)

### Effective Priority

```
effective_priority = base_priority + maintenance_debt + flexibility_protection
```

Where `flexibility_protection` = bonus applied to low-flexibility tasks.

---

## 2. Maintenance Debt

**File:** `backend/optimization/intelligence.py`

### Definition

Maintenance debt quantifies the accumulated risk from repeated postponement of a task.

### Formula

```
maintenance_debt = (
    (days_overdue × w_overdue)
    + (previous_deferrals × w_deferrals × deferral_factor)
    + (severity × criticality × w_severity)
) × asset_risk_multiplier
```

**Default Weights (configurable, not official railway values):**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `w_overdue` | 0.5 | Weight per day overdue |
| `w_deferrals` | 2.0 | Weight per previous deferral |
| `deferral_factor` | 1.5 | Exponential deferral multiplier (>1 = accelerating debt) |
| `w_severity` | 1.0 | Severity×criticality weight |
| `asset_risk_multiplier` | 1.0–2.0 | Asset class risk factor |

**Example:**

A track geometry task that is:
- 15 days overdue
- Previously deferred 3 times
- Severity 4, Criticality 4

```
maintenance_debt = (15 × 0.5) + (3 × 2.0 × 1.5^2) + (4 × 4 × 1.0) = 7.5 + 13.5 + 16 = 37.0
```

### Explanation Generation

The system generates explanations such as:
> "High maintenance debt (score: 37.0) due to 15 days overdue, 3 previous deferrals, and severity 4 / criticality 4."

---

## 3. Flexibility Score

**File:** `backend/optimization/intelligence.py`

### Definition

Flexibility score estimates how many feasible future planning windows are available for a task.

### Algorithm

```
for each future_block in upcoming_blocks:
    if feasible(task, future_block):
        feasible_count += 1

flexibility_score = feasible_count / total_future_blocks
```

A task with flexibility_score = 0.1 has very few future opportunities and should be prioritised.

A task with flexibility_score = 0.9 has many future opportunities and can safely be deferred.

### Protection Logic

```
if flexibility_score < FLEXIBILITY_THRESHOLD:
    flexibility_protection_bonus = (1 - flexibility_score) × w_flexibility_protection
```

Default `FLEXIBILITY_THRESHOLD` = 0.3 (configurable).

---

## 4. Feasibility Checking

**File:** `backend/optimization/conflicts.py`

A task-block assignment is **feasible** only if all of the following are satisfied:

### 4.1 Duration Feasibility

```
task.duration ≤ block.remaining_capacity
```

If False → REJECTED: "Task duration exceeds remaining block capacity."

### 4.2 Section/Spatial Feasibility

```
task.section == block.section
OR task.section ∈ block.adjacent_sections
```

If False → REJECTED: "Task section does not match block section."

### 4.3 Train Conflict Check

```
for each train in train_movements:
    if train.section overlaps block.section:
        if time_overlap(train, block):
            CONFLICT
```

Time overlap is checked with a configurable safety buffer (default 10 minutes).

If conflict → REJECTED: "Train movement [train_id] conflicts with block window."

### 4.4 Resource Feasibility

```
for each required_resource in task.required_resources:
    if required_resource not in block.available_resources:
        CONFLICT
```

If conflict → REJECTED: "Required resource [resource_id] not available in this block."

### 4.5 Department Compatibility (for multi-task blocks)

```
for each existing_task in block.assigned_tasks:
    check compatibility_rules(task.department, existing_task.department)
```

If incompatible → REJECTED: "Department [X] is not compatible with [Y] in the same block."

---

## 5. Opportunity Graph

**File:** `backend/optimization/opportunity_graph.py`

### Structure

- **Nodes:** Maintenance tasks that are individually feasible for a given block
- **Edges:** Pairs of tasks that are mutually compatible (can co-exist in the same block)

### Compatibility Conditions

Two tasks are compatible if:
1. `department_compatible(task_a.department, task_b.department)` per compatibility_rules
2. `task_a.section == task_b.section` (or compatible sections)
3. `combined_duration = task_a.duration + task_b.duration ≤ block.remaining_capacity`
4. No shared resource conflict between the two tasks
5. Both individually feasible for the block

### Combination Enumeration

```python
def get_feasible_combinations(graph, block):
    feasible_tasks = get_feasible_nodes(block)
    combinations = []
    
    # Single tasks
    for task in feasible_tasks:
        combinations.append([task])
    
    # Pairs
    for task_a, task_b in edges:
        if fits_in_block([task_a, task_b], block):
            combinations.append([task_a, task_b])
    
    # Triples (if practical)
    for triple in cliques_of_size_3(graph):
        if fits_in_block(triple, block):
            combinations.append(triple)
    
    return combinations
```

---

## 6. Block Value Calculation

**File:** `backend/optimization/optimizer.py`

### Formula

```
block_value = (
    Σ task.maintenance_benefit × w_maintenance
    + Σ task.risk_reduction × w_risk
    - additional_possession_minutes × w_possession
    - train_disruption_score × w_disruption
    - resource_conflict_penalty × w_resource
    - future_opportunity_loss × w_future
)
```

**Default Weights (configurable, not official railway values):**

| Weight | Default | Description |
|--------|---------|-------------|
| `w_maintenance` | 2.0 | Maintenance benefit multiplier |
| `w_risk` | 1.5 | Risk reduction multiplier |
| `w_possession` | 0.5 | Penalty per minute of additional possession |
| `w_disruption` | 3.0 | Penalty per train disrupted |
| `w_resource` | 5.0 | Penalty per resource conflict |
| `w_future` | 1.0 | Future opportunity loss penalty |

### Maintenance Benefit

```
task.maintenance_benefit = task.severity × task.criticality × task.effective_priority_factor
```

### Risk Reduction

```
task.risk_reduction = task.maintenance_debt × 0.1
```

### Additional Possession

If assigning a combination of tasks requires extending the block beyond its original end time:

```
additional_possession = max(0, total_duration - block.remaining_capacity)
```

---

## 7. Zero-Additional-Possession Preference

**File:** `backend/optimization/optimizer.py`

### Logic

When two combinations have similar block values, prefer the one with `additional_possession = 0`:

```python
def apply_zero_possession_preference(combinations, block, config):
    zero_poss = [c for c in combinations if c.additional_possession == 0]
    if zero_poss:
        # Apply bonus to zero-possession combinations
        for c in zero_poss:
            c.adjusted_value += config.zero_possession_bonus
    return combinations
```

Default `zero_possession_bonus` = 5.0 (configurable).

---

## 8. Future Block Protection

**File:** `backend/optimization/optimizer.py`

### Motivation

A greedy optimizer might assign Task A to Block 1 because it maximises Block 1's value. But if Task A had only ONE feasible future block (Block 2), and Block 2 is already planned with another critical task, the greedy decision was wrong.

### Algorithm (Bounded Look-ahead)

```python
def apply_future_protection(selected_combination, block, future_blocks, all_tasks, depth=3):
    # Check if assigning selected_combination now
    # causes any remaining task to lose all future opportunities
    
    remaining_tasks = all_tasks - selected_combination.tasks
    
    for task in remaining_tasks:
        future_feasible = count_future_feasible(task, future_blocks)
        current_feasible = count_feasible_in_current(task, [block] + future_blocks)
        
        if future_feasible == 0 and task in selected_combination:
            # This assignment strands another critical task
            future_opportunity_loss += task.effective_priority × w_future_loss
    
    return selected_combination.value - future_opportunity_loss
```

Look-ahead depth is configurable (default: 3 future blocks).

---

## 9. Opportunity Cost Analysis

**File:** `backend/optimization/optimizer.py`

### Definition

Opportunity cost = value of the best alternative combination NOT selected.

### Usage

```python
sorted_combinations = sorted(combinations, key=lambda c: c.adjusted_value, reverse=True)
selected = sorted_combinations[0]
next_best = sorted_combinations[1] if len(sorted_combinations) > 1 else None

opportunity_cost = selected.adjusted_value - next_best.adjusted_value if next_best else 0
```

### Explanation Generation

> "Task B was not selected (opportunity cost: 8.5 units) because Task A + Task C combination provided higher overall plan value (42.3 vs 33.8) without additional possession."

---

## 10. Full Optimization Pipeline

**File:** `backend/optimization/optimizer.py`

```
INPUT: tasks, blocks, trains, resources, compatibility_rules, config

FOR EACH BLOCK (sorted by start_time):
    1. Get feasible tasks for this block (all constraint checks)
    2. Build opportunity graph for this block
    3. Enumerate feasible task combinations
    4. For each combination:
        a. Calculate base block value
        b. Apply zero-possession preference
        c. Apply future block protection (look-ahead)
        d. Record adjusted value
    5. Sort combinations by adjusted value
    6. Select best combination
    7. Generate explanations for selected/rejected/deferred/protected tasks
    8. Mark selected tasks as PLANNED
    9. Mark remaining feasible tasks as DEFERRED (with reason)

OUTPUT: OptimizedPlan with per-task decisions and explanations
```

---

## 11. Dynamic Explainability

**File:** `backend/optimization/explainability.py`

### Principle

Every explanation is generated from actual algorithm data. No explanation is hardcoded.

### Status Types

| Status | Meaning |
|--------|---------|
| `SELECTED` | Task was assigned to this block |
| `REJECTED` | Task failed a constraint check |
| `DEFERRED` | Task passed constraints but another combination scored higher |
| `PROTECTED` | Task was deliberately not assigned to preserve future opportunities |

### Explanation Templates (filled with actual values)

**SELECTED:**
```
"Selected for block {block_id} ({section}): task fits within remaining capacity 
({task_duration} min of {remaining} min available), no train conflicts, 
required resources available, compatible department."
```

**REJECTED — Duration:**
```
"Rejected for block {block_id}: task duration {task_duration} min exceeds 
remaining block capacity of {remaining} min."
```

**REJECTED — Train Conflict:**
```
"Rejected for block {block_id}: train {train_id} ({train_type}) scheduled 
through section {section} at {time}, conflicting with block window 
{start}–{end}."
```

**REJECTED — Resource:**
```
"Rejected for block {block_id}: required resource {resource_id} 
({resource_type}) not available during block window."
```

**DEFERRED:**
```
"Deferred: feasible for block {block_id} but combination [{selected_tasks}] 
produced higher plan value ({selected_value:.1f} vs {this_value:.1f}). 
Will be reconsidered for future blocks."
```

**PROTECTED:**
```
"Protected: assigning to block {block_id} now would leave task {stranded_task_id} 
with no feasible future blocks. Future block {future_block_id} is a better 
opportunity for this task."
```

---

## Constraints Summary

| Constraint | Type | Priority |
|-----------|------|----------|
| Duration ≤ remaining capacity | Hard | Critical |
| Task section matches block | Hard | Critical |
| No train movement conflict | Hard | Critical |
| Required resources available | Hard | Critical |
| Department compatibility | Hard | Critical |
| Safety constraints | Hard | Critical |
| Zero-possession preference | Soft | High |
| Future block protection | Soft | High |
| Opportunity cost optimization | Soft | Medium |

---

## Determinism

The algorithm is fully deterministic:
- Fixed random seed (42) used for any tie-breaking
- Same input + same configuration → same output
- Documented in `backend/config.py`

---

## Configuration

All weights and thresholds are configurable via `OptimizationConfig`:

```python
class OptimizationConfig(BaseModel):
    w_maintenance: float = 2.0
    w_risk: float = 1.5
    w_possession: float = 0.5
    w_disruption: float = 3.0
    w_resource: float = 5.0
    w_future: float = 1.0
    zero_possession_bonus: float = 5.0
    lookahead_depth: int = 3
    flexibility_threshold: float = 0.3
    random_seed: int = 42
```

These can be overridden via the `/optimize` endpoint or `.env` file.

---

*Algorithm version: 1.0.0 — Fully implemented*

*Note: All weights and formulas in this document are RAILFUSE prototype values. They are NOT official Indian Railways maintenance planning formulas.*
