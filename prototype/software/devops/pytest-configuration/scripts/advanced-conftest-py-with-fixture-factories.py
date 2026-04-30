# tests/conftest.py — advanced fixture patterns
import pytest
from unittest.mock import AsyncMock, MagicMock

# Fixture factory — returns a function that creates users
@pytest.fixture
def make_user():
    """Factory fixture: creates users with customizable attributes."""
    def _make_user(name="test_user", role="viewer", active=True):
        return {"name": name, "role": role, "active": active}
    return _make_user

# Session-scoped fixture — expensive setup done once
@pytest.fixture(scope="session")
def database():
    """Set up test database for entire session."""
    db = setup_test_database()
    yield db
    teardown_test_database(db)

# Module-scoped fixture — reset per test module
@pytest.fixture(scope="module")
def api_client(database):
    """Create API client connected to test database."""
    return TestClient(app, database=database)

# Auto-use fixture — runs before every test
@pytest.fixture(autouse=True)
def clean_state(database):
    """Rollback database after each test."""
    yield
    database.rollback()

# Custom marker handling — skip integration tests unless flag set
def pytest_collection_modifyitems(config, items):
    if not config.getoption("--run-integration", default=False):
        skip_marker = pytest.mark.skip(reason="need --run-integration to run")
        for item in items:
            if "integration" in item.keywords:
                item.add_marker(skip_marker)

def pytest_addoption(parser):
    parser.addoption("--run-integration", action="store_true", default=False)
