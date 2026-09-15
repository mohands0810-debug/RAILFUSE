# RAILFUSE — Demo Guide

**Smart India Hackathon 2026 | PS ID: SIH26027**

---

## Quick Demo (5 minutes)

### 1. Start the Application

```bash
# Terminal 1: Backend
cd backend && uvicorn main:app --reload

# Terminal 2: Frontend
cd frontend-react && npm run dev
```

Open http://localhost:3000

### 2. Demo Sequence

1. **Command Center** → Show live KPIs from actual calculations
2. **Maintenance Tasks** → Show 25 tasks with debt/flexibility scores, filter by department
3. **Block Explorer** → Show 10 blocks → click one to see inline opportunity graph
4. **Click "Run Optimizer"** → Watch algorithm run in real time
5. **Opportunity Engine** → Select BLK003 → See compatible combination T011+T012
6. **Plan Optimizer** → Adjust weights → Re-run → Show plan changes
7. **What-If** → Increase T015 severity to 5 → Re-run → Confirm result changes

---

## Full SIH Judge Demonstration (15 minutes)

### Opening (1 minute)

> *"RAILFUSE is an Opportunity-Aware Adaptive Block Planner for Indian Railways. Traditional systems ask: which task goes in this block? RAILFUSE asks: what maximum useful maintenance can we safely accomplish using this already available block?"*

---

### Scene 1: Command Center (2 minutes)

Open the **Command Center** dashboard.

Point out:
- **25 maintenance tasks** across Delhi-Mumbai and Delhi-Howrah corridors
- **10 available blocks** with varying capacity
- **5 high-debt tasks** requiring urgent attention
- **3 low-flexibility tasks** with few future windows
- **Block utilization at 74%** (calculated dynamically)
- **145 minutes of possession saved** so far

> *"Every number here comes from the actual algorithm, not static data."*

---

### Scene 2: Maintenance Tasks (2 minutes)

Open **Maintenance Tasks** view.

Filter by **Department: Engineering**.

Point out **T015 — Urgent Track Replacement**:
- Maintenance Debt: **47.2** (highest in dataset)
- Previous deferrals: 4
- Days overdue: 21
- Flexibility: 0.15 (very few future windows)

> *"This task has been deferred 4 times. RAILFUSE calculates its debt score as 47.2, making it the highest priority task in the system. With flexibility of only 0.15, it has very few remaining scheduling opportunities."*

---

### Scene 3: Available Blocks (1 minute)

Open **Available Blocks** view.

Show **BLK001 (DLI-MTJ, 22:00–23:30)**:
- Duration: 90 minutes
- Existing tasks: None
- Remaining capacity: 90 minutes
- Available resources: Tamper (R001), Gang (R003)

---

### Scene 4: Run Optimization (2 minutes)

Click **"Run Optimization"** button.

Watch the result:

> *"The optimizer has just run through 10 blocks, 25 tasks, 24 train movements, and 12 resources. Let me show you what it found."*

Show the summary:
- **9 tasks planned** across 7 of 10 blocks
- **6 deferred** (better future windows exist)
- **10 rejected** (section mismatch, train conflicts, or capacity)
- **0 minutes additional possession** for 6 of the 7 assigned blocks

---

### Scene 5: Opportunity Engine — HERO SCREEN (4 minutes)

Open **Opportunity Engine**.

Select **BLK006 (MTJ-GWL, 01:00–03:00, 120 minutes)**.

Walk through the visualization:

**Step 1 — Block Information**
> *"BLK006 is a 120-minute engineering block on the Mathura–Gwalior section."*

**Step 2 — Feasible Tasks**
> *"The algorithm found 4 tasks feasible for this block: T011, T012, T013, T014."*

**Step 3 — Opportunity Graph**
> *"The opportunity graph shows that T011 and T012 are compatible — same department, same section, combined duration 85 minutes (well within the 120-minute block)."*

Point to the compatibility check results:
- ✅ Same section (MTJ-GWL)
- ✅ Compatible departments (Engineering + Engineering)
- ✅ Resources available (R001, R002)
- ✅ Combined duration 85 min ≤ 120 min capacity
- ✅ No train conflicts
- ❌ T013 + T011 — Resource conflict (both need R001)
- ❌ T014 — Train conflict (12051 passes at 01:45)

**Step 4 — Selected Combination**
> *"RAILFUSE selects T011 + T012. Combined duration: 85 minutes. Remaining capacity: 35 minutes. Additional possession: ZERO."*

**Step 5 — Explanations**
Show the explanation panel:
- T011: *"Selected: fits within capacity, no conflicts, required resources available."*
- T012: *"Selected: compatible with T011, combined duration within capacity."*
- T013: *"Rejected: resource R001 already assigned to T011."*
- T014: *"Rejected: train 12051 (Rajdhani) passes through section at 01:45, conflicting with block window."*

> *"Every explanation is dynamically generated from the actual algorithm results. Nothing is hardcoded."*

---

### Scene 6: Optimized Plan / Gantt (1 minute)

Open **Plan Optimizer** page.

Show the current plan table:
- Tasks planned by block (BLK001, BLK003, BLK005, etc.)
- Block values and zero-possession counts

Click a block row:
> *"T011 and T012 are both scheduled within the 105-minute BLK003 window. No additional possession was needed."*

---

### Scene 7: What-If (2 minutes)

Open **What-If Analysis**.

Select scenario: **"Change T015 severity to 5 (Critical)"**

Click **"Run What-If"**

Show comparison:
- **Before:** T015 deferred, BLK008 assigned T016 (value 28.4)
- **After:** T015 selected for BLK008 (value 41.7), T016 deferred
- Explanation: *"T015's severity increase to 5 raised its maintenance debt to 62.0, making it the highest-priority Engineering task. The optimizer now prefers T015 over T016 for BLK008."*

> *"This proves the system actually recalculates — it's not a static demo."*

---

### Closing (1 minute)

> *"RAILFUSE demonstrates four key innovations:"*
> 
> *"First: Opportunity-aware planning — actively searching for compatible tasks within existing blocks."*
> 
> *"Second: Transparent maintenance debt and flexibility scoring — no black box decisions."*
> 
> *"Third: Zero-additional-possession preference — 7 of 10 blocks required no extension."*
> 
> *"Fourth: Dynamic explainability — every decision is explained from actual algorithm results, not hardcoded text."*
> 
> *"For SIH 2026, we believe RAILFUSE demonstrates a technically sound foundation for AI-powered block planning on Indian Railways."*

---

## Technical Questions Preparation

| Question | Answer |
|----------|--------|
| How is maintenance debt calculated? | Formula: days_overdue × 0.5 + deferrals × 2.0 × 1.5^(deferrals-1) + severity × criticality. See ALGORITHM.md. |
| Is this real railway data? | No — synthetic demonstration data only. Clearly labelled throughout. |
| How do you ensure different departments can share a block? | Compatibility rules explicitly define which department pairs can share blocks and under what conditions. |
| What happens if train data changes? | Re-run `/optimize` — the algorithm checks all train movements dynamically. |
| Can this scale to the full railway network? | The prototype demonstrates the algorithm on a representative dataset. Full network optimization requires distributed infrastructure and integration with live systems. |
| How is the algorithm explainable? | Every decision traces to specific constraint checks and score calculations. No black box. |

---

*Demo guide version: 1.0.0*
