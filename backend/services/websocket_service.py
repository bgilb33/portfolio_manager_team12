"""
WebSocket service for real-time price streaming using yfinance
"""

import logging
import yfinance as yf
import threading
from typing import Set, Dict, Any
from datetime import datetime, timezone
import json
import time
from services.holdings_service import get_user_symbols
from utils.database import get_supabase_client

logger = logging.getLogger(__name__)

class PriceStreamingService:
    """Service to manage real-time price streaming using yfinance WebSocket"""
    
    def __init__(self, socketio):
        self.socketio = socketio
        self.user_subscriptions: Dict[str, Set[str]] = {}  # user_id -> set of holdings symbols
        self.watchlist_subscriptions: Dict[str, Set[str]] = {}  # user_id -> set of watchlist symbols
        self.market_indices_subscribers: Set[str] = set()  # user_ids subscribed to market indices
        self.active_symbols: Set[str] = set()  # all symbols being tracked
        self.websocket = None
        self.streaming_thread = None
        self.is_streaming = False
        self.price_cache: Dict[str, Dict[str, Any]] = {}  # symbol -> price data
        
        # Market indices symbols
        self.market_indices = {'^GSPC', '^DJI', '^IXIC'}
        
    def subscribe_user(self, user_id: str, symbols: list = None):
        """Subscribe a user to price updates for their holdings"""
        try:
            if symbols is None:
                # Get symbols from user's holdings
                symbols = get_user_symbols(user_id)
                symbols = [s for s in symbols if s != 'CASH']  # Exclude cash
            
            if not symbols:
                logger.info(f"No symbols to subscribe for user {user_id}")
                return False
                
            # Store user subscriptions
            self.user_subscriptions[user_id] = set(symbols)
            
            # Update active symbols
            new_symbols = set(symbols) - self.active_symbols
            self.active_symbols.update(symbols)
            
            logger.info(f"Subscribed user {user_id} to symbols: {symbols}")
            
            # Start streaming if not already active
            if not self.is_streaming:
                self._start_streaming()
            elif new_symbols:
                # If we have new symbols, restart the stream with updated symbols
                self._restart_streaming()
                
            return True
            
        except Exception as e:
            logger.error(f"Error subscribing user {user_id}: {e}")
            return False
    
    def unsubscribe_user(self, user_id: str):
        """Unsubscribe a user from all price updates"""
        try:
            # Remove from all subscription types
            if user_id in self.user_subscriptions:
                del self.user_subscriptions[user_id]
            if user_id in self.watchlist_subscriptions:
                del self.watchlist_subscriptions[user_id]
            if user_id in self.market_indices_subscribers:
                self.market_indices_subscribers.remove(user_id)
                
            # Recalculate active symbols
            self._update_active_symbols()
            
            logger.info(f"Unsubscribed user {user_id} from all streams")
                    
        except Exception as e:
            logger.error(f"Error unsubscribing user {user_id}: {e}")
    
    def subscribe_watchlist(self, user_id: str, symbols: list):
        """Subscribe a user to watchlist symbol updates"""
        try:
            if not symbols:
                logger.info(f"No watchlist symbols to subscribe for user {user_id}")
                return False
                
            # Store watchlist subscriptions
            self.watchlist_subscriptions[user_id] = set(symbols)
            
            # Update active symbols
            self._update_active_symbols()
            
            logger.info(f"Subscribed user {user_id} to watchlist symbols: {symbols}")
            
            # Start or restart streaming if needed
            if not self.is_streaming:
                self._start_streaming()
            else:
                self._restart_streaming()
                
            return True
            
        except Exception as e:
            logger.error(f"Error subscribing user {user_id} to watchlist: {e}")
            return False
    
    def subscribe_market_indices(self, user_id: str = None):
        """Subscribe to market indices updates"""
        try:
            if user_id:
                self.market_indices_subscribers.add(user_id)
            
            # Update active symbols to include market indices
            self._update_active_symbols()
            
            logger.info(f"Subscribed to market indices for user {user_id}")
            
            # Start or restart streaming if needed
            if not self.is_streaming:
                self._start_streaming()
            else:
                self._restart_streaming()
                
            return True
            
        except Exception as e:
            logger.error(f"Error subscribing to market indices: {e}")
            return False
    
    def unsubscribe_watchlist(self, user_id: str):
        """Unsubscribe a user from watchlist updates"""
        try:
            if user_id in self.watchlist_subscriptions:
                del self.watchlist_subscriptions[user_id]
                
            self._update_active_symbols()
            logger.info(f"Unsubscribed user {user_id} from watchlist")
                    
        except Exception as e:
            logger.error(f"Error unsubscribing user {user_id} from watchlist: {e}")
    
    def unsubscribe_market_indices(self, user_id: str = None):
        """Unsubscribe from market indices updates"""
        try:
            if user_id and user_id in self.market_indices_subscribers:
                self.market_indices_subscribers.remove(user_id)
                
            self._update_active_symbols()
            logger.info(f"Unsubscribed user {user_id} from market indices")
                    
        except Exception as e:
            logger.error(f"Error unsubscribing from market indices: {e}")
    
    def _update_active_symbols(self):
        """Update the set of active symbols based on all subscriptions"""
        old_active = self.active_symbols.copy()
        self.active_symbols = set()
        
        # Add holdings symbols
        for symbols in self.user_subscriptions.values():
            self.active_symbols.update(symbols)
        
        # Add watchlist symbols
        for symbols in self.watchlist_subscriptions.values():
            self.active_symbols.update(symbols)
        
        # Add market indices if anyone is subscribed
        if self.market_indices_subscribers:
            self.active_symbols.update(self.market_indices)
        
        # If symbols changed, restart streaming
        if old_active != self.active_symbols:
            if self.active_symbols:
                if self.is_streaming:
                    self._restart_streaming()
            else:
                self._stop_streaming()
    
    def _start_streaming(self):
        """Start the yfinance WebSocket stream"""
        if not self.active_symbols or self.is_streaming:
            return
            
        try:
            self.is_streaming = True
            self.streaming_thread = threading.Thread(target=self._stream_prices, daemon=True)
            self.streaming_thread.start()
            logger.info(f"Started price streaming for symbols: {list(self.active_symbols)}")
            
        except Exception as e:
            logger.error(f"Error starting price stream: {e}")
            self.is_streaming = False
    
    def _stop_streaming(self):
        """Stop the price streaming"""
        try:
            self.is_streaming = False
            if self.websocket:
                # yfinance WebSocket doesn't have a clean close method
                # The thread will exit when is_streaming becomes False
                pass
            logger.info("Stopped price streaming")
            
        except Exception as e:
            logger.error(f"Error stopping price stream: {e}")
    
    def _restart_streaming(self):
        """Restart streaming with updated symbol list"""
        self._stop_streaming()
        time.sleep(1)  # Brief pause before restarting
        self._start_streaming()
    
    def _stream_prices(self):
        """Main streaming loop using yfinance WebSocket"""
        retry_count = 0
        max_retries = 5
        
        while self.is_streaming and retry_count < max_retries:
            try:
                logger.info(f"Starting WebSocket connection for symbols: {list(self.active_symbols)}")
                
                # Define message handler
                def message_handler(message):
                    if not self.is_streaming:
                        return
                    
                    try:
                        # Parse the message from yfinance WebSocket
                        if isinstance(message, dict):
                            symbol = message.get('id') or message.get('symbol')
                            if symbol and symbol in self.active_symbols:
                                price_data = self._process_price_message(message)
                                if price_data:
                                    self._broadcast_price_update(symbol, price_data)
                    except Exception as e:
                        logger.error(f"Error processing WebSocket message: {e}")
                
                # Create and start WebSocket connection
                with yf.WebSocket() as ws:
                    self.websocket = ws
                    ws.subscribe(list(self.active_symbols))
                    logger.info(f"Subscribed to WebSocket for symbols: {list(self.active_symbols)}")
                    
                    # Listen for messages
                    ws.listen(message_handler)
                    
            except Exception as e:
                logger.error(f"WebSocket error (attempt {retry_count + 1}): {e}")
                retry_count += 1
                if retry_count < max_retries and self.is_streaming:
                    wait_time = min(retry_count * 2, 30)  # Exponential backoff, max 30s
                    logger.info(f"Retrying WebSocket connection in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logger.error("Max retries reached, stopping WebSocket stream")
                    self.is_streaming = False
    
    def _process_price_message(self, message: dict) -> dict:
        """Process incoming price message from yfinance WebSocket"""
        try:
            symbol = message.get('id') or message.get('symbol')
            if not symbol:
                return None
            
            # Extract price data from the message
            current_price = message.get('price')
            if current_price is None:
                return None
            
            # Use pre-calculated day change from yfinance WebSocket
            day_change = message.get('change', 0)  # yfinance provides this
            day_change_percent = message.get('change_percent', 0)  # yfinance provides this
            
            # Calculate previous close from current price and day change
            previous_close = current_price - day_change if day_change else None
            
            price_data = {
                'symbol': symbol,
                'current_price': float(current_price),
                'previous_close': float(previous_close) if previous_close else None,
                'day_change': float(day_change),
                'day_change_percent': float(day_change_percent),
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'timestamp': datetime.now(timezone.utc).timestamp()
            }
            
            # Cache the price data
            self.price_cache[symbol] = price_data
            
            # Also update database cache
            self._cache_price_in_db(symbol, price_data)
            
            return price_data
            
        except Exception as e:
            logger.error(f"Error processing price message for {symbol}: {e}")
            return None
    
    def _cache_price_in_db(self, symbol: str, price_data: dict):
        """Cache price data in database"""
        try:
            from services.market_service import cache_price
            cache_price(symbol, price_data)
        except Exception as e:
            logger.error(f"Error caching price in DB for {symbol}: {e}")
    
    def _broadcast_price_update(self, symbol: str, price_data: dict):
        """Broadcast price update to subscribed users"""
        try:
            # Find users subscribed to this symbol in holdings
            for user_id, user_symbols in self.user_subscriptions.items():
                if symbol in user_symbols:
                    self.socketio.emit('price_update', {
                        'symbol': symbol,
                        'price_data': price_data
                    }, room=f"user_{user_id}")
            
            # Find users subscribed to this symbol in watchlist
            for user_id, watchlist_symbols in self.watchlist_subscriptions.items():
                if symbol in watchlist_symbols:
                    self.socketio.emit('watchlist_price_update', {
                        'symbol': symbol,
                        'price_data': price_data
                    }, room=f"user_{user_id}")
            
            # Broadcast market indices to all subscribers
            if symbol in self.market_indices:
                for user_id in self.market_indices_subscribers:
                    self.socketio.emit('market_index_update', {
                        'symbol': symbol,
                        'price_data': price_data
                    }, room=f"user_{user_id}")
            
            logger.debug(f"Broadcasted price update for {symbol}: ${price_data['current_price']}")
            
        except Exception as e:
            logger.error(f"Error broadcasting price update for {symbol}: {e}")
    
    def get_cached_prices(self) -> dict:
        """Get all cached price data"""
        return self.price_cache.copy()
    
    def get_active_users(self) -> list:
        """Get list of active user IDs"""
        return list(self.user_subscriptions.keys())
    
    def get_stream_status(self) -> dict:
        """Get current streaming status"""
        return {
            'is_streaming': self.is_streaming,
            'active_symbols': list(self.active_symbols),
            'holdings_users': len(self.user_subscriptions),
            'watchlist_users': len(self.watchlist_subscriptions),
            'market_indices_users': len(self.market_indices_subscribers),
            'cached_prices': len(self.price_cache)
        }

# Global instance
price_streaming_service = None

def get_price_streaming_service():
    """Get the global price streaming service instance"""
    global price_streaming_service
    return price_streaming_service

def init_price_streaming_service(socketio):
    """Initialize the global price streaming service"""
    global price_streaming_service
    price_streaming_service = PriceStreamingService(socketio)
    return price_streaming_service