import pytest
from fastapi import status
from app.models.user_model import Case

@pytest.mark.asyncio
async def test_create_case(client):
    """Test case creation."""
    case_data = {
        "case_number": "CASE-2024-001",
        "case_title": "Smith v. Johnson",
        "case_type": "Civil",
        "court_name": "District Court",
        "status": "Open",
        "client_id": "CLIENT-001"
    }
    response = client.post("/api/v1/cases/", json=case_data)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["case_number"] == "CASE-2024-001"
    assert data["case_title"] == "Smith v. Johnson"
    assert "id" in data
    assert "created_at" in data

@pytest.mark.asyncio
async def test_list_cases(client, test_db):
    """Test listing cases."""
    # Create test cases
    for i in range(3):
        case = Case(
            case_number=f"CASE-2024-{i:03d}",
            case_title=f"Case {i}",
            status="Open"
        )
        test_db.add(case)
    await test_db.commit()
    
    response = client.get("/api/v1/cases/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 3
    assert all("id" in case for case in data)

@pytest.mark.asyncio
async def test_list_cases_with_filter(client, test_db):
    """Test listing cases with status filter."""
    # Create test cases with different statuses
    case1 = Case(case_number="CASE-001", case_title="Open Case", status="Open")
    case2 = Case(case_number="CASE-002", case_title="Closed Case", status="Closed")
    test_db.add(case1)
    test_db.add(case2)
    await test_db.commit()
    
    response = client.get("/api/v1/cases/?status_filter=Open")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "Open"

@pytest.mark.asyncio
async def test_get_case(client, test_db):
    """Test getting a specific case."""
    case = Case(
        case_number="CASE-2024-001",
        case_title="Test Case",
        status="Open"
    )
    test_db.add(case)
    await test_db.commit()
    await test_db.refresh(case)
    
    response = client.get(f"/api/v1/cases/{case.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["case_number"] == "CASE-2024-001"

@pytest.mark.asyncio
async def test_get_nonexistent_case(client):
    """Test getting nonexistent case."""
    from uuid import uuid4
    response = client.get(f"/api/v1/cases/{uuid4()}")
    assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.asyncio
async def test_update_case(client, test_db):
    """Test updating a case."""
    case = Case(
        case_number="CASE-2024-001",
        case_title="Original Title",
        status="Open"
    )
    test_db.add(case)
    await test_db.commit()
    await test_db.refresh(case)
    
    update_data = {"case_title": "Updated Title", "status": "On Hold"}
    response = client.put(f"/api/v1/cases/{case.id}", json=update_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["case_title"] == "Updated Title"
    assert data["status"] == "On Hold"

@pytest.mark.asyncio
async def test_delete_case(client, test_db):
    """Test deleting a case."""
    case = Case(
        case_number="CASE-2024-001",
        case_title="Test Case",
        status="Open"
    )
    test_db.add(case)
    await test_db.commit()
    await test_db.refresh(case)
    
    response = client.delete(f"/api/v1/cases/{case.id}")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify deletion
    response = client.get(f"/api/v1/cases/{case.id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND
