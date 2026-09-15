# RAILFUSE — Development Guide

**Smart India Hackathon 2026 | PS ID: SIH26027**

---

## Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend runtime |
| npm | 9+ | Package manager |
| Git | 2.40+ | Version control |

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/mohands0810-debug/RAILFUSE.git
cd RAILFUSE
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env if needed — defaults work for local development
```

### 3. Backend Setup

```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 4. Frontend Setup

```bash
cd frontend-react
npm install
```

---

## Running the Application

### Start Backend

```bash
cd backend
# Activate venv first
venv\Scripts\activate  # Windows

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: http://localhost:8000
API Docs: http://localhost:8000/docs

### Start Frontend

```bash
cd frontend-react
npm run dev
```

Frontend runs at: http://localhost:3000

---

## Project Structure

```
RAILFUSE/
├── README.md                    # Project overview
├── .gitignore                   # Git ignore rules
├── .env.example                 # Environment template
│
├── docs/                        # Documentation
├── data/
│   └── synthetic/               # Synthetic JSON datasets
├── backend/                     # Python FastAPI
│   ├── main.py                  # Application entry point
│   ├── config.py                # Configuration
│   ├── requirements.txt         # Python dependencies
│   ├── models/                  # Pydantic data models
│   ├── optimization/            # Core algorithm
│   ├── api/                     # API routes
│   └── tests/                   # pytest tests
├── frontend-react/              # Vite + React SPA
│   ├── package.json
│   ├── vite.config.js           # Proxy /api → localhost:8000
│   └── src/
│       ├── api/client.js        # Typed API client
│       ├── hooks/useApi.js      # Data-fetching hooks
│       ├── components/UI.jsx    # Shared components
│       └── pages/               # 6 page components
└── scripts/
    └── generate_dataset.py      # Regenerate synthetic data
```

---

## Running Tests

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Specific test files:

```bash
pytest tests/test_intelligence.py -v    # Debt and flexibility
pytest tests/test_conflicts.py -v       # Conflict detection
pytest tests/test_optimizer.py -v       # Optimization pipeline
pytest tests/test_api.py -v             # API endpoints
```

### Test Coverage

```bash
pytest tests/ --cov=. --cov-report=html
```

---

## Dataset Regeneration

```bash
cd scripts
python generate_dataset.py   # Recreate fresh synthetic data
```

---

## Making Code Changes

### Backend Changes

1. Edit files in `backend/`
2. Backend auto-reloads with `--reload` flag
3. Run `pytest tests/` after changes
4. Check API at http://localhost:8000/docs

### Frontend Changes

1. Edit files in `frontend-react/src/`
2. Vite hot-reloads automatically (HMR)
3. Check browser console for errors

### Adding a New Optimization Feature

1. Implement in `backend/optimization/`
2. Write tests in `backend/tests/`
3. Connect to API in `backend/api/routes.py`
4. Update `docs/ALGORITHM.md`

---

## Optimization Configuration

Optimization weights can be adjusted in `.env`:

```bash
OPTIMIZER_SEED=42
OPTIMIZER_LOOKAHEAD_DEPTH=3
```

Or passed directly to `POST /optimize`:

```json
{
  "config": {
    "w_maintenance": 2.0,
    "w_risk": 1.5,
    "lookahead_depth": 3
  }
}
```

---

## Common Issues

### Backend not starting

```bash
# Check Python version
python --version  # Must be 3.11+

# Check dependencies installed
pip install -r requirements.txt

# Check port not in use
netstat -an | findstr 8000
```

### Frontend API errors

```bash
# Vite proxies /api to http://localhost:8000 via vite.config.js
# Check backend is running:
curl http://localhost:8000/
```

### Dataset errors

```bash
# Regenerate synthetic dataset
cd scripts && python generate_dataset.py
```

---

## Git Workflow

```bash
# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "feat: add new feature"

# Push
git push origin main
```

### Commit Message Convention

| Prefix | Usage |
|--------|-------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation |
| `test:` | Tests |
| `refactor:` | Code refactoring |
| `chore:` | Maintenance |

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `RAILFUSE_ENV` | development | Environment |
| `RAILFUSE_HOST` | 0.0.0.0 | Backend host |
| `RAILFUSE_PORT` | 8000 | Backend port |
| `RAILFUSE_DEBUG` | true | Debug mode |
| `OPTIMIZER_SEED` | 42 | Random seed |
| `OPTIMIZER_LOOKAHEAD_DEPTH` | 3 | Look-ahead depth |

---

*Development guide version: 1.0.0*
