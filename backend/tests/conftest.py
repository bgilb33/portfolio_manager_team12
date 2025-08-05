"""
Pytest configuration and fixtures for backend testing
"""
import pytest
import os
import sys
from unittest.mock import Mock, patch
from flask import Flask

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    from app import app as flask_app
    flask_app.config['TESTING'] = True
    flask_app.config['WTF_CSRF_ENABLED'] = False
    return flask_app

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """A test runner for the app's Click commands."""
    return app.test_cli_runner()

@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for testing."""
    mock_client = Mock()
    
    # Mock auth methods
    mock_auth = Mock()
    mock_user = Mock()
    mock_user.user = Mock()
    mock_user.user.id = "550e8400-e29b-41d4-a716-446655440000"  # Valid UUID format
    mock_auth.get_user.return_value = mock_user
    mock_client.auth = mock_auth
    
    # Mock table methods
    mock_table = Mock()
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.upsert.return_value = mock_table
    mock_table.execute.return_value = Mock(data=[])
    mock_client.table.return_value = mock_table
    
    return mock_client

@pytest.fixture
def mock_yfinance():
    """Mock yfinance for testing."""
    mock_ticker = Mock()
    mock_ticker.info = {
        'symbol': 'AAPL',
        'longName': 'Apple Inc.',
        'sector': 'Technology',
        'industry': 'Consumer Electronics',
        'currentPrice': 150.0,
        'marketCap': 2500000000000,
        'volume': 50000000,
        'fiftyDayAverage': 145.0,
        'twoHundredDayAverage': 140.0
    }
    mock_ticker.history.return_value = Mock()
    
    with patch('yfinance.Ticker', return_value=mock_ticker) as mock:
        yield mock 