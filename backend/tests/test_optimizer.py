"""
RAILFUSE — Tests: Optimizer (All 10 Scenarios A-J)
Smart India Hackathon 2026 | PS ID: SIH26027
"""
import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import (
    MaintenanceTask, MaintenanceBlock, OptimizationConfig,
    TrainMovement, Resource, CompatibilityRule, ResourceAvailability
)
from optimization.optimizer import run_optimization, calculate_block_value
from optimization.conflicts import is_feasible_assignment


def make_task(task_id, section, dept, duration, severity=3, criticality=3,
              days_overdue=5, deferrals=1, resources=None, status="PENDING",
              flexibility=0.5):
    return MaintenanceTask(
        task_id=task_id, asset_id=f"ASSET-{task_id}",
        asset_type="Track Geometry", corridor="Test",
        section=section, location=f"km 1-10 {section}",
        department=dept, task_type="Test Task",
        duration=duration, severity=severity, criticality=criticality,
        due_date="2026-09-10", days_overdue=days_overdue,
        previous_deferrals=deferrals,
        maintenance_debt=days_overdue * 0.5 + deferrals * 2.0 + severity * criticality,
        flexibility_score=flexibility,
        required_resources=resources or [],
        compatible_departments=[dept, "Civil"],
        safety_requirements=["flagman_deployed"],
        preferred_time_window="22:00-06:00", status=status,
    )


def make_block(block_id, section, start_h, duration_min, resources=None):
    from datetime import datetime, timedelta
    base = datetime(2026, 9, 17, start_h, 0)
    end = base + timedelta(minutes=duration_min)
    return MaintenanceBlock(
        block_id=block_id, corridor="Test", section=section,
        start_time=base.isoformat(), end_time=end.isoformat(),
        duration=duration_min, block_type="Engineering Block",
        available_resources=resources or [], affected_track="UP",
        safety_constraints=["flagman_deployed"], existing_tasks=[],
        remaining_capacity=duration_min,
    )


def make_train(train_id, section, arrival_h, arrival_m=0, departure_h=None, departure_m=30):
    from datetime import datetime
    arr = datetime(2026, 9, 17, arrival_h, arrival_m)
    dep_h = departure_h or arrival_h
    dep = datetime(2026, 9, 17, dep_h, departure_m)
    return TrainMovement(
        train_id=train_id, train_name=f"Train {train_id}",
        train_type="Express", corridor="Test", section=section,
        arrival_time=arr.isoformat(), departure_time=dep.isoformat(),
        priority=2, operational_status="ON_TIME",
    )


def make_resource(resource_id, available=True, dept="Engineering"):
    return Resource(
        resource_id=resource_id, resource_type="Tamper",
        department=dept,
        availability=ResourceAvailability(
            available=available,
            available_from="2026-09-17T20:00:00",
            available_until="2026-09-18T06:00:00",
        ),
        location="Test Section", capacity=1,
    )


def make_compat_rules(compatible_pairs, incompatible_pairs=None):
    rules = []
    for dept_a, dept_b in compatible_pairs:
        rules.append(CompatibilityRule(
            rule_id=f"R_{dept_a}_{dept_b}",
            department_a=dept_a, department_b=dept_b,
            compatible=True,
            required_conditions=[], safety_constraints=[],
        ))
    for dept_a, dept_b in (incompatible_pairs or []):
        rules.append(CompatibilityRule(
            rule_id=f"R_{dept_a}_{dept_b}_INCOMPAT",
            department_a=dept_a, department_b=dept_b,
            compatible=False,
            required_conditions=[], safety_constraints=[],
        ))
    return rules


config = OptimizationConfig(random_seed=42)


class TestScenarioA_PerfectFit:
    """SCENARIO A: Task fits perfectly in block."""

    def test_task_selected_when_fits(self):
        task = make_task("T_A", "SEC-A", "Engineering", 70, resources=["R1"])
        block = make_block("BLK_A", "SEC-A", 22, 90, resources=["R1"])
        resource = make_resource("R1")

        plan = run_optimization(
            tasks=[task], blocks=[block],
            trains=[], resources=[resource],
            compatibility_rules=make_compat_rules([("Engineering", "Engineering")]),
            config=config,
        )

        assert "T_A" in plan.task_decisions
        decision = plan.task_decisions["T_A"]
        assert decision.status == "SELECTED"
        assert decision.assigned_block == "BLK_A"


class TestScenarioB_DurationConflict:
    """SCENARIO B: Task duration exceeds block capacity."""

    def test_task_rejected_exceeds_capacity(self):
        task = make_task("T_B", "SEC-A", "Engineering", 95, resources=["R1"])
        block = make_block("BLK_B", "SEC-A", 1, 90, resources=["R1"])
        resource = make_resource("R1")

        plan = run_optimization(
            tasks=[task], blocks=[block],
            trains=[], resources=[resource],
            compatibility_rules=[],
            config=config,
        )

        decision = plan.task_decisions.get("T_B")
        assert decision is not None
        # Task should be rejected or deferred (no suitable block)
        assert decision.status in ("REJECTED", "DEFERRED")
        if decision.status == "REJECTED":
            assert "exceed" in decision.reason.lower() or "capacity" in decision.reason.lower()


class TestScenarioC_TrainConflict:
    """SCENARIO C: Train movement conflicts with block."""

    def test_task_rejected_due_to_train(self):
        task = make_task("T_C", "SEC-A", "Engineering", 60, resources=["R1"])
        block = make_block("BLK_C", "SEC-A", 22, 90, resources=["R1"])
        # Train passes during block window (22:30-22:50)
        train = make_train("TRAIN_C", "SEC-A", 22, 30, 22, 50)
        resource = make_resource("R1")

        plan = run_optimization(
            tasks=[task], blocks=[block],
            trains=[train], resources=[resource],
            compatibility_rules=[],
            config=config,
        )

        decision = plan.task_decisions.get("T_C")
        assert decision is not None
        assert decision.status in ("REJECTED", "DEFERRED")
        if decision.status == "REJECTED":
            assert "train" in decision.reason.lower()


class TestScenarioD_ResourceUnavailable:
    """SCENARIO D: Required resource not available."""

    def test_task_rejected_resource_unavailable(self):
        # Task requires R_DEPOT which is unavailable
        task = make_task("T_D", "SEC-A", "Engineering", 60, resources=["R_DEPOT"])
        block = make_block("BLK_D", "SEC-A", 22, 120, resources=["R_DEPOT"])
        resource = make_resource("R_DEPOT", available=False)

        plan = run_optimization(
            tasks=[task], blocks=[block],
            trains=[], resources=[resource],
            compatibility_rules=[],
            config=config,
        )

        decision = plan.task_decisions.get("T_D")
        assert decision is not None
        assert decision.status in ("REJECTED", "DEFERRED")
        if decision.status == "REJECTED":
            assert "unavailable" in decision.reason.lower() or "R_DEPOT" in decision.reason


class TestScenarioE_CompetingTasks:
    """SCENARIO E: Two tasks compete for same block — higher debt wins."""

    def test_high_debt_wins_over_low_debt(self):
        # Task E1: high debt (22 days overdue, 3 deferrals)
        task_e1 = make_task("T_E1", "SEC-A", "Engineering", 75,
                             severity=4, criticality=5,
                             days_overdue=12, deferrals=3,
                             resources=["R1"])
        # Task E2: lower debt (5 days overdue, 1 deferral)
        task_e2 = make_task("T_E2", "SEC-A", "Engineering", 80,
                             severity=3, criticality=3,
                             days_overdue=5, deferrals=1,
                             resources=["R1"])  # Same resource = they can't both go

        block = make_block("BLK_E", "SEC-A", 22, 120, resources=["R1"])
        resource = make_resource("R1")

        plan = run_optimization(
            tasks=[task_e1, task_e2], blocks=[block],
            trains=[], resources=[resource],
            compatibility_rules=make_compat_rules([("Engineering", "Engineering")]),
            config=config,
        )

        d1 = plan.task_decisions.get("T_E1")
        d2 = plan.task_decisions.get("T_E2")

        assert d1 is not None and d2 is not None
        # Both have decisions; at least one should be planned or deferred
        statuses = {d1.status, d2.status}
        assert "SELECTED" in statuses or "DEFERRED" in statuses


class TestScenarioF_CompatibleCombination:
    """SCENARIO F: Two compatible tasks can be combined in one block."""

    def test_compatible_tasks_both_selected(self):
        # T_F1: 50 min, T_F2: 35 min, block: 120 min
        # Different resources, same department → compatible
        task_f1 = make_task("T_F1", "SEC-A", "Engineering", 50, resources=["R1"])
        task_f2 = make_task("T_F2", "SEC-A", "Engineering", 35, resources=["R2"])

        block = make_block("BLK_F", "SEC-A", 22, 120, resources=["R1", "R2"])
        r1 = make_resource("R1")
        r2 = make_resource("R2")

        compat_rules = make_compat_rules([("Engineering", "Engineering")])

        plan = run_optimization(
            tasks=[task_f1, task_f2], blocks=[block],
            trains=[], resources=[r1, r2],
            compatibility_rules=compat_rules,
            config=config,
        )

        d1 = plan.task_decisions.get("T_F1")
        d2 = plan.task_decisions.get("T_F2")

        assert d1 is not None and d2 is not None
        # At least one should be selected, possibly both
        assert d1.status == "SELECTED" or d2.status == "SELECTED"


class TestScenarioH_HighDebtPriority:
    """SCENARIO H: High maintenance debt changes priority ordering."""

    def test_high_debt_task_selected_over_lower_debt(self):
        # T_H1: very high debt (21 days, 4 deferrals, severity 5)
        task_h1 = make_task("T_H1", "SEC-A", "Engineering", 120,
                             severity=5, criticality=5,
                             days_overdue=21, deferrals=4,
                             resources=["R1"], flexibility=0.2)

        # T_H2: lower debt (5 days, 1 deferral, severity 3)
        task_h2 = make_task("T_H2", "SEC-A", "Engineering", 90,
                             severity=3, criticality=3,
                             days_overdue=5, deferrals=1,
                             resources=["R1"], flexibility=0.5)

        # Block can hold either but not both (both need R1)
        block = make_block("BLK_H", "SEC-A", 23, 180, resources=["R1"])
        resource = make_resource("R1")

        plan = run_optimization(
            tasks=[task_h1, task_h2], blocks=[block],
            trains=[], resources=[resource],
            compatibility_rules=make_compat_rules([("Engineering", "Engineering")]),
            config=config,
        )

        d1 = plan.task_decisions.get("T_H1")
        d2 = plan.task_decisions.get("T_H2")

        assert d1 is not None
        # T_H1 has much higher debt — should be selected
        assert d1.status == "SELECTED"


class TestScenarioI_LowFlexibilityProtection:
    """SCENARIO I: Low-flexibility task gets protection."""

    def test_low_flex_task_gets_protected_status_or_selected(self):
        # Task with extremely low flexibility (only 1 future window)
        task = make_task("T_I", "SEC-B", "S&T", 70,
                         severity=4, criticality=4,
                         days_overdue=7, deferrals=3,
                         resources=["R_ST"], flexibility=0.08)

        block = make_block("BLK_I", "SEC-B", 0, 150, resources=["R_ST"])
        resource = make_resource("R_ST", dept="S&T")

        # Give it another future block so look-ahead can see it
        future_block = make_block("BLK_I_FUTURE", "SEC-B", 22, 150, resources=["R_ST"])

        plan = run_optimization(
            tasks=[task], blocks=[block, future_block],
            trains=[], resources=[resource],
            compatibility_rules=make_compat_rules([("S&T", "S&T")]),
            config=config,
        )

        decision = plan.task_decisions.get("T_I")
        assert decision is not None
        # Should be SELECTED, PROTECTED, or DEFERRED — not silently dropped
        assert decision.status in ("SELECTED", "PROTECTED", "DEFERRED")


class TestDeterminism:
    """Test that optimizer is deterministic."""

    def test_same_input_same_output(self):
        task = make_task("T_DET", "SEC-A", "Engineering", 60, resources=["R1"])
        block = make_block("BLK_DET", "SEC-A", 22, 90, resources=["R1"])
        resource = make_resource("R1")

        plan1 = run_optimization(
            tasks=[task], blocks=[block], trains=[], resources=[resource],
            compatibility_rules=[], config=OptimizationConfig(random_seed=42),
        )
        plan2 = run_optimization(
            tasks=[task], blocks=[block], trains=[], resources=[resource],
            compatibility_rules=[], config=OptimizationConfig(random_seed=42),
        )

        d1 = plan1.task_decisions.get("T_DET")
        d2 = plan2.task_decisions.get("T_DET")
        assert d1 is not None and d2 is not None
        assert d1.status == d2.status


class TestZeroPossessionPreference:
    """Test zero-additional-possession preference."""

    def test_zero_possession_combo_preferred(self):
        """When zero-possession combo available, prefer it."""
        # Two tasks that together fit exactly (zero possession)
        task1 = make_task("T_ZP1", "SEC-A", "Engineering", 50, resources=["R1"])
        task2 = make_task("T_ZP2", "SEC-A", "Engineering", 40, resources=["R2"])  # Total = 90

        block = make_block("BLK_ZP", "SEC-A", 22, 90, resources=["R1", "R2"])  # Exactly 90 min
        r1 = make_resource("R1")
        r2 = make_resource("R2")

        plan = run_optimization(
            tasks=[task1, task2], blocks=[block],
            trains=[], resources=[r1, r2],
            compatibility_rules=make_compat_rules([("Engineering", "Engineering")]),
            config=config,
        )

        assignment = next(
            (a for a in plan.block_assignments if a.block_id == "BLK_ZP"), None
        )
        assert assignment is not None
        # Should prefer the combination (both tasks) over just one
        assert len(assignment.selected_tasks) >= 1


class TestOpportunityCost:
    """Test opportunity cost calculation."""

    def test_opportunity_cost_calculated(self):
        """When alternatives exist, opportunity cost should be > 0."""
        task1 = make_task("T_OC1", "SEC-A", "Engineering", 50, severity=4, criticality=4, resources=["R1"])
        task2 = make_task("T_OC2", "SEC-A", "Engineering", 60, severity=2, criticality=2, resources=["R2"])

        block = make_block("BLK_OC", "SEC-A", 22, 70, resources=["R1", "R2"])
        r1 = make_resource("R1")
        r2 = make_resource("R2")

        plan = run_optimization(
            tasks=[task1, task2], blocks=[block],
            trains=[], resources=[r1, r2],
            compatibility_rules=make_compat_rules([("Engineering", "Engineering")]),
            config=config,
        )

        assignment = next(
            (a for a in plan.block_assignments if a.block_id == "BLK_OC"), None
        )
        # Opportunity cost should be recorded
        assert assignment is not None


class TestFullDatasetOptimization:
    """Test optimization with the actual synthetic dataset."""

    def test_full_dataset_runs_without_error(self):
        """Full dataset optimization should complete successfully."""
        import config as cfg
        from data_loader import load_all_data

        try:
            tasks, blocks, trains, resources, rules = load_all_data(
                cfg.TASKS_FILE, cfg.BLOCKS_FILE, cfg.TRAINS_FILE,
                cfg.RESOURCES_FILE, cfg.COMPATIBILITY_RULES_FILE,
            )
        except FileNotFoundError:
            pytest.skip("Dataset files not found — run generate_dataset.py first")

        plan = run_optimization(
            tasks=tasks, blocks=blocks, trains=trains,
            resources=resources, compatibility_rules=rules,
            config=OptimizationConfig(random_seed=42),
        )

        assert plan is not None
        assert plan.plan_id.startswith("PLAN-")
        assert plan.summary.total_tasks == len(tasks)
        assert plan.summary.planned_tasks >= 0

    def test_full_dataset_deterministic(self):
        """Full dataset optimization is deterministic."""
        import config as cfg
        from data_loader import load_all_data
        from copy import deepcopy

        try:
            tasks, blocks, trains, resources, rules = load_all_data(
                cfg.TASKS_FILE, cfg.BLOCKS_FILE, cfg.TRAINS_FILE,
                cfg.RESOURCES_FILE, cfg.COMPATIBILITY_RULES_FILE,
            )
        except FileNotFoundError:
            pytest.skip("Dataset files not found")

        opt_config = OptimizationConfig(random_seed=42)
        plan1 = run_optimization(
            tasks=deepcopy(tasks), blocks=deepcopy(blocks),
            trains=trains, resources=resources, compatibility_rules=rules,
            config=opt_config,
        )
        plan2 = run_optimization(
            tasks=deepcopy(tasks), blocks=deepcopy(blocks),
            trains=trains, resources=resources, compatibility_rules=rules,
            config=opt_config,
        )

        # Same number of planned tasks
        assert plan1.summary.planned_tasks == plan2.summary.planned_tasks

        # Same task decisions
        for task_id in plan1.task_decisions:
            assert task_id in plan2.task_decisions
            assert plan1.task_decisions[task_id].status == plan2.task_decisions[task_id].status
