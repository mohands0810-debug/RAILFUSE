"""
RAILFUSE — Optimization Package
Smart India Hackathon 2026 | PS ID: SIH26027
"""
from optimization.intelligence import (
    calculate_maintenance_debt,
    calculate_flexibility_score,
    calculate_effective_priority,
    calculate_maintenance_benefit,
    calculate_risk_reduction,
    enrich_tasks_with_scores,
    get_debt_explanation,
    get_flexibility_explanation,
)
from optimization.conflicts import (
    is_feasible_assignment,
    find_feasible_tasks,
    check_train_conflicts,
    check_resource_feasibility,
    check_duration_feasibility,
    check_section_feasibility,
    check_department_compatibility,
)
from optimization.opportunity_graph import (
    build_opportunity_graph,
    generate_feasible_combinations,
    check_pair_compatibility,
)
from optimization.optimizer import (
    run_optimization,
    analyze_block_opportunities,
    calculate_block_value,
)
from optimization.explainability import (
    explain_selected,
    explain_rejected,
    explain_deferred,
    explain_protected,
)

__all__ = [
    "calculate_maintenance_debt",
    "calculate_flexibility_score",
    "calculate_effective_priority",
    "calculate_maintenance_benefit",
    "calculate_risk_reduction",
    "enrich_tasks_with_scores",
    "get_debt_explanation",
    "get_flexibility_explanation",
    "is_feasible_assignment",
    "find_feasible_tasks",
    "check_train_conflicts",
    "check_resource_feasibility",
    "check_duration_feasibility",
    "check_section_feasibility",
    "check_department_compatibility",
    "build_opportunity_graph",
    "generate_feasible_combinations",
    "check_pair_compatibility",
    "run_optimization",
    "analyze_block_opportunities",
    "calculate_block_value",
    "explain_selected",
    "explain_rejected",
    "explain_deferred",
    "explain_protected",
]
