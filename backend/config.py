"""
RAILFUSE Backend Configuration
Smart India Hackathon 2026 | PS ID: SIH26027 | Team: Runtime Rebels
"""
import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent.parent

# Data directory
DATA_DIR = BASE_DIR / "data" / "synthetic"

# Environment
ENV = os.getenv("RAILFUSE_ENV", "development")
DEBUG = os.getenv("RAILFUSE_DEBUG", "true").lower() == "true"
HOST = os.getenv("RAILFUSE_HOST", "0.0.0.0")
PORT = int(os.getenv("RAILFUSE_PORT", "8000"))

# Optimization
OPTIMIZER_SEED = int(os.getenv("OPTIMIZER_SEED", "42"))
OPTIMIZER_LOOKAHEAD_DEPTH = int(os.getenv("OPTIMIZER_LOOKAHEAD_DEPTH", "3"))

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# CORS
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

# Dataset files
TASKS_FILE = DATA_DIR / "tasks.json"
BLOCKS_FILE = DATA_DIR / "blocks.json"
TRAINS_FILE = DATA_DIR / "trains.json"
RESOURCES_FILE = DATA_DIR / "resources.json"
COMPATIBILITY_RULES_FILE = DATA_DIR / "compatibility_rules.json"

# API Info
API_TITLE = "RAILFUSE API"
API_VERSION = "1.0.0"
API_DESCRIPTION = """
RAILFUSE — Opportunity-Aware Adaptive Block Planner

Smart India Hackathon 2026 | PS ID: SIH26027 | Team: Runtime Rebels

⚠️ **DISCLAIMER**: This API serves synthetic demonstration data only. 
It is NOT connected to live Indian Railways operational systems.
All data is synthetic and for demonstration purposes only.
"""
