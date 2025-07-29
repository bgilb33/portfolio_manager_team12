"""
Database utility functions for Supabase operations
Single portfolio per user system
"""

import os
from supabase import create_client, Client
import logging

logger = logging.getLogger(__name__)

# Supabase client instance
supabase: Client = None

def init_database():
    """Initialize Supabase client"""
    global supabase
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase credentials not found in environment variables")
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return supabase

def get_supabase_client():
    """Get Supabase client instance"""
    global supabase
    if supabase is None:
        supabase = init_database()
    return supabase 