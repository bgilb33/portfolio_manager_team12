"""
Unit tests for market_service.py
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from services.market_service import (
    search_symbols, 
    fetch_current_price, 
    get_current_price,
    fetch_sector_info,
    get_market_status
)


class TestMarketService:
    
    def test_search_symbols_success(self, mock_yfinance):
        """Test successful symbol search."""
        mock_search = Mock()
        mock_quote = Mock()
        mock_quote.get.side_effect = lambda key: {
            'symbol': 'AAPL',
            'exchange': 'NASDAQ',
            'quoteType': 'EQUITY'
        }.get(key)
        mock_search.quotes = [mock_quote]
        
        with patch('yfinance.Search') as mock_search_class:
            mock_search_class.return_value.search.return_value = mock_search
            
            result = search_symbols("AAPL")
            
            assert len(result) > 0
            assert result[0]['symbol'] == 'AAPL'
            assert result[0]['exchange'] == 'NASDAQ'
    
    def test_search_symbols_empty_query(self):
        """Test search with empty query."""
        result = search_symbols("")
        assert result == []
    
    def test_search_symbols_error(self):
        """Test search with error handling."""
        with patch('yfinance.Search', side_effect=Exception("Search error")):
            result = search_symbols("AAPL")
            assert result == []
    
    def test_fetch_current_price_success(self, mock_yfinance):
        """Test successful price fetching."""
        with patch('services.market_service.validate_stock_symbol', return_value='AAPL'):
            result = fetch_current_price("AAPL")
            
            assert result is not None
            assert 'current_price' in result
            assert 'previous_close' in result
            assert 'day_change' in result
            assert 'day_change_percent' in result
    
    def test_fetch_current_price_no_price(self, mock_yfinance):
        """Test price fetching when no price is available."""
        mock_ticker = Mock()
        mock_ticker.info = {
            'symbol': 'AAPL',
            'longName': 'Apple Inc.',
            'currentPrice': None,
            'regularMarketPrice': None
        }
        
        with patch('yfinance.Ticker', return_value=mock_ticker):
            with patch('services.market_service.validate_stock_symbol', return_value='AAPL'):
                result = fetch_current_price("AAPL")
                assert result is None
    
    def test_fetch_current_price_invalid_symbol(self):
        """Test price fetching with invalid symbol."""
        with patch('services.market_service.validate_stock_symbol', side_effect=ValueError("Invalid symbol")):
            result = fetch_current_price("INVALID")
            assert result is None
    
    def test_get_current_price_with_cache(self, mock_yfinance):
        """Test getting current price with caching."""
        with patch('services.market_service.get_cached_price', return_value={'current_price': 150.0}):
            with patch('services.market_service.validate_stock_symbol', return_value='AAPL'):
                result = get_current_price("AAPL", force_fresh=False)
                
                assert result is not None
                assert result['current_price'] == 150.0
    
    def test_get_current_price_force_fresh(self, mock_yfinance):
        """Test getting current price with force fresh."""
        with patch('services.market_service.get_cached_price', return_value=None):
            with patch('services.market_service.fetch_current_price', return_value={'current_price': 150.0}):
                with patch('services.market_service.cache_price') as mock_cache:
                    with patch('services.market_service.validate_stock_symbol', return_value='AAPL'):
                        result = get_current_price("AAPL", force_fresh=True)
                        
                        assert result is not None
                        assert result['current_price'] == 150.0
                        mock_cache.assert_called_once()
    
    def test_fetch_sector_info_success(self, mock_yfinance):
        """Test successful sector info fetching."""
        with patch('services.market_service.validate_stock_symbol', return_value='AAPL'):
            result = fetch_sector_info("AAPL")
            
            assert result is not None
            assert result['symbol'] == 'AAPL'
            assert result['name'] == 'Apple Inc.'
            assert result['sector'] == 'Technology'
    
    def test_fetch_sector_info_error(self):
        """Test sector info fetching with error."""
        with patch('yfinance.Ticker', side_effect=Exception("API error")):
            with patch('services.market_service.validate_stock_symbol', return_value='AAPL'):
                result = fetch_sector_info("AAPL")
                assert result is not None
                assert result['symbol'] == 'AAPL'
                assert result['sector'] is None
    
    def test_get_market_status_open(self):
        """Test market status when market is open."""
        with patch('yfinance.Ticker') as mock_ticker:
            mock_ticker.return_value.info = {
                'regularMarketTime': 1642248000,  # Market is open
                'currentPrice': 450.0
            }
            
            result = get_market_status()
            
            assert result['market_open'] is True
            assert 'current_time' in result
            assert 'spy_price' in result
    
    def test_get_market_status_closed(self):
        """Test market status when market is closed."""
        with patch('yfinance.Ticker') as mock_ticker:
            mock_ticker.return_value.info = {
                'regularMarketTime': None,  # Market is closed
                'currentPrice': 450.0
            }
            
            result = get_market_status()
            
            assert result['market_open'] is False
            assert 'current_time' in result
            assert 'spy_price' in result
    
    def test_get_market_status_error(self):
        """Test market status with error handling."""
        with patch('yfinance.Ticker', side_effect=Exception("API error")):
            result = get_market_status()
            
            assert result['market_open'] is False
            assert 'current_time' in result
            assert 'spy_price' in result 