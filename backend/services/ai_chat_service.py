"""
AI Chat Service for Portfolio Manager
Uses Google GenAI with gemini-2.5-flash model
"""

import logging
import os
from typing import Dict, List, Any
from datetime import datetime, timezone
from google import genai

from services.portfolio_service import get_portfolio_details
from services.holdings_service import get_user_holdings
from services.transaction_service import get_transaction_history
from services.analytics_service import calculate_asset_allocation
from services.watchlist_service import get_watchlist

logger = logging.getLogger(__name__)

class AIChatService:
    def __init__(self):
        api_key = os.getenv('GOOGLE_GENAI_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_GENAI_API_KEY environment variable is required")
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.5-flash"
        self.active_chats: Dict[str, Any] = {}
        self.system_instruction = (
            "You are a helpful portfolio management assistant. You have access to the user's portfolio data and can provide insights about their investments, market analysis, and portfolio performance. "
            "Your capabilities include: Analyzing portfolio performance and allocation, providing market insights and stock information, suggesting portfolio improvements, answering questions about specific holdings, and explaining investment concepts. "
            "Always be helpful, accurate, and provide actionable insights."
        )

    def _get_or_create_chat(self, user_id: str):
        if user_id not in self.active_chats:
            self.active_chats[user_id] = self.client.chats.create(model=self.model)
        return self.active_chats[user_id]

    def _build_portfolio_context(self, user_id: str) -> str:
        try:
            context_parts = []
            
            # Get portfolio details with error handling
            try:
                portfolio_details = get_portfolio_details(user_id)
                if portfolio_details and isinstance(portfolio_details, dict):
                    context_parts.append(f"PORTFOLIO OVERVIEW:")
                    context_parts.append(f"- Total Value: ${portfolio_details.get('total_value', 0):,.2f}")
                    context_parts.append(f"- Cash Balance: ${portfolio_details.get('cash_balance', 0):,.2f}")
                    context_parts.append(f"- Total Gain/Loss: ${portfolio_details.get('total_gain_loss', 0):,.2f}")
                    context_parts.append(f"- Total Gain/Loss %: {portfolio_details.get('total_gain_loss_percent', 0):.2f}%")
            except Exception as e:
                logger.warning(f"Could not get portfolio details: {e}")
            
            # Get holdings with error handling
            try:
                holdings = get_user_holdings(user_id)
                if holdings and isinstance(holdings, list):
                    context_parts.append(f"\nCURRENT HOLDINGS:")
                    for holding in holdings:
                        if isinstance(holding, dict):
                            symbol = holding.get('symbol', '')
                            quantity = holding.get('quantity', 0)
                            avg_price = holding.get('avg_price', 0)
                            current_price = holding.get('current_price', 0)
                            market_value = holding.get('market_value', 0)
                            gain_loss = holding.get('gain_loss', 0)
                            gain_loss_percent = holding.get('gain_loss_percent', 0)
                            context_parts.append(
                                f"- {symbol}: {quantity} shares @ ${avg_price:.2f} avg, "
                                f"Current: ${current_price:.2f}, Value: ${market_value:.2f}, "
                                f"G/L: ${gain_loss:.2f} ({gain_loss_percent:.2f}%)"
                            )
            except Exception as e:
                logger.warning(f"Could not get holdings: {e}")
            
            # Get transactions with error handling
            try:
                transactions = get_transaction_history(user_id, limit=5, offset=0)
                if transactions and isinstance(transactions, list):
                    context_parts.append(f"\nRECENT TRANSACTIONS:")
                    for tx in transactions:
                        if isinstance(tx, dict):
                            symbol = tx.get('symbol', 'CASH')
                            tx_type = tx.get('transaction_type', '')
                            quantity = tx.get('quantity', 0)
                            price = tx.get('price', 0)
                            date = tx.get('transaction_date', '')
                            context_parts.append(
                                f"- {date}: {tx_type} {quantity} {symbol} @ ${price:.2f}"
                            )
            except Exception as e:
                logger.warning(f"Could not get transactions: {e}")
            
            # Get allocation with error handling
            try:
                allocation = calculate_asset_allocation(user_id)
                if allocation and isinstance(allocation, list):
                    context_parts.append(f"\nASSET ALLOCATION:")
                    for asset in allocation:
                        if isinstance(asset, dict):
                            symbol = asset.get('symbol', '')
                            percentage = asset.get('percentage', 0)
                            context_parts.append(f"- {symbol}: {percentage:.1f}%")
            except Exception as e:
                logger.warning(f"Could not get allocation: {e}")
            
            # Get watchlist with error handling
            try:
                watchlist = get_watchlist(user_id)
                if watchlist and isinstance(watchlist, list):
                    context_parts.append(f"\nWATCHLIST:")
                    for item in watchlist:
                        if isinstance(item, dict):
                            symbol = item.get('symbol', '')
                            context_parts.append(f"- {symbol}")
            except Exception as e:
                logger.warning(f"Could not get watchlist: {e}")
            
            return "\n".join(context_parts)
        except Exception as e:
            logger.error(f"Error building portfolio context for user {user_id}: {e}")
            return "Portfolio data unavailable"

    def chat(self, user_id: str, message: str) -> Dict[str, Any]:
        try:
            chat = self._get_or_create_chat(user_id)
            portfolio_context = self._build_portfolio_context(user_id)
            # No stock symbol extraction or market data lookup
            full_context = f"SYSTEM INSTRUCTION:\n{self.system_instruction}\n\nPORTFOLIO CONTEXT:\n{portfolio_context}\n\nUSER QUESTION: {message}"
            response = chat.send_message(full_context)
            return {
                'response': response.text,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'user_id': user_id,
                'history': [
                    {'role': m.role, 'content': m.parts[0].text if m.parts else ''}
                    for m in chat._curated_history
                ]
            }
        except Exception as e:
            logger.error(f"Error in AI chat for user {user_id}: {e}")
            return {
                'response': "I'm sorry, I encountered an error processing your request. Please try again.",
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'user_id': user_id,
                'error': str(e)
            }

    def clear_chat_history(self, user_id: str) -> bool:
        try:
            if user_id in self.active_chats:
                del self.active_chats[user_id]
                logger.info(f"Cleared chat history for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error clearing chat history for user {user_id}: {e}")
            return False

    def get_chat_history(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            if user_id not in self.active_chats:
                return []
            chat = self.active_chats[user_id]
            history = []
            for message in chat._curated_history:
                history.append({
                    'role': message.role,
                    'content': message.parts[0].text if message.parts else '',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                })
            return history
        except Exception as e:
            logger.error(f"Error getting chat history for user {user_id}: {e}")
            return []

# Global instance - lazy initialization
ai_chat_service = None

def get_ai_chat_service():
    global ai_chat_service
    if ai_chat_service is None:
        ai_chat_service = AIChatService()
    return ai_chat_service 