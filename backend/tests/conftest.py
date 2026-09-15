"""
RAILFUSE — pytest Configuration and Fixtures
Smart India Hackathon 2026 | PS ID: SIH26027
"""
import sys
from pathlib import Path
import pytest

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import (
    MaintenanceTask, MaintenanceBlock, TrainMovement, Resource,
    CompatibilityRule, OptimizationConfig, ResourceAvailability
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def default_config():
    return OptimizationConfig(random_seed=42)


@pytest.fixture
def simple_task():
    """A simple pending maintenance task."""
    return MaintenanceTask(
        task_id="TEST001",
        asset_id="TRK-TEST-001",
        asset_type="Track Geometry",
        corridor="Test Corridor",
        section="SEC-A",
        location="Between km 1 and km 5",
        department="Engineering",
        task_type="Track Tamping",
        duration=60,
        severity=3,
        criticality=3,
        due_date="2026-09-10",
        days_overdue=7,
        previous_deferrals=2,
        maintenance_debt=20.0,
        flexibility_score=0.5,
        required_resources=["R_TEST_01"],
        compatible_departments=["Engineering", "Civil"],
        safety_requirements=["flagman_deployed"],
        preferred_time_window="22:00-06:00",
        status="PENDING",
    )


@pytest.fixture
def long_task():
    """A task that exceeds typical block capacity."""
    return MaintenanceTask(
        task_id="TEST002",
        asset_id="TRK-TEST-002",
        asset_type="Track Geometry",
        corridor="Test Corridor",
        section="SEC-A",
        location="Between km 5 and km 20",
        department="Engineering",
        task_type="Deep Screening",
        duration=95,
        severity=4,
        criticality=3,
        due_date="2026-09-08",
        days_overdue=9,
        previous_deferrals=1,
        maintenance_debt=25.0,
        flexibility_score=0.4,
        required_resources=["R_TEST_01"],
        compatible_departments=["Engineering"],
        safety_requirements=["flagman_deployed"],
        preferred_time_window="22:00-06:00",
        status="PENDING",
    )


@pytest.fixture
def short_task():
    """A short task that pairs well with others."""
    return MaintenanceTask(
        task_id="TEST003",
        asset_id="TRK-TEST-003",
        asset_type="Track Geometry",
        corridor="Test Corridor",
        section="SEC-A",
        location="Between km 5 and km 8",
        department="Engineering",
        task_type="Rail Joint Inspection",
        duration=20,
        severity=2,
        criticality=2,
        due_date="2026-09-15",
        days_overdue=2,
        previous_deferrals=0,
        maintenance_debt=5.0,
        flexibility_score=0.8,
        required_resources=["R_TEST_02"],
        compatible_departments=["Engineering", "Civil"],
        safety_requirements=["flagman_deployed"],
        preferred_time_window="22:00-06:00",
        status="PENDING",
    )


@pytest.fixture
def incompatible_task():
    """A TRD task that is incompatible with Engineering tasks."""
    return MaintenanceTask(
        task_id="TEST004",
        asset_id="OHE-TEST-001",
        asset_type="OHE",
        corridor="Test Corridor",
        section="SEC-A",
        location="OHE km 1-15",
        department="TRD",
        task_type="OHE Inspection",
        duration=45,
        severity=3,
        criticality=3,
        due_date="2026-09-12",
        days_overdue=5,
        previous_deferrals=1,
        maintenance_debt=15.0,
        flexibility_score=0.6,
        required_resources=["R_TEST_03"],
        compatible_departments=["TRD"],
        safety_requirements=["power_isolated"],
        preferred_time_window="22:00-05:00",
        status="PENDING",
    )


@pytest.fixture
def high_debt_task():
    """A task with very high maintenance debt."""
    return MaintenanceTask(
        task_id="TEST005",
        asset_id="TRK-TEST-005",
        asset_type="Points & Crossings",
        corridor="Test Corridor",
        section="SEC-A",
        location="Station points",
        department="Engineering",
        task_type="Points Overhaul",
        duration=80,
        severity=5,
        criticality=5,
        due_date="2026-08-25",
        days_overdue=22,
        previous_deferrals=4,
        maintenance_debt=50.0,
        flexibility_score=0.15,
        required_resources=["R_TEST_01"],
        compatible_departments=["Engineering"],
        safety_requirements=["flagman_deployed"],
        preferred_time_window="22:00-05:00",
        status="PENDING",
    )


@pytest.fixture
def low_flex_task():
    """A task with very low flexibility (few future windows)."""
    return MaintenanceTask(
        task_id="TEST006",
        asset_id="SIG-TEST-001",
        asset_type="Signal Equipment",
        corridor="Test Corridor",
        section="SEC-B",
        location="Signal cabin",
        department="S&T",
        task_type="Relay Testing",
        duration=70,
        severity=4,
        criticality=4,
        due_date="2026-09-08",
        days_overdue=9,
        previous_deferrals=3,
        maintenance_debt=35.0,
        flexibility_score=0.08,
        required_resources=["R_TEST_04"],
        compatible_departments=["S&T"],
        safety_requirements=["signal_isolation"],
        preferred_time_window="01:00-04:00",
        status="PENDING",
    )


@pytest.fixture
def standard_block():
    """A standard 90-minute block with no existing tasks."""
    return MaintenanceBlock(
        block_id="BLK_TEST_001",
        corridor="Test Corridor",
        section="SEC-A",
        start_time="2026-09-17T22:00:00",
        end_time="2026-09-17T23:30:00",
        duration=90,
        block_type="Engineering Block",
        available_resources=["R_TEST_01", "R_TEST_02"],
        affected_track="UP",
        safety_constraints=["flagman_deployed"],
        existing_tasks=[],
        remaining_capacity=90,
    )


@pytest.fixture
def small_block():
    """A small 50-minute block."""
    return MaintenanceBlock(
        block_id="BLK_TEST_002",
        corridor="Test Corridor",
        section="SEC-A",
        start_time="2026-09-17T01:00:00",
        end_time="2026-09-17T01:50:00",
        duration=50,
        block_type="Engineering Block",
        available_resources=["R_TEST_01"],
        affected_track="DN",
        safety_constraints=["flagman_deployed"],
        existing_tasks=[],
        remaining_capacity=50,
    )


@pytest.fixture
def different_section_block():
    """A block in a different section."""
    return MaintenanceBlock(
        block_id="BLK_TEST_003",
        corridor="Test Corridor",
        section="SEC-B",
        start_time="2026-09-17T01:00:00",
        end_time="2026-09-17T02:30:00",
        duration=90,
        block_type="Signal Block",
        available_resources=["R_TEST_04"],
        affected_track="BOTH",
        safety_constraints=["signal_isolation"],
        existing_tasks=[],
        remaining_capacity=90,
    )


@pytest.fixture
def conflicting_train():
    """A train that conflicts with standard_block."""
    return TrainMovement(
        train_id="TEST_TRAIN_01",
        train_name="Test Rajdhani",
        train_type="Rajdhani Express",
        corridor="Test Corridor",
        section="SEC-A",
        arrival_time="2026-09-17T22:30:00",
        departure_time="2026-09-17T22:50:00",
        priority=1,
        operational_status="ON_TIME",
    )


@pytest.fixture
def non_conflicting_train():
    """A train that does NOT conflict with standard_block (passes before)."""
    return TrainMovement(
        train_id="TEST_TRAIN_02",
        train_name="Test Mail",
        train_type="Mail Express",
        corridor="Test Corridor",
        section="SEC-A",
        arrival_time="2026-09-17T20:00:00",
        departure_time="2026-09-17T20:30:00",
        priority=2,
        operational_status="ON_TIME",
    )


@pytest.fixture
def available_resource():
    """An available resource."""
    return Resource(
        resource_id="R_TEST_01",
        resource_type="Track Tamping Machine",
        department="Engineering",
        availability=ResourceAvailability(
            available=True,
            available_from="2026-09-17T20:00:00",
            available_until="2026-09-18T06:00:00",
            base_section="SEC-A",
        ),
        location="SEC-A",
        capacity=1,
    )


@pytest.fixture
def unavailable_resource():
    """An unavailable resource (in depot)."""
    return Resource(
        resource_id="R_TEST_03",
        resource_type="OHE Tower Wagon",
        department="TRD",
        availability=ResourceAvailability(
            available=False,
            available_from="2026-09-18T20:00:00",
            available_until="2026-09-19T06:00:00",
            base_section="SEC-A",
            unavailability_reason="Scheduled maintenance at depot",
        ),
        location="Depot",
        capacity=1,
    )


@pytest.fixture
def compatibility_rules():
    """Standard compatibility rules."""
    return [
        CompatibilityRule(
            rule_id="CR_ENG_ENG",
            department_a="Engineering",
            department_b="Engineering",
            compatible=True,
            required_conditions=["No shared heavy machinery"],
            safety_constraints=["flagman_on_site"],
            notes="Same department compatible",
        ),
        CompatibilityRule(
            rule_id="CR_ENG_TRD",
            department_a="Engineering",
            department_b="TRD",
            compatible=False,
            required_conditions=[],
            safety_constraints=[],
            notes="Engineering and TRD cannot share block",
        ),
        CompatibilityRule(
            rule_id="CR_ST_ST",
            department_a="S&T",
            department_b="S&T",
            compatible=True,
            required_conditions=[],
            safety_constraints=["signal_isolation"],
            notes="S&T same department compatible",
        ),
    ]
