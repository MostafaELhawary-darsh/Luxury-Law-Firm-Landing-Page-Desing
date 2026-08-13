import pytest
from fastapi import status
from app.schemas.user import UserCreate

@pytest.mark.asyncio
async def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_register_user(client):
    """Test user registration."""
    user_data = {
        "username": "newuser",
        "email": "newuser@example.com",
        "full_name": "New User",
        "password": "securepassword123"
    }
    response = client.post("/api/v1/users/register", json=user_data)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert "hashed_password" not in data

@pytest.mark.asyncio
async def test_register_duplicate_user(client, test_user):
    """Test registration with duplicate username."""
    user_data = {
        "username": "testuser",
        "email": "another@example.com",
        "password": "securepassword123"
    }
    response = client.post("/api/v1/users/register", json=user_data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_success(client, test_user):
    """Test successful user login."""
    login_data = {
        "username": "testuser",
        "password": "testpassword123"
    }
    response = client.post("/api/v1/auth/token", data=login_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_credentials(client, test_user):
    """Test login with invalid credentials."""
    login_data = {
        "username": "testuser",
        "password": "wrongpassword"
    }
    response = client.post("/api/v1/auth/token", data=login_data)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    """Test login with nonexistent user."""
    login_data = {
        "username": "nonexistent",
        "password": "password123"
    }
    response = client.post("/api/v1/auth/token", data=login_data)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
