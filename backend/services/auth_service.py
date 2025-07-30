#Authentication service for handling user authentication and authorization

import logging
from utils.database import get_supabase_client

logger = logging.getLogger(__name__)


def verify_user_token(token: str): #Verify JWT token and return user information
    try:
        client = get_supabase_client()
        user = client.auth.get_user(token)
        return user.user
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return None

def get_user_profile(user_id: str): #Get user profile information
    try:
        client = get_supabase_client()
        response = client.table('user_profiles').select('*').eq('id', user_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        return None

def create_user_profile(user_id: str, full_name: str = None): #Create user profile if it doesn't exist
    try:
        client = get_supabase_client()
        profile_data = {
            'id': user_id,
            'full_name': full_name or 'User'
        }
        response = client.table('user_profiles').upsert(profile_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating user profile: {e}")
        return None

def sign_up_user(email, password):
    try:
        client = get_supabase_client()
        auth_response = client.auth.sign_up({"email": email, "password": password})
        if auth_response.user:
            user_id = auth_response.user.id
            create_user_profile(user_id, full_name=email)
        return auth_response
    except Exception as e:
        logger.error(f"Sign up failed: {e}")
        raise e

def sign_in_user(email, password):
    try:
        client = get_supabase_client()
        auth_response = client.auth.sign_in_with_password({"email": email, "password": password})
        return auth_response
    except Exception as e:
        logger.error(f"Sign in failed: {e}")
        raise e