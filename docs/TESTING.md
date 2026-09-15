# RAILFUSE — Testing Documentation

**Smart India Hackathon 2026 | PS ID: SIH26027**

---

## Overview

RAILFUSE uses **pytest** for backend testing. Tests cover all major algorithm components and API endpoints.

**Test location:** `backend/tests/`

---

## Running Tests

### All Tests

```bash
cd backend
pytest tests/ -v
```

### Specific Test Files

```bash
pytest tests/test_intelligence.py -v    # Maintenance debt + flexibility
pytest tests/test_conflicts.py -v       # Conflict detection
pytest tests/test_optimizer.py -v       # Full optimization pipeline
pytest tests/test_api.py -v             # API endpoints
```

### With Coverage

```bash
pytest tests/ --cov=. --cov-report=html --cov-report=term-missing
```

---

## Test Coverage Areas

### 1. Maintenance Debt (test_intelligence.py)

| Test | Description | Expected |
|------|-------------|---------|
| test_debt_zero_overdue | Task with 0 days overdue | Low debt |
| test_debt_high_overdue | Task with 30 days overdue | High debt |
| test_debt_multiple_deferrals | Task deferred 5 times | Very high debt |
| test_debt_high_severity | High severity × criticality | Increased debt |
| test_debt_formula_components | Verify each component | Correct contribution |
| test_debt_deterministic | Same input → same result | Deterministic |

### 2. Flexibility Score (test_intelligence.py)

| Test | Description | Expected |
|------|-------------|---------|
| test_flexibility_many_windows | Task with 10 future blocks | High score (~0.9) |
| test_flexibility_one_window | Task with 1 future block | Low score (~0.1) |
| test_flexibility_no_windows | Task with 0 future blocks | Score = 0.0 |
| test_flexibility_protection_bonus | Low-flex task | Bonus applied |

### 3. Conflict Detection (test_conflicts.py)

| Test | Scenario | Expected |
|------|---------|---------|
| test_duration_fits | Task 70 min, block 90 min remaining | FEASIBLE |
| test_duration_exceeds | Task 95 min, block 90 min remaining | REJECTED (duration) |
| test_train_conflict_overlaps | Train traverses section during block | REJECTED (train conflict) |
| test_train_conflict_no_overlap | Train outside block window | FEASIBLE |
| test_train_conflict_safety_buffer | Train 5 min after block end | REJECTED (buffer) |
| test_resource_available | Required resources present | FEASIBLE |
| test_resource_unavailable | Required resource absent | REJECTED (resource) |
| test_section_mismatch | Task in different section | REJECTED (section) |
| test_section_match | Task in same section | FEASIBLE |

### 4. Opportunity Graph Logic (within test_optimizer.py)

Opportunity graph construction and combination generation is tested through the optimizer integration tests. Key scenarios covered:

| Behavior | Covered By |
|----------|------------|
| Single feasible task produces 1 combination | CASE A |
| Two compatible tasks produce joint combination | CASE F |
| Incompatible departments — no joint combination | CASE B/C |
| Resource conflict prevents joint assignment | CASE D |
| Combined duration exceeding capacity excluded | CASE B |

### 5. Optimizer (test_optimizer.py)

| Test | Scenario | Expected |
|------|---------|---------|
| CASE A — Perfect fit | Task fits exactly | SELECTED |
| CASE B — Duration conflict | Task exceeds capacity | REJECTED |
| CASE C — Train conflict | Train movement conflict | REJECTED |
| CASE D — Resource unavailable | Resource missing | REJECTED |
| CASE E — Competing tasks | Two feasible tasks | Higher-value SELECTED, other DEFERRED |
| CASE F — Compatible combination | Two compatible tasks | BOTH SELECTED |
| CASE G — Additional possession | Task needs block extension | SELECTED with possession note |
| CASE H — High debt priority | Two tasks, one high debt | High-debt task SELECTED |
| CASE I — Low flexibility protection | Low-flex task | PROTECTED (not assigned to suboptimal block) |
| CASE J — Future opportunity conflict | Current selection damages future | Rejected in favour of future |
| test_zero_possession_preference | Zero and non-zero options | Zero-possession preferred |
| test_opportunity_cost_calculated | Multiple options | Opportunity cost > 0 |
| test_deterministic_output | Same input twice | Identical results |

### 6. API Tests (test_api.py)

| Test | Endpoint | Expected |
|------|---------|---------|
| test_health_check | GET / | 200, status: healthy |
| test_get_tasks | GET /tasks | 200, list of 25 tasks |
| test_get_tasks_filter_status | GET /tasks?status=PENDING | Filtered list |
| test_get_blocks | GET /blocks | 200, list of 10 blocks |
| test_get_trains | GET /trains | 200, list of 24 trains |
| test_get_resources | GET /resources | 200, list of 12 resources |
| test_optimize_default | POST /optimize | 200, valid plan |
| test_optimize_custom_config | POST /optimize with config | 200, plan uses config |
| test_optimize_deterministic | POST /optimize twice | Identical results |
| test_get_optimized_plan | GET /optimized-plan | 200, cached plan |
| test_get_opportunities | GET /opportunities | 200, opportunity data |
| test_get_block_detail | GET /block/BLK001 | 200, block details |
| test_get_block_not_found | GET /block/INVALID | 404 |
| test_what_if | POST /what-if | 200, comparison |
| test_what_if_changes_result | Modify severity → re-run | Different plan |

---

## Deliberate Test Scenarios (from Dataset)

The dataset is designed to test specific behaviors. These scenarios are verified end-to-end:

### CASE A — Perfect Task-Block Fit

```python
# T001 (70 min) in BLK001 (90 min remaining)
# Expected: SELECTED
# Verification: assignment present, no additional possession
```

### CASE B — Duration Conflict

```python
# T005 (95 min) in BLK002 (90 min remaining)
# Expected: REJECTED
# Reason: "Task duration 95 min exceeds remaining block capacity of 90 min"
```

### CASE C — Train Movement Conflict

```python
# T003 in BLK003 — Rajdhani 12001 passes through section at 01:45 during block
# Expected: REJECTED
# Reason: "Train 12001 (Rajdhani Express) conflicts with block window"
```

### CASE D — Resource Unavailable

```python
# T007 requires R004 (OHE Tower Wagon)
# BLK004 does not have R004 in available_resources
# Expected: REJECTED
# Reason: "Required resource R004 not available in this block"
```

### CASE E — Competing Tasks

```python
# T009 and T010 both feasible for BLK005
# T009 has higher maintenance debt (38.5 vs 22.1)
# Expected: T009 SELECTED, T010 DEFERRED
```

### CASE F — Compatible Task Combination

```python
# T011 (50 min, Engineering) + T012 (35 min, Engineering)
# BLK006 has 120 min remaining
# Both compatible (same dept, no shared resources)
# Expected: T011 + T012 BOTH SELECTED, additional possession = 0
```

### CASE G — Additional Possession

```python
# T013 (75 min) selected for a block with 60 min remaining
# Zero-possession option has lower value
# Expected: SELECTED with 15 min additional possession noted
```

### CASE H — High Maintenance Debt Changes Priority

```python
# T015 (debt: 47.2) vs T016 (debt: 18.3) for BLK008
# Without debt: T016 might score higher on base priority
# With debt: T015 is prioritized
# Expected: T015 SELECTED
```

### CASE I — Low-Flexibility Task Protection

```python
# T018 has flexibility_score = 0.10 (only 1 future feasible window)
# Assigning T018 to BLK009 now would still be technically feasible
# But look-ahead shows BLK009 is better suited for a different combination
# Expected: T018 PROTECTED with explanation citing future window preservation
```

### CASE J — Future Opportunity Conflict Changes Decision

```python
# T020 is attractive for BLK010 (high score)
# But assigning T020 to BLK010 strands T021 (the next most critical task)
# T021 has no other feasible window
# Expected: T020 DEFERRED, T021 protected for BLK010
```

---

## Test Data

Tests use a combination of:
1. The main synthetic dataset (for end-to-end tests)
2. Minimal fixtures (for unit tests of individual components)

Unit test fixtures are defined in `tests/conftest.py`.

---

## Expected Test Results Summary

| Suite | Tests | Expected Pass |
|-------|-------|--------------|
| test_intelligence.py | 12 | 12/12 |
| test_conflicts.py | 14 | 14/14 |
| test_optimizer.py | 38 | 38/38 |
| test_api.py | 15 | 15/15 |
| **Total** | **79** | **79/79** |

---

*Testing documentation version: 1.0.0*
