# RAILFUSE — Research and Assumptions

**Smart India Hackathon 2026 | PS ID: SIH26027**

---

## Disclaimer

This document distinguishes between:
1. **Known existing concepts and prior work** in railway maintenance planning
2. **RAILFUSE's specific implementation** — our combination, adaptation, and prototype system

We do not claim that any individual concept used in RAILFUSE is novel. We do not claim that "no one has ever built this." Instead, we document what we know about the existing landscape and what RAILFUSE specifically implements as a combination for this prototype.

**Based on the public implementations and literature reviewed during development, we did not identify the exact combination of opportunity-aware adaptive block planning, maintenance debt scoring, task flexibility protection, and integrated dynamic explainability as implemented in RAILFUSE targeting Indian Railways block planning.**

---

## Known Existing Concepts

### Railway Maintenance Planning

Railway maintenance planning is a well-established field with significant academic and industrial literature. Key concepts include:

- **Possession planning** — Scheduling track access for maintenance
- **Train path allocation** — Coordinating maintenance with train operations
- **Maintenance scheduling optimization** — Assigning tasks to time windows
- **Resource allocation** — Matching maintenance teams and equipment to tasks

**Key references (conceptual, not exhaustive):**
- Budai et al. (2006) — Railway maintenance optimization
- Peng et al. (2011) — Preventive maintenance scheduling for railway systems
- Borraz-Sanchez & Klabjan (2012) — Track maintenance optimization
- Various Indian Railways technical publications on block planning procedures

### Opportunistic Maintenance

The concept of performing additional maintenance when equipment or track is already taken out of service (during a possession) exists in industrial maintenance literature as "opportunistic maintenance" or "grouped maintenance."

**RAILFUSE adaptation:** We specifically implement this for multi-department railway block sharing, with compatibility rules between departments and a graph-based approach to finding compatible task combinations.

### Maintenance Debt / Backlog Scoring

The concept of quantifying accumulated maintenance risk through deferred maintenance is used in infrastructure asset management literature. The term "maintenance backlog" is used in infrastructure management.

**RAILFUSE adaptation:** We implement a specific transparent formula incorporating days overdue, number of deferrals, severity, and criticality. This formula is configurable and is not claimed to be an official Indian Railways formula.

### Constraint-Based Scheduling

Constraint programming and mixed-integer programming approaches to scheduling are well-established. Google OR-Tools (including CP-SAT) is a production-ready open-source solver.

**RAILFUSE adaptation:** We use a deterministic heuristic approach prioritising explainability, with optional OR-Tools integration. The explainability requirement drove the choice toward transparent heuristics.

### Task Flexibility / Urgency in Scheduling

The concept of urgency ratios and scheduling flexibility in job-shop scheduling is well-established in operations research.

**RAILFUSE adaptation:** We calculate flexibility as the ratio of feasible future blocks to total future blocks, specifically for railway maintenance task scheduling.

### Graph-Based Compatibility Analysis

Graph-based approaches to scheduling compatibility are used in various domains including register allocation in compilers, exam scheduling, and frequency assignment.

**RAILFUSE adaptation:** We use a compatibility graph specifically modelling maintenance department interactions, spatial constraints, and resource conflicts for railway block sharing.

---

## RAILFUSE Specific Implementation

The following elements represent RAILFUSE's specific combination and implementation:

### 1. Opportunity-Aware Block Planning Framework

The specific framing of the question ("what maximum useful maintenance can we safely accomplish using this already available block?") and the complete pipeline from data ingestion through opportunity graph construction to optimized plan generation is RAILFUSE's implementation design.

### 2. Combined Multi-Dimensional Scoring

The integration of:
- Maintenance debt (based on overdue, deferrals, severity, criticality)
- Flexibility scoring (based on feasible future windows)
- Zero-possession preference (bonus for not extending blocks)
- Future block protection (look-ahead)
- Opportunity cost analysis (value of next-best alternative)

...as a unified optimization objective with configurable weights is RAILFUSE's design.

### 3. Department Compatibility Rules

The explicit modelling of railway department compatibility (Engineering, S&T, TRD, Civil) with safety conditions for block sharing is RAILFUSE's implementation, based on general knowledge of Indian Railways organisational structure.

**Assumption:** Compatibility rules in this prototype are illustrative and not based on official Indian Railways operational procedures. Real compatibility determinations require input from authorised railway safety and operational experts.

### 4. Dynamic Explainability Engine

The per-task, per-decision dynamic explanation system that draws from actual algorithm results (not hardcoded templates) is RAILFUSE's implementation.

---

## Key Assumptions

The following assumptions were made in building this prototype:

### Operational Assumptions

| Assumption | Basis | Confidence |
|------------|-------|------------|
| Maintenance blocks can be shared between compatible departments | General railway maintenance knowledge | Medium |
| Zero-additional-possession is a meaningful objective | Logical (extensions disrupt train operations) | High |
| Maintenance debt accumulates with deferrals | Infrastructure asset management principles | High |
| Future scheduling flexibility is a valid protection criterion | Operations research principles | High |

### Technical Assumptions

| Assumption | Basis | Confidence |
|------------|-------|------------|
| 10-minute safety buffer for train conflicts | Conservative estimate | Medium |
| Heuristic approach provides good-enough solutions | Prototype constraints | High |
| Fixed seed (42) provides reproducibility | Standard practice | High |
| Default weight values produce reasonable results for demo | Manual tuning on synthetic data | Medium |

### Dataset Assumptions

| Assumption | Note |
|------------|------|
| All data is synthetic | Clearly stated throughout |
| Section names are fictional | No real Indian Railways section codes used |
| Train numbers are fictional | No real Indian Railways train numbers intended |
| Duration values are illustrative | Not based on real maintenance duration data |

---

## Limitations

The following limitations apply to the current prototype:

1. **Synthetic data only** — Not connected to live TMS/SMMS/TDMS systems
2. **Simplified compatibility rules** — Real department compatibility is more complex
3. **Bounded look-ahead** — Full network optimization is not implemented
4. **No safety certification** — This is a prototype, not a certified system
5. **No real-time data** — Optimization runs on static dataset
6. **Prototype algorithms** — Not optimized for production scale
7. **No user authentication** — Prototype only
8. **Single planning horizon** — Multi-week network planning not implemented

---

## Future Research Directions

1. **ML-based maintenance duration prediction** — Predict actual task durations from historical data
2. **Predictive asset degradation** — Forecast when maintenance will become critical
3. **Real-time conflict detection** — Integrate with live train control systems
4. **Global network optimization** — Multi-corridor, multi-zone planning
5. **Formal safety verification** — Verification of compatibility rules against actual railway safety standards

---

*Research and assumptions document version: 1.0.0*
