#!/usr/bin/env python3
"""
RAILFUSE — Fix Train Timings
Shifts synthetic train times so that ~60% of blocks have at least
one feasible task (clear of train conflicts).
DISCLAIMER: All data is SYNTHETIC DEMONSTRATION DATA.
"""
import json, sys
sys.path.insert(0, '.')
import config

# Shift trains OUT of block windows so the optimizer can plan tasks.
# Block windows (with 10-min safety buffer):
#   BLK001 DLI-MTJ 21:50–23:40  (originally 22:00–23:30)
#   BLK002 DLI-MTJ 00:50–02:40  (originally 01:00–02:30)
#   BLK003 MTJ-GWL 00:50–02:55  (originally 01:00–02:45)
#   BLK004 DLI-MTJ 22:50–01:10
#   BLK005 MTJ-GWL 22:20–00:40
#   BLK006 MTJ-GWL 00:50–03:10
#   BLK007 GWL-BPL 21:50–23:40
#   BLK008 DLI-CNB 22:50–02:10
#   BLK009 CNB-ALD 23:50–02:40
#   BLK010 ALD-MGS 00:50–03:10
#
# Strategy: Move each conflicting train to BEFORE its block window starts.
# Keep a few conflicts for realism (algorithm should show "Rejected" sometimes).

FIXED_TRAINS = [
    # DLI-MTJ trains - clear BLK002 (01:00-02:30) and BLK001 (22:00-23:30)
    # Move 12001 (was 21:30-21:55) -> 20:00-20:25 (clear of BLK001)
    {
        "train_id": "12001", "train_name": "Bhopal Rajdhani",
        "train_type": "Rajdhani Express", "corridor": "Delhi-Mumbai Central",
        "section": "DLI-MTJ",
        "arrival_time": "2026-09-17T20:00:00", "departure_time": "2026-09-17T20:25:00",
        "priority": 1, "operational_status": "ON_TIME",
        "notes": "Passes DLI-MTJ before BLK001 starts — no conflict"
    },
    # 12002 (MTJ-GWL) was 01:40-02:05, conflicts BLK003 & BLK006 -> move to 04:00-04:25
    {
        "train_id": "12002", "train_name": "Bhopal Rajdhani Return",
        "train_type": "Rajdhani Express", "corridor": "Delhi-Mumbai Central",
        "section": "MTJ-GWL",
        "arrival_time": "2026-09-18T04:00:00", "departure_time": "2026-09-18T04:25:00",
        "priority": 1, "operational_status": "ON_TIME",
        "notes": "Passes MTJ-GWL after BLK003/BLK006 ends — no conflict"
    },
    # 12005 (DLI-MTJ) was 23:50-00:15, conflicts BLK004 -> move to 21:00-21:25
    {
        "train_id": "12005", "train_name": "Kalka Mail",
        "train_type": "Mail Express", "corridor": "Delhi-Kalka",
        "section": "DLI-MTJ",
        "arrival_time": "2026-09-17T21:00:00", "departure_time": "2026-09-17T21:25:00",
        "priority": 2, "operational_status": "ON_TIME",
        "notes": "Passes DLI-MTJ before maintenance blocks — no conflict"
    },
    # 12006 (DLI-MTJ) was 01:30-01:55, conflicts BLK002 -> keep this conflict (realistic)
    {
        "train_id": "12006", "train_name": "Kalka Mail DN",
        "train_type": "Mail Express", "corridor": "Delhi-Kalka",
        "section": "DLI-MTJ",
        "arrival_time": "2026-09-17T01:30:00", "departure_time": "2026-09-17T01:55:00",
        "priority": 2, "operational_status": "ON_TIME",
        "notes": "Intentional conflict: demonstrates algorithm rejecting BLK002 for DLI-MTJ tasks"
    },
    # 12010 (MTJ-GWL) was 23:15-23:40, conflicts BLK005 -> move to 20:30-20:55
    {
        "train_id": "12010", "train_name": "Shatabdi Express",
        "train_type": "Shatabdi", "corridor": "Delhi-Bhopal",
        "section": "MTJ-GWL",
        "arrival_time": "2026-09-17T20:30:00", "departure_time": "2026-09-17T20:55:00",
        "priority": 1, "operational_status": "ON_TIME",
        "notes": "Passes MTJ-GWL before BLK005 starts — no conflict"
    },
    # 14001 (GWL-BPL) was 23:45-00:10, no conflict with BLK007 (22:00-23:30) -> keep
    {
        "train_id": "14001", "train_name": "Marudhar Express",
        "train_type": "Express", "corridor": "Gwalior-Bhopal",
        "section": "GWL-BPL",
        "arrival_time": "2026-09-18T00:00:00", "departure_time": "2026-09-18T00:25:00",
        "priority": 3, "operational_status": "ON_TIME",
        "notes": "Passes after BLK007 ends — no conflict"
    },
    # 14002 (GWL-BPL) was 22:50-23:20, conflicts BLK007 (22:00-23:30) -> move to 21:00-21:30
    {
        "train_id": "14002", "train_name": "Marudhar Express Return",
        "train_type": "Express", "corridor": "Gwalior-Bhopal",
        "section": "GWL-BPL",
        "arrival_time": "2026-09-18T21:00:00", "departure_time": "2026-09-18T21:30:00",
        "priority": 3, "operational_status": "ON_TIME",
        "notes": "Passes GWL-BPL before BLK007 — no conflict"
    },
    # 12301 (DLI-CNB) was 22:00-22:30 -> clear of BLK008 (23:00-02:00) -> keep
    {
        "train_id": "12301", "train_name": "Howrah Rajdhani",
        "train_type": "Rajdhani Express", "corridor": "Delhi-Howrah",
        "section": "DLI-CNB",
        "arrival_time": "2026-09-17T22:00:00", "departure_time": "2026-09-17T22:30:00",
        "priority": 1, "operational_status": "ON_TIME",
        "notes": "Passes before BLK008 window — no conflict"
    },
    # 12302 (DLI-CNB) was 02:30-03:00, conflicts BLK008 (23:00-02:00) — barely. Move to 03:00
    {
        "train_id": "12302", "train_name": "Howrah Rajdhani Return",
        "train_type": "Rajdhani Express", "corridor": "Delhi-Howrah",
        "section": "DLI-CNB",
        "arrival_time": "2026-09-18T03:00:00", "departure_time": "2026-09-18T03:30:00",
        "priority": 1, "operational_status": "ON_TIME",
        "notes": "Passes after BLK008 ends — no conflict"
    },
    # 13005 (CNB-ALD) was 01:20-01:45, conflicts BLK009 (00:00-02:30) -> keep (1 realistic conflict)
    {
        "train_id": "13005", "train_name": "Amritsar Mail",
        "train_type": "Mail Express", "corridor": "Amritsar-Kolkata",
        "section": "CNB-ALD",
        "arrival_time": "2026-09-18T01:20:00", "departure_time": "2026-09-18T01:45:00",
        "priority": 2, "operational_status": "ON_TIME",
        "notes": "Intentional conflict: demonstrates constraint enforcement in BLK009 window"
    },
    # 13006 (ALD-MGS) was 02:15-02:40, conflicts BLK010 (01:00-03:00) -> move to 03:30-03:55
    {
        "train_id": "13006", "train_name": "Amritsar Mail Return",
        "train_type": "Mail Express", "corridor": "Amritsar-Kolkata",
        "section": "ALD-MGS",
        "arrival_time": "2026-09-18T03:30:00", "departure_time": "2026-09-18T03:55:00",
        "priority": 2, "operational_status": "ON_TIME",
        "notes": "Passes after BLK010 ends — no conflict"
    },
    # Goods/freight trains
    {
        "train_id": "52001", "train_name": "BCT Coal Rake",
        "train_type": "Goods", "corridor": "Delhi-Mumbai Central",
        "section": "DLI-MTJ",
        "arrival_time": "2026-09-17T19:30:00", "departure_time": "2026-09-17T20:15:00",
        "priority": 4, "operational_status": "ON_TIME",
        "notes": "Passes before maintenance blocks — no conflict"
    },
    {
        "train_id": "52002", "train_name": "MTJ Container Rake",
        "train_type": "Goods", "corridor": "Delhi-Mumbai Central",
        "section": "MTJ-GWL",
        "arrival_time": "2026-09-17T19:30:00", "departure_time": "2026-09-17T20:15:00",
        "priority": 4, "operational_status": "ON_TIME",
        "notes": "Passes before BLK005 — no conflict"
    },
    {
        "train_id": "52003", "train_name": "GWL Goods Train",
        "train_type": "Goods", "corridor": "Gwalior-Bhopal",
        "section": "GWL-BPL",
        "arrival_time": "2026-09-18T20:30:00", "departure_time": "2026-09-18T21:15:00",
        "priority": 4, "operational_status": "ON_TIME",
        "notes": "Passes before BLK007 — no conflict"
    },
    {
        "train_id": "52004", "train_name": "CNB Freight",
        "train_type": "Goods", "corridor": "Delhi-Howrah",
        "section": "DLI-CNB",
        "arrival_time": "2026-09-18T03:30:00", "departure_time": "2026-09-18T04:15:00",
        "priority": 4, "operational_status": "ON_TIME",
        "notes": "Passes after BLK008 ends — no conflict"
    },
    {
        "train_id": "52005", "train_name": "ALD Goods",
        "train_type": "Goods", "corridor": "Amritsar-Kolkata",
        "section": "CNB-ALD",
        "arrival_time": "2026-09-18T03:00:00", "departure_time": "2026-09-18T03:45:00",
        "priority": 4, "operational_status": "ON_TIME",
        "notes": "Passes after BLK009 ends — no conflict"
    },
    {
        "train_id": "52006", "train_name": "MGS Coal Rake",
        "train_type": "Goods", "corridor": "Amritsar-Kolkata",
        "section": "ALD-MGS",
        "arrival_time": "2026-09-17T23:30:00", "departure_time": "2026-09-18T00:15:00",
        "priority": 4, "operational_status": "ON_TIME",
        "notes": "Passes before BLK010 starts — no conflict"
    },
    {
        "train_id": "19019", "train_name": "Dehradun Express",
        "train_type": "Express", "corridor": "Delhi-Dehradun",
        "section": "DLI-MTJ",
        "arrival_time": "2026-09-17T19:30:00", "departure_time": "2026-09-17T19:55:00",
        "priority": 3, "operational_status": "ON_TIME",
        "notes": "Passes before all DLI-MTJ blocks — no conflict"
    },
    {
        "train_id": "19020", "train_name": "Dehradun Express Return",
        "train_type": "Express", "corridor": "Delhi-Dehradun",
        "section": "DLI-MTJ",
        "arrival_time": "2026-09-18T05:00:00", "departure_time": "2026-09-18T05:30:00",
        "priority": 3, "operational_status": "ON_TIME",
        "notes": "Passes after all DLI-MTJ blocks — no conflict"
    },
    {
        "train_id": "22455", "train_name": "Lucknow Double Decker",
        "train_type": "Express", "corridor": "Delhi-Lucknow",
        "section": "DLI-CNB",
        "arrival_time": "2026-09-17T21:00:00", "departure_time": "2026-09-17T21:25:00",
        "priority": 2, "operational_status": "ON_TIME",
        "notes": "Passes before BLK008 — no conflict"
    },
    {
        "train_id": "22456", "train_name": "Lucknow Double Decker Return",
        "train_type": "Express", "corridor": "Delhi-Lucknow",
        "section": "DLI-CNB",
        "arrival_time": "2026-09-18T05:30:00", "departure_time": "2026-09-18T06:00:00",
        "priority": 2, "operational_status": "ON_TIME",
        "notes": "Passes after BLK008 ends — no conflict"
    },
    {
        "train_id": "15001", "train_name": "Allahabad Express",
        "train_type": "Express", "corridor": "Delhi-Allahabad",
        "section": "CNB-ALD",
        "arrival_time": "2026-09-17T22:30:00", "departure_time": "2026-09-17T23:00:00",
        "priority": 3, "operational_status": "ON_TIME",
        "notes": "Passes before BLK009 starts — no conflict"
    },
    {
        "train_id": "15002", "train_name": "Allahabad Express Return",
        "train_type": "Express", "corridor": "Delhi-Allahabad",
        "section": "ALD-MGS",
        "arrival_time": "2026-09-18T03:30:00", "departure_time": "2026-09-18T04:00:00",
        "priority": 3, "operational_status": "ON_TIME",
        "notes": "Passes after BLK010 ends — no conflict"
    },
    {
        "train_id": "18101", "train_name": "Tata Express",
        "train_type": "Express", "corridor": "Delhi-Tatanagar",
        "section": "DLI-CNB",
        "arrival_time": "2026-09-18T03:30:00", "departure_time": "2026-09-18T04:00:00",
        "priority": 3, "operational_status": "ON_TIME",
        "notes": "Moved after BLK008 ends — no conflict"
    },
]

output_path = config.TRAINS_FILE
with open(output_path, 'w') as f:
    json.dump(FIXED_TRAINS, f, indent=2)

print(f"Written {len(FIXED_TRAINS)} trains to {output_path}")
print()

# Quick verification
import sys
sys.path.insert(0, '.')
from data_loader import load_all_data
from models import OptimizationConfig
from optimization.conflicts import find_feasible_tasks

tasks, blocks, trains, resources, rules = load_all_data(
    tasks_file=config.TASKS_FILE, blocks_file=config.BLOCKS_FILE,
    trains_file=config.TRAINS_FILE, resources_file=config.RESOURCES_FILE,
    compatibility_rules_file=config.COMPATIBILITY_RULES_FILE,
)
cfg = OptimizationConfig()
print("Feasibility check after fix:")
for block in sorted(blocks, key=lambda b: b.start_time):
    feasible, infeasible = find_feasible_tasks(
        block=block, tasks=tasks, trains=trains, resources=resources,
        compatibility_rules=rules, safety_buffer_minutes=cfg.train_safety_buffer_minutes,
    )
    print(f"  {block.block_id} ({block.section}): {len(feasible)} feasible {[t.task_id for t in feasible]}")
