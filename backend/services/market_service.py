"""
Market data service for portfolio tracking
SIMPLIFIED: Portfolio-focused, minimal individual stock research features
"""

import logging
import yfinance as yf
from datetime import datetime, timezone, timedelta
from utils.database import get_supabase_client
from utils.validators import validate_stock_symbol

logger = logging.getLogger(__name__)

def search_symbols(query: str, fuzzy: bool = True):
    """
    Search for stock symbols using yfinance with optional fuzzy search.
    """
    try:
        if not query:
            return []

        # Use yfinance.Search with fuzzy matching enabled
        search_instance = yf.Search(
            query,
            max_results=10,
            enable_fuzzy_query=fuzzy,
            news_count=0,  # Disable news to speed up
        )
        
        # Execute the search
        results = search_instance.search()
        
        # Format results for the frontend with price information
        formatted_results = []
        for result in results.quotes:
            symbol = result.get('symbol')
            if symbol:
                # Try to get current price and company name for the symbol
                try:
                    ticker = yf.Ticker(symbol)
                    info = ticker.info
                    
                    current_price = info.get('currentPrice') or info.get('regularMarketPrice')
                    previous_close = info.get('previousClose', current_price) if current_price else None
                    
                    # Get company name from ticker info
                    company_name = info.get('longName') or info.get('shortName') or symbol
                    
                    if current_price:
                        day_change = current_price - previous_close
                        day_change_percent = (day_change / previous_close * 100) if previous_close else 0
                    else:
                        day_change = 0
                        day_change_percent = 0
                    
                    formatted_results.append({
                        'symbol': symbol,
                        'name': company_name,
                        'exchange': result.get('exchange'),
                        'type': result.get('quoteType'),
                        'current_price': current_price,
                        'previous_close': previous_close,
                        'day_change': day_change,
                        'day_change_percent': day_change_percent,
                    })
                except Exception as e:
                    # If price fetch fails, still include the symbol without price
                    logger.warning(f"Could not fetch price for {symbol}: {e}")
                    formatted_results.append({
                        'symbol': symbol,
                        'name': symbol,  # Fallback to symbol if we can't get company name
                        'exchange': result.get('exchange'),
                        'type': result.get('quoteType'),
                        'current_price': None,
                        'previous_close': None,
                        'day_change': 0,
                        'day_change_percent': 0,
                    })
        
        return formatted_results
    except Exception as e:
        logger.error(f"Error searching for symbol {query}: {e}")
        return []

def fetch_current_price(symbol: str):
    """Fetch current price from yfinance (ONLY for portfolio refresh)"""
    try:
        symbol = validate_stock_symbol(symbol)
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        current_price = info.get('currentPrice') or info.get('regularMarketPrice')
        previous_close = info.get('previousClose')
        
        if not current_price or not previous_close:
            logger.warning(f"Missing price data for {symbol}: current_price={current_price}, previous_close={previous_close}")
            return None
        
        day_change = current_price - previous_close
        day_change_percent = (day_change / previous_close * 100) if previous_close else 0
        
        return {
            'symbol': symbol,
            'name': info.get('longName', info.get('shortName', symbol)),
            'current_price': current_price,
            'previous_close': previous_close,
            'day_change': day_change,
            'day_change_percent': day_change_percent,
            'last_updated': datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching price for {symbol}: {e}")
        return None

def get_cached_price(symbol: str):
    """Get cached price from database (NO yfinance calls)"""
    try:
        client = get_supabase_client()
        response = client.table('market_prices').select('*').eq('symbol', symbol).execute()
        
        if response.data:
            price_data = response.data[0]
            
            # Get company name from assets table
            from services.holdings_service import get_asset_info
            asset_info = get_asset_info(symbol)
            if asset_info:
                price_data['name'] = asset_info.get('name', symbol)
            else:
                price_data['name'] = symbol
                
            return price_data
        
        return None
    except Exception as e:
        logger.error(f"Error getting cached price for {symbol}: {e}")
        return None

def cache_price(symbol: str, price_data: dict):
    """Cache price data in database"""
    try:
        client = get_supabase_client()
        
        # Ensure asset exists in assets table before caching price
        from services.holdings_service import add_new_asset_if_needed
        add_new_asset_if_needed(symbol, price_data.get('name', symbol))
        
        # Prepare data for database (market_prices table doesn't have name column)
        cache_data = {
            'symbol': symbol,
            'current_price': price_data.get('current_price'),
            'previous_close': price_data.get('previous_close'),
            'day_change': price_data.get('day_change'),
            'day_change_percent': price_data.get('day_change_percent'),
            'last_updated': price_data.get('last_updated', datetime.now(timezone.utc).isoformat())
        }
        
        # Remove None values
        cache_data = {k: v for k, v in cache_data.items() if v is not None}
        
        response = client.table('market_prices').upsert(cache_data, on_conflict='symbol').execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error caching price for {symbol}: {e}")
        return None

def get_current_price(symbol: str, force_fresh: bool = False):
    """Get current price for individual stock lookup (for adding to portfolio)"""
    try:
        # If force_fresh is True, always fetch fresh data
        if force_fresh:
            price_data = fetch_current_price(symbol)
            if price_data:
                cache_price(symbol, price_data)
                return price_data
            return None
        
        # Try cache first
        cached_price = get_cached_price(symbol)
        if cached_price:
            return cached_price
        
        # If not cached, fetch fresh price
        price_data = fetch_current_price(symbol)
        if price_data:
            cache_price(symbol, price_data)
            return price_data
        
        return None
    except Exception as e:
        logger.error(f"Error getting current price for {symbol}: {e}")
        return None

def refresh_all_prices(user_id: str):
    """Refresh prices for user's portfolio holdings with fresh day change data"""
    try:
        from services.holdings_service import get_user_symbols
        
        # Get symbols for this specific user (excluding CASH)
        symbols = get_user_symbols(user_id)
        
        if not symbols:
            logger.info(f"No symbols to refresh for user {user_id}")
            return 0
        
        updated_count = 0
        failed_symbols = []
        
        logger.info(f"Starting price refresh for {len(symbols)} symbols: {symbols}")
        
        for symbol in symbols:
            try:
                # Fetch current price from yfinance with day change calculation
                price_data = fetch_current_price(symbol)
                if price_data:
                    # Cache the price data
                    cache_price(symbol, price_data)
                    updated_count += 1
                    logger.info(f"Updated {symbol}: ${price_data['current_price']}, day_change={price_data.get('day_change', 0)}, day_change_percent={price_data.get('day_change_percent', 0)}%")
                else:
                    failed_symbols.append(symbol)
                    logger.warning(f"Failed to get price for {symbol}")
            except Exception as e:
                logger.error(f"Error updating price for {symbol}: {e}")
                failed_symbols.append(symbol)
        
        logger.info(f"Refreshed {updated_count}/{len(symbols)} prices for user {user_id}")
        
        if failed_symbols:
            logger.warning(f"Failed to update prices for: {failed_symbols}")
        
        return updated_count
    except Exception as e:
        logger.error(f"Error refreshing prices for user {user_id}: {e}")
        raise Exception("Failed to refresh prices")

def get_market_status():
    """Get basic market status"""
    try:
        # Simple market status check using SPY
        spy = yf.Ticker("SPY")
        info = spy.info
        
        return {
            'market_open': info.get('regularMarketTime') is not None,
            'current_time': datetime.now(timezone.utc).isoformat(),
            'spy_price': info.get('currentPrice', 0),
            'last_updated': datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting market status: {e}")
        return {
            'market_open': False,
            'current_time': datetime.now(timezone.utc).isoformat(),
            'spy_price': 0,
            'last_updated': datetime.now(timezone.utc).isoformat()
        }

def fetch_sector_info(symbol: str):
    """Fetch sector information from yfinance for a given symbol"""
    try:
        symbol = validate_stock_symbol(symbol)
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # Extract sector information
        sector = info.get("sector")
        
        return {
            'symbol': symbol,
            'sector': sector,
            'name': info.get('longName', info.get('shortName', symbol))
        }
    except Exception as e:
        logger.error(f"Error fetching sector info for {symbol}: {e}")
        return {
            'symbol': symbol,
            'sector': None,
            'name': symbol
        }

# Portfolio-focused historical data functions

def store_portfolio_snapshot(user_id: str, portfolio_value: float, date: str = None):
    """Store daily portfolio value snapshot for historical tracking"""
    try:
        client = get_supabase_client()
        
        snapshot_date = date or datetime.now(timezone.utc).strftime('%Y-%m-%d')
        
        # Store portfolio value snapshot
        response = client.table('portfolio_snapshots').upsert({
            'user_id': user_id,
            'date': snapshot_date,
            'total_value': portfolio_value,
            'created_at': datetime.now(timezone.utc).isoformat()
        }, on_conflict='user_id,date').execute()
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error storing portfolio snapshot: {e}")
        return None

def get_portfolio_value_history(user_id: str, days: int = 30):
    """Get portfolio value history for charts with daily net change calculation"""
    try:
        client = get_supabase_client()
        cutoff_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        # Get portfolio snapshots
        response = client.table('portfolio_snapshots')\
            .select('date, total_value')\
            .eq('user_id', user_id)\
            .gte('date', cutoff_date)\
            .order('date')\
            .execute()
        
        chart_data = response.data
        
        # Calculate cumulative changes
        cumulative_changes = []
        cumulative_change = 0
        
        for i, data_point in enumerate(chart_data):
            if i == 0:
                # First day: no change (starts at 0)
                daily_change = 0
            else:
                # Calculate change from previous day
                previous_value = chart_data[i-1]['total_value']
                current_value = data_point['total_value']
                daily_change = current_value - previous_value
            
            cumulative_change += daily_change
            
            # Add cumulative change info to the data point
            enhanced_data_point = {
                **data_point,
                'cumulative_change': cumulative_change
            }
            cumulative_changes.append(enhanced_data_point)
        
        return {
            'chart_data': cumulative_changes,
            'period_days': days
        }
    except Exception as e:
        logger.error(f"Error getting portfolio value history: {e}")
        return {
            'chart_data': [],
            'period_days': days
        }

