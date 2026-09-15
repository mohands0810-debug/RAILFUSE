"""
RAILFUSE — Maintenance Intelligence Engine
Smart India Hackathon 2026 | PS ID: SIH26027 | Team: Runtime Rebels

Calculates:
- Maintenance Debt Score
- Flexibility Score
- Effective Priority

All formulas are transparent and configurable.
These are RAILFUSE prototype formulas, NOT official Indian Railways formulas.
"""
from typing import List, Optional
from models import MaintenanceTask, MaintenanceBlock, OptimizationConfig


def calculate_maintenance_debt(
    days_overdue: int,
    previous_deferrals: int,
    severity: int,
    criticality: int,
    w_overdue: float = 0.5,
    w_deferrals: float = 2.0,
    deferral_factor: float = 1.5,
    w_severity: float = 1.0,
    asset_risk_multiplier: float = 1.0,
) -> float:
    """
    Calculate maintenance debt score for a task.
    
    Formula:
        debt = (
            (days_overdue * w_overdue)
            + (previous_deferrals * w_deferrals * deferral_factor^max(0, previous_deferrals-1))
            + (severity * criticality * w_severity)
        ) * asset_risk_multiplier
    
    Args:
        days_overdue: Number of days past due date
        previous_deferrals: Number of times previously deferred
        severity: Task severity 1-5
        criticality: Task criticality 1-5
        w_overdue: Weight per day overdue
        w_deferrals: Base weight per deferral
        deferral_factor: Exponential factor for accelerating debt
        w_severity: Weight for severity × criticality component
        asset_risk_multiplier: Asset class risk factor (1.0-2.0)
    
    Returns:
        Maintenance debt score (non-negative float)
    
    Notes:
        These weights are RAILFUSE prototype values.
        They are NOT official Indian Railways maintenance planning formulas.
    """
    overdue_component = days_overdue * w_overdue
    
    # Exponential growth for repeated deferrals
    if previous_deferrals > 0:
        deferral_component = previous_deferrals * w_deferrals * (deferral_factor ** max(0, previous_deferrals - 1))
    else:
        deferral_component = 0.0
    
    severity_component = severity * criticality * w_severity
    
    debt = (overdue_component + deferral_component + severity_component) * asset_risk_multiplier
    
    return round(max(0.0, debt), 2)


def calculate_flexibility_score(
    task: MaintenanceTask,
    future_blocks: List[MaintenanceBlock],
    trains: list,
    resources: list,
    compatibility_rules: list,
) -> float:
    """
    Calculate flexibility score — ratio of feasible future blocks for this task.
    
    Score = feasible_future_blocks / total_future_blocks
    
    A score near 0 means very few future scheduling opportunities (low flexibility).
    A score near 1 means many future scheduling opportunities (high flexibility).
    
    Args:
        task: The maintenance task
        future_blocks: List of upcoming blocks to check
        trains: Train movements for conflict checking
        resources: Resources for availability checking
        compatibility_rules: Department compatibility rules
    
    Returns:
        Flexibility score in [0.0, 1.0]
    """
    if not future_blocks:
        return 0.0
    
    # Import here to avoid circular imports
    from optimization.conflicts import is_feasible_assignment
    
    feasible_count = 0
    for block in future_blocks:
        # Check basic feasibility (section match, duration, resources)
        feasible, _ = is_feasible_assignment(task, block, trains, resources, [])
        if feasible:
            feasible_count += 1
    
    score = feasible_count / len(future_blocks)
    return round(min(1.0, max(0.0, score)), 3)


def calculate_effective_priority(
    task: MaintenanceTask,
    config: OptimizationConfig,
) -> float:
    """
    Calculate the effective priority of a task.
    
    effective_priority = base_priority + maintenance_debt + flexibility_protection_bonus
    
    Args:
        task: The maintenance task
        config: Optimization configuration
    
    Returns:
        Effective priority score
    """
    base_priority = task.severity * task.criticality
    
    debt_contribution = task.maintenance_debt
    
    # Apply protection bonus to low-flexibility tasks
    flexibility_protection = 0.0
    if task.flexibility_score < config.flexibility_threshold:
        flexibility_protection = (1.0 - task.flexibility_score) * config.flexibility_protection_bonus
    
    return base_priority + debt_contribution + flexibility_protection


def calculate_maintenance_benefit(task: MaintenanceTask) -> float:
    """
    Calculate the maintenance benefit of completing a task.
    
    maintenance_benefit = severity * criticality * (1 + debt_factor)
    
    Higher severity × criticality + higher debt = more benefit from completing now.
    """
    base_benefit = float(task.severity * task.criticality)
    debt_factor = min(task.maintenance_debt / 50.0, 1.0)  # Normalized, max 1.0
    return base_benefit * (1.0 + debt_factor)


def calculate_risk_reduction(task: MaintenanceTask) -> float:
    """
    Calculate the risk reduction from completing a maintenance task.
    
    risk_reduction = maintenance_debt * 0.1
    """
    return task.maintenance_debt * 0.1


def enrich_tasks_with_scores(
    tasks: List[MaintenanceTask],
    future_blocks: List[MaintenanceBlock],
    trains: list,
    resources: list,
    compatibility_rules: list,
    config: OptimizationConfig,
) -> List[MaintenanceTask]:
    """
    Enrich tasks with calculated scores (debt, flexibility, effective priority).
    
    This function RECALCULATES all scores from raw fields.
    Useful for ensuring consistency.
    
    Args:
        tasks: List of maintenance tasks
        future_blocks: All upcoming blocks (for flexibility calculation)
        trains: Train movements
        resources: Resources
        compatibility_rules: Compatibility rules
        config: Optimization configuration
    
    Returns:
        Tasks with updated scores (does not modify originals)
    """
    enriched = []
    for task in tasks:
        # Recalculate debt from raw fields
        debt = calculate_maintenance_debt(
            days_overdue=task.days_overdue,
            previous_deferrals=task.previous_deferrals,
            severity=task.severity,
            criticality=task.criticality,
        )
        
        # Recalculate flexibility
        flex = calculate_flexibility_score(
            task=task,
            future_blocks=future_blocks,
            trains=trains,
            resources=resources,
            compatibility_rules=compatibility_rules,
        )
        
        # Create updated task
        task_dict = task.model_dump()
        task_dict["maintenance_debt"] = debt
        task_dict["flexibility_score"] = flex
        enriched.append(MaintenanceTask(**task_dict))
    
    return enriched


def get_debt_explanation(task: MaintenanceTask) -> str:
    """
    Generate a human-readable explanation of a task's maintenance debt.
    
    Returns:
        Explanation string
    """
    parts = []
    
    if task.days_overdue > 0:
        parts.append(f"{task.days_overdue} days overdue")
    
    if task.previous_deferrals > 0:
        parts.append(f"deferred {task.previous_deferrals} previous time(s)")
    
    parts.append(f"severity {task.severity}/criticality {task.criticality}")
    
    level = "Low"
    if task.maintenance_debt >= 40:
        level = "Critical"
    elif task.maintenance_debt >= 25:
        level = "High"
    elif task.maintenance_debt >= 15:
        level = "Moderate"
    
    reason = ", ".join(parts)
    return (
        f"{level} maintenance debt (score: {task.maintenance_debt:.1f}) "
        f"due to {reason}."
    )


def get_flexibility_explanation(task: MaintenanceTask) -> str:
    """
    Generate a human-readable explanation of a task's flexibility score.
    
    Returns:
        Explanation string
    """
    score = task.flexibility_score
    
    if score <= 0.1:
        level = "very low"
        desc = "only 1 or no feasible future windows"
    elif score <= 0.3:
        level = "low"
        desc = "few feasible future windows"
    elif score <= 0.6:
        level = "moderate"
        desc = "some future scheduling opportunities"
    else:
        level = "high"
        desc = "many future scheduling opportunities"
    
    return (
        f"Flexibility: {level} ({score:.2f}) — {desc}. "
        f"{'This task may need protection.' if score <= 0.3 else ''}"
    ).strip()
