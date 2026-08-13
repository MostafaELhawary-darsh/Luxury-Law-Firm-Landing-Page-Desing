# Backend README - next steps

This branch contains a scaffold FastAPI backend with:
- Pydantic types converted from firmTypes.ts (initial subset)
- SQLAlchemy models and async session
- Alembic env.py (skeleton)
- OAuth2 JWT token endpoint (prototype)
- Celery app and a simple deadline engine task

Next recommended steps:
- Run `poetry install` inside backend/ and create the database configured in DATABASE_URL
- Create Alembic migrations (alembic revision --autogenerate -m "initial") and apply
- Replace the fake user store with a real users table and secure password handling
- Add tests and CI
