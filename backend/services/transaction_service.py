"""
Transaction management service for portfolio tracking
CORRECTED: Only uses user input data, no yfinance during transaction processing
"""

import logging
from decimal import Decimal
from datetime import datetime, timezone
from utils.database import get_supabase_client
from utils.validators import (
    validate_stock_symbol, validate_positive_number, 
    validate_transaction_type, validate_required_field
)

logger = logging.getLogger(__name__)

def validate_buy_transaction(user_id: str, quantity: Decimal, price: Decimal):
    """Validate buy transaction - ensure user has sufficient cash"""
    try:
        client = get_supabase_client()
        
        # Get user's cash balance
        cash_holding = client.table('holdings')\
            .select('quantity')\
            .eq('user_id', user_id)\
            .eq('symbol', 'CASH')\
            .single()\
            .execute()
        
        available_cash = Decimal(str(cash_holding.data['quantity'])) if cash_holding.data else Decimal('0')
        required_cash = quantity * price
        
        if required_cash > available_cash:
            raise ValueError(f"Insufficient cash. Available: ${available_cash:.2f}, Required: ${required_cash:.2f}")
        
        return True
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error validating buy transaction: {e}")
        raise Exception("Failed to validate buy transaction")

def validate_sell_transaction(user_id: str, symbol: str, quantity: Decimal):
    """Validate sell transaction - ensure user owns sufficient quantity"""
    try:
        client = get_supabase_client()
        
        # Get user's current holding for this symbol
        holding = client.table('holdings')\
            .select('quantity')\
            .eq('user_id', user_id)\
            .eq('symbol', symbol)\
            .single()\
            .execute()
        
        if not holding.data:
            raise ValueError(f"You don't own any shares of {symbol}")
        
        owned_quantity = Decimal(str(holding.data['quantity']))
        
        if owned_quantity <= 0:
            raise ValueError(f"You don't own any shares of {symbol}")
        
        if quantity > owned_quantity:
            raise ValueError(f"Insufficient shares. Owned: {owned_quantity}, Trying to sell: {quantity}")
        
        return True
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error validating sell transaction: {e}")
        raise Exception("Failed to validate sell transaction")

def get_transaction_history(user_id: str, limit: int = 50, offset: int = 0):
    """Get transaction history for a user"""
    try:
        client = get_supabase_client()
        response = client.table('transactions')\
            .select('*, assets(name, asset_type)')\
            .eq('user_id', user_id)\
            .order('transaction_date', desc=True)\
            .limit(limit)\
            .offset(offset)\
            .execute()
        
        return response.data
    except Exception as e:
        logger.error(f"Error fetching transaction history: {e}")
        raise Exception("Failed to fetch transaction history")

def get_transaction_by_id(user_id: str, transaction_id: str):
    """Get a specific transaction by ID"""
    try:
        client = get_supabase_client()
        response = client.table('transactions')\
            .select('*, assets(name, asset_type)')\
            .eq('user_id', user_id)\
            .eq('id', transaction_id)\
            .single()\
            .execute()
        
        if not response.data:
            raise ValueError("Transaction not found")
        
        return response.data
    except Exception as e:
        logger.error(f"Error fetching transaction: {e}")
        raise e

def process_buy_transaction(user_id: str, symbol: str, quantity: Decimal, price: Decimal, transaction_date: str = None, notes: str = None):
    """Process a BUY transaction using USER INPUT data only - no yfinance calls"""
    try:
        # Validate inputs
        symbol = validate_stock_symbol(symbol)
        quantity = validate_positive_number(quantity, "quantity")
        price = validate_positive_number(price, "price")
        
        # Validate cash balance for buy transaction
        validate_buy_transaction(user_id, quantity, price)
        
        # Ensure asset exists in assets table
        from services.holdings_service import add_new_asset_if_needed
        add_new_asset_if_needed(symbol)
        
        # Use provided date or current date
        if transaction_date:
            date = datetime.fromisoformat(transaction_date.replace('Z', '+00:00'))
        else:
            date = datetime.now(timezone.utc)
        
        total_amount = quantity * price
        
        # Update holdings using USER'S actual purchase data
        update_holding_for_buy(user_id, symbol, quantity, price)
        
        # Update cash balance (can go negative - user tracks manually)
        update_cash_balance(user_id, -total_amount)
        
        # Record transaction with USER'S data
        transaction = create_transaction_record(
            user_id, symbol, 'BUY', quantity, price, total_amount, date, notes
        )
        
        return transaction
    except ValueError as e:
        logger.error(f"Validation error in buy transaction: {e}")
        raise e
    except Exception as e:
        logger.error(f"Error processing buy transaction: {e}")
        raise Exception("Failed to process buy transaction")

def process_sell_transaction(user_id: str, symbol: str, quantity: Decimal, price: Decimal, transaction_date: str = None, notes: str = None):
    """Process a SELL transaction using USER INPUT data only - no yfinance calls"""
    try:
        # Validate inputs
        symbol = validate_stock_symbol(symbol)
        quantity = validate_positive_number(quantity, "quantity")
        price = validate_positive_number(price, "price")
        
        # Validate holdings quantity for sell transaction
        validate_sell_transaction(user_id, symbol, quantity)
        
        # Ensure asset exists in assets table
        from services.holdings_service import add_new_asset_if_needed
        add_new_asset_if_needed(symbol)
        
        # Use provided date or current date
        if transaction_date:
            date = datetime.fromisoformat(transaction_date.replace('Z', '+00:00'))
        else:
            date = datetime.now(timezone.utc)
        
        total_amount = quantity * price

        # Calculate realized gain/loss
        realized_gain_loss = calculate_realized_gain_loss(user_id, symbol, quantity, price)
        
        # Update holding using USER'S actual sale data (can go negative)
        update_holding_for_sell(user_id, symbol, quantity)
        
        # Update cash balance
        update_cash_balance(user_id, total_amount)
        
        # Record transaction with USER'S data
        transaction = create_transaction_record(
            user_id, symbol, 'SELL', quantity, price, total_amount, date, notes, realized_gain_loss
        )
        
        return transaction
    except ValueError as e:
        logger.error(f"Validation error in sell transaction: {e}")
        raise e
    except Exception as e:
        logger.error(f"Error processing sell transaction: {e}")
        raise Exception("Failed to process sell transaction")

def process_cash_deposit(user_id: str, amount: Decimal, transaction_date: str = None, notes: str = None):
    """Process a cash deposit using USER INPUT data"""
    try:
        # Validate inputs
        amount = validate_positive_number(amount, "amount")
        
        # Use provided date or current date
        if transaction_date:
            date = datetime.fromisoformat(transaction_date.replace('Z', '+00:00'))
        else:
            date = datetime.now(timezone.utc)
        
        # Update cash balance
        update_cash_balance(user_id, amount)
        
        # Record transaction
        transaction = create_transaction_record(
            user_id, 'CASH', 'DEPOSIT', amount, Decimal('1'), amount, date, notes
        )
        
        return transaction
    except ValueError as e:
        logger.error(f"Validation error in cash deposit: {e}")
        raise e
    except Exception as e:
        logger.error(f"Error processing cash deposit: {e}")
        raise Exception("Failed to process cash deposit")

def process_cash_withdrawal(user_id: str, amount: Decimal, transaction_date: str = None, notes: str = None):
    """Process a cash withdrawal using USER INPUT data"""
    try:
        # Validate inputs
        amount = validate_positive_number(amount, "amount")
        
        # Use provided date or current date
        if transaction_date:
            date = datetime.fromisoformat(transaction_date.replace('Z', '+00:00'))
        else:
            date = datetime.now(timezone.utc)
        
        # Update cash balance (can go negative - user tracks manually)
        update_cash_balance(user_id, -amount)
        
        # Record transaction
        transaction = create_transaction_record(
            user_id, 'CASH', 'WITHDRAWAL', amount, Decimal('1'), amount, date, notes
        )
        
        return transaction
    except ValueError as e:
        logger.error(f"Validation error in cash withdrawal: {e}")
        raise e
    except Exception as e:
        logger.error(f"Error processing cash withdrawal: {e}")
        raise Exception("Failed to process cash withdrawal")

def process_transaction(user_id: str, transaction_data: dict):
    """Main transaction processing function - ONLY uses user input data"""
    try:
        transaction_type = validate_transaction_type(transaction_data.get('transaction_type'))
        
        if transaction_type == 'BUY':
            return process_buy_transaction(
                user_id,
                transaction_data.get('symbol'),
                Decimal(str(transaction_data.get('quantity'))),
                Decimal(str(transaction_data.get('price'))),  # USER'S actual price
                transaction_data.get('transaction_date'),
                transaction_data.get('notes')
            )
        elif transaction_type == 'SELL':
            return process_sell_transaction(
                user_id,
                transaction_data.get('symbol'),
                Decimal(str(transaction_data.get('quantity'))),
                Decimal(str(transaction_data.get('price'))),  # USER'S actual price
                transaction_data.get('transaction_date'),
                transaction_data.get('notes')
            )
        elif transaction_type == 'DEPOSIT':
            return process_cash_deposit(
                user_id,
                Decimal(str(transaction_data.get('amount', transaction_data.get('quantity')))),
                transaction_data.get('transaction_date'),
                transaction_data.get('notes')
            )
        elif transaction_type == 'WITHDRAWAL':
            return process_cash_withdrawal(
                user_id,
                Decimal(str(transaction_data.get('amount', transaction_data.get('quantity')))),
                transaction_data.get('transaction_date'),
                transaction_data.get('notes')
            )
        else:
            raise ValueError(f"Unsupported transaction type: {transaction_type}")
    
    except ValueError as e:
        logger.error(f"Validation error processing transaction: {e}")
        raise e
    except Exception as e:
        logger.error(f"Error processing transaction: {e}")
        raise Exception("Failed to process transaction")

# Helper functions for database operations
def update_holding_for_buy(user_id: str, symbol: str, quantity: Decimal, price: Decimal):
    """Update holdings for buy transaction using USER'S actual cost basis"""
    try:
        client = get_supabase_client()
        
        # Get existing holding
        existing = client.table('holdings')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('symbol', symbol)\
            .execute()
        
        if existing.data:
            # Calculate new average cost using USER'S data
            current_qty = Decimal(str(existing.data[0]['quantity']))
            current_avg = Decimal(str(existing.data[0]['average_cost']))
            
            new_qty = current_qty + quantity
            new_avg = ((current_qty * current_avg) + (quantity * price)) / new_qty
            
            # Update existing holding
            client.table('holdings')\
                .update({
                    'quantity': float(new_qty),
                    'average_cost': float(new_avg),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                })\
                .eq('user_id', user_id)\
                .eq('symbol', symbol)\
                .execute()
        else:
            # Create new holding
            client.table('holdings')\
                .insert({
                    'user_id': user_id,
                    'symbol': symbol,
                    'quantity': float(quantity),
                    'average_cost': float(price)
                })\
                .execute()
                
    except Exception as e:
        logger.error(f"Error updating holding for buy: {e}")
        raise Exception("Failed to update holding")

def update_holding_for_sell(user_id: str, symbol: str, quantity: Decimal):
    """Update holdings for sell transaction (can go negative)"""
    try:
        client = get_supabase_client()
        
        # Get existing holding
        existing = client.table('holdings')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('symbol', symbol)\
            .execute()
        
        if existing.data:
            current_qty = Decimal(str(existing.data[0]['quantity']))
            new_qty = current_qty - quantity
            
            # If quantity becomes 0 or negative, delete the holding record entirely
            if new_qty <= 0:
                client.table('holdings')\
                    .delete()\
                    .eq('user_id', user_id)\
                    .eq('symbol', symbol)\
                    .execute()
                logger.info(f"Deleted holding for {symbol} (quantity became {new_qty})")
            else:
                # Update quantity if still positive
                client.table('holdings')\
                    .update({
                        'quantity': float(new_qty),
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    })\
                    .eq('user_id', user_id)\
                    .eq('symbol', symbol)\
                    .execute()
        else:
            # Create negative holding if selling without previous holding
            client.table('holdings')\
                .insert({
                    'user_id': user_id,
                    'symbol': symbol,
                    'quantity': float(-quantity),
                    'average_cost': 0
                })\
                .execute()
                
    except Exception as e:
        logger.error(f"Error updating holding for sell: {e}")
        raise Exception("Failed to update holding")

def update_cash_balance(user_id: str, amount: Decimal):
    """Update cash balance (can go negative)"""
    try:
        client = get_supabase_client()
        
        # Get existing cash holding
        existing = client.table('holdings')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('symbol', 'CASH')\
            .execute()
        
        if existing.data:
            current_balance = Decimal(str(existing.data[0]['quantity']))
            new_balance = current_balance + amount
            
            client.table('holdings')\
                .update({
                    'quantity': float(new_balance),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                })\
                .eq('user_id', user_id)\
                .eq('symbol', 'CASH')\
                .execute()
        else:
            # Create cash holding
            client.table('holdings')\
                .insert({
                    'user_id': user_id,
                    'symbol': 'CASH',
                    'quantity': float(amount),
                    'average_cost': 1.0
                })\
                .execute()
                
        return float(new_balance) if 'new_balance' in locals() else float(amount)
        
    except Exception as e:
        logger.error(f"Error updating cash balance: {e}")
        raise Exception("Failed to update cash balance")

def create_transaction_record(user_id: str, symbol: str, transaction_type: str, 
                            quantity: Decimal, price: Decimal, total_amount: Decimal, 
                            transaction_date: datetime, notes: str = None, realized_gain_loss: Decimal = Decimal('0')):
    """Create transaction record with USER'S data"""
    try:
        client = get_supabase_client()
        
        response = client.table('transactions')\
            .insert({
                'user_id': user_id,
                'symbol': symbol,
                'transaction_type': transaction_type,
                'quantity': float(quantity),
                'price': float(price),
                'total_amount': float(total_amount),
                'transaction_date': transaction_date.isoformat(),
                'notes': notes,
                'realized_gain_loss': float(realized_gain_loss)
            })\
            .execute()
        
        return response.data[0]
        
    except Exception as e:
        logger.error(f"Error creating transaction record: {e}")
        raise Exception("Failed to create transaction record") 

def get_user_cash_balance(user_id: str):
    """Get user's current cash balance"""
    try:
        client = get_supabase_client()
        cash_holding = client.table('holdings')\
            .select('quantity')\
            .eq('user_id', user_id)\
            .eq('symbol', 'CASH')\
            .single()\
            .execute()
        
        return float(cash_holding.data['quantity']) if cash_holding.data else 0.0
    except Exception as e:
        logger.error(f"Error getting cash balance: {e}")
        return 0.0

def get_user_holding_quantity(user_id: str, symbol: str):
    """Get user's current quantity for a specific symbol"""
    try:
        client = get_supabase_client()
        holding = client.table('holdings')\
            .select('quantity')\
            .eq('user_id', user_id)\
            .eq('symbol', symbol)\
            .single()\
            .execute()
        
        return float(holding.data['quantity']) if holding.data else 0.0
    except Exception as e:
        logger.error(f"Error getting holding quantity for {symbol}: {e}")
        return 0.0


def calculate_realized_gain_loss(user_id: str, symbol: str, sell_quantity: Decimal, sell_price: Decimal):
    """Calculate realized gain/loss for a sell transaction using FIFO"""
    try:
        client = get_supabase_client()
        
        # Get all BUY transactions for the symbol, oldest first
        buy_transactions = client.table('transactions')\
            .select('quantity', 'price', 'transaction_date')\
            .eq('user_id', user_id)\
            .eq('symbol', symbol)\
            .eq('transaction_type', 'BUY')\
            .order('transaction_date', desc=False)\
            .execute()

        if not buy_transactions.data:
            return Decimal('0')

        realized_gain_loss = Decimal('0')
        remaining_sell_quantity = sell_quantity
        
        # Use a copy of the data to manipulate
        buy_data = list(buy_transactions.data)

        for buy_tx in buy_data:
            if remaining_sell_quantity <= 0:
                break

            buy_qty = Decimal(str(buy_tx['quantity']))
            buy_price = Decimal(str(buy_tx['price']))
            
            # Quantity to be sold from this buy transaction
            qty_to_sell = min(remaining_sell_quantity, buy_qty)
            
            # Calculate gain/loss for this portion
            gain_loss = (sell_price - buy_price) * qty_to_sell
            realized_gain_loss += gain_loss
            
            # Update remaining quantities
            remaining_sell_quantity -= qty_to_sell
            buy_tx['quantity'] = str(buy_qty - qty_to_sell) # Update the copy

        return realized_gain_loss
    except Exception as e:
        logger.error(f"Error calculating realized gain/loss: {e}")
        raise Exception("Failed to calculate realized gain/loss") 