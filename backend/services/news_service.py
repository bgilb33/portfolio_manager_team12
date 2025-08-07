"""
News service for fetching stock news using yfinance
"""

import logging
import yfinance as yf
from datetime import datetime, timezone
from utils.validators import validate_stock_symbol

logger = logging.getLogger(__name__)

def get_stock_news(symbol: str, count: int = 10, tab: str = 'news'):
    """
    Fetch news for a given stock symbol using yfinance.
    
    Args:
        symbol (str): Stock symbol
        count (int): Number of news articles to fetch (default: 10)
        tab (str): News tab type - "news", "all", or "press releases" (default: "news")
    
    Returns:
        dict: News data with articles list and metadata
    """
    try:
        symbol = validate_stock_symbol(symbol)
        ticker = yf.Ticker(symbol)
        
        # Get news using yfinance
        news_data = ticker.get_news(count=count, tab=tab)
        
        # Format the news data
        formatted_news = []
        for article in news_data:
            # Extract content from the nested structure
            content = article.get('content', {})
            
            # Get the canonical URL for the link
            canonical_url = content.get('canonicalUrl', {})
            link = canonical_url.get('url', '') if canonical_url else ''
            
            # Get provider information
            provider = content.get('provider', {})
            publisher = provider.get('displayName', '') if provider else ''
            
            formatted_article = {
                'title': content.get('title', ''),
                'summary': content.get('summary', ''),
                'link': link,
                'publisher': publisher,
                'published': content.get('pubDate', ''),
                'type': content.get('contentType', ''),
                'uuid': content.get('id', '')
            }
            formatted_news.append(formatted_article)
        
        return {
            'symbol': symbol,
            'count': len(formatted_news),
            'tab': tab,
            'articles': formatted_news,
            'last_updated': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching news for {symbol}: {e}")
        return {
            'symbol': symbol,
            'count': 0,
            'tab': tab,
            'articles': [],
            'error': str(e),
            'last_updated': datetime.now(timezone.utc).isoformat()
        } 