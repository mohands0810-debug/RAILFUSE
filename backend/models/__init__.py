"""
RAILFUSE — Pydantic Data Models
Smart India Hackathon 2026 | PS ID: SIH26027 | Team: Runtime Rebels
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class MaintenanceTask(BaseModel):
    """Represents a single maintenance task."""
    task_id: str
    asset_id: str
    asset_type: str
    corridor: str
    section: str
    location: str
    department: str
    task_type: str
    duration: int  # minutes
    severity: int = Field(ge=1, le=5)
    criticality: int = Field(ge=1, le=5)
    due_date: str
    days_overdue: int = 0
    previous_deferrals: int = 0
    maintenance_debt: float = 0.0
    flexibility_score: float = Field(ge=0.0, le=1.0, default=0.5)
    required_resources: List[str] = []
    compatible_departments: List[str] = []
    safety_requirements: List[str] = []
    preferred_time_window: str = "22:00-06:00"
    status: str = "PENDING"  # PENDING, PLANNED, DEFERRED, PROTECTED
    notes: str = ""

    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "T001",
                "asset_id": "TRK-UP-DLI-MTJ-001",
                "asset_type": "Track Geometry",
                "department": "Engineering",
                "duration": 70,
                "severity": 4,
                "maintenance_debt": 28.5
            }
        }


class MaintenanceBlock(BaseModel):
    """Represents an available maintenance block."""
    block_id: str
    corridor: str
    section: str
    start_time: str  # ISO datetime string
    end_time: str    # ISO datetime string
    duration: int    # minutes
    block_type: str
    available_resources: List[str] = []
    affected_track: str = "UP"
    safety_constraints: List[str] = []
    existing_tasks: List[str] = []
    remaining_capacity: int = 0
    notes: str = ""

    class Config:
        json_schema_extra = {
            "example": {
                "block_id": "BLK001",
                "section": "DLI-MTJ",
                "start_time": "2026-09-17T22:00:00",
                "end_time": "2026-09-17T23:30:00",
                "duration": 90
            }
        }


class TrainMovement(BaseModel):
    """Represents a train movement through a section."""
    train_id: str
    train_name: str = ""
    train_type: str
    corridor: str
    section: str
    arrival_time: str   # ISO datetime string
    departure_time: str  # ISO datetime string
    priority: int = Field(ge=1, le=4, default=2)
    operational_status: str = "ON_TIME"
    notes: str = ""


class ResourceAvailability(BaseModel):
    """Resource availability schedule."""
    available: bool
    available_from: Optional[str] = None
    available_until: Optional[str] = None
    base_section: Optional[str] = None
    unavailability_reason: Optional[str] = None


class Resource(BaseModel):
    """Represents a maintenance resource."""
    resource_id: str
    resource_type: str
    department: str
    availability: ResourceAvailability
    location: str
    capacity: int = 1
    description: str = ""


class CompatibilityRule(BaseModel):
    """Department compatibility rule for block sharing."""
    rule_id: str
    department_a: str
    department_b: str
    compatible: bool
    required_conditions: List[str] = []
    safety_constraints: List[str] = []
    notes: str = ""


class OptimizationConfig(BaseModel):
    """Configuration for the optimization engine."""
    w_maintenance: float = Field(default=2.0, description="Maintenance benefit weight")
    w_risk: float = Field(default=1.5, description="Risk reduction weight")
    w_possession: float = Field(default=0.5, description="Additional possession penalty per minute")
    w_disruption: float = Field(default=3.0, description="Train disruption penalty")
    w_resource: float = Field(default=5.0, description="Resource conflict penalty")
    w_future: float = Field(default=1.0, description="Future opportunity loss weight")
    zero_possession_bonus: float = Field(default=5.0, description="Bonus for zero additional possession")
    lookahead_depth: int = Field(default=3, description="Number of future blocks to consider")
    flexibility_threshold: float = Field(default=0.3, description="Below this, task gets protection bonus")
    flexibility_protection_bonus: float = Field(default=3.0, description="Bonus applied to low-flex tasks")
    train_safety_buffer_minutes: int = Field(default=10, description="Safety buffer around train times")
    random_seed: int = Field(default=42, description="Fixed seed for determinism")


class TaskDecision(BaseModel):
    """Decision made for a single task in the optimization."""
    task_id: str
    status: str  # SELECTED, REJECTED, DEFERRED, PROTECTED
    assigned_block: Optional[str] = None
    reason: str = ""
    score: float = 0.0
    additional_possession: int = 0


class BlockAssignment(BaseModel):
    """Optimized assignment for a single block."""
    block_id: str
    selected_tasks: List[str] = []
    rejected_tasks: List[str] = []
    deferred_tasks: List[str] = []
    protected_tasks: List[str] = []
    block_value: float = 0.0
    additional_possession: int = 0
    opportunity_cost: float = 0.0
    remaining_capacity: int = 0
    zero_possession: bool = True
    explanations: Dict[str, TaskDecision] = {}
    combination_details: Dict[str, Any] = {}


class OptimizationSummary(BaseModel):
    """Summary statistics for the optimization run."""
    total_tasks: int = 0
    pending_tasks: int = 0
    planned_tasks: int = 0
    deferred_tasks: int = 0
    protected_tasks: int = 0
    rejected_tasks: int = 0
    total_additional_possession: int = 0
    total_block_value: float = 0.0
    zero_possession_blocks: int = 0
    blocks_with_assignments: int = 0
    avg_block_utilization: float = 0.0


class OptimizedPlan(BaseModel):
    """The complete optimized block plan."""
    plan_id: str
    generated_at: str
    config: OptimizationConfig
    block_assignments: List[BlockAssignment] = []
    task_decisions: Dict[str, TaskDecision] = {}
    summary: OptimizationSummary = OptimizationSummary()


class OpportunityNode(BaseModel):
    """Node in the opportunity graph."""
    task_id: str
    department: str
    duration: int
    maintenance_debt: float
    flexibility_score: float
    feasible: bool = True
    rejection_reason: str = ""


class OpportunityEdge(BaseModel):
    """Edge in the opportunity graph (compatible pair)."""
    source_task_id: str
    target_task_id: str
    compatible: bool
    compatibility_reason: str = ""
    incompatibility_reason: str = ""


class TaskCombination(BaseModel):
    """A feasible combination of tasks for a block."""
    tasks: List[str]
    total_duration: int
    remaining_after: int
    additional_possession: int
    base_value: float
    adjusted_value: float
    zero_possession: bool


class OpportunityAnalysis(BaseModel):
    """Opportunity analysis for a single block."""
    block_id: str
    section: str
    duration: int
    remaining_capacity: int
    feasible_tasks: List[str] = []
    infeasible_tasks: List[Dict[str, str]] = []
    opportunity_graph: Dict[str, Any] = {}
    compatible_combinations: List[TaskCombination] = []
    best_combination: Optional[TaskCombination] = None
    explanations: Dict[str, str] = {}


class WhatIfModification(BaseModel):
    """A single field modification for what-if analysis."""
    task_id: Optional[str] = None
    block_id: Optional[str] = None
    field: str
    value: Any


class WhatIfRequest(BaseModel):
    """Request for what-if scenario analysis."""
    scenario_name: str = "Custom Scenario"
    task_modifications: List[WhatIfModification] = []
    block_modifications: List[WhatIfModification] = []
    config: Optional[OptimizationConfig] = None


class WhatIfComparison(BaseModel):
    """Before/after comparison for what-if."""
    block_id: str
    before_tasks: List[str] = []
    after_tasks: List[str] = []
    before_value: float = 0.0
    after_value: float = 0.0
    changed: bool = False
    explanation: str = ""


class WhatIfResult(BaseModel):
    """Result of what-if analysis."""
    scenario_name: str
    baseline_plan: OptimizedPlan
    modified_plan: OptimizedPlan
    changed_assignments: List[WhatIfComparison] = []
    summary_delta: Dict[str, Any] = {}



# =============================================================================
# Dynamic Re-planning Models
# =============================================================================

class ReplanTaskInput(BaseModel):
    """New task to inject for dynamic re-planning."""
    task_id: str = Field(description="Unique task ID (must not already exist)")
    asset_id: str = "ASSET-NEW"
    asset_type: str = "Track"
    corridor: str
    section: str
    location: str = ""
    department: str
    task_type: str
    duration: int = Field(ge=5, le=300, description="Duration in minutes")
    severity: int = Field(ge=1, le=5, default=5)
    criticality: int = Field(ge=1, le=5, default=5)
    due_date: str = ""
    days_overdue: int = 0
    previous_deferrals: int = 0
    required_resources: List[str] = []
    compatible_departments: List[str] = []
    safety_requirements: List[str] = []
    preferred_time_window: str = "22:00-06:00"
    notes: str = "Injected via dynamic re-planning"


class ChangedDecision(BaseModel):
    """A task decision that changed between before and after replanning."""
    task_id: str
    before_status: str
    after_status: str
    before_block: Optional[str] = None
    after_block: Optional[str] = None
    before_reason: str = ""
    after_reason: str = ""


class ReplanResult(BaseModel):
    """Result of a dynamic re-planning run."""
    replan_id: str
    generated_at: str
    added_task: MaintenanceTask
    before_plan: OptimizedPlan
    after_plan: OptimizedPlan
    changed_decisions: List[ChangedDecision] = []
    new_task_decision: Optional[TaskDecision] = None
    summary_delta: Dict[str, Any] = {}
    narrative: str = ""


# =============================================================================
# Asset Availability Models
# =============================================================================

class AssetAvailabilityEstimate(BaseModel):
    """
    Prototype estimate of asset availability.

    DISCLAIMER: This is a RAILFUSE prototype-level estimate based on
    maintenance debt and outstanding tasks. It is NOT an official Indian
    Railways asset health or availability metric.
    """
    asset_id: str
    asset_type: str
    section: str
    department: str
    availability_pct: float = Field(description="Estimated availability 0-100%")
    maintenance_debt: float
    outstanding_critical_tasks: int
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    notes: str = ""
    disclaimer: str = (
        "Prototype Asset Availability Estimate — RAILFUSE SIH 2026. "
        "Not an official Indian Railways metric."
    )


# =============================================================================
# Weekly Planning Models
# =============================================================================

class DayPlan(BaseModel):
    """Optimized plan for a single calendar day."""
    date: str  # YYYY-MM-DD
    day_name: str  # Monday, Tuesday, etc.
    blocks: List[str] = []           # block_ids on this day
    planned_tasks: List[str] = []    # task_ids planned
    deferred_tasks: List[str] = []   # task_ids deferred
    total_capacity_minutes: int = 0
    used_capacity_minutes: int = 0
    block_utilization_pct: float = 0.0
    additional_possession_minutes: int = 0
    zero_possession_blocks: int = 0
    departments_covered: List[str] = []
    block_value: float = 0.0


class WeeklyPlan(BaseModel):
    """Optimized plan across a 7-day horizon."""
    plan_id: str
    generated_at: str
    horizon_start: str
    horizon_end: str
    days: List[DayPlan] = []
    full_plan: OptimizedPlan
    total_tasks_planned: int = 0
    total_tasks_deferred: int = 0
    total_block_utilization_pct: float = 0.0
    total_additional_possession: int = 0
    disclaimer: str = (
        "RAILFUSE Weekly Plan — Synthetic demonstration data only. "
        "Not connected to live Indian Railways systems."
    )


class DashboardStats(BaseModel):
    """Stats for the command center dashboard."""
    total_tasks: int = 0
    pending_tasks: int = 0
    planned_tasks: int = 0
    deferred_tasks: int = 0
    protected_tasks: int = 0
    available_blocks: int = 0
    avg_maintenance_debt: float = 0.0
    avg_flexibility_score: float = 0.0
    block_utilization_pct: float = 0.0
    additional_possession_avoided_minutes: int = 0
    train_movements_total: int = 0
    high_debt_tasks: int = 0
    low_flexibility_tasks: int = 0
    optimization_run: bool = False
    last_optimized_at: Optional[str] = None
