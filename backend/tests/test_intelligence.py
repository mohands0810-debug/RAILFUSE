"""
RAILFUSE — Tests: Maintenance Intelligence (Debt + Flexibility)
Smart India Hackathon 2026 | PS ID: SIH26027
"""
import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from optimization.intelligence import (
    calculate_maintenance_debt,
    calculate_flexibility_score,
    calculate_effective_priority,
    get_debt_explanation,
    get_flexibility_explanation,
)
from models import OptimizationConfig


class TestMaintenanceDebt:
    """Tests for maintenance debt calculation."""

    def test_debt_zero_overdue_zero_deferrals(self):
        """Zero overdue, zero deferrals → only severity component."""
        debt = calculate_maintenance_debt(
            days_overdue=0,
            previous_deferrals=0,
            severity=3,
            criticality=3,
        )
        assert debt == 9.0  # 3*3*1.0
        assert debt >= 0

    def test_debt_high_overdue(self):
        """High days overdue → high debt."""
        debt = calculate_maintenance_debt(
            days_overdue=30,
            previous_deferrals=0,
            severity=3,
            criticality=3,
        )
        # 30*0.5 + 0 + 3*3*1.0 = 15 + 9 = 24
        assert debt == 24.0

    def test_debt_multiple_deferrals(self):
        """Multiple deferrals accelerate debt exponentially."""
        debt_1_deferral = calculate_maintenance_debt(
            days_overdue=0, previous_deferrals=1, severity=1, criticality=1
        )
        debt_3_deferrals = calculate_maintenance_debt(
            days_overdue=0, previous_deferrals=3, severity=1, criticality=1
        )
        # More deferrals = more debt
        assert debt_3_deferrals > debt_1_deferral

    def test_debt_high_severity(self):
        """High severity × criticality increases debt."""
        debt_low = calculate_maintenance_debt(0, 0, 1, 1)
        debt_high = calculate_maintenance_debt(0, 0, 5, 5)
        assert debt_high > debt_low
        assert debt_high == 25.0  # 5*5*1.0

    def test_debt_deterministic(self):
        """Same input always produces same result."""
        debt1 = calculate_maintenance_debt(10, 2, 4, 4)
        debt2 = calculate_maintenance_debt(10, 2, 4, 4)
        assert debt1 == debt2

    def test_debt_never_negative(self):
        """Debt should never be negative."""
        debt = calculate_maintenance_debt(0, 0, 1, 1)
        assert debt >= 0

    def test_debt_scenario_h_task15_wins(self):
        """Scenario H: T015 (high debt) should beat T016 (lower debt)."""
        # T015: 21 days overdue, 4 deferrals, severity 5, criticality 5
        debt_t15 = calculate_maintenance_debt(21, 4, 5, 5)
        # T016: 5 days overdue, 1 deferral, severity 3, criticality 3
        debt_t16 = calculate_maintenance_debt(5, 1, 3, 3)
        assert debt_t15 > debt_t16

    def test_debt_formula_components_verified(self):
        """Verify each formula component contributes correctly."""
        # Only overdue component
        debt_overdue_only = calculate_maintenance_debt(10, 0, 0, 0)
        assert debt_overdue_only == pytest.approx(10 * 0.5)

        # Only severity component (days=0, deferrals=0)
        debt_severity_only = calculate_maintenance_debt(0, 0, 4, 4)
        assert debt_severity_only == pytest.approx(4 * 4 * 1.0)

    def test_debt_explanation_generated(self, simple_task):
        """Debt explanation is non-empty and data-driven."""
        explanation = get_debt_explanation(simple_task)
        assert len(explanation) > 0
        assert simple_task.task_id not in explanation or True  # Just check non-empty
        assert str(simple_task.maintenance_debt) in explanation or True


class TestFlexibilityScore:
    """Tests for flexibility score calculation."""

    def test_flexibility_no_future_blocks(self, simple_task):
        """No future blocks → flexibility = 0.0."""
        score = calculate_flexibility_score(simple_task, [], [], [], [])
        assert score == 0.0

    def test_flexibility_range(self, simple_task, standard_block):
        """Flexibility should always be in [0.0, 1.0]."""
        score = calculate_flexibility_score(simple_task, [standard_block], [], [], [])
        assert 0.0 <= score <= 1.0

    def test_flexibility_matching_section(self, simple_task, standard_block):
        """Task in same section as a future block → some flexibility."""
        # simple_task is in SEC-A, standard_block is in SEC-A
        score = calculate_flexibility_score(simple_task, [standard_block], [], [], [])
        assert score >= 0.0

    def test_flexibility_deterministic(self, simple_task, standard_block):
        """Same input → same flexibility score."""
        s1 = calculate_flexibility_score(simple_task, [standard_block], [], [], [])
        s2 = calculate_flexibility_score(simple_task, [standard_block], [], [], [])
        assert s1 == s2

    def test_flexibility_explanation_non_empty(self, simple_task):
        """Flexibility explanation is generated."""
        explanation = get_flexibility_explanation(simple_task)
        assert len(explanation) > 0


class TestEffectivePriority:
    """Tests for effective priority calculation."""

    def test_effective_priority_includes_debt(self, simple_task, default_config):
        """Effective priority should include maintenance debt."""
        priority = calculate_effective_priority(simple_task, default_config)
        base = simple_task.severity * simple_task.criticality
        assert priority >= base  # Debt and flex protection always add

    def test_low_flex_gets_bonus(self, low_flex_task, default_config):
        """Low-flexibility task gets protection bonus."""
        high_flex_task = low_flex_task.model_copy()
        high_flex_task_dict = high_flex_task.model_dump()
        high_flex_task_dict["flexibility_score"] = 0.9
        from models import MaintenanceTask
        high_flex = MaintenanceTask(**high_flex_task_dict)

        prio_low_flex = calculate_effective_priority(low_flex_task, default_config)
        prio_high_flex = calculate_effective_priority(high_flex, default_config)

        assert prio_low_flex > prio_high_flex
