"""
Portfolio management service - Single portfolio per user
CORRECTED: Works directly with user_id, no portfolios table needed
"""

import logging
from utils.database import get_supabase_client
from utils.validators import validate_required_field
from services.holdings_service import get_user_holdings, calculate_portfolio_totals
from services.analytics_service import calculate_portfolio_performance

logger = logging.getLogger(__name__)

def get_user_portfolio(user_id: str):
    """Get the user's portfolio information (simplified - no separate portfolio table)"""
    try:
        client = get_supabase_client()
        
        # Get user profile (acts as portfolio info)
        response = client.table('user_profiles').select('*').eq('id', user_id).execute()
        
        if response.data:
            user_profile = response.data[0]
            # Add portfolio-specific fields
            user_profile['portfolio_id'] = user_id  # For compatibility
            user_profile['name'] = 'My Portfolio'
            user_profile['description'] = 'Personal investment portfolio'
            return user_profile
        else:
            # Create user profile if it doesn't exist
            return create_user_profile(user_id)
    except Exception as e:
        logger.error(f"Error fetching portfolio for user {user_id}: {e}")
        raise Exception("Failed to fetch portfolio")

def create_user_profile(user_id: str):
    """Create user profile (acts as portfolio info)"""
    try:
        client = get_supabase_client()
        
        user_data = {
            'id': user_id,
            'full_name': 'User',
            'portfolio_id': user_id,
            'name': 'My Portfolio',
            'description': 'Personal investment portfolio'
        }
        
        response = client.table('user_profiles').insert({
            'id': user_id,
            'full_name': 'User'
        }).execute()
        
        return user_data
    except Exception as e:
        logger.error(f"Error creating user profile: {e}")
        raise Exception("Failed to create user profile")

def get_portfolio_details(user_id: str):
    """Get detailed portfolio information including holdings and performance"""
    try:
        # Get user portfolio info
        portfolio = get_user_portfolio(user_id)
        
        # Get holdings with current market values
        holdings = get_user_holdings(user_id)
        
        # Calculate portfolio totals
        totals = calculate_portfolio_totals(user_id)
        
        # Calculate performance metrics
        performance = calculate_portfolio_performance(user_id)
        
        # Combine all data into a single, unified object
        return {
            'portfolio': portfolio,
            'summary': totals,
            'holdings': holdings
        }
    except Exception as e:
        logger.error(f"Error getting portfolio details: {e}")
        raise Exception("Failed to get portfolio details")

def update_portfolio(user_id: str, update_data: dict):
    """Update user profile information"""
    try:
        client = get_supabase_client()
        
        # Only allow updating certain fields
        allowed_fields = ['full_name']
        filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        if not filtered_data:
            raise ValueError("No valid fields to update")
        
        response = client.table('user_profiles')\
            .update(filtered_data)\
            .eq('id', user_id)\
            .execute()
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error updating portfolio: {e}")
        raise e


def get_portfolio_summary(user_id: str):
    """Get a quick summary of portfolio key metrics"""
    try:
        totals = calculate_portfolio_totals(user_id)
        holdings = get_user_holdings(user_id)
        
        # Get top holdings by value
        stock_holdings = [h for h in holdings if h['symbol'] != 'CASH' and h['quantity'] > 0]
        stock_holdings.sort(key=lambda x: x['market_value'], reverse=True)
        top_holdings = stock_holdings[:5]
        
        return {
            'total_value': totals['total_market_value'],
            'total_cost': totals['total_cost_basis'],
            'total_gain_loss': totals['total_gain_loss'],
            'gain_loss_percent': totals['total_gain_loss_percent'],
            'cash_balance': totals['cash_balance'],
            'positions_count': totals['total_positions'],
            'top_holdings': top_holdings
        }
    except Exception as e:
        logger.error(f"Error getting portfolio summary: {e}")
        return {
            'total_value': 0,
            'total_cost': 0,
            'total_gain_loss': 0,
            'gain_loss_percent': 0,
            'cash_balance': 0,
            'positions_count': 0,
            'top_holdings': []
        } 