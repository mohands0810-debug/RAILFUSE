"""
RAILFUSE — Conflict Detection Engine
Smart India Hackathon 2026 | PS ID: SIH26027 | Team: Runtime Rebels

Checks whether a maintenance task can feasibly be assigned to a block.
All constraints are checked explicitly and reasons are reported.
"""
from typing import Tuple, List, Optional
from datetime import datetime
from models import MaintenanceTask, MaintenanceBlock, TrainMovement, Resource, CompatibilityRule


def parse_dt(dt_str: str) -> datetime:
    """Parse ISO datetime string to datetime object."""
    # Handle both with and without microseconds
    for fmt in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"]:
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse datetime: {dt_str}")


def check_duration_feasibility(
    task: MaintenanceTask,
    block: MaintenanceBlock,
    already_assigned_duration: int = 0,
) -> Tuple[bool, str]:
    """
    Check if task duration fits within remaining block capacity.
    
    Args:
        task: Maintenance task to check
        block: Target block
        already_assigned_duration: Duration already allocated in block (for multi-task)
    
    Returns:
        (feasible, reason_string)
    """
    available = block.remaining_capacity - already_assigned_duration
    if task.duration <= available:
        return True, f"Duration {task.duration} min fits within remaining capacity {available} min."
    else:
        return False, (
            f"Rejected: task duration {task.duration} min exceeds remaining block capacity "
            f"of {available} min (block has {block.remaining_capacity} min, "
            f"{already_assigned_duration} min already allocated)."
        )


def check_section_feasibility(
    task: MaintenanceTask,
    block: MaintenanceBlock,
) -> Tuple[bool, str]:
    """
    Check if task section matches the block section.
    
    Args:
        task: Maintenance task
        block: Target block
    
    Returns:
        (feasible, reason_string)
    """
    if task.section == block.section:
        return True, f"Section match: {task.section}."
    else:
        return False, (
            f"Rejected: task section '{task.section}' does not match "
            f"block section '{block.section}'."
        )


def check_train_conflicts(
    task: MaintenanceTask,
    block: MaintenanceBlock,
    trains: List[TrainMovement],
    safety_buffer_minutes: int = 10,
) -> Tuple[bool, str]:
    """
    Check for train movement conflicts during the block window.
    
    A conflict exists if any train passes through the block's section
    during the block's time window (including safety buffer).
    
    Args:
        task: Maintenance task (for section reference)
        block: Target block
        trains: All train movements
        safety_buffer_minutes: Buffer before/after block for safety
    
    Returns:
        (no_conflict, reason_string)
    """
    try:
        block_start = parse_dt(block.start_time)
        block_end = parse_dt(block.end_time)
    except ValueError as e:
        return False, f"Cannot parse block times: {e}"
    
    from datetime import timedelta
    buffer = timedelta(minutes=safety_buffer_minutes)
    
    # Expand block window by safety buffer for conflict detection
    check_start = block_start - buffer
    check_end = block_end + buffer
    
    for train in trains:
        # Only check trains in the same section
        if train.section != block.section:
            continue
        
        try:
            train_arrival = parse_dt(train.arrival_time)
            train_departure = parse_dt(train.departure_time)
        except ValueError:
            continue
        
        # Check for time overlap
        # Overlap if train_arrival < check_end AND train_departure > check_start
        if train_arrival < check_end and train_departure > check_start:
            return False, (
                f"Rejected: train {train.train_id} ({train.train_name or train.train_type}) "
                f"scheduled through section {block.section} from "
                f"{train.arrival_time} to {train.departure_time}, "
                f"conflicting with block window {block.start_time}–{block.end_time} "
                f"(including {safety_buffer_minutes}-minute safety buffer)."
            )
    
    return True, "No train movement conflicts detected."


def check_resource_feasibility(
    task: MaintenanceTask,
    block: MaintenanceBlock,
    resources: List[Resource],
    already_used_resources: List[str] = None,
) -> Tuple[bool, str]:
    """
    Check if required resources are available in the block.
    
    Args:
        task: Maintenance task
        block: Target block
        resources: All resources
        already_used_resources: Resource IDs already committed in this block
    
    Returns:
        (feasible, reason_string)
    """
    if already_used_resources is None:
        already_used_resources = []
    
    # Build resource lookup
    resource_lookup = {r.resource_id: r for r in resources}
    
    for resource_id in task.required_resources:
        # Check if resource is in block's available list
        if resource_id not in block.available_resources:
            return False, (
                f"Rejected: required resource {resource_id} is not listed in "
                f"block {block.block_id}'s available resources "
                f"(available: {block.available_resources})."
            )
        
        # Check if resource is already used by another task in this block
        if resource_id in already_used_resources:
            return False, (
                f"Rejected: required resource {resource_id} is already committed "
                f"to another task in block {block.block_id}."
            )
        
        # Check if resource is actually available (not in depot/unavailable)
        if resource_id in resource_lookup:
            resource = resource_lookup[resource_id]
            if not resource.availability.available:
                reason = resource.availability.unavailability_reason or "in depot/maintenance"
                return False, (
                    f"Rejected: required resource {resource_id} "
                    f"({resource.resource_type}) is unavailable — {reason}."
                )
    
    return True, f"All required resources available: {task.required_resources}."


def check_department_compatibility(
    task: MaintenanceTask,
    existing_departments: List[str],
    compatibility_rules: List[CompatibilityRule],
) -> Tuple[bool, str]:
    """
    Check if task's department is compatible with already-assigned departments.
    
    Args:
        task: Maintenance task to check
        existing_departments: Departments already in this block
        compatibility_rules: Department compatibility rules
    
    Returns:
        (compatible, reason_string)
    """
    if not existing_departments:
        return True, "No existing tasks in block — no compatibility check needed."
    
    # Build compatibility lookup
    compat_lookup = {}
    for rule in compatibility_rules:
        key_ab = (rule.department_a, rule.department_b)
        key_ba = (rule.department_b, rule.department_a)
        compat_lookup[key_ab] = rule
        compat_lookup[key_ba] = rule
    
    for existing_dept in existing_departments:
        if existing_dept == task.department:
            # Same department — check same-dept compatibility
            key = (task.department, task.department)
            if key in compat_lookup and not compat_lookup[key].compatible:
                return False, (
                    f"Rejected: department {task.department} is not compatible "
                    f"with itself in a shared block per rule."
                )
            continue
        
        key = (task.department, existing_dept)
        if key in compat_lookup:
            rule = compat_lookup[key]
            if not rule.compatible:
                return False, (
                    f"Rejected: department {task.department} is NOT compatible "
                    f"with department {existing_dept} in the same block "
                    f"(Rule {rule.rule_id}). {rule.notes}"
                )
        # If no rule exists, assume incompatible (conservative)
        elif task.department != existing_dept:
            return False, (
                f"Rejected: no compatibility rule found for departments "
                f"{task.department} + {existing_dept}. Assuming incompatible "
                f"(conservative safety policy)."
            )
    
    return True, (
        f"Department {task.department} is compatible with existing departments "
        f"{existing_departments}."
    )


def is_feasible_assignment(
    task: MaintenanceTask,
    block: MaintenanceBlock,
    trains: List[TrainMovement],
    resources: List[Resource],
    existing_tasks: List[MaintenanceTask],
    compatibility_rules: List[CompatibilityRule] = None,
    already_used_resources: List[str] = None,
    safety_buffer_minutes: int = 10,
) -> Tuple[bool, str]:
    """
    Check all constraints to determine if a task can be assigned to a block.
    
    Checks in order:
    1. Section match
    2. Duration feasibility
    3. Train conflict
    4. Resource availability
    5. Department compatibility (if other tasks present)
    
    Returns:
        (feasible, reason_string)
    """
    if compatibility_rules is None:
        compatibility_rules = []
    if already_used_resources is None:
        already_used_resources = []
    
    # Already-assigned duration (for multi-task blocks)
    already_assigned_duration = sum(t.duration for t in existing_tasks)
    
    # 1. Section check
    ok, reason = check_section_feasibility(task, block)
    if not ok:
        return False, reason
    
    # 2. Duration check
    ok, reason = check_duration_feasibility(task, block, already_assigned_duration)
    if not ok:
        return False, reason
    
    # 3. Train conflict check
    ok, reason = check_train_conflicts(task, block, trains, safety_buffer_minutes)
    if not ok:
        return False, reason
    
    # 4. Resource check
    ok, reason = check_resource_feasibility(task, block, resources, already_used_resources)
    if not ok:
        return False, reason
    
    # 5. Department compatibility (if there are existing tasks)
    if existing_tasks and compatibility_rules:
        existing_departments = list(set(t.department for t in existing_tasks))
        ok, reason = check_department_compatibility(task, existing_departments, compatibility_rules)
        if not ok:
            return False, reason
    
    return True, (
        f"Feasible for block {block.block_id} ({block.section}): "
        f"section match, duration {task.duration} min fits, "
        f"no train conflicts, required resources available."
    )


def find_feasible_tasks(
    block: MaintenanceBlock,
    tasks: List[MaintenanceTask],
    trains: List[TrainMovement],
    resources: List[Resource],
    compatibility_rules: List[CompatibilityRule],
    safety_buffer_minutes: int = 10,
) -> Tuple[List[MaintenanceTask], List[dict]]:
    """
    Find all tasks that are individually feasible for a given block.
    
    Args:
        block: The target block
        tasks: All pending maintenance tasks
        trains: Train movements
        resources: Resources
        compatibility_rules: Compatibility rules
        safety_buffer_minutes: Train safety buffer
    
    Returns:
        (feasible_tasks, infeasible_info)
        infeasible_info is a list of {task_id, reason} dicts
    """
    feasible = []
    infeasible = []
    
    for task in tasks:
        if task.status not in ("PENDING", "DEFERRED"):
            continue
        
        ok, reason = is_feasible_assignment(
            task=task,
            block=block,
            trains=trains,
            resources=resources,
            existing_tasks=[],
            compatibility_rules=compatibility_rules,
            safety_buffer_minutes=safety_buffer_minutes,
        )
        
        if ok:
            feasible.append(task)
        else:
            infeasible.append({"task_id": task.task_id, "reason": reason})
    
    return feasible, infeasible
