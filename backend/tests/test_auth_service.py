"""
Unit tests for auth_service.py
"""
import pytest
from unittest.mock import Mock, patch
from services.auth_service import verify_user_token, get_user_profile, create_user_profile


class TestAuthService:
    
    def test_verify_user_token_success(self, mock_supabase_client):
        """Test successful token verification."""
        with patch('services.auth_service.get_supabase_client', return_value=mock_supabase_client):
            result = verify_user_token("valid-token")
            
            assert result is not None
            assert result.id == "550e8400-e29b-41d4-a716-446655440000"
            mock_supabase_client.auth.get_user.assert_called_once_with("valid-token")
    
    def test_verify_user_token_failure(self, mock_supabase_client):
        """Test token verification failure."""
        mock_supabase_client.auth.get_user.side_effect = Exception("Invalid token")
        
        with patch('services.auth_service.get_supabase_client', return_value=mock_supabase_client):
            result = verify_user_token("invalid-token")
            
            assert result is None
    
    def test_get_user_profile_success(self, mock_supabase_client):
        """Test successful user profile retrieval."""
        mock_response = Mock()
        mock_response.data = [{'id': 'test-user-id', 'full_name': 'Test User'}]
        mock_supabase_client.table().select().eq().execute.return_value = mock_response
        
        with patch('services.auth_service.get_supabase_client', return_value=mock_supabase_client):
            result = get_user_profile("test-user-id")
            
            assert result is not None
            assert result['id'] == 'test-user-id'
            assert result['full_name'] == 'Test User'
    
    def test_get_user_profile_not_found(self, mock_supabase_client):
        """Test user profile retrieval when user doesn't exist."""
        mock_response = Mock()
        mock_response.data = []
        mock_supabase_client.table().select().eq().execute.return_value = mock_response
        
        with patch('services.auth_service.get_supabase_client', return_value=mock_supabase_client):
            result = get_user_profile("non-existent-user")
            
            assert result is None
    
    def test_get_user_profile_error(self, mock_supabase_client):
        """Test user profile retrieval with database error."""
        mock_supabase_client.table().select().eq().execute.side_effect = Exception("Database error")
        
        with patch('services.auth_service.get_supabase_client', return_value=mock_supabase_client):
            result = get_user_profile("test-user-id")
            
            assert result is None
    
    def test_create_user_profile_success(self, mock_supabase_client):
        """Test successful user profile creation."""
        mock_response = Mock()
        mock_response.data = [{'id': 'test-user-id', 'full_name': 'New User'}]
        mock_supabase_client.table().upsert().execute.return_value = mock_response
        
        with patch('services.auth_service.get_supabase_client', return_value=mock_supabase_client):
            result = create_user_profile("test-user-id", "New User")
            
            assert result is not None
            assert result['id'] == 'test-user-id'
            assert result['full_name'] == 'New User'
    
    def test_create_user_profile_default_name(self, mock_supabase_client):
        """Test user profile creation with default name."""
        mock_response = Mock()
        mock_response.data = [{'id': 'test-user-id', 'full_name': 'User'}]
        mock_supabase_client.table().upsert().execute.return_value = mock_response
        
        with patch('services.auth_service.get_supabase_client', return_value=mock_supabase_client):
            result = create_user_profile("test-user-id")
            
            assert result is not None
            assert result['full_name'] == 'User'
    
    def test_create_user_profile_error(self, mock_supabase_client):
        """Test user profile creation with database error."""
        mock_supabase_client.table().upsert().execute.side_effect = Exception("Database error")
        
        with patch('services.auth_service.get_supabase_client', return_value=mock_supabase_client):
            result = create_user_profile("test-user-id", "Test User")
            
            assert result is None 