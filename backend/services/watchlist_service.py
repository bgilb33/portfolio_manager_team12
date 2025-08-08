import logging
import yfinance as yf
from utils.database import get_supabase_client

logger = logging.getLogger(__name__)

def get_watchlist(user_id):
    """Fetches the user's watchlist with detailed ticker information."""
    client = get_supabase_client()
    response = client.table('watchlist').select('symbol').eq('user_id', user_id).execute()
    if not response.data:
        return []

    watchlist_details = []
    for item in response.data:
        try:
            # Use the same reliable method as market service
            from services.market_service import fetch_current_price
            price_data = fetch_current_price(item['symbol'])
            
            # Get ticker info for additional data regardless of price_data success
            ticker = yf.Ticker(item['symbol'])
            info = ticker.info
            
            if price_data:
                current_price = price_data.get('current_price')
                previous_close = price_data.get('previous_close')
                day_change = price_data.get('day_change', 0)
                day_change_percent = price_data.get('day_change_percent', 0)
                company_name = price_data.get('name') or info.get('longName')
                logger.info(f"Watchlist {item['symbol']}: ${current_price:.2f}, day_change=${day_change:+.2f} ({day_change_percent:+.2f}%)")
            else:
                # Fallback to direct yfinance call
                current_price = info.get('currentPrice') or info.get('regularMarketPrice')
                previous_close = info.get('previousClose')
                company_name = info.get('longName')
                day_change = 0
                day_change_percent = 0
                if current_price and previous_close and previous_close != 0:
                    day_change = float(current_price - previous_close)
                    day_change_percent = float((day_change / previous_close) * 100)
                logger.info(f"Watchlist {item['symbol']} (fallback): ${current_price:.2f}, day_change=${day_change:+.2f} ({day_change_percent:+.2f}%)")
            
            watchlist_details.append({
                'symbol': item['symbol'],
                'name': company_name,
                'current_price': current_price,
                'open': info.get('open'),
                'high': info.get('dayHigh'),
                'low': info.get('dayLow'),
                'previousClose': previous_close,
                'day_change': day_change,
                'day_change_percent': day_change_percent,
                'marketCap': info.get('marketCap'),
                'fiftyTwoWeekHigh': info.get('fiftyTwoWeekHigh'),
                'fiftyTwoWeekLow': info.get('fiftyTwoWeekLow'),
                'recommendations': ticker.recommendations.to_dict('records') if hasattr(ticker, 'recommendations') else []
            })
        except Exception as e:
            logger.error(f"Error fetching info for {item['symbol']}: {e}")
            # Add the symbol with minimal data if yfinance fails
            watchlist_details.append({'symbol': item['symbol'], 'name': 'Data not available'})

    return watchlist_details

def add_to_watchlist(user_id, symbol):
    """Adds a ticker to the user's watchlist."""
    # First, check if the asset exists in the assets table
    client = get_supabase_client()
    response = client.table('assets').select('symbol').eq('symbol', symbol).execute()
    if not response.data:
        # If not, fetch from yfinance and add it
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            quote_type = info.get('quoteType')
            asset_type = 'STOCK' if quote_type == 'EQUITY' else quote_type
            asset_data = {
                'symbol': symbol,
                'name': info.get('longName'),
                'asset_type': asset_type
            }
            client.table('assets').upsert(asset_data).execute()
        except Exception as e:
            logger.error(f"Failed to fetch info for new asset {symbol}: {e}")
            raise ValueError(f"Invalid symbol: {symbol}")

    # Add to watchlist
    response = client.table('watchlist').insert({'user_id': user_id, 'symbol': symbol}).execute()
    return response.data

def remove_from_watchlist(user_id, symbol):
    """Removes a ticker from the user's watchlist."""
    client = get_supabase_client()
    response = client.table('watchlist').delete().match({'user_id': user_id, 'symbol': symbol}).execute()
    return response.data
