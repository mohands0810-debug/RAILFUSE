"""
RAILFUSE — FastAPI Backend Main Application
Smart India Hackathon 2026 | PS ID: SIH26027 | Team: Runtime Rebels

Run with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

API Docs available at:
    http://localhost:8000/docs
    http://localhost:8000/redoc

DISCLAIMER: This API serves SYNTHETIC DEMONSTRATION DATA ONLY.
It is NOT connected to live Indian Railways operational systems.
"""
import sys
import os
from pathlib import Path
from contextlib import asynccontextmanager

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional, Any
from copy import deepcopy
from datetime import datetime

import config
from models import (
    MaintenanceTask, MaintenanceBlock, TrainMovement, Resource,
    CompatibilityRule, OptimizationConfig, OptimizedPlan,
    OpportunityAnalysis, WhatIfRequest, WhatIfResult, WhatIfComparison,
    DashboardStats, TaskDecision,
    ReplanTaskInput, ReplanResult, ChangedDecision,
    AssetAvailabilityEstimate, WeeklyPlan, DayPlan,
)
from data_loader import load_all_data
from optimization.optimizer import run_optimization, analyze_block_opportunities
from optimization.intelligence import get_debt_explanation, get_flexibility_explanation


# =============================================================================
# Application State
# =============================================================================

class AppState:
    """Application-level state (in-memory for prototype)."""
    tasks: List[MaintenanceTask] = []
    blocks: List[MaintenanceBlock] = []
    trains: List[TrainMovement] = []
    resources: List[Resource] = []
    compatibility_rules: List[CompatibilityRule] = []
    current_plan: Optional[OptimizedPlan] = None
    data_loaded: bool = False
    load_error: Optional[str] = None


state = AppState()


# =============================================================================
# Application Setup
# =============================================================================

def initialize_app():
    """Initialize app state: load data and run optimization. Callable from tests."""
    try:
        print("Loading synthetic dataset...")
        (
            state.tasks,
            state.blocks,
            state.trains,
            state.resources,
            state.compatibility_rules,
        ) = load_all_data(
            tasks_file=config.TASKS_FILE,
            blocks_file=config.BLOCKS_FILE,
            trains_file=config.TRAINS_FILE,
            resources_file=config.RESOURCES_FILE,
            compatibility_rules_file=config.COMPATIBILITY_RULES_FILE,
        )
        print(f"  Loaded {len(state.tasks)} tasks, {len(state.blocks)} blocks")
        state.data_loaded = True
        opt_config = OptimizationConfig(random_seed=config.OPTIMIZER_SEED)
        state.current_plan = run_optimization(
            tasks=deepcopy(state.tasks),
            blocks=deepcopy(state.blocks),
            trains=state.trains,
            resources=state.resources,
            compatibility_rules=state.compatibility_rules,
            config=opt_config,
        )
        print(f"  Optimization: {state.current_plan.plan_id} complete.")
    except Exception as e:
        state.load_error = str(e)
        print(f"Startup error: {e}")
        import traceback
        traceback.print_exc()


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_app()
    yield


app = FastAPI(
    title=config.API_TITLE,
    version=config.API_VERSION,
    description=config.API_DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Helper Functions
# =============================================================================

def require_data():
    """Raise 503 if data is not loaded."""
    if not state.data_loaded:
        raise HTTPException(
            status_code=503,
            detail=f"Dataset not loaded. Error: {state.load_error or 'Unknown error'}"
        )


def require_plan():
    """Raise 503 if no plan exists."""
    require_data()
    if state.current_plan is None:
        raise HTTPException(
            status_code=503,
            detail="No optimization plan available. POST to /optimize first."
        )


# =============================================================================
# Health Check
# =============================================================================

@app.get("/", summary="Health check")
async def root():
    """Health check and API information."""
    return {
        "name": "RAILFUSE API",
        "version": config.API_VERSION,
        "status": "healthy" if state.data_loaded else "initializing",
        "data_loaded": state.data_loaded,
        "optimization_available": state.current_plan is not None,
        "disclaimer": (
            "RAILFUSE is a prototype using SYNTHETIC DEMONSTRATION DATA ONLY. "
            "Not connected to live Indian Railways systems."
        ),
        "links": {
            "docs": "/docs",
            "redoc": "/redoc",
            "tasks": "/tasks",
            "blocks": "/blocks",
            "optimize": "/optimize",
            "opportunities": "/opportunities",
        }
    }


# =============================================================================
# Data Endpoints
# =============================================================================

@app.get("/tasks", response_model=List[MaintenanceTask], summary="List maintenance tasks")
async def get_tasks(
    status: Optional[str] = Query(None, description="Filter by status"),
    department: Optional[str] = Query(None, description="Filter by department"),
    section: Optional[str] = Query(None, description="Filter by section"),
    min_severity: Optional[int] = Query(None, ge=1, le=5, description="Minimum severity"),
):
    """
    List all maintenance tasks with calculated scores.

    Optionally filter by status, department, section, or severity.
    """
    require_data()

    tasks = deepcopy(state.tasks)

    # Apply task statuses from current plan if available
    if state.current_plan:
        for task in tasks:
            if task.task_id in state.current_plan.task_decisions:
                decision = state.current_plan.task_decisions[task.task_id]
                task.status = decision.status

    # Filters
    if status:
        tasks = [t for t in tasks if t.status.upper() == status.upper()]
    if department:
        tasks = [t for t in tasks if t.department.lower() == department.lower()]
    if section:
        tasks = [t for t in tasks if t.section.lower() == section.lower()]
    if min_severity is not None:
        tasks = [t for t in tasks if t.severity >= min_severity]

    return tasks


@app.get("/tasks/{task_id}", response_model=MaintenanceTask, summary="Get task details")
async def get_task(task_id: str):
    """Get details for a specific maintenance task."""
    require_data()

    task = next((t for t in state.tasks if t.task_id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    task = deepcopy(task)
    if state.current_plan and task_id in state.current_plan.task_decisions:
        task.status = state.current_plan.task_decisions[task_id].status

    return task


@app.get("/blocks", response_model=List[MaintenanceBlock], summary="List maintenance blocks")
async def get_blocks(
    section: Optional[str] = Query(None, description="Filter by section"),
    min_capacity: Optional[int] = Query(None, description="Minimum remaining capacity"),
):
    """List all available maintenance blocks with capacity information."""
    require_data()

    blocks = deepcopy(state.blocks)

    if section:
        blocks = [b for b in blocks if b.section.lower() == section.lower()]
    if min_capacity is not None:
        blocks = [b for b in blocks if b.remaining_capacity >= min_capacity]

    return blocks


@app.get("/trains", response_model=List[TrainMovement], summary="List train movements")
async def get_trains(
    section: Optional[str] = Query(None, description="Filter by section"),
    train_type: Optional[str] = Query(None, description="Filter by train type"),
):
    """List all train movements."""
    require_data()

    trains = deepcopy(state.trains)

    if section:
        trains = [t for t in trains if t.section.lower() == section.lower()]
    if train_type:
        trains = [t for t in trains if t.train_type.lower() == train_type.lower()]

    return trains


@app.get("/resources", response_model=List[Resource], summary="List resources")
async def get_resources(
    department: Optional[str] = Query(None, description="Filter by department"),
    available_only: bool = Query(False, description="Only return available resources"),
):
    """List all resources with availability information."""
    require_data()

    resources = deepcopy(state.resources)

    if department:
        resources = [r for r in resources if r.department.lower() == department.lower()]
    if available_only:
        resources = [r for r in resources if r.availability.available]

    return resources


@app.get("/compatibility-rules", response_model=List[CompatibilityRule], summary="List compatibility rules")
async def get_compatibility_rules():
    """List all department compatibility rules."""
    require_data()
    return state.compatibility_rules


# =============================================================================
# Optimization Endpoints
# =============================================================================

@app.post("/optimize", response_model=OptimizedPlan, summary="Run optimization")
async def optimize(config_body: Optional[OptimizationConfig] = None):
    """
    Run the RAILFUSE optimization engine.

    Analyzes all available blocks and tasks, applies compatibility rules,
    detects conflicts, builds opportunity graphs, and selects the optimal
    assignment of tasks to blocks.

    The result is fully explainable — every decision includes a reason.

    **This is DETERMINISTIC**: same input + same config = same output.
    """
    require_data()

    opt_config = config_body or OptimizationConfig(random_seed=config.OPTIMIZER_SEED)

    try:
        plan = run_optimization(
            tasks=deepcopy(state.tasks),
            blocks=deepcopy(state.blocks),
            trains=state.trains,
            resources=state.resources,
            compatibility_rules=state.compatibility_rules,
            config=opt_config,
        )
        state.current_plan = plan
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(e)}")


@app.get("/optimized-plan", response_model=OptimizedPlan, summary="Get optimized plan")
async def get_optimized_plan():
    """
    Get the most recently generated optimized plan without re-running optimization.
    """
    require_plan()
    return state.current_plan


@app.get("/opportunities", response_model=List[OpportunityAnalysis], summary="Get opportunities")
async def get_opportunities(
    block_id: Optional[str] = Query(None, description="Filter by block ID"),
):
    """
    Get opportunity analysis for all (or a specific) block.

    Shows feasible tasks, opportunity graph, compatible combinations,
    and the best combination for each block.
    """
    require_data()

    opt_config = OptimizationConfig(random_seed=config.OPTIMIZER_SEED)
    blocks = deepcopy(state.blocks)
    tasks = deepcopy(state.tasks)

    # Apply statuses from current plan
    if state.current_plan:
        task_map = {t.task_id: t for t in tasks}
        for task_id, decision in state.current_plan.task_decisions.items():
            if task_id in task_map:
                task_map[task_id].status = decision.status

    if block_id:
        blocks = [b for b in blocks if b.block_id == block_id]
        if not blocks:
            raise HTTPException(status_code=404, detail=f"Block {block_id} not found")

    results = []
    for block in blocks:
        analysis = analyze_block_opportunities(
            block=block,
            tasks=tasks,
            trains=state.trains,
            resources=state.resources,
            compatibility_rules=state.compatibility_rules,
            config=opt_config,
        )
        results.append(analysis)

    return results


@app.get("/block/{block_id}", summary="Get block with opportunity analysis")
async def get_block_detail(block_id: str):
    """
    Get detailed information and opportunity analysis for a specific block.

    Includes feasible tasks, opportunity graph, all compatible combinations,
    and the best combination with explanations.
    """
    require_data()

    block = next((b for b in state.blocks if b.block_id == block_id), None)
    if not block:
        raise HTTPException(status_code=404, detail=f"Block {block_id} not found")

    opt_config = OptimizationConfig(random_seed=config.OPTIMIZER_SEED)
    tasks = deepcopy(state.tasks)

    analysis = analyze_block_opportunities(
        block=deepcopy(block),
        tasks=tasks,
        trains=state.trains,
        resources=state.resources,
        compatibility_rules=state.compatibility_rules,
        config=opt_config,
    )

    # Include block assignment from current plan if available
    plan_assignment = None
    if state.current_plan:
        plan_assignment = next(
            (a for a in state.current_plan.block_assignments if a.block_id == block_id),
            None
        )

    return {
        "block": block,
        "opportunity_analysis": analysis,
        "plan_assignment": plan_assignment,
    }


# =============================================================================
# What-If Endpoint
# =============================================================================

@app.post("/what-if", response_model=WhatIfResult, summary="What-if scenario")
async def what_if(request: WhatIfRequest):
    """
    Run a what-if scenario analysis.

    Modify task or block parameters and see how the optimization changes.

    If input changes, optimization output changes — this is NOT a static demo.
    """
    require_data()

    # Start with baseline plan
    baseline_config = OptimizationConfig(random_seed=config.OPTIMIZER_SEED)

    try:
        baseline_plan = run_optimization(
            tasks=deepcopy(state.tasks),
            blocks=deepcopy(state.blocks),
            trains=state.trains,
            resources=state.resources,
            compatibility_rules=state.compatibility_rules,
            config=baseline_config,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Baseline optimization error: {str(e)}")

    # Apply modifications
    modified_tasks = deepcopy(state.tasks)
    modified_blocks = deepcopy(state.blocks)

    task_map = {t.task_id: t for t in modified_tasks}
    block_map = {b.block_id: b for b in modified_blocks}

    for mod in request.task_modifications:
        if mod.task_id and mod.task_id in task_map:
            task = task_map[mod.task_id]
            task_dict = task.model_dump()
            if mod.field in task_dict:
                task_dict[mod.field] = mod.value
                # Recalculate maintenance_debt if base fields changed
                if mod.field in ("days_overdue", "previous_deferrals", "severity", "criticality"):
                    from optimization.intelligence import calculate_maintenance_debt
                    task_dict["maintenance_debt"] = calculate_maintenance_debt(
                        days_overdue=task_dict["days_overdue"],
                        previous_deferrals=task_dict["previous_deferrals"],
                        severity=task_dict["severity"],
                        criticality=task_dict["criticality"],
                    )
                task_map[mod.task_id] = MaintenanceTask(**task_dict)

    for mod in request.block_modifications:
        if mod.block_id and mod.block_id in block_map:
            block = block_map[mod.block_id]
            block_dict = block.model_dump()
            if mod.field in block_dict:
                block_dict[mod.field] = mod.value
                block_map[mod.block_id] = MaintenanceBlock(**block_dict)

    modified_tasks_list = list(task_map.values())
    modified_blocks_list = list(block_map.values())

    # Run modified optimization
    modified_config = request.config or OptimizationConfig(random_seed=config.OPTIMIZER_SEED)

    try:
        modified_plan = run_optimization(
            tasks=modified_tasks_list,
            blocks=modified_blocks_list,
            trains=state.trains,
            resources=state.resources,
            compatibility_rules=state.compatibility_rules,
            config=modified_config,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"What-if optimization error: {str(e)}")

    # Compare plans
    changed_assignments = []
    baseline_by_block = {a.block_id: a for a in baseline_plan.block_assignments}
    modified_by_block = {a.block_id: a for a in modified_plan.block_assignments}

    all_block_ids = set(baseline_by_block.keys()) | set(modified_by_block.keys())

    for bid in all_block_ids:
        before = baseline_by_block.get(bid)
        after = modified_by_block.get(bid)

        before_tasks = sorted(before.selected_tasks) if before else []
        after_tasks = sorted(after.selected_tasks) if after else []
        before_value = before.block_value if before else 0.0
        after_value = after.block_value if after else 0.0
        changed = before_tasks != after_tasks

        explanation = ""
        if changed:
            added = set(after_tasks) - set(before_tasks)
            removed = set(before_tasks) - set(after_tasks)
            parts = []
            if added:
                parts.append(f"added: {list(added)}")
            if removed:
                parts.append(f"removed: {list(removed)}")
            # Find why
            for mod in request.task_modifications:
                if mod.task_id in added or mod.task_id in removed:
                    parts.append(
                        f"Modification to {mod.task_id}.{mod.field}={mod.value} "
                        f"changed its effective priority, altering the block assignment."
                    )
            explanation = " ".join(parts)

        changed_assignments.append(WhatIfComparison(
            block_id=bid,
            before_tasks=before_tasks,
            after_tasks=after_tasks,
            before_value=before_value,
            after_value=after_value,
            changed=changed,
            explanation=explanation,
        ))

    # Update state with latest plan
    state.current_plan = modified_plan

    # Summary delta
    summary_delta = {
        "planned_tasks_change": (
            modified_plan.summary.planned_tasks - baseline_plan.summary.planned_tasks
        ),
        "additional_possession_change": (
            modified_plan.summary.total_additional_possession
            - baseline_plan.summary.total_additional_possession
        ),
        "total_value_change": round(
            modified_plan.summary.total_block_value - baseline_plan.summary.total_block_value, 2
        ),
        "zero_possession_blocks_change": (
            modified_plan.summary.zero_possession_blocks
            - baseline_plan.summary.zero_possession_blocks
        ),
    }

    return WhatIfResult(
        scenario_name=request.scenario_name,
        baseline_plan=baseline_plan,
        modified_plan=modified_plan,
        changed_assignments=[c for c in changed_assignments if c.changed],
        summary_delta=summary_delta,
    )


# =============================================================================
# Dynamic Re-planning Endpoint
# =============================================================================

@app.post("/replan", response_model=ReplanResult, summary="Dynamic re-planning")
async def replan(new_task: ReplanTaskInput):
    """
    Dynamic Re-planning: inject a new critical maintenance task and re-optimize.

    This is the core RAILFUSE dynamic re-planning demonstration:

    1. Accepts a new task (e.g., a critical defect just discovered)
    2. Calculates its maintenance debt and flexibility
    3. Adds it to the task pool
    4. Re-runs the full optimizer
    5. Returns the before/after plan with changed decisions and explanations

    The before plan is the current cached plan.
    The after plan is freshly recalculated with the new task included.

    IMPORTANT: This temporarily adds the task to in-memory state.
    Use POST /reset-demo to restore the original dataset.
    """
    require_data()

    from optimization.intelligence import calculate_maintenance_debt, calculate_flexibility_score

    # Check task_id doesn't collide
    existing_ids = {t.task_id for t in state.tasks}
    task_id = new_task.task_id
    if task_id in existing_ids:
        task_id = f"{task_id}-REPLAN-{datetime.now().strftime('%H%M%S')}"

    # Compute maintenance_debt for the new task
    debt = calculate_maintenance_debt(
        days_overdue=new_task.days_overdue,
        previous_deferrals=new_task.previous_deferrals,
        severity=new_task.severity,
        criticality=new_task.criticality,
    )
    due_date = new_task.due_date or datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

    # Build task with preliminary flex=0.5; we'll compute the real value next
    injected_task = MaintenanceTask(
        task_id=task_id,
        asset_id=new_task.asset_id,
        asset_type=new_task.asset_type,
        corridor=new_task.corridor,
        section=new_task.section,
        location=new_task.location or new_task.section,
        department=new_task.department,
        task_type=new_task.task_type,
        duration=new_task.duration,
        severity=new_task.severity,
        criticality=new_task.criticality,
        due_date=due_date,
        days_overdue=new_task.days_overdue,
        previous_deferrals=new_task.previous_deferrals,
        maintenance_debt=round(debt, 2),
        flexibility_score=0.5,
        required_resources=new_task.required_resources,
        compatible_departments=new_task.compatible_departments,
        safety_requirements=new_task.safety_requirements,
        preferred_time_window=new_task.preferred_time_window,
        status="PENDING",
        notes=new_task.notes,
    )

    # Compute real flexibility score (requires a full MaintenanceTask object)
    flex = calculate_flexibility_score(
        task=injected_task,
        future_blocks=state.blocks,
        trains=state.trains,
        resources=state.resources,
        compatibility_rules=state.compatibility_rules,
    )
    injected_task.flexibility_score = round(flex, 3)

    # Capture the before plan
    opt_config = OptimizationConfig(random_seed=config.OPTIMIZER_SEED)
    if state.current_plan is None:
        before_plan = run_optimization(
            tasks=deepcopy(state.tasks),
            blocks=deepcopy(state.blocks),
            trains=state.trains,
            resources=state.resources,
            compatibility_rules=state.compatibility_rules,
            config=opt_config,
        )
    else:
        before_plan = state.current_plan

    # Build augmented task list with the new task inserted at the front
    # (high priority tasks should be evaluated first)
    augmented_tasks = [injected_task] + deepcopy(state.tasks)

    try:
        after_plan = run_optimization(
            tasks=augmented_tasks,
            blocks=deepcopy(state.blocks),
            trains=state.trains,
            resources=state.resources,
            compatibility_rules=state.compatibility_rules,
            config=opt_config,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Re-planning error: {str(e)}")

    # Update state with new plan and persist the injected task
    state.tasks.append(injected_task)
    state.current_plan = after_plan

    # Diff the decisions
    before_decisions = before_plan.task_decisions
    after_decisions = after_plan.task_decisions
    all_ids = set(before_decisions.keys()) | set(after_decisions.keys())

    changed = []
    for tid in all_ids:
        b = before_decisions.get(tid)
        a = after_decisions.get(tid)
        b_status = b.status if b else "NOT_IN_PLAN"
        a_status = a.status if a else "NOT_IN_PLAN"
        if b_status != a_status:
            changed.append(ChangedDecision(
                task_id=tid,
                before_status=b_status,
                after_status=a_status,
                before_block=b.assigned_block if b else None,
                after_block=a.assigned_block if a else None,
                before_reason=b.reason[:120] if b else "",
                after_reason=a.reason[:120] if a else "",
            ))

    new_task_decision = after_decisions.get(task_id)

    # Summary delta
    b_sum = before_plan.summary
    a_sum = after_plan.summary
    summary_delta = {
        "planned_tasks_change": a_sum.planned_tasks - b_sum.planned_tasks,
        "deferred_tasks_change": a_sum.deferred_tasks - b_sum.deferred_tasks,
        "total_value_change": round(a_sum.total_block_value - b_sum.total_block_value, 2),
        "additional_possession_change": a_sum.total_additional_possession - b_sum.total_additional_possession,
        "tasks_changed_count": len(changed),
    }

    # Human-readable narrative
    new_status = new_task_decision.status if new_task_decision else "NOT_EVALUATED"
    new_block = new_task_decision.assigned_block if new_task_decision else None
    narrative_parts = [
        f"New critical task '{task_id}' (dept: {new_task.department}, "
        f"severity: {new_task.severity}/5, debt: {debt:.1f}) was injected into the planning horizon.",
        f"Re-optimization result: task was {new_status}" +
        (f" → assigned to block {new_block}." if new_block else "."),
        f"{len(changed)} existing task decision(s) changed as a result of re-planning.",
    ]
    if summary_delta["planned_tasks_change"] > 0:
        narrative_parts.append(
            f"Net effect: {summary_delta['planned_tasks_change']} more tasks planned."
        )
    elif summary_delta["planned_tasks_change"] < 0:
        narrative_parts.append(
            f"Net effect: {abs(summary_delta['planned_tasks_change'])} tasks displaced by the critical task."
        )

    return ReplanResult(
        replan_id=f"REPLAN-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
        generated_at=datetime.now().isoformat(),
        added_task=injected_task,
        before_plan=before_plan,
        after_plan=after_plan,
        changed_decisions=changed,
        new_task_decision=new_task_decision,
        summary_delta=summary_delta,
        narrative=" ".join(narrative_parts),
    )


@app.post("/reset-demo", summary="Reset dataset to original")
async def reset_demo():
    """
    Reset the in-memory dataset to the original synthetic data.

    Use this after dynamic re-planning demos to restore the original state.
    """
    initialize_app()
    return {
        "status": "reset",
        "tasks": len(state.tasks),
        "message": "Dataset restored to original synthetic data.",
    }


# =============================================================================
# Asset Availability Endpoint
# =============================================================================

@app.get("/asset-availability", response_model=list, summary="Asset availability estimates")
async def get_asset_availability(
    department: Optional[str] = Query(None, description="Filter by department"),
    min_risk: Optional[str] = Query(None, description="Filter by min risk level: LOW, MEDIUM, HIGH, CRITICAL"),
):
    """
    **Prototype Asset Availability Estimates.**

    Returns a prototype-level estimate of asset availability based on:
    - Outstanding maintenance debt
    - Number of critical/high severity tasks
    - Task overdue days

    **DISCLAIMER**: This is a RAILFUSE SIH 2026 prototype estimate.
    It is NOT an official Indian Railways asset health metric or prediction.
    Formula: availability_pct = max(0, 100 - maintenance_debt * 1.5 - critical_tasks * 5)
    """
    require_data()

    RISK_RANK = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}

    # Group tasks by asset
    asset_map: dict = {}
    for task in state.tasks:
        aid = task.asset_id
        if aid not in asset_map:
            asset_map[aid] = {
                "asset_id": aid,
                "asset_type": task.asset_type,
                "section": task.section,
                "department": task.department,
                "tasks": [],
            }
        asset_map[aid]["tasks"].append(task)

    results = []
    for aid, info in asset_map.items():
        if department and info["department"].lower() != department.lower():
            continue
        tasks = info["tasks"]
        total_debt = sum(t.maintenance_debt for t in tasks)
        critical_tasks = sum(1 for t in tasks if t.severity >= 4 or t.criticality >= 4)
        max_overdue = max((t.days_overdue for t in tasks), default=0)

        # Prototype formula (transparent, labeled)
        availability_pct = max(0.0, 100.0 - (total_debt * 0.8) - (critical_tasks * 4.0))
        availability_pct = min(100.0, round(availability_pct, 1))

        if availability_pct >= 80:
            risk = "LOW"
        elif availability_pct >= 60:
            risk = "MEDIUM"
        elif availability_pct >= 40:
            risk = "HIGH"
        else:
            risk = "CRITICAL"

        if min_risk and RISK_RANK.get(risk, 0) < RISK_RANK.get(min_risk.upper(), 0):
            continue

        notes_parts = []
        if total_debt > 30:
            notes_parts.append(f"High cumulative debt ({total_debt:.1f}).")
        if critical_tasks > 0:
            notes_parts.append(f"{critical_tasks} critical/high-severity task(s) pending.")
        if max_overdue > 7:
            notes_parts.append(f"Tasks overdue by up to {max_overdue} days.")

        results.append(AssetAvailabilityEstimate(
            asset_id=aid,
            asset_type=info["asset_type"],
            section=info["section"],
            department=info["department"],
            availability_pct=availability_pct,
            maintenance_debt=round(total_debt, 1),
            outstanding_critical_tasks=critical_tasks,
            risk_level=risk,
            notes=" ".join(notes_parts) if notes_parts else "No significant issues detected.",
        ).model_dump())

    # Sort by availability ascending (worst first)
    results.sort(key=lambda r: r["availability_pct"])
    return results


# =============================================================================
# Weekly Planning Endpoint
# =============================================================================

@app.get("/weekly-plan", response_model=WeeklyPlan, summary="Weekly planning horizon")
async def get_weekly_plan():
    """
    Generate an optimized maintenance plan across the full 7-day block horizon.

    Groups existing maintenance blocks by calendar day and runs the full
    optimization engine across all blocks.

    Returns:
    - Day-by-day breakdown of planned/deferred tasks
    - Per-day block utilization and capacity
    - Overall weekly summary

    This REUSES the existing optimization engine — no separate weekly algorithm.
    Same constraints, same opportunity graph, same explainability.
    """
    require_data()

    from datetime import date
    import calendar

    opt_config = OptimizationConfig(random_seed=config.OPTIMIZER_SEED)

    try:
        full_plan = run_optimization(
            tasks=deepcopy(state.tasks),
            blocks=deepcopy(state.blocks),
            trains=state.trains,
            resources=state.resources,
            compatibility_rules=state.compatibility_rules,
            config=opt_config,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weekly planning error: {str(e)}")

    # Group blocks by date
    block_map = {b.block_id: b for b in state.blocks}
    task_map = {t.task_id: t for t in state.tasks}
    assignment_map = {a.block_id: a for a in full_plan.block_assignments}

    day_map: dict = {}
    for block in state.blocks:
        try:
            dt_str = block.start_time[:10]  # YYYY-MM-DD
            if dt_str not in day_map:
                day_map[dt_str] = []
            day_map[dt_str].append(block)
        except Exception:
            continue

    days = []
    all_dates = sorted(day_map.keys())
    horizon_start = all_dates[0] if all_dates else ""
    horizon_end = all_dates[-1] if all_dates else ""

    for date_str in all_dates:
        day_blocks = day_map[date_str]
        try:
            d = date.fromisoformat(date_str)
            day_name = calendar.day_name[d.weekday()]
        except Exception:
            day_name = date_str

        planned_tasks, deferred_tasks = [], []
        total_cap = sum(b.duration for b in day_blocks)
        used_cap = 0
        add_poss = 0
        zero_poss = 0
        depts = set()
        day_value = 0.0

        for block in day_blocks:
            a = assignment_map.get(block.block_id)
            if a:
                planned_tasks.extend(a.selected_tasks)
                deferred_tasks.extend(a.deferred_tasks)
                add_poss += a.additional_possession
                if a.zero_possession and a.selected_tasks:
                    zero_poss += 1
                day_value += a.block_value
                for tid in a.selected_tasks:
                    if tid in task_map:
                        used_cap += task_map[tid].duration
                        depts.add(task_map[tid].department)

        util = round((used_cap / max(total_cap, 1)) * 100, 1)

        days.append(DayPlan(
            date=date_str,
            day_name=day_name,
            blocks=[b.block_id for b in day_blocks],
            planned_tasks=planned_tasks,
            deferred_tasks=deferred_tasks,
            total_capacity_minutes=total_cap,
            used_capacity_minutes=used_cap,
            block_utilization_pct=util,
            additional_possession_minutes=add_poss,
            zero_possession_blocks=zero_poss,
            departments_covered=sorted(depts),
            block_value=round(day_value, 2),
        ))

    total_planned = sum(len(d.planned_tasks) for d in days)
    total_deferred = sum(len(d.deferred_tasks) for d in days)
    total_cap_all = sum(d.total_capacity_minutes for d in days)
    total_used_all = sum(d.used_capacity_minutes for d in days)
    total_poss = sum(d.additional_possession_minutes for d in days)
    avg_util = round((total_used_all / max(total_cap_all, 1)) * 100, 1)

    return WeeklyPlan(
        plan_id=f"WEEKLY-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
        generated_at=datetime.now().isoformat(),
        horizon_start=horizon_start,
        horizon_end=horizon_end,
        days=days,
        full_plan=full_plan,
        total_tasks_planned=total_planned,
        total_tasks_deferred=total_deferred,
        total_block_utilization_pct=avg_util,
        total_additional_possession=total_poss,
    )


# =============================================================================
# Dashboard Stats
# =============================================================================

@app.get("/stats", response_model=DashboardStats, summary="Dashboard statistics")
async def get_stats():
    """
    Get aggregate statistics for the command center dashboard.

    All values are calculated dynamically from the dataset and latest optimization.
    """
    require_data()

    tasks = state.tasks
    blocks = state.blocks
    trains = state.trains

    total = len(tasks)
    pending = sum(1 for t in tasks if t.status == "PENDING")
    avg_debt = sum(t.maintenance_debt for t in tasks) / max(total, 1)
    avg_flex = sum(t.flexibility_score for t in tasks) / max(total, 1)
    high_debt = sum(1 for t in tasks if t.maintenance_debt >= 25)
    low_flex = sum(1 for t in tasks if t.flexibility_score <= 0.3)

    planned = deferred = protected = 0
    total_possession = 0
    total_block_duration = sum(b.duration for b in blocks)
    used_block_duration = 0
    opt_time = None

    if state.current_plan:
        plan = state.current_plan
        planned = plan.summary.planned_tasks
        deferred = plan.summary.deferred_tasks
        protected = plan.summary.protected_tasks
        total_possession = plan.summary.total_additional_possession
        opt_time = plan.generated_at

        # Calculate used duration
        task_map = {t.task_id: t for t in tasks}
        for assignment in plan.block_assignments:
            for tid in assignment.selected_tasks:
                if tid in task_map:
                    used_block_duration += task_map[tid].duration

    util_pct = (used_block_duration / max(total_block_duration, 1)) * 100

    return DashboardStats(
        total_tasks=total,
        pending_tasks=pending,
        planned_tasks=planned,
        deferred_tasks=deferred,
        protected_tasks=protected,
        available_blocks=len(blocks),
        avg_maintenance_debt=round(avg_debt, 1),
        avg_flexibility_score=round(avg_flex, 3),
        block_utilization_pct=round(util_pct, 1),
        additional_possession_avoided_minutes=max(0, total_block_duration - total_possession - used_block_duration),
        train_movements_total=len(trains),
        high_debt_tasks=high_debt,
        low_flexibility_tasks=low_flex,
        optimization_run=state.current_plan is not None,
        last_optimized_at=opt_time,
    )


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.DEBUG,
        log_level=config.LOG_LEVEL.lower(),
    )
