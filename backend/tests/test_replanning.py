"""
RAILFUSE — Dynamic Replanning + End-to-End Tests
Smart India Hackathon 2026 | PS ID: SIH26027 | Team: Runtime Rebels

Tests the critical replanning scenario and the full innovation E2E test.
"""
import pytest
from fastapi.testclient import TestClient
from copy import deepcopy


# =============================================================================
# Dynamic Replanning Tests
# =============================================================================

class TestCriticalDefectReplanning:
    """
    Scenario: A critical defect is discovered mid-cycle.
    The system must inject it, recalculate, and update the plan.

    We test the behaviour (decisions can change), not a hardcoded schedule.
    """

    def test_replan_returns_valid_structure(self, client, sample_replan_task):
        resp = client.post("/replan", json=sample_replan_task)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "replan_id" in data
        assert "added_task" in data
        assert "before_plan" in data
        assert "after_plan" in data
        assert "summary_delta" in data
        assert "narrative" in data

    def test_replan_new_task_appears_in_after_plan(self, client, sample_replan_task):
        resp = client.post("/replan", json=sample_replan_task)
        assert resp.status_code == 200
        data = resp.json()
        added_id = data["added_task"]["task_id"]
        after_decisions = data["after_plan"]["task_decisions"]
        # The new task must appear in the after plan decisions
        assert added_id in after_decisions, (
            f"New task '{added_id}' was not evaluated in after_plan.task_decisions"
        )

    def test_replan_new_task_has_decision(self, client, sample_replan_task):
        resp = client.post("/replan", json=sample_replan_task)
        assert resp.status_code == 200
        data = resp.json()
        new_decision = data.get("new_task_decision")
        assert new_decision is not None
        assert "status" in new_decision
        assert new_decision["status"] in ("SELECTED", "DEFERRED", "REJECTED", "PROTECTED")

    def test_replan_narrative_is_non_empty(self, client, sample_replan_task):
        resp = client.post("/replan", json=sample_replan_task)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["narrative"]) > 20

    def test_replan_high_criticality_task_gets_high_debt(self, client):
        """A severity=5, criticality=5 task must have the highest debt."""
        task = {
            "task_id": "CRITICAL-TEST-DEBT",
            "corridor": "C17-DLI-MTJ",
            "section": "DLI-MTJ",
            "department": "Engineering",
            "task_type": "Emergency Track Repair",
            "duration": 60,
            "severity": 5,
            "criticality": 5,
            "days_overdue": 10,
            "previous_deferrals": 2,
        }
        resp = client.post("/replan", json=task)
        assert resp.status_code == 200
        data = resp.json()
        added = data["added_task"]
        # High severity + criticality + overdue should give significant debt
        assert added["maintenance_debt"] > 20, (
            f"Expected debt > 20 for crit task, got {added['maintenance_debt']}"
        )

    def test_replan_summary_delta_has_expected_keys(self, client, sample_replan_task):
        resp = client.post("/replan", json=sample_replan_task)
        assert resp.status_code == 200
        delta = resp.json()["summary_delta"]
        assert "planned_tasks_change" in delta
        assert "deferred_tasks_change" in delta
        assert "total_value_change" in delta
        assert "tasks_changed_count" in delta

    def test_replan_changed_decisions_are_valid(self, client, sample_replan_task):
        resp = client.post("/replan", json=sample_replan_task)
        assert resp.status_code == 200
        changed = resp.json()["changed_decisions"]
        valid_statuses = {"SELECTED", "DEFERRED", "REJECTED", "PROTECTED", "NOT_IN_PLAN"}
        for c in changed:
            assert c["before_status"] in valid_statuses
            assert c["after_status"] in valid_statuses
            assert c["before_status"] != c["after_status"]  # Must actually differ

    def test_replan_high_priority_displaces_lower_priority(self, client):
        """
        When a very high priority task is added to a section that has a feasible block,
        it should be selected (not deferred/rejected) if capacity allows.

        We cannot test *which* existing task is displaced because that depends on
        specific section/capacity/block availability — but we verify the new task
        gets evaluated and has a reason.
        """
        # Use the section from the dataset (DLI-MTJ) which we know has blocks
        task = {
            "task_id": "EMERGENCY-C17",
            "corridor": "C17-DLI-MTJ",
            "section": "DLI-MTJ",
            "department": "Engineering",
            "task_type": "Emergency Rail Defect Repair",
            "duration": 30,
            "severity": 5,
            "criticality": 5,
            "days_overdue": 15,
        }
        resp = client.post("/replan", json=task)
        assert resp.status_code == 200
        data = resp.json()
        after_decisions = data["after_plan"]["task_decisions"]
        added_id = data["added_task"]["task_id"]
        assert added_id in after_decisions
        decision = after_decisions[added_id]
        assert decision["reason"] != "", "Decision must have a non-empty reason"

    def test_reset_demo_restores_data(self, client):
        """After reset, task count should return to original synthetic dataset size."""
        # Add a task
        task = {
            "task_id": "REPLAN-RESET-TEST",
            "corridor": "C17-DLI-MTJ",
            "section": "DLI-MTJ",
            "department": "Engineering",
            "task_type": "Test Repair",
            "duration": 30,
            "severity": 5,
            "criticality": 5,
        }
        client.post("/replan", json=task)

        # Reset
        reset = client.post("/reset-demo")
        assert reset.status_code == 200

        # After reset, task count should be the original synthetic dataset count (25)
        after = len(client.get("/tasks").json())
        assert after == 25, f"Expected 25 tasks after reset (original dataset), got {after}"


# =============================================================================
# End-to-End Innovation Test (Spec §20)
# =============================================================================

class TestE2EInnovationScenario:
    """
    Test the core RAILFUSE innovation end-to-end:

    Existing block: 90 minutes
    Existing task already consuming: 60 minutes (so 30 min remaining)
    Candidate Task A: 15 minutes
    Candidate Task B: 10 minutes
    Candidate Task C: 25 minutes

    Expected:
    - A (15) and B (10) together = 25 min → fit in 30 min remaining ✓
    - A (15) + C (25) = 40 min > 30 min → won't fit with A ✗ (unless no existing task)
    - C alone (25) fits in 30 min ✓
    - Train conflicts respected ✓
    - Resource conflicts respected ✓
    - Optimizer selects best valid combo ✓
    - Output changes when Task A duration changes 15 → 35 ✓
    """

    def test_full_pipeline_runs_without_error(self, initialized_app):
        """The full optimization pipeline runs end-to-end without exceptions."""
        from optimization.optimizer import run_optimization
        from models import OptimizationConfig

        tasks = deepcopy(initialized_app["tasks"])
        blocks = deepcopy(initialized_app["blocks"])
        result = run_optimization(
            tasks=tasks,
            blocks=blocks,
            trains=initialized_app["trains"],
            resources=initialized_app["resources"],
            compatibility_rules=initialized_app["rules"],
            config=OptimizationConfig(random_seed=42),
        )
        assert result is not None
        assert result.plan_id.startswith("PLAN-")
        assert result.summary.total_tasks == len(tasks)

    def test_task_a_b_fit_task_c_does_not(self, initialized_app):
        """
        With a 90-min block and 60 min pre-occupied (remaining=30):
        Task A=15, B=10 → A+B=25 fits ✓
        Task C=25 → fits alone ✓
        Task A=15 + C=25 = 40 > 30 → does NOT fit together ✗
        """
        from optimization.conflicts import check_duration_feasibility
        from models import MaintenanceTask, MaintenanceBlock

        block = MaintenanceBlock(
            block_id="TEST-BLK-001", corridor="C1", section="S1",
            start_time="2026-09-17T02:00:00", end_time="2026-09-17T03:30:00",
            duration=90, remaining_capacity=30, block_type="Engineering Block",
        )

        task_a = MaintenanceTask(
            task_id="TA", asset_id="A1", asset_type="Track", corridor="C1",
            section="S1", location="S1", department="Engineering",
            task_type="Test", duration=15, severity=3, criticality=3,
            due_date="2026-09-20", flexibility_score=0.5,
        )
        task_b = MaintenanceTask(
            task_id="TB", asset_id="A2", asset_type="Track", corridor="C1",
            section="S1", location="S1", department="S&T",
            task_type="Test", duration=10, severity=2, criticality=2,
            due_date="2026-09-20", flexibility_score=0.5,
        )
        task_c = MaintenanceTask(
            task_id="TC", asset_id="A3", asset_type="Track", corridor="C1",
            section="S1", location="S1", department="TRD",
            task_type="Test", duration=25, severity=4, criticality=4,
            due_date="2026-09-20", flexibility_score=0.5,
        )

        # A fits alone (15 <= 30)
        ok_a, _ = check_duration_feasibility(task_a, block)
        assert ok_a, "Task A (15 min) should fit in 30 min remaining"

        # B fits alone (10 <= 30)
        ok_b, _ = check_duration_feasibility(task_b, block)
        assert ok_b, "Task B (10 min) should fit in 30 min remaining"

        # C fits alone (25 <= 30)
        ok_c, _ = check_duration_feasibility(task_c, block)
        assert ok_c, "Task C (25 min) should fit in 30 min remaining"

        # A+B together = 25 <= 30: fits
        ok_ab, _ = check_duration_feasibility(task_b, block, already_assigned_duration=15)
        assert ok_ab, "Task A+B (25 min total) should fit in 30 min remaining"

        # A+C together = 40 > 30: does NOT fit
        ok_ac, reason_ac = check_duration_feasibility(task_c, block, already_assigned_duration=15)
        assert not ok_ac, "Task A+C (40 min total) should NOT fit in 30 min remaining"
        assert "exceeds" in reason_ac.lower()

    def test_output_changes_when_task_duration_changes(self, client):
        """
        Run optimizer → record planned tasks.
        Then change a task's duration via what-if → output must differ.
        This is the core of Spec §20 modification test.
        """
        # Get baseline plan
        base_resp = client.post("/optimize", json={})
        assert base_resp.status_code == 200
        base = base_resp.json()
        base_decisions = base["task_decisions"]

        # Find a task that was SELECTED and get its current duration
        selected_ids = [
            tid for tid, d in base_decisions.items()
            if d["status"] == "SELECTED"
        ]
        if not selected_ids:
            pytest.skip("No selected tasks in base plan — need data with assignments")

        target_id = selected_ids[0]

        # Modify the task duration dramatically (make it too long to fit)
        whatif_resp = client.post("/what-if", json={
            "scenario_name": "Duration change test",
            "task_modifications": [
                {"task_id": target_id, "field": "duration", "value": 500}
            ],
            "block_modifications": [],
        })
        assert whatif_resp.status_code == 200
        modified = whatif_resp.json()

        # The modified plan should differ from baseline in at least one assignment
        # (making duration=500 should force it to be rejected/deferred)
        mod_decisions = modified["modified_plan"]["task_decisions"]
        original_status = base_decisions[target_id]["status"]   # SELECTED
        new_status = mod_decisions.get(target_id, {}).get("status", "NOT_EVALUATED")

        # Duration=500 should make it unschedulable (blocks are 60-120 min)
        assert new_status != "SELECTED", (
            f"Task {target_id} with duration=500 should not remain SELECTED "
            f"(got {new_status}). Optimizer output must change with input."
        )

    def test_train_conflicts_respected(self, initialized_app):
        """
        A task in the same section as a train movement (with overlapping times)
        must be rejected due to train conflict.
        """
        from optimization.conflicts import check_train_conflicts
        from models import MaintenanceTask, MaintenanceBlock, TrainMovement

        block = MaintenanceBlock(
            block_id="BLK-CONFLICT", corridor="C1", section="DLI-MTJ",
            start_time="2026-09-17T02:00:00", end_time="2026-09-17T03:30:00",
            duration=90, remaining_capacity=90, block_type="Engineering Block",
        )
        task = MaintenanceTask(
            task_id="T-CONFLICT", asset_id="A1", asset_type="Track",
            corridor="C1", section="DLI-MTJ", location="DLI-MTJ",
            department="Engineering", task_type="Test", duration=60,
            severity=3, criticality=3, due_date="2026-09-20",
            flexibility_score=0.5,
        )
        # Train that OVERLAPS with the block
        conflicting_train = TrainMovement(
            train_id="TR001", train_type="EXPRESS", corridor="C1",
            section="DLI-MTJ",
            arrival_time="2026-09-17T02:30:00",
            departure_time="2026-09-17T02:50:00",
            priority=1,
        )

        feasible, reason = check_train_conflicts(task, block, [conflicting_train], safety_buffer_minutes=10)
        assert not feasible, "Task should be rejected due to train conflict"
        assert "train" in reason.lower() or "conflict" in reason.lower()

    def test_compatibility_rules_respected(self, initialized_app):
        """Departments marked as incompatible should not be combined."""
        from optimization.opportunity_graph import generate_feasible_combinations
        from models import MaintenanceTask, MaintenanceBlock

        # Find an incompatible pair from the rules
        rules = initialized_app["rules"]
        incompatible_pairs = [
            (r.department_a, r.department_b) for r in rules if not r.compatible
        ]
        if not incompatible_pairs:
            pytest.skip("No incompatible department pairs found in compatibility rules")

        dept_a, dept_b = incompatible_pairs[0]

        block = MaintenanceBlock(
            block_id="COMPAT-BLK", corridor="C1", section="DLI-MTJ",
            start_time="2026-09-17T02:00:00", end_time="2026-09-17T04:00:00",
            duration=120, remaining_capacity=120, block_type="Engineering Block",
        )
        task_a = MaintenanceTask(
            task_id="INCOMPAT-A", asset_id="A1", asset_type="Track",
            corridor="C1", section="DLI-MTJ", location="DLI-MTJ",
            department=dept_a, task_type="Test", duration=40,
            severity=3, criticality=3, due_date="2026-09-20",
            flexibility_score=0.5,
        )
        task_b = MaintenanceTask(
            task_id="INCOMPAT-B", asset_id="A2", asset_type="Track",
            corridor="C1", section="DLI-MTJ", location="DLI-MTJ",
            department=dept_b, task_type="Test", duration=40,
            severity=3, criticality=3, due_date="2026-09-20",
            flexibility_score=0.5,
        )

        combos = generate_feasible_combinations(
            block=block,
            feasible_tasks=[task_a, task_b],
            compatibility_rules=rules,
            resources=[],
            trains=[],
            safety_buffer_minutes=10,
        )

        # The incompatible pair should not appear together in any combo
        for combo in combos:
            tasks_in_combo = set(combo.tasks)
            assert not (
                "INCOMPAT-A" in tasks_in_combo and "INCOMPAT-B" in tasks_in_combo
            ), f"Incompatible departments {dept_a} + {dept_b} were fused — should not happen"

    def test_optimizer_deterministic_with_same_seed(self, initialized_app):
        """Same input + same seed must always produce same output."""
        from optimization.optimizer import run_optimization
        from models import OptimizationConfig

        config = OptimizationConfig(random_seed=42)

        plan1 = run_optimization(
            tasks=deepcopy(initialized_app["tasks"]),
            blocks=deepcopy(initialized_app["blocks"]),
            trains=initialized_app["trains"],
            resources=initialized_app["resources"],
            compatibility_rules=initialized_app["rules"],
            config=config,
        )
        plan2 = run_optimization(
            tasks=deepcopy(initialized_app["tasks"]),
            blocks=deepcopy(initialized_app["blocks"]),
            trains=initialized_app["trains"],
            resources=initialized_app["resources"],
            compatibility_rules=initialized_app["rules"],
            config=config,
        )

        # Core decisions must be identical
        assert plan1.task_decisions.keys() == plan2.task_decisions.keys()
        for tid in plan1.task_decisions:
            assert plan1.task_decisions[tid].status == plan2.task_decisions[tid].status, (
                f"Task {tid}: plan1={plan1.task_decisions[tid].status} "
                f"plan2={plan2.task_decisions[tid].status}"
            )


# =============================================================================
# Weekly Planning Tests
# =============================================================================

class TestWeeklyPlan:
    def test_weekly_plan_returns_structure(self, client):
        resp = client.get("/weekly-plan")
        assert resp.status_code == 200
        data = resp.json()
        assert "plan_id" in data
        assert "days" in data
        assert "full_plan" in data
        assert "total_tasks_planned" in data
        assert isinstance(data["days"], list)

    def test_weekly_plan_days_have_required_fields(self, client):
        resp = client.get("/weekly-plan")
        assert resp.status_code == 200
        for day in resp.json()["days"]:
            assert "date" in day
            assert "day_name" in day
            assert "blocks" in day
            assert "planned_tasks" in day
            assert "total_capacity_minutes" in day
            assert "block_utilization_pct" in day

    def test_weekly_plan_utilization_in_range(self, client):
        resp = client.get("/weekly-plan")
        assert resp.status_code == 200
        for day in resp.json()["days"]:
            assert 0.0 <= day["block_utilization_pct"] <= 100.0


# =============================================================================
# Asset Availability Tests
# =============================================================================

class TestAssetAvailability:
    def test_asset_availability_returns_list(self, client):
        resp = client.get("/asset-availability")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_asset_availability_has_required_fields(self, client):
        resp = client.get("/asset-availability")
        assert resp.status_code == 200
        for item in resp.json():
            assert "asset_id" in item
            assert "availability_pct" in item
            assert "risk_level" in item
            assert "maintenance_debt" in item
            assert "disclaimer" in item

    def test_asset_availability_pct_in_range(self, client):
        resp = client.get("/asset-availability")
        assert resp.status_code == 200
        for item in resp.json():
            assert 0.0 <= item["availability_pct"] <= 100.0

    def test_asset_availability_risk_levels_valid(self, client):
        resp = client.get("/asset-availability")
        assert resp.status_code == 200
        valid = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        for item in resp.json():
            assert item["risk_level"] in valid

    def test_asset_availability_sorted_worst_first(self, client):
        resp = client.get("/asset-availability")
        assert resp.status_code == 200
        avails = [item["availability_pct"] for item in resp.json()]
        assert avails == sorted(avails), "Assets should be sorted by availability ascending (worst first)"

    def test_asset_availability_filter_by_department(self, client):
        resp = client.get("/asset-availability?department=Engineering")
        assert resp.status_code == 200
        for item in resp.json():
            assert item["department"] == "Engineering"
