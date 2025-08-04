import logging
from decimal import Decimal
from utils.database import get_supabase_client
from services.market_service import get_cached_price
from utils.validators import validate_positive_number

logger = logging.getLogger(__name__)

def get_user_holdings(user_id: str):
    """Get all holdings for a user with current market values (from cached prices)"""
    try:
        client = get_supabase_client()
        response = client.table('holdings').select('*').eq('user_id', user_id).execute()
        holdings = []
        
        for holding in response.data:
            symbol = holding['symbol']
            quantity = Decimal(str(holding['quantity']))
            average_cost = Decimal(str(holding['average_cost']))
            
            # Get total realized gain/loss for this holding
            realized_gain_loss_total = get_total_realized_gain_loss(user_id, symbol)

            if symbol == 'CASH':
                holdings.append({
                    'symbol': symbol,
                    'name': 'Cash',
                    'quantity': float(quantity),
                    'average_cost': 1.0,
                    'current_price': 1.0,
                    'market_value': float(quantity),
                    'total_cost': float(quantity),
                    'gain_loss': 0.0,
                    'gain_loss_percent': 0.0,
                    'day_change': 0.0,
                    'day_change_percent': 0.0,
                    'realized_gain_loss': 0.0,
                    'sector': None
                })
            else:
                # Get current price from CACHED market_prices table (no yfinance call)
                price_data = get_cached_price(symbol)
                current_price = Decimal(str(price_data.get('current_price', 0))) if price_data else Decimal('0')
                
                # Get company name and sector from assets table
                asset_data = get_asset_info(symbol)
                company_name = asset_data.get('name', symbol) if asset_data else symbol
                sector = asset_data.get('sector') if asset_data else None
                
                # Calculate values using USER'S cost basis vs CURRENT market price
                market_value = quantity * current_price
                total_cost = quantity * average_cost  # USER'S actual cost basis
                gain_loss = market_value - total_cost
                gain_loss_percent = (gain_loss / total_cost * 100) if total_cost != 0 else 0
                
                holdings.append({
                    'symbol': symbol,
                    'name': company_name,
                    'quantity': float(quantity),
                    'average_cost': float(average_cost),  # USER'S cost basis
                    'current_price': float(current_price),  # From market cache
                    'market_value': float(market_value),
                    'total_cost': float(total_cost),  # USER'S actual investment
                    'gain_loss': float(gain_loss),
                    'gain_loss_percent': float(gain_loss_percent),
                    'day_change': float(price_data.get('day_change', 0)) if price_data else 0.0,
                    'day_change_percent': float(price_data.get('day_change_percent', 0)) if price_data else 0.0,
                    'realized_gain_loss': float(realized_gain_loss_total),
                    'sector': sector
                })
        
        return holdings
    except Exception as e:
        logger.error(f"Error getting user holdings: {e}")
        return []

def get_asset_info(symbol: str):
    """Get asset information from assets table"""
    try:
        client = get_supabase_client()
        response = client.table('assets')\
            .select('*')\
            .eq('symbol', symbol)\
            .single()\
            .execute()
        
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Error getting asset info for {symbol}: {e}")
        return None

def get_holding_by_symbol(user_id: str, symbol: str):
    """Get a specific holding by symbol"""
    try:
        client = get_supabase_client()
        response = client.table('holdings')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('symbol', symbol)\
            .single()\
            .execute()
        
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Error getting holding for {symbol}: {e}")
        return None

def get_user_symbols(user_id: str):
    """Get all unique symbols in user's portfolio (for price refresh)"""
    try:
        client = get_supabase_client()
        response = client.table('holdings')\
            .select('symbol')\
            .eq('user_id', user_id)\
            .neq('symbol', 'CASH')\
            .execute()
        
        return [holding['symbol'] for holding in response.data]
    except Exception as e:
        logger.error(f"Error getting user symbols: {e}")
        return []

def calculate_portfolio_totals(user_id: str):
    """Calculate total portfolio value using cached market prices"""
    try:
        holdings = get_user_holdings(user_id)
        
        total_market_value = sum(holding['market_value'] for holding in holdings)
        total_cost_basis = sum(holding['total_cost'] for holding in holdings)
        total_gain_loss = total_market_value - total_cost_basis
        total_gain_loss_percent = (total_gain_loss / total_cost_basis * 100) if total_cost_basis != 0 else 0
        # Use the new function to get total realized gain/loss across ALL transactions
        total_realized_gain_loss = get_total_realized_gain_loss_for_user(user_id)
        
        cash_balance = next((h['quantity'] for h in holdings if h['symbol'] == 'CASH'), 0)
        total_positions = len([h for h in holdings if h['symbol'] != 'CASH' and h['quantity'] != 0])
        
        return {
            'total_market_value': total_market_value,
            'total_cost_basis': total_cost_basis,
            'total_gain_loss': total_gain_loss,
            'total_gain_loss_percent': total_gain_loss_percent,
            'total_realized_gain_loss': float(total_realized_gain_loss),
            'cash_balance': cash_balance,
            'total_positions': total_positions,
            'holdings_count': len(holdings)
        }
    except Exception as e:
        logger.error(f"Error calculating portfolio totals: {e}")
        return {
            'total_market_value': 0,
            'total_cost_basis': 0,
            'total_gain_loss': 0,
            'total_gain_loss_percent': 0,
            'cash_balance': 0,
            'total_positions': 0,
            'holdings_count': 0
        }

def get_holdings_for_symbol_refresh(user_id: str):
    """Get holdings that need price updates (non-zero positions, excluding cash)"""
    try:
        client = get_supabase_client()
        response = client.table('holdings')\
            .select('symbol, quantity')\
            .eq('user_id', user_id)\
            .neq('symbol', 'CASH')\
            .execute()
        
        return response.data
    except Exception as e:
        logger.error(f"Error getting holdings for refresh: {e}")
        return []

def add_new_asset_if_needed(symbol: str, name: str = None, asset_type: str = 'STOCK'):
    """Add asset to assets table if it doesn't exist (called when user enters new stock)"""
    try:
        client = get_supabase_client()
        
        # Check if asset exists
        existing = client.table('assets').select('symbol').eq('symbol', symbol).execute()
        
        if not existing.data:
            # For stocks, try to get sector information from yfinance
            sector = None
            
            if asset_type == 'STOCK' and symbol != 'CASH':
                try:
                    from services.market_service import fetch_sector_info
                    sector_info = fetch_sector_info(symbol)
                    sector = sector_info.get("sector")
                    # Use the name from yfinance if available
                    if not name and sector_info.get('name'):
                        name = sector_info.get('name')
                except Exception as e:
                    logger.warning(f"Could not fetch sector info for {symbol}: {e}")
            
            # Add new asset
            asset_data = {
                'symbol': symbol,
                'name': name or symbol,
                'asset_type': asset_type
            }
            
            # Add sector if available
            if sector:
                asset_data['sector'] = sector
            
            client.table('assets').insert(asset_data).execute()
            
            logger.info(f"Added new asset: {symbol} (sector: {sector})")
            
    except Exception as e:
        logger.error(f"Error adding asset {symbol}: {e}")
        # Don't raise exception - asset creation is not critical for transaction processing

def clean_zero_holdings(user_id: str):
    """Remove holdings with zero quantity (legacy cleanup - now handled during sell transactions)"""
    try:
        client = get_supabase_client()
        # This function is now mostly for legacy data cleanup
        # Zero holdings are now deleted immediately during sell transactions
        client.table('holdings')\
            .delete()\
            .eq('user_id', user_id)\
            .eq('quantity', 0)\
            .neq('symbol', 'CASH')\
            .execute()
        
        logger.info(f"Cleaned legacy zero holdings for user {user_id}")
        
    except Exception as e:
        logger.error(f"Error cleaning zero holdings: {e}")
        # Don't raise exception - cleanup is not critical

def get_total_realized_gain_loss(user_id: str, symbol: str):
    """Get total realized gain/loss for a specific symbol"""
    try:
        client = get_supabase_client()
        response = client.table('transactions')\
            .select('realized_gain_loss')\
            .eq('user_id', user_id)\
            .eq('symbol', symbol)\
            .eq('transaction_type', 'SELL')\
            .execute()
        
        if not response.data:
            return Decimal('0')
        
        # Calculate total realized gain/loss by summing all SELL transactions
        total_gain_loss = Decimal('0')
        for tx in response.data:
            total_gain_loss += Decimal(str(tx['realized_gain_loss']))
        
        return total_gain_loss
    except Exception as e:
        logger.error(f"Error getting total realized gain/loss for {symbol}: {e}")
        return Decimal('0')

def get_total_realized_gain_loss_for_user(user_id: str):
    """Get total realized gain/loss across ALL transactions for a user"""
    try:
        client = get_supabase_client()
        response = client.table('transactions')\
            .select('realized_gain_loss')\
            .eq('user_id', user_id)\
            .eq('transaction_type', 'SELL')\
            .execute()
        
        if not response.data:
            return Decimal('0')
        
        # Calculate total realized gain/loss by summing all SELL transactions
        total_gain_loss = Decimal('0')
        for tx in response.data:
            total_gain_loss += Decimal(str(tx['realized_gain_loss']))
        
        return total_gain_loss
    except Exception as e:
        logger.error(f"Error getting total realized gain/loss for user {user_id}: {e}")
        return Decimal('0') 