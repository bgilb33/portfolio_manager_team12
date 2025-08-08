from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
from datetime import datetime, timezone
import logging
from functools import wraps
from dotenv import load_dotenv

from services.auth_service import (
    verify_user_token
)
from services.portfolio_service import (
    get_user_portfolio, get_portfolio_details, 
    update_portfolio, get_portfolio_summary
)
from services.holdings_service import get_user_holdings, get_user_symbols
from services.transaction_service import (
    get_transaction_history, process_transaction,
    get_transaction_by_id, get_user_cash_balance, get_user_holding_quantity
)
from services.market_service import (
    search_symbols, get_current_price, refresh_all_prices,
    get_market_status, store_portfolio_snapshot, get_portfolio_value_history
)
from services.analytics_service import (
    calculate_portfolio_performance, calculate_asset_allocation,
    get_portfolio_summary, calculate_historical_performance,
)
from services.watchlist_service import (
    get_watchlist, add_to_watchlist, remove_from_watchlist
)
from services.news_service import get_stock_news
from services.ai_chat_service import get_ai_chat_service

from utils.database import init_database
from services.websocket_service import init_price_streaming_service, get_price_streaming_service
load_dotenv()


app = Flask(__name__)
CORS(app, cors_allowed_origins="*")

# Initialize SocketIO
socketio = SocketIO(
    app, 
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    init_database()
    logger.info("Database initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")

# Initialize WebSocket price streaming service
price_service = init_price_streaming_service(socketio)
logger.info("Price streaming service initialized")


# ERROR HANDLERS

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@app.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': 'Unauthorized'}), 401

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(ValueError)
def validation_error(error):
    return jsonify({'error': str(error)}), 400


# AUTHENTICATION ENDPOINTS

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password required'}), 400
        
        auth_response = sign_up_user(data['email'], data['password'])
        return jsonify(auth_response.user), 201
    except Exception as e:
        logger.error(f"Sign up error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/signin', methods=['POST'])
def signin():
    try:
        data = request.get_json()
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password required'}), 400
        
        auth_response = sign_in_user(data['email'], data['password'])
        return jsonify(auth_response), 200
    except Exception as e:
        logger.error(f"Sign in error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/signout', methods=['POST'])
def signout():
    try:
        data = request.get_json()
        if not data or 'user_id' not in data:
            return jsonify({'error': 'User ID required'}), 400
        
        user_id = data['user_id']
        ai_service = get_ai_chat_service()
        ai_service.clear_chat_history(user_id)
        ai_service.clear_cache(user_id)
        
        return jsonify({'message': 'Signed out successfully'}), 200
    except Exception as e:
        logger.error(f"Sign out error: {e}")
        return jsonify({'error': str(e)}), 500


# WATCHLIST ENDPOINTS

@app.route('/api/watchlist/<user_id>', methods=['GET'])
def get_watchlist_route(user_id):
    try:
        watchlist = get_watchlist(user_id)
        return jsonify({'watchlist': watchlist})
    except Exception as e:
        logger.error(f"Error in get_watchlist: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/watchlist/<user_id>', methods=['POST'])
def add_to_watchlist_route(user_id):
    try:
        data = request.get_json()
        if not data or 'symbol' not in data:
            return jsonify({'error': 'Symbol required'}), 400
        
        result = add_to_watchlist(user_id, data['symbol'])
        return jsonify(result), 201
    except Exception as e:
        logger.error(f"Error in add_to_watchlist: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/watchlist/<user_id>/<symbol>', methods=['DELETE'])
def remove_from_watchlist_route(user_id, symbol):
    try:
        result = remove_from_watchlist(user_id, symbol)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in remove_from_watchlist: {e}")
        return jsonify({'error': str(e)}), 500


# PORTFOLIO ENDPOINTS

@app.route('/api/portfolio/<user_id>', methods=['GET'])
def get_portfolio(user_id):
    """Get a user's complete portfolio data, including holdings"""
    try:
        portfolio_details = get_portfolio_details(user_id)
        return jsonify(portfolio_details)
    except Exception as e:
        logger.error(f"Error in get_portfolio: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/portfolio/<user_id>', methods=['PUT'])
def update_portfolio_endpoint(user_id):
    """Update portfolio/user information"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        updated_portfolio = update_portfolio(user_id, data)
        return jsonify({'portfolio': updated_portfolio})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error in update_portfolio: {e}")
        return jsonify({'error': str(e)}), 500

# TRANSACTION ENDPOINTS (USER INPUT ONLY)

@app.route('/api/transactions/<user_id>', methods=['GET'])
def get_transactions(user_id):
    """Get transaction history"""
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        transactions = get_transaction_history(user_id, limit, offset)
        return jsonify({'transactions': transactions})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error in get_transactions: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/<user_id>', methods=['POST'])
def create_transaction(user_id):
    """Create a new transaction using USER INPUT data only"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        transaction = process_transaction(user_id, data)
        return jsonify({'transaction': transaction}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error in create_transaction: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/<user_id>/<transaction_id>', methods=['GET'])
def get_transaction(user_id, transaction_id):
    """Get a specific transaction"""
    try:
        transaction = get_transaction_by_id(user_id, transaction_id)
        return jsonify({'transaction': transaction})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error in get_transaction: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/<user_id>/cash-balance', methods=['GET'])
def get_cash_balance(user_id):
    """Get user's current cash balance for validation"""
    try:
        cash_balance = get_user_cash_balance(user_id)
        return jsonify({'cash_balance': cash_balance})
    except Exception as e:
        logger.error(f"Error in get_cash_balance: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/<user_id>/holding/<symbol>', methods=['GET'])
def get_holding_quantity(user_id, symbol):
    """Get user's current quantity for a specific symbol for validation"""
    try:
        quantity = get_user_holding_quantity(user_id, symbol)
        return jsonify({'symbol': symbol, 'quantity': quantity})
    except Exception as e:
        logger.error(f"Error in get_holding_quantity: {e}")
        return jsonify({'error': str(e)}), 500

# MARKET DATA ENDPOINTS (PORTFOLIO-FOCUSED)

@app.route('/api/market/search/<query>', methods=['GET'])
def search_market_symbols(query):
    """Search for stock symbols (for adding to portfolio)"""
    try:
        fuzzy = request.args.get('fuzzy', 'true').lower() == 'true'
        results = search_symbols(query, fuzzy=fuzzy)
        return jsonify({'results': results})
    except Exception as e:
        logger.error(f"Error in search_symbols: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/market/price/<symbol>', methods=['GET'])
def get_symbol_price(symbol):
    """Get current price for a symbol (for adding to portfolio)"""
    try:
        # This calls yfinance for current price - force fresh data for transactions
        price_data = get_current_price(symbol, force_fresh=True)
        return jsonify({'price_data': price_data})
    except Exception as e:
        logger.error(f"Error in get_symbol_price: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/market/prices/refresh/<user_id>', methods=['POST'])
def refresh_portfolio_prices(user_id):
    """Refresh current prices for user's portfolio (yfinance calls)"""
    try:
        # Get user's symbols and refresh their prices
        updated_count = refresh_all_prices(user_id)
        return jsonify({
            'message': f'Updated prices for {updated_count} symbols',
            'updated_count': updated_count,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"Error in refresh_prices: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/market/sectors/update/<user_id>', methods=['POST'])
def update_sector_info(user_id):
    """Update sector information for user's holdings that don't have sector data"""
    try:
        from services.holdings_service import get_user_symbols
        from services.market_service import fetch_sector_info
        from utils.database import get_supabase_client
        
        # Get user's symbols (excluding CASH)
        symbols = get_user_symbols(user_id)
        
        if not symbols:
            return jsonify({
                'message': 'No symbols to update sector info for',
                'updated_count': 0
            })
        
        client = get_supabase_client()
        updated_count = 0
        failed_symbols = []
        
        for symbol in symbols:
            try:
                # Check if asset already has sector info
                asset_response = client.table('assets').select('sector').eq('symbol', symbol).execute()
                
                if asset_response.data and not asset_response.data[0].get('sector'):
                    # Fetch sector info from yfinance
                    sector_info = fetch_sector_info(symbol)
                    
                    if sector_info.get('sector'):
                        # Update asset with sector information
                        client.table('assets').update({
                            'sector': sector_info['sector'],
                            'name': sector_info.get('name', symbol)
                        }).eq('symbol', symbol).execute()
                        
                        updated_count += 1
                        logger.info(f"Updated sector info for {symbol}: {sector_info['sector']}")
                    else:
                        failed_symbols.append(symbol)
                        
            except Exception as e:
                logger.error(f"Error updating sector info for {symbol}: {e}")
                failed_symbols.append(symbol)
        
        return jsonify({
            'message': f'Updated sector info for {updated_count} symbols',
            'updated_count': updated_count,
            'failed_symbols': failed_symbols,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"Error in update_sector_info: {e}")
        return jsonify({'error': str(e)}), 500

# NEWS ENDPOINTS

@app.route('/api/market/news/<symbol>', methods=['GET'])
def get_stock_news_route(symbol):
    """Get news for a specific stock symbol"""
    try:
        count = request.args.get('count', 10, type=int)
        tab = request.args.get('tab', 'news')
        
        if tab not in ['news', 'all', 'press releases']:
            return jsonify({'error': 'Invalid tab parameter. Must be "news", "all", or "press releases"'}), 400
        
        news_data = get_stock_news(symbol, count=count, tab=tab)
        return jsonify(news_data)
    except Exception as e:
        logger.error(f"Error in get_stock_news_route: {e}")
        return jsonify({'error': str(e)}), 500

# AI CHAT ENDPOINTS

@app.route('/api/chat/<user_id>', methods=['POST'])
def chat_with_ai(user_id):
    """Chat with AI assistant about portfolio"""
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        message = data['message']
        ai_service = get_ai_chat_service()
        response = ai_service.chat(user_id, message)
        
        return jsonify(response)
    except Exception as e:
        logger.error(f"Error in chat_with_ai: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/<user_id>/clear', methods=['POST'])
def clear_chat_history(user_id):
    """Clear chat history for user"""
    try:
        ai_service = get_ai_chat_service()
        success = ai_service.clear_chat_history(user_id)
        
        return jsonify({
            'success': success,
            'message': 'Chat history cleared' if success else 'Failed to clear chat history'
        })
    except Exception as e:
        logger.error(f"Error in clear_chat_history: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/<user_id>/history', methods=['GET'])
def get_chat_history(user_id):
    """Get chat history for user"""
    try:
        ai_service = get_ai_chat_service()
        history = ai_service.get_chat_history(user_id)
        
        return jsonify({'history': history})
    except Exception as e:
        logger.error(f"Error in get_chat_history: {e}")
        return jsonify({'error': str(e)}), 500

# PORTFOLIO ANALYTICS ENDPOINTS

@app.route('/api/performance/<user_id>', methods=['GET'])
def get_performance(user_id):
    """Get portfolio performance metrics"""
    try:
        performance = calculate_portfolio_performance(user_id)
        return jsonify({'performance': performance})
    except Exception as e:
        logger.error(f"Error in get_performance: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/allocation/<user_id>', methods=['GET'])
def get_allocation(user_id):
    """Get asset allocation breakdown"""
    try:
        allocation = calculate_asset_allocation(user_id)
        return jsonify({'allocation': allocation})
    except Exception as e:
        logger.error(f"Error in get_allocation: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/portfolio/chart/<user_id>/<period>', methods=['GET'])
def get_portfolio_chart(user_id, period):
    """Get portfolio value chart data for specified time period"""
    try:
        # Map period to days
        period_days = {
            '1W': 7,
            '1M': 30,
            '3M': 90,
            '6M': 180,
            '1Y': 365,
            'MAX': 3650  # 10 years for MAX period
        }
        
        days = period_days.get(period, 30)
        chart_data = get_portfolio_value_history(user_id, days)
        
        return jsonify({
            'chart_data': chart_data,
            'period': period,
            'days': days
        })
    except Exception as e:
        logger.error(f"Error in get_portfolio_chart: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/portfolio/snapshot/<user_id>', methods=['POST'])
def create_portfolio_snapshot(user_id):
    """Store current portfolio value snapshot"""
    try:
        from services.holdings_service import calculate_portfolio_totals
        
        # Calculate current portfolio value
        totals = calculate_portfolio_totals(user_id)
        current_value = totals['total_market_value']
        
        # Store snapshot
        snapshot = store_portfolio_snapshot(user_id, current_value)
        
        return jsonify({
            'snapshot': snapshot,
            'portfolio_value': current_value,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"Error in create_portfolio_snapshot: {e}")
        return jsonify({'error': str(e)}), 500

# WEBSOCKET EVENT HANDLERS

@socketio.on('connect')
def handle_connect(auth):
    """Handle client connection"""
    try:
        logger.info(f"Client connected: {request.sid}")
        emit('connected', {'status': 'Connected to price streaming service'})
    except Exception as e:
        logger.error(f"Error handling client connection: {e}")

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    try:
        logger.info(f"Client disconnected: {request.sid}")
        # Note: User-specific cleanup is handled in unsubscribe_prices
    except Exception as e:
        logger.error(f"Error handling client disconnection: {e}")

@socketio.on('subscribe_prices')
def handle_subscribe_prices(data):
    """Handle price subscription request"""
    try:
        user_id = data.get('user_id')
        if not user_id:
            emit('error', {'message': 'User ID required'})
            return
        
        # Join user-specific room
        join_room(f"user_{user_id}")
        
        # Subscribe to price updates
        service = get_price_streaming_service()
        if service:
            success = service.subscribe_user(user_id)
            if success:
                emit('subscription_status', {
                    'status': 'subscribed',
                    'user_id': user_id,
                    'message': 'Successfully subscribed to price updates'
                })
                logger.info(f"User {user_id} subscribed to price updates")
            else:
                emit('error', {'message': 'Failed to subscribe to price updates'})
        else:
            emit('error', {'message': 'Price streaming service not available'})
            
    except Exception as e:
        logger.error(f"Error subscribing to prices: {e}")
        emit('error', {'message': 'Failed to subscribe to price updates'})

@socketio.on('unsubscribe_prices')
def handle_unsubscribe_prices(data):
    """Handle price unsubscription request"""
    try:
        user_id = data.get('user_id')
        if not user_id:
            emit('error', {'message': 'User ID required'})
            return
        
        # Leave user-specific room
        leave_room(f"user_{user_id}")
        
        # Unsubscribe from price updates
        service = get_price_streaming_service()
        if service:
            service.unsubscribe_user(user_id)
            emit('subscription_status', {
                'status': 'unsubscribed',
                'user_id': user_id,
                'message': 'Successfully unsubscribed from price updates'
            })
            logger.info(f"User {user_id} unsubscribed from price updates")
        
    except Exception as e:
        logger.error(f"Error unsubscribing from prices: {e}")
        emit('error', {'message': 'Failed to unsubscribe from price updates'})

@socketio.on('get_stream_status')
def handle_get_stream_status():
    """Get current streaming status"""
    try:
        service = get_price_streaming_service()
        if service:
            status = service.get_stream_status()
            emit('stream_status', status)
        else:
            emit('error', {'message': 'Price streaming service not available'})
    except Exception as e:
        logger.error(f"Error getting stream status: {e}")
        emit('error', {'message': 'Failed to get stream status'})

@socketio.on('subscribe_watchlist')
def handle_subscribe_watchlist(data):
    """Handle watchlist subscription request"""
    try:
        user_id = data.get('user_id')
        symbols = data.get('symbols', [])
        
        if not user_id:
            emit('error', {'message': 'User ID required'})
            return
        
        if not symbols:
            emit('error', {'message': 'Symbols list required'})
            return
        
        # Join user-specific room
        join_room(f"user_{user_id}")
        
        # Subscribe to watchlist updates
        service = get_price_streaming_service()
        if service:
            success = service.subscribe_watchlist(user_id, symbols)
            if success:
                emit('watchlist_subscription_status', {
                    'status': 'subscribed',
                    'user_id': user_id,
                    'symbols': symbols,
                    'message': 'Successfully subscribed to watchlist updates'
                })
                logger.info(f"User {user_id} subscribed to watchlist: {symbols}")
            else:
                emit('error', {'message': 'Failed to subscribe to watchlist updates'})
        else:
            emit('error', {'message': 'Price streaming service not available'})
            
    except Exception as e:
        logger.error(f"Error subscribing to watchlist: {e}")
        emit('error', {'message': 'Failed to subscribe to watchlist updates'})

@socketio.on('unsubscribe_watchlist')
def handle_unsubscribe_watchlist(data):
    """Handle watchlist unsubscription request"""
    try:
        user_id = data.get('user_id')
        if not user_id:
            emit('error', {'message': 'User ID required'})
            return
        
        # Unsubscribe from watchlist updates
        service = get_price_streaming_service()
        if service:
            service.unsubscribe_watchlist(user_id)
            emit('watchlist_subscription_status', {
                'status': 'unsubscribed',
                'user_id': user_id,
                'message': 'Successfully unsubscribed from watchlist updates'
            })
            logger.info(f"User {user_id} unsubscribed from watchlist")
        
    except Exception as e:
        logger.error(f"Error unsubscribing from watchlist: {e}")
        emit('error', {'message': 'Failed to unsubscribe from watchlist updates'})

@socketio.on('subscribe_market_indices')
def handle_subscribe_market_indices(data):
    """Handle market indices subscription request"""
    try:
        user_id = request.sid  # Use session ID if no user_id provided
        if 'user_id' in data:
            user_id = data['user_id']
        
        # Join user-specific room
        join_room(f"user_{user_id}")
        
        # Subscribe to market indices updates
        service = get_price_streaming_service()
        if service:
            success = service.subscribe_market_indices(user_id)
            if success:
                emit('market_indices_subscription_status', {
                    'status': 'subscribed',
                    'user_id': user_id,
                    'message': 'Successfully subscribed to market indices updates'
                })
                logger.info(f"User {user_id} subscribed to market indices")
            else:
                emit('error', {'message': 'Failed to subscribe to market indices updates'})
        else:
            emit('error', {'message': 'Price streaming service not available'})
            
    except Exception as e:
        logger.error(f"Error subscribing to market indices: {e}")
        emit('error', {'message': 'Failed to subscribe to market indices updates'})

@socketio.on('unsubscribe_market_indices')
def handle_unsubscribe_market_indices(data=None):
    """Handle market indices unsubscription request"""
    try:
        user_id = request.sid  # Use session ID if no user_id provided
        if data and 'user_id' in data:
            user_id = data['user_id']
        
        # Unsubscribe from market indices updates
        service = get_price_streaming_service()
        if service:
            service.unsubscribe_market_indices(user_id)
            emit('market_indices_subscription_status', {
                'status': 'unsubscribed',
                'user_id': user_id,
                'message': 'Successfully unsubscribed from market indices updates'
            })
            logger.info(f"User {user_id} unsubscribed from market indices")
        
    except Exception as e:
        logger.error(f"Error unsubscribing from market indices: {e}")
        emit('error', {'message': 'Failed to unsubscribe from market indices updates'})

# REST API endpoint for manual price refresh (fallback)
@app.route('/api/market/prices/refresh/<user_id>', methods=['POST'])
def refresh_holdings_prices(user_id):
    """Manual price refresh endpoint (fallback for WebSocket)"""
    try:
        updated_count = refresh_all_prices(user_id)
        return jsonify({
            'success': True,
            'message': f'Refreshed prices for {updated_count} symbols',
            'updated_count': updated_count
        })
    except Exception as e:
        logger.error(f"Error refreshing holdings for user {user_id}: {e}")
        return jsonify({'error': str(e)}), 500

# RUN APPLICATION

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 2000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=debug,
        allow_unsafe_werkzeug=True
    )