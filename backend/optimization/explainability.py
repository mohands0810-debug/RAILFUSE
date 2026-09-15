"""
RAILFUSE — Explainability Engine
Smart India Hackathon 2026 | PS ID: SIH26027 | Team: Runtime Rebels

Generates dynamic, data-driven explanations for every scheduling decision.
No explanation is hardcoded — all text is generated from actual algorithm results.
"""
from typing import List, Dict, Optional, Any
from models import (
    MaintenanceTask, MaintenanceBlock, TaskDecision, TaskCombination,
    OptimizationConfig
)
from optimization.intelligence import get_debt_explanation, get_flexibility_explanation


def explain_selected(
    task: MaintenanceTask,
    block: MaintenanceBlock,
    combination: TaskCombination,
    config: OptimizationConfig,
    block_value: float,
    opportunity_cost: float,
) -> TaskDecision:
    """
    Generate explanation for a SELECTED task.
    
    Args:
        task: Selected task
        block: Block where task is assigned
        combination: The winning combination
        config: Optimization config
        block_value: Final block value for this assignment
        opportunity_cost: Value of next-best alternative
    
    Returns:
        TaskDecision with SELECTED status
    """
    other_tasks = [t for t in combination.tasks if t != task.task_id]
    
    reason_parts = [
        f"Selected for block {block.block_id} ({block.section}):"
    ]
    
    reason_parts.append(
        f"task fits within remaining capacity "
        f"({task.duration} min of {block.remaining_capacity} min available)"
    )
    reason_parts.append("no train movement conflicts detected")
    reason_parts.append(f"required resources {task.required_resources} available")
    reason_parts.append(f"department {task.department} compatible")
    
    if other_tasks:
        reason_parts.append(
            f"combined with {other_tasks} for total {combination.total_duration} min "
            f"(opportunity: zero additional possession)"
        )
    
    if combination.additional_possession > 0:
        reason_parts.append(
            f"NOTE: {combination.additional_possession} min additional possession required"
        )
    
    if task.maintenance_debt > 25:
        reason_parts.append(
            f"prioritised due to high maintenance debt ({task.maintenance_debt:.1f})"
        )
    
    if task.flexibility_score < config.flexibility_threshold:
        reason_parts.append(
            f"prioritised due to low flexibility score ({task.flexibility_score:.2f}) — "
            f"limited future scheduling opportunities"
        )
    
    if opportunity_cost > 0:
        reason_parts.append(
            f"opportunity cost vs next-best alternative: {opportunity_cost:.1f} value units"
        )
    
    reason = ". ".join(reason_parts) + "."
    
    return TaskDecision(
        task_id=task.task_id,
        status="SELECTED",
        assigned_block=block.block_id,
        reason=reason,
        score=task.maintenance_debt,
        additional_possession=combination.additional_possession,
    )


def explain_rejected(
    task: MaintenanceTask,
    block: MaintenanceBlock,
    rejection_reason: str,
) -> TaskDecision:
    """
    Generate explanation for a REJECTED task.
    
    Args:
        task: Rejected task
        block: Block where rejection occurred
        rejection_reason: Technical reason from conflict checker
    
    Returns:
        TaskDecision with REJECTED status
    """
    return TaskDecision(
        task_id=task.task_id,
        status="REJECTED",
        assigned_block=None,
        reason=rejection_reason,
        score=0.0,
        additional_possession=0,
    )


def explain_deferred(
    task: MaintenanceTask,
    block: MaintenanceBlock,
    selected_combination: Optional[TaskCombination],
    selected_value: float,
    this_value: float,
    future_blocks_available: int,
) -> TaskDecision:
    """
    Generate explanation for a DEFERRED task.
    
    Task was feasible for this block but another combination scored higher.
    
    Args:
        task: Deferred task
        block: Block where deferral occurred
        selected_combination: The winning combination
        selected_value: Value of selected combination
        this_value: Value if this task had been selected
        future_blocks_available: Number of future feasible blocks
    
    Returns:
        TaskDecision with DEFERRED status
    """
    reason_parts = []
    
    if selected_combination:
        reason_parts.append(
            f"Deferred from block {block.block_id} ({block.section}): "
            f"task is feasible but combination {selected_combination.tasks} "
            f"produced higher overall plan value "
            f"({selected_value:.1f} vs {this_value:.1f} value units)"
        )
    else:
        reason_parts.append(
            f"Deferred from block {block.block_id} ({block.section}): "
            f"task is feasible but another task or combination was preferred"
        )
    
    if future_blocks_available > 0:
        reason_parts.append(
            f"Will be reconsidered for {future_blocks_available} upcoming block(s)"
        )
    else:
        reason_parts.append(
            "WARNING: No identified future feasible blocks — requires urgent replanning"
        )
    
    return TaskDecision(
        task_id=task.task_id,
        status="DEFERRED",
        assigned_block=None,
        reason=". ".join(reason_parts) + ".",
        score=task.maintenance_debt,
        additional_possession=0,
    )


def explain_protected(
    task: MaintenanceTask,
    current_block: MaintenanceBlock,
    future_block_id: str,
    stranded_task_id: Optional[str],
    reason_detail: str,
) -> TaskDecision:
    """
    Generate explanation for a PROTECTED task.
    
    Task is deliberately not assigned now to preserve future opportunities.
    
    Args:
        task: Protected task
        current_block: Block being planned now
        future_block_id: Identified better future block
        stranded_task_id: Task that would be stranded if we assigned now
        reason_detail: Specific reason from look-ahead
    
    Returns:
        TaskDecision with PROTECTED status
    """
    reason_parts = [
        f"Protected: task {task.task_id} was NOT assigned to block {current_block.block_id}"
    ]
    
    if stranded_task_id:
        reason_parts.append(
            f"because assigning it now would leave task {stranded_task_id} "
            f"with no feasible future scheduling window"
        )
    
    if future_block_id:
        reason_parts.append(
            f"Future block {future_block_id} is a better opportunity "
            f"for this task or for higher-priority dependent tasks"
        )
    
    if reason_detail:
        reason_parts.append(reason_detail)
    
    return TaskDecision(
        task_id=task.task_id,
        status="PROTECTED",
        assigned_block=None,
        reason=". ".join(reason_parts) + ".",
        score=task.maintenance_debt,
        additional_possession=0,
    )


def explain_no_blocks_available(task: MaintenanceTask) -> TaskDecision:
    """
    Explain when no suitable blocks are available for a task.
    """
    return TaskDecision(
        task_id=task.task_id,
        status="DEFERRED",
        assigned_block=None,
        reason=(
            f"Deferred: no available blocks found in the current planning horizon "
            f"that satisfy all constraints for task {task.task_id} "
            f"({task.section}, {task.department}, {task.duration} min). "
            f"Task requires replanning in next cycle."
        ),
        score=task.maintenance_debt,
        additional_possession=0,
    )


def build_combination_explanation(
    block: MaintenanceBlock,
    combination: TaskCombination,
    all_combinations: List[TaskCombination],
    task_map: Dict[str, MaintenanceTask],
    config: OptimizationConfig,
) -> str:
    """
    Generate a summary explanation for why a specific combination was selected.
    
    Args:
        block: Target block
        combination: Selected combination
        all_combinations: All combinations evaluated
        task_map: task_id -> MaintenanceTask mapping
        config: Optimization config
    
    Returns:
        Explanation string
    """
    task_names = [
        f"{tid} ({task_map[tid].task_type if tid in task_map else 'Unknown'})"
        for tid in combination.tasks
    ]
    
    parts = [
        f"Selected combination [{', '.join(task_names)}] for block {block.block_id}:"
    ]
    
    parts.append(f"total duration {combination.total_duration} min")
    parts.append(f"remaining capacity after: {combination.remaining_after} min")
    
    if combination.zero_possession:
        parts.append("zero additional possession required ✓")
    else:
        parts.append(
            f"requires {combination.additional_possession} min additional possession"
        )
    
    parts.append(f"adjusted value: {combination.adjusted_value:.1f}")
    
    # Compare with alternatives
    alternatives = [c for c in all_combinations if c.tasks != combination.tasks]
    if alternatives:
        best_alt = max(alternatives, key=lambda c: c.adjusted_value)
        parts.append(
            f"next-best alternative {best_alt.tasks} had value {best_alt.adjusted_value:.1f}"
        )
    
    return ". ".join(parts) + "."


def generate_opportunity_cost_explanation(
    selected: TaskCombination,
    next_best: Optional[TaskCombination],
    task_map: Dict[str, MaintenanceTask],
) -> str:
    """
    Explain the opportunity cost of the selection.
    """
    if not next_best:
        return "No alternative combinations available for comparison."
    
    opp_cost = selected.adjusted_value - next_best.adjusted_value
    
    selected_desc = selected.tasks
    next_desc = next_best.tasks
    
    return (
        f"Selecting {selected_desc} over {next_desc}: "
        f"opportunity cost = {opp_cost:.1f} value units "
        f"({selected.adjusted_value:.1f} vs {next_best.adjusted_value:.1f}). "
        f"{'Zero possession preferred over additional possession.' if selected.zero_possession and not next_best.zero_possession else ''}"
    ).strip()
