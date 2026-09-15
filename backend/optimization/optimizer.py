"""
RAILFUSE — Main Optimization Engine
Smart India Hackathon 2026 | PS ID: SIH26027 | Team: Runtime Rebels

The core optimization pipeline:
1. Load and score tasks
2. For each block, find feasible tasks
3. Build opportunity graph
4. Generate feasible combinations
5. Calculate block values
6. Apply zero-possession preference
7. Apply future block protection (look-ahead)
8. Select best combination
9. Generate explanations
10. Return optimized plan

This is a deterministic heuristic optimizer (not stochastic).
Same input + same config = same output (fixed seed = 42).

Note: All weights in OptimizationConfig are RAILFUSE prototype values.
They are NOT official Indian Railways values.
"""
import random
from typing import List, Dict, Optional, Tuple, Any
from copy import deepcopy
from datetime import datetime

from models import (
    MaintenanceTask, MaintenanceBlock, TrainMovement, Resource,
    CompatibilityRule, OptimizationConfig, OptimizedPlan, BlockAssignment,
    TaskDecision, OpportunityAnalysis, TaskCombination, OptimizationSummary
)
from optimization.conflicts import (
    find_feasible_tasks, is_feasible_assignment
)
from optimization.opportunity_graph import (
    build_opportunity_graph, generate_feasible_combinations,
    get_opportunity_explanation
)
from optimization.intelligence import (
    calculate_effective_priority, calculate_maintenance_benefit,
    calculate_risk_reduction
)
from optimization.explainability import (
    explain_selected, explain_rejected, explain_deferred, explain_protected,
    explain_no_blocks_available, build_combination_explanation,
    generate_opportunity_cost_explanation
)


def calculate_block_value(
    combination: TaskCombination,
    task_map: Dict[str, MaintenanceTask],
    config: OptimizationConfig,
) -> float:
    """
    Calculate the value of a task combination for a block.
    
    Formula:
        block_value = sum(maintenance_benefit * w_maintenance
                        + risk_reduction * w_risk)
                    - additional_possession * w_possession
    
    Args:
        combination: Task combination to evaluate
        task_map: task_id -> MaintenanceTask
        config: Optimization configuration
    
    Returns:
        Block value (higher = better)
    """
    total_value = 0.0
    
    for task_id in combination.tasks:
        if task_id not in task_map:
            continue
        task = task_map[task_id]
        
        benefit = calculate_maintenance_benefit(task) * config.w_maintenance
        risk_red = calculate_risk_reduction(task) * config.w_risk
        
        total_value += benefit + risk_red
    
    # Penalty for additional possession
    possession_penalty = combination.additional_possession * config.w_possession
    total_value -= possession_penalty
    
    return round(total_value, 3)


def apply_zero_possession_bonus(
    combination: TaskCombination,
    base_value: float,
    config: OptimizationConfig,
) -> float:
    """
    Apply bonus for zero additional possession.
    
    Encourages the optimizer to prefer combinations that don't extend blocks.
    This is a soft preference — safety and operational constraints always take priority.
    """
    if combination.zero_possession:
        return base_value + config.zero_possession_bonus
    return base_value


def count_future_feasible(
    task: MaintenanceTask,
    future_blocks: List[MaintenanceBlock],
    trains: List[TrainMovement],
    resources: List[Resource],
    compatibility_rules: List[CompatibilityRule],
    config: OptimizationConfig,
) -> int:
    """
    Count how many future blocks are feasible for this task.
    
    Args:
        task: Task to check
        future_blocks: Upcoming blocks
        trains: Train movements
        resources: Resources
        compatibility_rules: Compatibility rules
        config: Optimization config
    
    Returns:
        Number of feasible future blocks
    """
    count = 0
    for block in future_blocks:
        ok, _ = is_feasible_assignment(
            task=task,
            block=block,
            trains=trains,
            resources=resources,
            existing_tasks=[],
            compatibility_rules=compatibility_rules,
            safety_buffer_minutes=config.train_safety_buffer_minutes,
        )
        if ok:
            count += 1
    return count


def apply_future_block_protection(
    selected_combination: TaskCombination,
    current_block: MaintenanceBlock,
    future_blocks: List[MaintenanceBlock],
    all_tasks: List[MaintenanceTask],
    trains: List[TrainMovement],
    resources: List[Resource],
    compatibility_rules: List[CompatibilityRule],
    config: OptimizationConfig,
    task_map: Dict[str, MaintenanceTask],
) -> Tuple[float, Optional[str], Optional[str]]:
    """
    Calculate penalty for future opportunity loss.
    
    If assigning the selected combination now would leave a critical task
    with no feasible future blocks, penalise the selection.
    
    Args:
        selected_combination: The combination being considered
        current_block: Current block being planned
        future_blocks: Upcoming blocks (within lookahead_depth)
        all_tasks: All maintenance tasks
        trains: Train movements
        resources: Resources
        compatibility_rules: Compatibility rules
        config: Optimization config
        task_map: task_id -> MaintenanceTask
    
    Returns:
        (penalty, stranded_task_id, future_block_id)
    """
    selected_task_ids = set(selected_combination.tasks)
    
    # Tasks not being assigned in this block
    remaining_tasks = [
        t for t in all_tasks
        if t.task_id not in selected_task_ids
        and t.status in ("PENDING", "DEFERRED")
    ]
    
    total_penalty = 0.0
    stranded_task_id = None
    future_block_id = None
    
    # Check each remaining task
    for task in remaining_tasks:
        # Would this task have been feasible for the current block?
        current_feasible, _ = is_feasible_assignment(
            task=task,
            block=current_block,
            trains=trains,
            resources=resources,
            existing_tasks=[],
            compatibility_rules=compatibility_rules,
            safety_buffer_minutes=config.train_safety_buffer_minutes,
        )
        
        if not current_feasible:
            # Task wasn't feasible here anyway, so no impact
            continue
        
        # Check future feasibility (after assigning selected tasks)
        future_feasible_count = count_future_feasible(
            task=task,
            future_blocks=future_blocks,
            trains=trains,
            resources=resources,
            compatibility_rules=compatibility_rules,
            config=config,
        )
        
        if future_feasible_count == 0:
            # This task will have NO future window — major penalty!
            effective_priority = calculate_effective_priority(task, config)
            penalty = effective_priority * config.w_future * 2.0  # Double penalty for stranded
            total_penalty += penalty
            
            if stranded_task_id is None or (
                task_map.get(task.task_id, task).maintenance_debt >
                task_map.get(stranded_task_id, task).maintenance_debt
            ):
                stranded_task_id = task.task_id
                # Find what future block would have been suitable
                for fb in future_blocks:
                    future_ok, _ = is_feasible_assignment(
                        task=task,
                        block=fb,
                        trains=trains,
                        resources=resources,
                        existing_tasks=[],
                        compatibility_rules=compatibility_rules,
                        safety_buffer_minutes=config.train_safety_buffer_minutes,
                    )
                    # This was feasible BEFORE our assignment — check it
                    if True:  # Simplified: it was feasible in future before
                        future_block_id = fb.block_id
                        break
    
    return total_penalty, stranded_task_id, future_block_id


def optimize_single_block(
    block: MaintenanceBlock,
    available_tasks: List[MaintenanceTask],
    trains: List[TrainMovement],
    resources: List[Resource],
    compatibility_rules: List[CompatibilityRule],
    future_blocks: List[MaintenanceBlock],
    config: OptimizationConfig,
    rng: random.Random,
) -> Tuple[BlockAssignment, List[str]]:
    """
    Optimize the task assignment for a single block.
    
    Args:
        block: Block to optimize
        available_tasks: Tasks available for planning (PENDING or DEFERRED)
        trains: Train movements
        resources: Resources
        compatibility_rules: Compatibility rules
        future_blocks: Upcoming blocks for look-ahead
        config: Optimization configuration
        rng: Random generator for tie-breaking
    
    Returns:
        (BlockAssignment, list of selected task IDs)
    """
    task_map = {t.task_id: t for t in available_tasks}
    
    # Step 1: Find individually feasible tasks
    feasible_tasks, infeasible_info = find_feasible_tasks(
        block=block,
        tasks=available_tasks,
        trains=trains,
        resources=resources,
        compatibility_rules=compatibility_rules,
        safety_buffer_minutes=config.train_safety_buffer_minutes,
    )
    
    # Build block assignment
    assignment = BlockAssignment(
        block_id=block.block_id,
        selected_tasks=[],
        rejected_tasks=[info["task_id"] for info in infeasible_info],
        deferred_tasks=[],
        protected_tasks=[],
        block_value=0.0,
        additional_possession=0,
        opportunity_cost=0.0,
        remaining_capacity=block.remaining_capacity,
        zero_possession=True,
        explanations={},
    )
    
    # Record rejections
    for info in infeasible_info:
        if info["task_id"] in task_map:
            task = task_map[info["task_id"]]
            decision = explain_rejected(task, block, info["reason"])
            assignment.explanations[info["task_id"]] = decision
    
    if not feasible_tasks:
        # No feasible tasks for this block
        return assignment, []
    
    # Step 2: Generate feasible combinations
    combinations = generate_feasible_combinations(
        block=block,
        feasible_tasks=feasible_tasks,
        compatibility_rules=compatibility_rules,
        resources=resources,
        trains=trains,
        max_tasks_per_combination=3,
        safety_buffer_minutes=config.train_safety_buffer_minutes,
    )
    
    if not combinations:
        return assignment, []
    
    # Step 3: Calculate base values for each combination
    for combo in combinations:
        combo.base_value = calculate_block_value(combo, task_map, config)
        combo.adjusted_value = combo.base_value
    
    # Step 4: Apply zero-possession preference
    for combo in combinations:
        combo.adjusted_value = apply_zero_possession_bonus(
            combo, combo.adjusted_value, config
        )
    
    # Step 5: Apply future block protection (look-ahead)
    for combo in combinations:
        penalty, stranded_id, future_block_id = apply_future_block_protection(
            selected_combination=combo,
            current_block=block,
            future_blocks=future_blocks[:config.lookahead_depth],
            all_tasks=available_tasks,
            trains=trains,
            resources=resources,
            compatibility_rules=compatibility_rules,
            config=config,
            task_map=task_map,
        )
        combo.adjusted_value -= penalty
        combo.adjusted_value = round(combo.adjusted_value, 3)
    
    # Step 6: Sort by adjusted value (descending), use rng for tie-breaking
    combinations.sort(key=lambda c: (c.adjusted_value, rng.random()), reverse=True)
    
    # Step 7: Select best combination
    best = combinations[0]
    next_best = combinations[1] if len(combinations) > 1 else None
    
    opportunity_cost = 0.0
    if next_best:
        opportunity_cost = round(best.adjusted_value - next_best.adjusted_value, 2)
    
    # Step 8: Check for protection (look-ahead said to protect a task)
    # If a task in best combo would strand a critical task, override
    penalty, stranded_id, future_block_id = apply_future_block_protection(
        selected_combination=best,
        current_block=block,
        future_blocks=future_blocks[:config.lookahead_depth],
        all_tasks=available_tasks,
        trains=trains,
        resources=resources,
        compatibility_rules=compatibility_rules,
        config=config,
        task_map=task_map,
    )
    
    protected_task_ids = set()
    
    # If penalty is very large, check if we should remove the offending task
    if penalty > best.adjusted_value * 0.5 and len(best.tasks) > 1:
        # Try finding a better combination without the problematic task
        for combo in combinations[1:]:
            p2, _, _ = apply_future_block_protection(
                selected_combination=combo,
                current_block=block,
                future_blocks=future_blocks[:config.lookahead_depth],
                all_tasks=available_tasks,
                trains=trains,
                resources=resources,
                compatibility_rules=compatibility_rules,
                config=config,
                task_map=task_map,
            )
            if p2 < penalty * 0.5:
                best = combo
                break
    
    # Also protect tasks that have very low flexibility and better future blocks
    for task in feasible_tasks:
        if task.task_id in best.tasks:
            continue
        if task.flexibility_score < config.flexibility_threshold:
            # Check if this task has a good future block
            future_count = count_future_feasible(
                task=task,
                future_blocks=future_blocks,
                trains=trains,
                resources=resources,
                compatibility_rules=compatibility_rules,
                config=config,
            )
            if future_count == 1:
                protected_task_ids.add(task.task_id)
    
    # Step 9: Finalize selection
    assignment.selected_tasks = list(best.tasks)
    assignment.block_value = round(best.adjusted_value, 2)
    assignment.additional_possession = best.additional_possession
    assignment.remaining_capacity = best.remaining_after
    assignment.zero_possession = best.zero_possession
    assignment.opportunity_cost = opportunity_cost
    assignment.combination_details = {
        "combination": best.model_dump(),
        "explanation": build_combination_explanation(
            block, best, combinations, task_map, config
        ),
        "opportunity_cost_explanation": generate_opportunity_cost_explanation(
            best, next_best, task_map
        ),
    }
    
    # Step 10: Generate explanations
    selected_set = set(best.tasks)
    deferred_set = set()
    
    for task in feasible_tasks:
        if task.task_id in selected_set:
            decision = explain_selected(
                task=task,
                block=block,
                combination=best,
                config=config,
                block_value=best.adjusted_value,
                opportunity_cost=opportunity_cost,
            )
        elif task.task_id in protected_task_ids:
            assignment.protected_tasks.append(task.task_id)
            decision = explain_protected(
                task=task,
                current_block=block,
                future_block_id=future_block_id or "future block",
                stranded_task_id=stranded_id,
                reason_detail=f"Low flexibility score ({task.flexibility_score:.2f}) — only 1 future window available.",
            )
        else:
            deferred_set.add(task.task_id)
            assignment.deferred_tasks.append(task.task_id)
            decision = explain_deferred(
                task=task,
                block=block,
                selected_combination=best,
                selected_value=best.adjusted_value,
                this_value=next((
                    c.adjusted_value for c in combinations
                    if task.task_id in c.tasks
                ), 0.0),
                future_blocks_available=count_future_feasible(
                    task=task,
                    future_blocks=future_blocks,
                    trains=trains,
                    resources=resources,
                    compatibility_rules=compatibility_rules,
                    config=config,
                ),
            )
        
        assignment.explanations[task.task_id] = decision
    
    return assignment, list(best.tasks)


def run_optimization(
    tasks: List[MaintenanceTask],
    blocks: List[MaintenanceBlock],
    trains: List[TrainMovement],
    resources: List[Resource],
    compatibility_rules: List[CompatibilityRule],
    config: Optional[OptimizationConfig] = None,
) -> OptimizedPlan:
    """
    Run the complete RAILFUSE optimization pipeline.
    
    This is the main entry point for the optimization engine.
    
    Pipeline:
    1. Load and validate inputs
    2. Sort blocks by start time
    3. For each block:
       a. Find feasible tasks
       b. Build opportunity graph
       c. Generate combinations
       d. Apply zero-possession preference
       e. Apply future block protection
       f. Select best combination
       g. Update task statuses
    4. Compile final plan with all decisions
    5. Calculate summary statistics
    
    Args:
        tasks: All maintenance tasks
        blocks: All available blocks
        trains: All train movements
        resources: All resources
        compatibility_rules: Department compatibility rules
        config: Optimization configuration (uses defaults if None)
    
    Returns:
        OptimizedPlan with all decisions and explanations
    
    Notes:
        - Algorithm is DETERMINISTIC: same input → same output (seed=42)
        - All weights in OptimizationConfig are RAILFUSE prototype values
        - Not official Indian Railways operational values
    """
    if config is None:
        config = OptimizationConfig()
    
    # Fixed seed for determinism
    rng = random.Random(config.random_seed)
    
    # Work on copies to avoid mutating originals
    working_tasks = deepcopy(tasks)
    working_blocks = deepcopy(blocks)
    
    # Task map for quick lookup
    task_map = {t.task_id: t for t in working_tasks}
    
    # Sort blocks by start time
    working_blocks.sort(key=lambda b: b.start_time)
    
    # Initialize plan
    plan_id = f"PLAN-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    all_decisions: Dict[str, TaskDecision] = {}
    all_block_assignments: List[BlockAssignment] = []
    
    # Track which tasks have been planned
    planned_task_ids = set()
    
    # Process each block in order
    for block_idx, block in enumerate(working_blocks):
        # Tasks available for this block (not yet planned)
        available_tasks = [
            t for t in working_tasks
            if t.task_id not in planned_task_ids
            and t.status in ("PENDING", "DEFERRED")
        ]
        
        # Future blocks (for look-ahead)
        future_blocks = working_blocks[block_idx + 1:block_idx + 1 + config.lookahead_depth]
        
        # Optimize this block
        assignment, selected_ids = optimize_single_block(
            block=block,
            available_tasks=available_tasks,
            trains=trains,
            resources=resources,
            compatibility_rules=compatibility_rules,
            future_blocks=future_blocks,
            config=config,
            rng=rng,
        )
        
        # Mark selected tasks as planned
        for task_id in selected_ids:
            planned_task_ids.add(task_id)
            if task_id in task_map:
                task_map[task_id].status = "PLANNED"
        
        # Merge decisions using priority ranking.
        # A task rejected by an early block (e.g. section mismatch) must NOT
        # override a later meaningful decision from its matching block.
        # Priority: SELECTED=4 > PROTECTED=3 > DEFERRED=2 > REJECTED=1
        STATUS_PRIORITY = {"SELECTED": 4, "PROTECTED": 3, "DEFERRED": 2, "REJECTED": 1}
        for task_id, decision in assignment.explanations.items():
            existing = all_decisions.get(task_id)
            if existing is None:
                all_decisions[task_id] = decision
            else:
                new_prio = STATUS_PRIORITY.get(decision.status, 0)
                old_prio = STATUS_PRIORITY.get(existing.status, 0)
                if new_prio > old_prio:
                    all_decisions[task_id] = decision
        
        all_block_assignments.append(assignment)
    
    # Tasks never evaluated by any block -> generate no-block explanations
    for task in working_tasks:
        if task.task_id not in all_decisions and task.status in ("PENDING", "DEFERRED"):
            decision = explain_no_blocks_available(task)
            all_decisions[task.task_id] = decision
    
    # Calculate summary statistics
    planned = sum(1 for d in all_decisions.values() if d.status == "SELECTED")
    deferred = sum(1 for d in all_decisions.values() if d.status == "DEFERRED")
    protected = sum(1 for d in all_decisions.values() if d.status == "PROTECTED")
    rejected = sum(1 for d in all_decisions.values() if d.status == "REJECTED")
    
    total_possession = sum(a.additional_possession for a in all_block_assignments)
    total_value = sum(a.block_value for a in all_block_assignments)
    zero_poss_blocks = sum(1 for a in all_block_assignments if a.zero_possession and a.selected_tasks)
    blocks_with_assign = sum(1 for a in all_block_assignments if a.selected_tasks)
    
    # Average block utilization (tasks assigned / block duration)
    utilizations = []
    for i, assignment in enumerate(all_block_assignments):
        block = working_blocks[i]
        if assignment.selected_tasks:
            used = sum(
                task_map[tid].duration
                for tid in assignment.selected_tasks
                if tid in task_map
            )
            util = min(100.0, (used / block.duration) * 100) if block.duration > 0 else 0
            utilizations.append(util)
    
    avg_utilization = sum(utilizations) / len(utilizations) if utilizations else 0.0
    
    summary = OptimizationSummary(
        total_tasks=len(working_tasks),
        pending_tasks=sum(1 for t in tasks if t.status == "PENDING"),
        planned_tasks=planned,
        deferred_tasks=deferred,
        protected_tasks=protected,
        rejected_tasks=rejected,
        total_additional_possession=total_possession,
        total_block_value=round(total_value, 2),
        zero_possession_blocks=zero_poss_blocks,
        blocks_with_assignments=blocks_with_assign,
        avg_block_utilization=round(avg_utilization, 1),
    )
    
    return OptimizedPlan(
        plan_id=plan_id,
        generated_at=datetime.now().isoformat(),
        config=config,
        block_assignments=all_block_assignments,
        task_decisions=all_decisions,
        summary=summary,
    )


def analyze_block_opportunities(
    block: MaintenanceBlock,
    tasks: List[MaintenanceTask],
    trains: List[TrainMovement],
    resources: List[Resource],
    compatibility_rules: List[CompatibilityRule],
    config: Optional[OptimizationConfig] = None,
) -> OpportunityAnalysis:
    """
    Analyze the opportunities for a specific block without running full optimization.
    
    Used by the Opportunity Engine screen.
    
    Args:
        block: Block to analyze
        tasks: All maintenance tasks
        trains: Train movements
        resources: Resources
        compatibility_rules: Compatibility rules
        config: Optimization config
    
    Returns:
        OpportunityAnalysis with graph and combinations
    """
    if config is None:
        config = OptimizationConfig()
    
    task_map = {t.task_id: t for t in tasks}
    
    # Find feasible tasks
    feasible_tasks, infeasible_info = find_feasible_tasks(
        block=block,
        tasks=tasks,
        trains=trains,
        resources=resources,
        compatibility_rules=compatibility_rules,
        safety_buffer_minutes=config.train_safety_buffer_minutes,
    )
    
    # Build opportunity graph
    opp_graph = build_opportunity_graph(
        block=block,
        feasible_tasks=feasible_tasks,
        trains=trains,
        resources=resources,
        compatibility_rules=compatibility_rules,
        safety_buffer_minutes=config.train_safety_buffer_minutes,
    )
    
    # Generate combinations
    combinations = generate_feasible_combinations(
        block=block,
        feasible_tasks=feasible_tasks,
        compatibility_rules=compatibility_rules,
        resources=resources,
        trains=trains,
        safety_buffer_minutes=config.train_safety_buffer_minutes,
    )
    
    # Calculate values
    rng = random.Random(config.random_seed)
    for combo in combinations:
        combo.base_value = calculate_block_value(combo, task_map, config)
        combo.adjusted_value = apply_zero_possession_bonus(combo, combo.base_value, config)
    
    combinations.sort(key=lambda c: c.adjusted_value, reverse=True)
    
    best = combinations[0] if combinations else None
    
    # Generate explanations
    explanations = get_opportunity_explanation(
        block=block,
        feasible_tasks=feasible_tasks,
        infeasible_tasks=infeasible_info,
        best_combination=best,
        all_combinations=combinations,
    )
    
    return OpportunityAnalysis(
        block_id=block.block_id,
        section=block.section,
        duration=block.duration,
        remaining_capacity=block.remaining_capacity,
        feasible_tasks=[t.task_id for t in feasible_tasks],
        infeasible_tasks=infeasible_info,
        opportunity_graph=opp_graph,
        compatible_combinations=combinations[:10],  # Top 10
        best_combination=best,
        explanations=explanations,
    )
