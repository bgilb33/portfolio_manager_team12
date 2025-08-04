import logging
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from services.holdings_service import get_user_holdings, calculate_portfolio_totals
from services.transaction_service import get_transaction_history
from utils.database import get_supabase_client

logger = logging.getLogger(__name__)

def calculate_portfolio_performance(user_id: str):
    """Calculate portfolio performance metrics"""
    try:
        holdings = get_user_holdings(user_id)
        
        # Basic calculations using portfolio totals
        totals = calculate_portfolio_totals(user_id)
        
        total_value = totals['total_market_value']
        total_cost = totals['total_cost_basis']
        total_gain_loss = totals['total_gain_loss']
        total_return_percent = totals['total_gain_loss_percent']
        cash_balance = totals['cash_balance']
        
        # Calculate invested amount (exclude cash)
        invested_amount = total_value - cash_balance
        
        # Day change calculations
        day_change = sum(
            h['day_change'] * h['quantity'] 
            for h in holdings 
            if h['symbol'] != 'CASH'
        )
        day_change_percent = (day_change / (total_value - day_change) * 100) if (total_value - day_change) > 0 else 0
        
        return {
            'total_value': round(total_value, 2),
            'total_cost': round(total_cost, 2),
            'total_gain_loss': round(total_gain_loss, 2),
            'total_return_percent': round(total_return_percent, 2),
            'day_change': round(day_change, 2),
            'day_change_percent': round(day_change_percent, 2),
            'cash_balance': round(cash_balance, 2),
            'invested_amount': round(invested_amount, 2),
            'positions_count': totals['total_positions'],
            'as_of_date': datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error calculating portfolio performance: {e}")
        return {}

def calculate_asset_allocation(user_id: str):
    """Calculate asset allocation breakdown by type"""
    try:
        holdings = get_user_holdings(user_id)
        
        # Group by asset type
        allocation = {}
        total_value = 0
        
        for holding in holdings:
            if holding['quantity'] <= 0:
                continue
                
            symbol = holding['symbol']
            value = holding['market_value']
            total_value += value
            
            # Determine asset type
            if symbol == 'CASH':
                asset_type = 'Cash'
            else:
                asset_type = 'Stocks'
            
            if asset_type not in allocation:
                allocation[asset_type] = {'value': 0, 'count': 0}
            
            allocation[asset_type]['value'] += value
            allocation[asset_type]['count'] += 1
        
        # Calculate percentages
        for asset_type in allocation:
            allocation[asset_type]['percentage'] = (
                allocation[asset_type]['value'] / total_value * 100
            ) if total_value > 0 else 0
            allocation[asset_type]['value'] = round(allocation[asset_type]['value'], 2)
            allocation[asset_type]['percentage'] = round(allocation[asset_type]['percentage'], 1)
        
        return allocation
    except Exception as e:
        logger.error(f"Error calculating asset allocation: {e}")
        return {}

def get_portfolio_summary(user_id: str):
    """Get comprehensive portfolio summary with key metrics"""
    try:
        performance = calculate_portfolio_performance(user_id)
        allocation = calculate_asset_allocation(user_id)
        totals = calculate_portfolio_totals(user_id)
        
        # Get top holdings by value (no individual performance analysis)
        holdings = get_user_holdings(user_id)
        stock_holdings = [h for h in holdings if h['symbol'] != 'CASH' and h['quantity'] > 0]
        stock_holdings.sort(key=lambda x: x['market_value'], reverse=True)
        top_holdings = stock_holdings[:5]
        
        return {
            'performance': performance,
            'asset_allocation': allocation,
            'top_holdings': [
                {
                    'symbol': h['symbol'],
                    'name': h['name'],
                    'quantity': h['quantity'],
                    'market_value': h['market_value'],
                    'percentage_of_portfolio': (h['market_value'] / totals['total_market_value'] * 100) if totals['total_market_value'] > 0 else 0
                }
                for h in top_holdings
            ],
            'portfolio_totals': totals,
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error generating portfolio summary: {e}")
        return {}

def calculate_transaction_metrics(user_id: str, days: int = 30):
    """Calculate transaction-based metrics over a period"""
    try:
        transactions = get_transaction_history(user_id, limit=1000)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get transactions within the period
        recent_transactions = [
            t for t in transactions 
            if datetime.fromisoformat(t['transaction_date'].replace('Z', '+00:00')) >= cutoff_date
        ]
        
        # Calculate metrics
        total_invested = sum(
            float(t['total_amount']) for t in recent_transactions 
            if t['transaction_type'] == 'BUY'
        )
        total_divested = sum(
            float(t['total_amount']) for t in recent_transactions 
            if t['transaction_type'] == 'SELL'
        )
        net_cash_flow = sum(
            float(t['total_amount']) for t in recent_transactions 
            if t['transaction_type'] == 'DEPOSIT'
        ) - sum(
            float(t['total_amount']) for t in recent_transactions 
            if t['transaction_type'] == 'WITHDRAWAL'
        )
        
        return {
            'period_days': days,
            'total_invested': round(total_invested, 2),
            'total_divested': round(total_divested, 2),
            'net_cash_flow': round(net_cash_flow, 2),
            'transaction_count': len(recent_transactions),
            'calculated_at': datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error calculating transaction metrics: {e}")
        return {}

def calculate_portfolio_chart_data(user_id: str, period: str = '1M'):
    """Get portfolio value chart data from snapshots"""
    try:
        from services.market_service import get_portfolio_value_history
        
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
        
        # Get portfolio value history from snapshots
        history_data = get_portfolio_value_history(user_id, days)
        
        # If no historical data, return current value only
        if not history_data:
            current_totals = calculate_portfolio_totals(user_id)
            current_value = current_totals['total_market_value']
            
            return [{
                'date': datetime.now().strftime('%Y-%m-%d'),
                'total_value': round(current_value, 2)
            }]
        
        # Format the data for charting
        chart_data = []
        for snapshot in history_data:
            chart_data.append({
                'date': snapshot['date'],
                'total_value': round(float(snapshot['total_value']), 2)
            })
        
        return chart_data
    except Exception as e:
        logger.error(f"Error getting portfolio chart data: {e}")
        return []

def calculate_historical_performance(user_id: str, days: int = 30):
    """Calculate historical performance using portfolio snapshots"""
    try:
        from services.market_service import get_portfolio_value_history
        
        # Get portfolio value history
        history_data = get_portfolio_value_history(user_id, days)
        
        if len(history_data) < 2:
            return {
                'period_days': days,
                'insufficient_data': True,
                'message': 'Need at least 2 portfolio snapshots for historical analysis',
                'calculated_at': datetime.now(timezone.utc).isoformat()
            }
        
        # Calculate performance metrics
        earliest_value = float(history_data[0]['total_value'])
        latest_value = float(history_data[-1]['total_value'])
        
        value_change = latest_value - earliest_value
        percent_change = (value_change / earliest_value * 100) if earliest_value > 0 else 0
        
        # Transaction metrics for the period
        transaction_metrics = calculate_transaction_metrics(user_id, days)
        
        return {
            'period_days': days,
            'start_date': history_data[0]['date'],
            'end_date': history_data[-1]['date'],
            'start_value': round(earliest_value, 2),
            'end_value': round(latest_value, 2),
            'value_change': round(value_change, 2),
            'percent_change': round(percent_change, 2),
            'snapshots_count': len(history_data),
            'transaction_metrics': transaction_metrics,
            'calculated_at': datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error calculating historical performance: {e}")
        return {} 