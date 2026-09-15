"""
RAILFUSE — Data Loading Utilities
Smart India Hackathon 2026 | PS ID: SIH26027
"""
import json
from pathlib import Path
from typing import List, Tuple
from models import (
    MaintenanceTask, MaintenanceBlock, TrainMovement,
    Resource, CompatibilityRule, ResourceAvailability
)


def load_json_file(filepath: Path) -> list:
    """Load a JSON file and return its contents."""
    if not filepath.exists():
        raise FileNotFoundError(f"Dataset file not found: {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def load_tasks(filepath: Path) -> List[MaintenanceTask]:
    """Load maintenance tasks from JSON file."""
    data = load_json_file(filepath)
    return [MaintenanceTask(**item) for item in data]


def load_blocks(filepath: Path) -> List[MaintenanceBlock]:
    """Load maintenance blocks from JSON file."""
    data = load_json_file(filepath)
    return [MaintenanceBlock(**item) for item in data]


def load_trains(filepath: Path) -> List[TrainMovement]:
    """Load train movements from JSON file."""
    data = load_json_file(filepath)
    return [TrainMovement(**item) for item in data]


def load_resources(filepath: Path) -> List[Resource]:
    """Load resources from JSON file."""
    data = load_json_file(filepath)
    resources = []
    for item in data:
        avail = item.get("availability", {})
        item["availability"] = ResourceAvailability(**avail)
        resources.append(Resource(**item))
    return resources


def load_compatibility_rules(filepath: Path) -> List[CompatibilityRule]:
    """Load compatibility rules from JSON file."""
    data = load_json_file(filepath)
    return [CompatibilityRule(**item) for item in data]


def load_all_data(
    tasks_file: Path,
    blocks_file: Path,
    trains_file: Path,
    resources_file: Path,
    compatibility_rules_file: Path,
) -> Tuple[List[MaintenanceTask], List[MaintenanceBlock], List[TrainMovement], List[Resource], List[CompatibilityRule]]:
    """Load all dataset files."""
    tasks = load_tasks(tasks_file)
    blocks = load_blocks(blocks_file)
    trains = load_trains(trains_file)
    resources = load_resources(resources_file)
    rules = load_compatibility_rules(compatibility_rules_file)
    return tasks, blocks, trains, resources, rules
