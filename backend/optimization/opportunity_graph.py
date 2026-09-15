"""
RAILFUSE — Opportunity Graph Engine
Smart India Hackathon 2026 | PS ID: SIH26027 | Team: Runtime Rebels

Builds the opportunity graph for a given block and generates
feasible task combinations.

Graph structure:
- Nodes: Tasks that are individually feasible for the block
- Edges: Pairs of tasks that are mutually compatible (can co-exist in same block)
"""
from typing import List, Tuple, Dict, Optional, Any
from itertools import combinations
from models import (
    MaintenanceTask, MaintenanceBlock, TrainMovement, Resource,
    CompatibilityRule, OpportunityNode, OpportunityEdge, TaskCombination
)
from optimization.conflicts import (
    is_feasible_assignment, check_department_compatibility,
    check_resource_feasibility
)


def check_pair_compatibility(
    task_a: MaintenanceTask,
    task_b: MaintenanceTask,
    block: MaintenanceBlock,
    trains: List[TrainMovement],
    resources: List[Resource],
    compatibility_rules: List[CompatibilityRule],
    safety_buffer_minutes: int = 10,
) -> Tuple[bool, str]:
    """
    Check if two tasks can be performed together in the same block.
    
    Conditions for compatibility:
    1. Department compatibility per rules
    2. No shared resource conflicts
    3. Combined duration within block capacity
    4. Both individually feasible (train conflicts already checked)
    
    Args:
        task_a: First task
        task_b: Second task
        block: Target block
        trains: Train movements (for individual feasibility)
        resources: Resources
        compatibility_rules: Compatibility rules
        safety_buffer_minutes: Train safety buffer
    
    Returns:
        (compatible, reason_string)
    """
    # 1. Department compatibility
    ok, reason = check_department_compatibility(
        task=task_b,
        existing_departments=[task_a.department],
        compatibility_rules=compatibility_rules,
    )
    if not ok:
        return False, reason
    
    # 2. Resource conflict between the two tasks
    shared_resources = set(task_a.required_resources) & set(task_b.required_resources)
    if shared_resources:
        return False, (
            f"Tasks {task_a.task_id} and {task_b.task_id} cannot share block: "
            f"both require resource(s) {list(shared_resources)}, "
            f"which cannot be used simultaneously."
        )
    
    # 3. Combined duration check
    combined_duration = task_a.duration + task_b.duration
    if combined_duration > block.remaining_capacity:
        # This is still "compatible in principle" but requires additional possession
        # We mark it compatible and let the optimizer decide about possession
        return True, (
            f"Tasks compatible (same dept/resource rules) but combined duration "
            f"{combined_duration} min exceeds remaining capacity {block.remaining_capacity} min. "
            f"Additional possession of {combined_duration - block.remaining_capacity} min required."
        )
    
    return True, (
        f"Tasks {task_a.task_id} and {task_b.task_id} are compatible: "
        f"department rules satisfied, no resource conflicts, "
        f"combined duration {combined_duration} min within capacity {block.remaining_capacity} min."
    )


def build_opportunity_graph(
    block: MaintenanceBlock,
    feasible_tasks: List[MaintenanceTask],
    trains: List[TrainMovement],
    resources: List[Resource],
    compatibility_rules: List[CompatibilityRule],
    safety_buffer_minutes: int = 10,
) -> Dict[str, Any]:
    """
    Build the opportunity graph for a block.
    
    Args:
        block: Target block
        feasible_tasks: Tasks that are individually feasible for this block
        trains: Train movements
        resources: Resources
        compatibility_rules: Compatibility rules
        safety_buffer_minutes: Safety buffer minutes
    
    Returns:
        Graph as dict with 'nodes' and 'edges' lists
    """
    nodes = []
    edges = []
    
    # Create nodes
    for task in feasible_tasks:
        node = OpportunityNode(
            task_id=task.task_id,
            department=task.department,
            duration=task.duration,
            maintenance_debt=task.maintenance_debt,
            flexibility_score=task.flexibility_score,
            feasible=True,
        )
        nodes.append(node.model_dump())
    
    # Create edges (check all pairs)
    task_map = {t.task_id: t for t in feasible_tasks}
    
    for task_a, task_b in combinations(feasible_tasks, 2):
        compatible, reason = check_pair_compatibility(
            task_a=task_a,
            task_b=task_b,
            block=block,
            trains=trains,
            resources=resources,
            compatibility_rules=compatibility_rules,
            safety_buffer_minutes=safety_buffer_minutes,
        )
        
        edge = OpportunityEdge(
            source_task_id=task_a.task_id,
            target_task_id=task_b.task_id,
            compatible=compatible,
            compatibility_reason=reason if compatible else "",
            incompatibility_reason=reason if not compatible else "",
        )
        edges.append(edge.model_dump())
    
    return {
        "block_id": block.block_id,
        "nodes": nodes,
        "edges": edges,
        "node_count": len(nodes),
        "edge_count": len(edges),
        "compatible_edge_count": sum(1 for e in edges if e["compatible"]),
    }


def generate_feasible_combinations(
    block: MaintenanceBlock,
    feasible_tasks: List[MaintenanceTask],
    compatibility_rules: List[CompatibilityRule],
    resources: List[Resource],
    trains: List[TrainMovement],
    max_tasks_per_combination: int = 3,
    safety_buffer_minutes: int = 10,
) -> List[TaskCombination]:
    """
    Generate all feasible task combinations for a block.
    
    Algorithm:
    1. Single-task combinations (always include individually feasible tasks)
    2. Pairs of compatible tasks
    3. Triples of mutually compatible tasks (up to max_tasks_per_combination)
    
    For each combination, calculate:
    - total_duration
    - remaining_after (remaining capacity after this combination)
    - additional_possession (how much block needs to be extended)
    - zero_possession flag
    
    Note: Combinations requiring additional possession are included
    (optimizer will penalize them but may still select them if value is high enough).
    
    Args:
        block: Target block
        feasible_tasks: Individually feasible tasks
        compatibility_rules: Department compatibility rules
        resources: Resources
        trains: Train movements
        max_tasks_per_combination: Maximum tasks in one combination
        safety_buffer_minutes: Safety buffer
    
    Returns:
        List of TaskCombination objects, sorted by total_duration descending
    """
    combinations_list = []
    task_map = {t.task_id: t for t in feasible_tasks}
    
    # Single tasks
    for task in feasible_tasks:
        additional = max(0, task.duration - block.remaining_capacity)
        combo = TaskCombination(
            tasks=[task.task_id],
            total_duration=task.duration,
            remaining_after=max(0, block.remaining_capacity - task.duration),
            additional_possession=additional,
            base_value=0.0,  # Will be calculated by optimizer
            adjusted_value=0.0,
            zero_possession=(additional == 0),
        )
        combinations_list.append(combo)
    
    if max_tasks_per_combination < 2:
        return combinations_list
    
    # Pairs
    for task_a, task_b in combinations(feasible_tasks, 2):
        compatible, reason = check_pair_compatibility(
            task_a=task_a,
            task_b=task_b,
            block=block,
            trains=trains,
            resources=resources,
            compatibility_rules=compatibility_rules,
            safety_buffer_minutes=safety_buffer_minutes,
        )
        
        if compatible:
            total_dur = task_a.duration + task_b.duration
            additional = max(0, total_dur - block.remaining_capacity)
            combo = TaskCombination(
                tasks=[task_a.task_id, task_b.task_id],
                total_duration=total_dur,
                remaining_after=max(0, block.remaining_capacity - total_dur),
                additional_possession=additional,
                base_value=0.0,
                adjusted_value=0.0,
                zero_possession=(additional == 0),
            )
            combinations_list.append(combo)
    
    if max_tasks_per_combination < 3 or len(feasible_tasks) < 3:
        return combinations_list
    
    # Triples
    for task_a, task_b, task_c in combinations(feasible_tasks, 3):
        # Check all pairs within triple are compatible
        ab_ok, _ = check_pair_compatibility(task_a, task_b, block, trains, resources, compatibility_rules, safety_buffer_minutes)
        ac_ok, _ = check_pair_compatibility(task_a, task_c, block, trains, resources, compatibility_rules, safety_buffer_minutes)
        bc_ok, _ = check_pair_compatibility(task_b, task_c, block, trains, resources, compatibility_rules, safety_buffer_minutes)
        
        if ab_ok and ac_ok and bc_ok:
            # Check no 3-way resource conflicts
            all_resources = (
                set(task_a.required_resources) |
                set(task_b.required_resources) |
                set(task_c.required_resources)
            )
            # If combined resource count == sum of individual = no conflicts
            total_resources = (
                len(task_a.required_resources) +
                len(task_b.required_resources) +
                len(task_c.required_resources)
            )
            if len(all_resources) == total_resources:
                total_dur = task_a.duration + task_b.duration + task_c.duration
                additional = max(0, total_dur - block.remaining_capacity)
                combo = TaskCombination(
                    tasks=[task_a.task_id, task_b.task_id, task_c.task_id],
                    total_duration=total_dur,
                    remaining_after=max(0, block.remaining_capacity - total_dur),
                    additional_possession=additional,
                    base_value=0.0,
                    adjusted_value=0.0,
                    zero_possession=(additional == 0),
                )
                combinations_list.append(combo)
    
    return combinations_list


def get_opportunity_explanation(
    block: MaintenanceBlock,
    feasible_tasks: List[MaintenanceTask],
    infeasible_tasks: List[dict],
    best_combination: Optional[TaskCombination],
    all_combinations: List[TaskCombination],
) -> Dict[str, str]:
    """
    Generate explanations for the opportunity analysis.
    
    Args:
        block: Target block
        feasible_tasks: Feasible tasks
        infeasible_tasks: Infeasible task info
        best_combination: Selected combination
        all_combinations: All combinations considered
    
    Returns:
        Dict mapping task_id to explanation string
    """
    explanations = {}
    
    selected_task_ids = set(best_combination.tasks) if best_combination else set()
    feasible_task_ids = set(t.task_id for t in feasible_tasks)
    
    # Explanations for feasible tasks
    for task in feasible_tasks:
        if task.task_id in selected_task_ids:
            extra = ""
            if best_combination and len(best_combination.tasks) > 1:
                others = [t for t in best_combination.tasks if t != task.task_id]
                extra = f" Combined with {others} for total {best_combination.total_duration} min."
            explanations[task.task_id] = (
                f"Selected for block {block.block_id} ({block.section}): "
                f"fits within remaining capacity ({task.duration} min of "
                f"{block.remaining_capacity} min available), no train conflicts, "
                f"required resources available, compatible department.{extra}"
            )
        else:
            # Check if it was in any combination
            in_combinations = [
                c for c in all_combinations
                if task.task_id in c.tasks and c.tasks != (best_combination.tasks if best_combination else [])
            ]
            if in_combinations:
                explanations[task.task_id] = (
                    f"Deferred: task {task.task_id} is feasible for block {block.block_id} "
                    f"but was not in the highest-value combination. "
                    f"Will be reconsidered for future blocks."
                )
            else:
                explanations[task.task_id] = (
                    f"Deferred: individually feasible for block {block.block_id} "
                    f"but not compatible with the selected combination. "
                    f"Will be reconsidered for future blocks."
                )
    
    # Explanations for infeasible tasks
    for info in infeasible_tasks:
        explanations[info["task_id"]] = info["reason"]
    
    return explanations
