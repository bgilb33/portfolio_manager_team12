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
    
    # Enhanced symbol validation (letters, numbers, dots, hyphens, caret for indices)
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