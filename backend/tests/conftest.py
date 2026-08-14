import pytest
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.core.security import hash_password
from app.models.user_model import User
from fastapi.testclient import TestClient
from httpx import AsyncClient

# Database URL for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def test_db():
    """Create test database and session."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
    )
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()

@pytest.fixture
def override_get_db(test_db):
    """Override get_db dependency."""
    def _override_get_db():
        return test_db
    
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def client(override_get_db):
    """Create test client."""
    return TestClient(app)

@pytest.fixture
async def async_client(override_get_db):
    """Create async test client."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
async def test_user(test_db):
    """Create test user."""
    user = User(
        username="testuser",
        email="test@example.com",
        full_name="Test User",
        hashed_password=hash_password("testpassword123")
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user
