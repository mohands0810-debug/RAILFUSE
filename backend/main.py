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
    DashboardStats, TaskDecision
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
