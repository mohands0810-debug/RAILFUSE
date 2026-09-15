# RAILFUSE — Dataset Documentation

**Smart India Hackathon 2026 | PS ID: SIH26027**

---

> ## ⚠️ Important Disclaimer
> 
> **These datasets are synthetic demonstration data and are NOT operational Indian Railways data.**
> 
> All task IDs, block IDs, train numbers, section names, resource names, durations, schedules, and other values are fictional and have been created specifically to demonstrate the RAILFUSE algorithm. They do not represent actual Indian Railways operations, schedules, infrastructure, or maintenance records.

---

## Dataset Structure

The RAILFUSE synthetic dataset is stored in `data/synthetic/` as JSON files.

| File | Records | Description |
|------|---------|-------------|
| `tasks.json` | 25 | Maintenance tasks |
| `blocks.json` | 10 | Available maintenance blocks |
| `trains.json` | 24 | Train movements |
| `resources.json` | 12 | Resources |
| `compatibility_rules.json` | 8 | Department compatibility rules |

---

## Maintenance Tasks (25 records)

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | Unique identifier (e.g., "T001") |
| `asset_id` | string | Asset being maintained (e.g., "TRK-UP-001") |
| `asset_type` | string | Type of asset (Track, Signal, OHE, Bridge, Points) |
| `corridor` | string | Railway corridor name |
| `section` | string | Track section identifier |
| `location` | string | Location description |
| `department` | string | Department (Engineering, S&T, TRD, Civil) |
| `task_type` | string | Type of maintenance work |
| `duration` | integer | Duration in minutes |
| `severity` | integer | Severity 1–5 (5=Critical) |
| `criticality` | integer | Criticality 1–5 (5=Critical) |
| `due_date` | string | ISO date when maintenance is due |
| `days_overdue` | integer | Days past due date |
| `previous_deferrals` | integer | Number of times previously deferred |
| `maintenance_debt` | float | Calculated debt score |
| `flexibility_score` | float | Calculated flexibility (0–1) |
| `required_resources` | array | List of required resource IDs |
| `compatible_departments` | array | Departments that can share the block |
| `safety_requirements` | array | Required safety conditions |
| `preferred_time_window` | string | Preferred time range |
| `status` | string | PENDING / PLANNED / DEFERRED / PROTECTED |

### Corridors Represented

| Corridor | Sections |
|----------|---------|
| Delhi–Mumbai (Central) | DLI-MTJ, MTJ-GWL, GWL-BPL, BPL-BSL, BSL-MMR |
| Delhi–Howrah (Eastern) | DLI-CNB, CNB-ALD, ALD-MGS, MGS-DHN, DHN-HWH |
| Chennai–Mumbai (Southern) | MAS-SA, SA-ED, ED-CBE, CBE-SRR |

### Department Distribution

| Department | Count |
|-----------|-------|
| Engineering (Track) | 10 |
| Signal & Telecom (S&T) | 7 |
| Traction Rolling Devices (TRD) | 5 |
| Civil (Bridge/Structure) | 3 |

### Asset Types

| Asset Type | Count |
|-----------|-------|
| Track Geometry | 8 |
| Points & Crossings | 5 |
| Signal Equipment | 7 |
| OHE (Overhead Equipment) | 3 |
| Bridge/Structure | 2 |

---

## Available Blocks (10 records)

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `block_id` | string | Unique identifier (e.g., "BLK001") |
| `corridor` | string | Corridor where block is available |
| `section` | string | Track section |
| `start_time` | string | Block start (ISO datetime) |
| `end_time` | string | Block end (ISO datetime) |
| `duration` | integer | Total block duration (minutes) |
| `block_type` | string | TSR, Absolute, Caution, etc. |
| `available_resources` | array | Resources available during block |
| `affected_track` | string | Track affected (UP/DN/BOTH) |
| `safety_constraints` | array | Safety conditions |
| `existing_tasks` | array | Already assigned task IDs |
| `remaining_capacity` | integer | Remaining minutes for additional tasks |

### Block Types Represented

| Block Type | Count | Description |
|-----------|-------|-------------|
| Engineering Block | 4 | Standard maintenance window |
| Traffic Block | 3 | Train-free possession |
| Power Block | 2 | OHE work requiring power cut |
| Signal Block | 1 | S&T maintenance |

---

## Train Movements (24 records)

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `train_id` | string | Train identifier (e.g., "12001") |
| `train_type` | string | Express, Mail, Freight, etc. |
| `corridor` | string | Operating corridor |
| `section` | string | Section being traversed |
| `arrival_time` | string | Arrival at section start |
| `departure_time` | string | Departure from section |
| `priority` | integer | Train priority (1=highest) |
| `operational_status` | string | ON_TIME / DELAYED / CANCELLED |

### Train Types Represented

| Type | Count | Priority |
|------|-------|---------|
| Rajdhani Express | 4 | 1 (Highest) |
| Mail/Express | 8 | 2 |
| Passenger | 6 | 3 |
| Freight | 6 | 4 |

---

## Resources (12 records)

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `resource_id` | string | Unique identifier (e.g., "R001") |
| `resource_type` | string | Type of resource |
| `department` | string | Owning department |
| `availability` | object | Availability schedule |
| `location` | string | Current base location |
| `capacity` | integer | Units available |

### Resource Types

| Type | Count |
|------|-------|
| Track Machine (Tamper) | 2 |
| OHE Tower Wagon | 2 |
| Signal Testing Unit | 2 |
| Gang (maintenance crew) | 3 |
| Rail Dolly | 2 |
| Bridge Inspection Unit | 1 |

---

## Compatibility Rules (8 records)

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `rule_id` | string | Unique identifier (e.g., "CR001") |
| `department_a` | string | First department |
| `department_b` | string | Second department |
| `compatible` | boolean | Whether they can share a block |
| `required_conditions` | array | Conditions required for compatibility |
| `safety_constraints` | array | Safety checks required |

### Compatibility Matrix

| | Engineering | S&T | TRD | Civil |
|--|-------------|-----|-----|-------|
| **Engineering** | ✅ | ⚠️ (conditions) | ❌ | ✅ |
| **S&T** | ⚠️ (conditions) | ✅ | ⚠️ (conditions) | ✅ |
| **TRD** | ❌ | ⚠️ (conditions) | ✅ | ❌ |
| **Civil** | ✅ | ✅ | ❌ | ✅ |

*Engineering + TRD: Never compatible — track work and OHE work cannot safely coexist.*
*Engineering + S&T: Compatible only if no heavy machinery near signal locations.*

---

## Deliberate Test Scenarios

The dataset is deliberately designed to contain 12 scenarios that test specific algorithm behaviors:

| Scenario | Block | Task(s) | Expected Result |
|----------|-------|---------|-----------------|
| A — Perfect fit | BLK001 | T001 | SELECTED (fits exactly) |
| B — Duration conflict | BLK002 | T005 | REJECTED (exceeds capacity) |
| C — Train conflict | BLK003 | T003 | REJECTED (train conflict) |
| D — Resource unavailable | BLK004 | T007 | REJECTED (resource R004 unavailable) |
| E — Competing tasks | BLK005 | T009, T010 | T009 SELECTED, T010 DEFERRED (higher value) |
| F — Compatible combination | BLK006 | T011, T012 | BOTH SELECTED (compatible, fits together) |
| G — Additional possession | BLK007 | T013 | SELECTED with additional possession note |
| H — High debt priority | BLK008 | T015, T016 | T015 SELECTED (higher debt score) |
| I — Low flexibility protection | BLK009 | T018 | PROTECTED (only 1 future window) |
| J — Future opportunity conflict | BLK010 | T020 | DEFERRED (protects T021's future opportunity) |
| K — Zero possession | BLK006 | T011, T012 | Zero additional possession achieved |
| L — Zero possession combination | BLK001 | T001, T002 | Two tasks, zero additional possession |

---

## Regenerating the Dataset

To regenerate the synthetic dataset:

```bash
cd scripts
python generate_dataset.py
```

This will overwrite the JSON files in `data/synthetic/` with freshly generated synthetic data using fixed seed (42) for reproducibility.

To reset to the original dataset:

```bash
cd scripts
python seed_data.py
```

---

## Data Generation Methodology

The synthetic dataset was generated using the following principles:

1. **Realistic structure** — Field names, types, and value ranges are based on publicly available information about railway maintenance planning concepts
2. **Clear synthetic labelling** — Section names, block IDs, and task IDs are clearly synthetic (no real Indian Railways codes)
3. **Deliberate test coverage** — The dataset was specifically designed to cover all 12 test scenarios
4. **Reproducibility** — Random seed 42 is used for any random elements
5. **Diverse values** — Multiple departments, corridors, task types, and severity levels represented

---

## Schema Validation

All data is validated against Pydantic schemas defined in `backend/models/`. Invalid data will raise validation errors on load.

Schema documentation: `data/schemas/schema.md`

---

*Dataset version: 1.0.0*
*Generated for RAILFUSE prototype demonstration — not operational Indian Railways data*
