# RAILFUSE — Project Overview

**Smart India Hackathon 2026 | PS ID: SIH26027 | Team: Runtime Rebels**

---

## Problem Context

Indian Railways operates one of the world's largest railway networks with thousands of kilometres of track requiring regular maintenance. Maintenance activities require temporary possession of track sections — called **"blocks"** — during which train operations are suspended on that section.

### Current Challenges

1. **Suboptimal Block Utilisation** — Existing blocks are often used for a single task while additional compatible work could safely be performed in the same window
2. **Maintenance Debt Accumulation** — Repeated deferral of maintenance increases infrastructure risk
3. **Train Disruption** — Poorly planned blocks create unnecessary disruption to train operations
4. **Manual Coordination** — Block planning across departments (Engineering, S&T, TRD, etc.) requires complex manual coordination
5. **No Opportunity Awareness** — Systems do not actively search for compatible maintenance opportunities within existing blocks
6. **Lack of Explainability** — Planners cannot easily understand why certain decisions were made

---

## RAILFUSE Solution

RAILFUSE is an **Opportunity-Aware Adaptive Block Planner** — a decision-support prototype that:

1. **Maximises maintenance within existing blocks** — Zero-additional-possession preference
2. **Intelligently scores and prioritises tasks** — Using maintenance debt and flexibility
3. **Detects and avoids conflicts** — Train movements, resource clashes, spatial constraints
4. **Identifies compatible task combinations** — Through an Opportunity Graph
5. **Protects future scheduling opportunities** — Look-ahead prevents short-sighted decisions
6. **Explains every decision** — Dynamic, data-driven explanations for each choice

### The Core Question

| Traditional | RAILFUSE |
|-------------|----------|
| "Which task should be assigned to this block?" | "What maximum useful maintenance can be safely accomplished using this already available block?" |

---

## Scope and Boundaries

### In Scope (Prototype)
- Maintenance block planning decision support
- Synthetic dataset demonstration
- Optimization algorithm
- Opportunity Engine
- Dynamic explainability
- Interactive web UI

### Out of Scope (Prototype)
- Integration with live TMS/SMMS/TDMS systems
- Production safety certification
- Real-time data ingestion
- Global network optimization
- Field execution management

---

## Key Stakeholders (Conceptual)

| Stakeholder | Role |
|-------------|------|
| Divisional Railway Manager (DRM) | Decision authority |
| Senior Divisional Engineer (SDE) | Engineering maintenance planning |
| Senior Divisional Signal & Telecom Engineer (SDSTE) | S&T maintenance |
| TRD Engineer | Traction/electrical maintenance |
| Traffic Controller (OC) | Train operations coordination |
| Block Inspector | Field block execution |

---

## Innovation Summary

| Innovation Element | Description |
|-------------------|-------------|
| Opportunity-Aware Planning | Actively searches for compatible tasks within existing blocks |
| Maintenance Debt Scoring | Transparent formula quantifying postponement risk |
| Flexibility Scoring | Identifies tasks with few future opportunities |
| Zero-Possession Preference | Maximises maintenance without extending blocks |
| Opportunity Graph | Graph-based compatible task identification |
| Future Block Protection | Look-ahead prevents short-sighted assignments |
| Dynamic Explainability | Every decision explained from actual algorithm results |

---

## Demonstration Scenarios

The synthetic dataset is deliberately designed to contain 12 distinct scenarios:

| Scenario | Description |
|----------|-------------|
| A | Perfect task-block fit |
| B | Duration conflict |
| C | Train movement conflict |
| D | Resource unavailable |
| E | Competing tasks for same block |
| F | Compatible task combination |
| G | Additional possession scenario |
| H | High maintenance debt changes priority |
| I | Low-flexibility task protection |
| J | Future opportunity conflict changes decision |
| K | Zero-additional-possession opportunity |
| L | Combined compatible tasks (zero possession) |

---

*All data is synthetic demonstration data — not operational Indian Railways data.*
