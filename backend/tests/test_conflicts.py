"""
RAILFUSE — Tests: Conflict Detection
Smart India Hackathon 2026 | PS ID: SIH26027
"""
import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from optimization.conflicts import (
    check_duration_feasibility,
    check_section_feasibility,
    check_train_conflicts,
    check_resource_feasibility,
    is_feasible_assignment,
)
from models import TrainMovement, Resource, ResourceAvailability


class TestDurationFeasibility:
    """Test duration constraint checking."""

    def test_task_fits_exactly(self, simple_task, standard_block):
        """Task duration exactly equals remaining capacity."""
        simple_task_dict = simple_task.model_dump()
        simple_task_dict["duration"] = standard_block.remaining_capacity
        from models import MaintenanceTask
        exact_task = MaintenanceTask(**simple_task_dict)
        ok, reason = check_duration_feasibility(exact_task, standard_block)
        assert ok is True

    def test_task_fits_with_room(self, simple_task, standard_block):
        """SCENARIO A: Task 60 min in 90 min block → fits."""
        assert simple_task.duration == 60
        assert standard_block.remaining_capacity == 90
        ok, reason = check_duration_feasibility(simple_task, standard_block)
        assert ok is True

    def test_task_exceeds_capacity(self, long_task, standard_block):
        """SCENARIO B: Task 95 min in 90 min block → rejected."""
        assert long_task.duration > standard_block.remaining_capacity
        ok, reason = check_duration_feasibility(long_task, standard_block)
        assert ok is False
        assert "exceeds" in reason.lower()
        assert str(long_task.duration) in reason

    def test_task_fits_with_existing_allocation(self, simple_task, standard_block):
        """Task fits when existing allocation leaves enough room."""
        ok, reason = check_duration_feasibility(simple_task, standard_block, already_assigned_duration=20)
        # simple_task=60 min, remaining=90-20=70 min → fits
        assert ok is True

    def test_task_fails_with_existing_allocation(self, simple_task, standard_block):
        """Task doesn't fit when existing allocation is large."""
        ok, reason = check_duration_feasibility(simple_task, standard_block, already_assigned_duration=50)
        # simple_task=60 min, remaining=90-50=40 min → doesn't fit
        assert ok is False


class TestSectionFeasibility:
    """Test section matching."""

    def test_same_section(self, simple_task, standard_block):
        """Task and block in same section → feasible."""
        assert simple_task.section == standard_block.section  # Both SEC-A
        ok, reason = check_section_feasibility(simple_task, standard_block)
        assert ok is True

    def test_different_section(self, simple_task, different_section_block):
        """Task in SEC-A, block in SEC-B → rejected."""
        assert simple_task.section != different_section_block.section
        ok, reason = check_section_feasibility(simple_task, different_section_block)
        assert ok is False
        assert "does not match" in reason.lower()


class TestTrainConflicts:
    """Test train conflict detection. SCENARIO C."""

    def test_conflicting_train_rejected(self, simple_task, standard_block, conflicting_train):
        """SCENARIO C: Train passes during block window → REJECTED."""
        ok, reason = check_train_conflicts(simple_task, standard_block, [conflicting_train])
        assert ok is False
        assert conflicting_train.train_id in reason

    def test_non_conflicting_train_allowed(self, simple_task, standard_block, non_conflicting_train):
        """Train passes before block → no conflict."""
        ok, reason = check_train_conflicts(simple_task, standard_block, [non_conflicting_train])
        assert ok is True

    def test_no_trains_allowed(self, simple_task, standard_block):
        """No trains at all → no conflict."""
        ok, reason = check_train_conflicts(simple_task, standard_block, [])
        assert ok is True

    def test_safety_buffer_prevents_close_train(self, simple_task, standard_block):
        """Train just after block end (within safety buffer) → conflict."""
        # Block ends at 23:30, train arrives at 23:35 (within 10-min buffer)
        close_train = TrainMovement(
            train_id="CLOSE_TRAIN",
            train_name="Close Express",
            train_type="Express",
            corridor="Test Corridor",
            section="SEC-A",  # Same section
            arrival_time="2026-09-17T23:35:00",
            departure_time="2026-09-17T23:55:00",
            priority=2,
            operational_status="ON_TIME",
        )
        ok, reason = check_train_conflicts(
            simple_task, standard_block, [close_train], safety_buffer_minutes=10
        )
        assert ok is False  # Within 10-min buffer

    def test_different_section_train_ignored(self, simple_task, standard_block, conflicting_train):
        """Train in different section → not a conflict."""
        import copy
        train_other_section = copy.deepcopy(conflicting_train)
        train_other_section.section = "COMPLETELY_DIFFERENT_SECTION"
        ok, reason = check_train_conflicts(simple_task, standard_block, [train_other_section])
        assert ok is True


class TestResourceFeasibility:
    """Test resource availability checking. SCENARIO D."""

    def test_required_resource_available(self, simple_task, standard_block, available_resource):
        """Resource available in block → feasible."""
        # simple_task requires R_TEST_01, standard_block has R_TEST_01
        assert "R_TEST_01" in simple_task.required_resources
        assert "R_TEST_01" in standard_block.available_resources
        ok, reason = check_resource_feasibility(simple_task, standard_block, [available_resource])
        assert ok is True

    def test_required_resource_not_in_block(self, simple_task, standard_block, unavailable_resource):
        """SCENARIO D: Required resource not in block → REJECTED."""
        # Modify task to require R_TEST_03 (not in standard_block)
        task_dict = simple_task.model_dump()
        task_dict["required_resources"] = ["R_TEST_03"]
        from models import MaintenanceTask
        task_needs_r03 = MaintenanceTask(**task_dict)
        ok, reason = check_resource_feasibility(task_needs_r03, standard_block, [unavailable_resource])
        assert ok is False
        assert "R_TEST_03" in reason

    def test_resource_in_depot_rejected(self, simple_task, standard_block, unavailable_resource):
        """Resource in depot (unavailable) → REJECTED."""
        # Add R_TEST_03 to block's available list but resource itself is unavailable
        block_dict = standard_block.model_dump()
        block_dict["available_resources"] = ["R_TEST_01", "R_TEST_02", "R_TEST_03"]
        from models import MaintenanceBlock
        block_with_r03 = MaintenanceBlock(**block_dict)

        task_dict = simple_task.model_dump()
        task_dict["required_resources"] = ["R_TEST_03"]
        from models import MaintenanceTask
        task_needs_r03 = MaintenanceTask(**task_dict)

        ok, reason = check_resource_feasibility(task_needs_r03, block_with_r03, [unavailable_resource])
        assert ok is False
        assert "unavailable" in reason.lower()

    def test_resource_already_used_rejected(self, simple_task, standard_block, available_resource):
        """Resource already committed to another task → REJECTED."""
        ok, reason = check_resource_feasibility(
            simple_task, standard_block, [available_resource],
            already_used_resources=["R_TEST_01"]
        )
        assert ok is False
        assert "already committed" in reason.lower()


class TestFullFeasibility:
    """Integration tests for full feasibility checking."""

    def test_fully_feasible_assignment(self, simple_task, standard_block, non_conflicting_train, available_resource, compatibility_rules):
        """Task that satisfies all constraints → FEASIBLE."""
        ok, reason = is_feasible_assignment(
            task=simple_task,
            block=standard_block,
            trains=[non_conflicting_train],
            resources=[available_resource],
            existing_tasks=[],
            compatibility_rules=compatibility_rules,
        )
        assert ok is True

    def test_section_mismatch_rejected(self, simple_task, different_section_block, available_resource):
        """Section mismatch fails first constraint → REJECTED."""
        ok, reason = is_feasible_assignment(
            task=simple_task,
            block=different_section_block,
            trains=[],
            resources=[available_resource],
            existing_tasks=[],
        )
        assert ok is False
        assert "section" in reason.lower()

    def test_train_conflict_rejected(self, simple_task, standard_block, conflicting_train, available_resource):
        """Train conflict → REJECTED."""
        ok, reason = is_feasible_assignment(
            task=simple_task,
            block=standard_block,
            trains=[conflicting_train],
            resources=[available_resource],
            existing_tasks=[],
        )
        assert ok is False
        assert "train" in reason.lower()
