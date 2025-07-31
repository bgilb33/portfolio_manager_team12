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
            ticker = yf.Ticker(item['symbol'])
            info = ticker.info
            
            # Extract comprehensive details
            watchlist_details.append({
                'symbol': item['symbol'],
                'name': info.get('longName'),
                'open': info.get('open'),
                'high': info.get('dayHigh'),
                'low': info.get('dayLow'),
                'previousClose': info.get('previousClose'),
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
