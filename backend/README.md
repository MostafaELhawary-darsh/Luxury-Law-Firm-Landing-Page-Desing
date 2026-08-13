This branch contains a scaffold FastAPI backend and an initial conversion of firmTypes.ts to Pydantic models.

What I added:
- backend/pyproject.toml (Poetry project)
- backend/app/main.py (FastAPI app entry)
- backend/app/api/v1/firm.py (basic CRUD endpoints for cases using in-memory store)
- backend/package/firm/types.py (Pydantic models converted from src/lib/firmTypes.ts — initial subset)

Next steps I suggest:
- Expand the Pydantic models to cover remaining interfaces in firmTypes.ts
- Add persistent storage (Postgres + SQLAlchemy) and migrations (Alembic)
- Add authentication, tests, and CI

To run locally (after installing dependencies):
1. cd backend
2. poetry install
3. poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

