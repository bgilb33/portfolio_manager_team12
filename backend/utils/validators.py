"""
Validation utility functions
"""

from decimal import Decimal, InvalidOperation
import re

def validate_positive_number(value, field_name: str) -> Decimal:
    """Validate and convert a value to a positive Decimal"""
    try:
        decimal_value = Decimal(str(value))
        if decimal_value <= 0:
            raise ValueError(f"{field_name} must be positive")
        return decimal_value
    except (InvalidOperation, TypeError):
        raise ValueError(f"Invalid {field_name} format")

def validate_non_negative_number(value, field_name: str) -> Decimal:
    """Validate and convert a value to a non-negative Decimal"""
    try:
        decimal_value = Decimal(str(value))
        if decimal_value < 0:
            raise ValueError(f"{field_name} cannot be negative")
        return decimal_value
    except (InvalidOperation, TypeError):
        raise ValueError(f"Invalid {field_name} format")

def validate_stock_symbol(symbol: str) -> str:
    """Validate stock symbol format"""
    if not symbol or not isinstance(symbol, str):
        raise ValueError("Symbol is required")
    
    if not re.match(r'^[A-Z0-9.^=-]+$', symbol.upper()):
        raise ValueError("Invalid symbol format")
    
    return symbol.upper()

def validate_transaction_type(transaction_type: str) -> str:
    """Validate transaction type"""
    valid_types = ['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL']
    if transaction_type not in valid_types:
        raise ValueError(f"Transaction type must be one of: {', '.join(valid_types)}")
    return transaction_type

def validate_portfolio_name(name: str) -> str:
    """Validate portfolio name"""
    if not name or not isinstance(name, str):
        raise ValueError("Portfolio name is required")
    
    name = name.strip()
    if len(name) < 1 or len(name) > 100:
        raise ValueError("Portfolio name must be between 1 and 100 characters")
    
    return name

def validate_required_field(value, field_name: str):
    """Validate that a required field is present"""
    if value is None or value == "":
        raise ValueError(f"{field_name} is required")
    return value

def validate_sufficient_cash(user_id: str, required_amount: Decimal):
    """Validate that user has sufficient cash for transaction"""
    from services.holdings_service import get_holding_by_symbol
    from decimal import Decimal
    
    cash_holding = get_holding_by_symbol(user_id, 'CASH')
    if not cash_holding:
        raise ValueError("Insufficient cash: No cash balance found")
    
    current_cash = Decimal(str(cash_holding['quantity']))
    if current_cash < required_amount:
        raise ValueError(f"Insufficient cash: Required ${required_amount}, Available ${current_cash}")
    
    return current_cash

def validate_sufficient_stock(user_id: str, symbol: str, required_quantity: Decimal):
    """Validate that user has sufficient stock quantity for sale"""
    from services.holdings_service import get_holding_by_symbol
    from decimal import Decimal
    
    holding = get_holding_by_symbol(user_id, symbol)
    if not holding:
        raise ValueError(f"Cannot sell {symbol}: No shares owned")
    
    current_quantity = Decimal(str(holding['quantity']))
    if current_quantity < required_quantity:
        raise ValueError(f"Insufficient {symbol} shares: Required {required_quantity}, Owned {current_quantity}")
    
    return current_quantity 