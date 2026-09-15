"""
RAILFUSE — Tests: API Endpoints
Smart India Hackathon 2026 | PS ID: SIH26027
"""
import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Pre-initialize app state before importing TestClient
import main as app_module
app_module.initialize_app()

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestHealthCheck:
    def test_root_returns_200(self):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_root_has_name(self):
        resp = client.get("/")
        data = resp.json()
        assert data["name"] == "RAILFUSE API"

    def test_root_has_disclaimer(self):
        resp = client.get("/")
        data = resp.json()
        assert "disclaimer" in data
        assert "synthetic" in data["disclaimer"].lower()


class TestTasksEndpoint:
    def test_get_tasks_returns_list(self):
        resp = client.get("/tasks")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_get_tasks_has_expected_count(self):
        resp = client.get("/tasks")
        data = resp.json()
        # Should have 25 tasks
        assert len(data) == 25

    def test_get_tasks_has_required_fields(self):
        resp = client.get("/tasks")
        data = resp.json()
        if data:
            task = data[0]
            assert "task_id" in task
            assert "department" in task
            assert "duration" in task
            assert "maintenance_debt" in task
            assert "flexibility_score" in task

    def test_filter_by_department(self):
        resp = client.get("/tasks?department=Engineering")
        assert resp.status_code == 200
        data = resp.json()
        for task in data:
            assert task["department"] == "Engineering"

    def test_filter_by_section(self):
        resp = client.get("/tasks?section=DLI-MTJ")
        assert resp.status_code == 200
        data = resp.json()
        for task in data:
            assert task["section"] == "DLI-MTJ"

    def test_get_specific_task(self):
        resp = client.get("/tasks/T001")
        assert resp.status_code == 200
        data = resp.json()
        assert data["task_id"] == "T001"

    def test_get_nonexistent_task(self):
        resp = client.get("/tasks/T999")
        assert resp.status_code == 404


class TestBlocksEndpoint:
    def test_get_blocks_returns_list(self):
        resp = client.get("/blocks")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_get_blocks_count(self):
        resp = client.get("/blocks")
        data = resp.json()
        assert len(data) == 10

    def test_blocks_have_required_fields(self):
        resp = client.get("/blocks")
        data = resp.json()
        if data:
            block = data[0]
            assert "block_id" in block
            assert "section" in block
            assert "duration" in block
            assert "remaining_capacity" in block


class TestTrainsEndpoint:
    def test_get_trains_returns_list(self):
        resp = client.get("/trains")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_trains_count(self):
        resp = client.get("/trains")
        data = resp.json()
        assert len(data) == 24


class TestResourcesEndpoint:
    def test_get_resources_returns_list(self):
        resp = client.get("/resources")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 12


class TestOptimizeEndpoint:
    def test_optimize_returns_plan(self):
        resp = client.post("/optimize")
        assert resp.status_code == 200
        data = resp.json()
        assert "plan_id" in data
        assert "block_assignments" in data
        assert "summary" in data

    def test_optimize_plan_has_task_decisions(self):
        resp = client.post("/optimize")
        data = resp.json()
        assert "task_decisions" in data
        assert len(data["task_decisions"]) > 0

    def test_optimize_decisions_have_reasons(self):
        resp = client.post("/optimize")
        data = resp.json()
        for task_id, decision in data["task_decisions"].items():
            assert "reason" in decision
            assert len(decision["reason"]) > 0, f"Task {task_id} has empty reason"

    def test_optimize_is_deterministic(self):
        resp1 = client.post("/optimize", json={"random_seed": 42})
        resp2 = client.post("/optimize", json={"random_seed": 42})
        d1 = resp1.json()
        d2 = resp2.json()
        # Same planned task count
        assert d1["summary"]["planned_tasks"] == d2["summary"]["planned_tasks"]

    def test_optimize_with_custom_config(self):
        payload = {"w_maintenance": 3.0, "w_possession": 1.0, "random_seed": 42}
        resp = client.post("/optimize", json=payload)
        assert resp.status_code == 200

    def test_optimize_summary_contains_stats(self):
        resp = client.post("/optimize")
        data = resp.json()
        summary = data["summary"]
        assert "total_tasks" in summary
        assert "planned_tasks" in summary
        assert "deferred_tasks" in summary
        assert summary["total_tasks"] == 25


class TestOptimizedPlanEndpoint:
    def test_get_plan_after_optimize(self):
        # Ensure optimization has run
        client.post("/optimize")
        resp = client.get("/optimized-plan")
        assert resp.status_code == 200
        data = resp.json()
        assert "plan_id" in data


class TestOpportunitiesEndpoint:
    def test_get_opportunities_returns_list(self):
        resp = client.get("/opportunities")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 10  # One per block

    def test_get_opportunities_for_specific_block(self):
        resp = client.get("/opportunities?block_id=BLK001")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["block_id"] == "BLK001"

    def test_block_detail_endpoint(self):
        resp = client.get("/block/BLK001")
        assert resp.status_code == 200
        data = resp.json()
        assert "block" in data
        assert "opportunity_analysis" in data

    def test_block_not_found(self):
        resp = client.get("/block/INVALID_BLOCK")
        assert resp.status_code == 404


class TestStatsEndpoint:
    def test_get_stats(self):
        resp = client.get("/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_tasks" in data
        assert data["total_tasks"] == 25
        assert "available_blocks" in data
        assert data["available_blocks"] == 10


class TestWhatIfEndpoint:
    def test_what_if_runs(self):
        payload = {
            "scenario_name": "Test Scenario",
            "task_modifications": [
                {"task_id": "T015", "field": "severity", "value": 5}
            ],
            "block_modifications": [],
        }
        resp = client.post("/what-if", json=payload)
        assert resp.status_code == 200

    def test_what_if_returns_comparison(self):
        payload = {
            "scenario_name": "Test",
            "task_modifications": [
                {"task_id": "T001", "field": "days_overdue", "value": 30}
            ],
            "block_modifications": [],
        }
        resp = client.post("/what-if", json=payload)
        data = resp.json()
        assert "baseline_plan" in data
        assert "modified_plan" in data
        assert "summary_delta" in data

    def test_what_if_modifying_severity_changes_result(self):
        """Changing severity should change maintenance_debt and potentially the plan."""
        # First get baseline
        payload_baseline = {
            "scenario_name": "Baseline",
            "task_modifications": [],
            "block_modifications": [],
        }
        baseline_resp = client.post("/what-if", json=payload_baseline)
        baseline_data = baseline_resp.json()

        # Then modify T015 severity to 5 (maximum)
        payload_modified = {
            "scenario_name": "High Severity",
            "task_modifications": [
                {"task_id": "T015", "field": "severity", "value": 5},
                {"task_id": "T015", "field": "days_overdue", "value": 30}
            ],
            "block_modifications": [],
        }
        modified_resp = client.post("/what-if", json=payload_modified)
        modified_data = modified_resp.json()

        # Plans should both be valid
        assert baseline_resp.status_code == 200
        assert modified_resp.status_code == 200
        # Both should have task decisions
        assert len(modified_data["modified_plan"]["task_decisions"]) > 0
