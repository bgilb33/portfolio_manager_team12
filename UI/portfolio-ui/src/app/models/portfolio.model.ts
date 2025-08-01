// Holdings/User Data

export interface PortfolioInfo {
  id: string,
  full_name: string,
  created_at: Date,
  portfolio_id: string,
  name: string
}

export interface PortfolioSummary {
  total_market_value: number,
  total_cost_basis: number,
  total_gain_loss: number,
  total_gain_loss_percent: number,
  total_realized_gain_loss?: number,
  cash_balance: number,
  total_positions: number
}

export interface PortfolioPerformance {
  total_value: number,
  day_change: number,
  day_change_percent: number
}

export interface Holding {
  symbol: string,
  name: string,
  quantity: number,
  average_cost: number,
  current_price: number,
  market_value: number,
  total_cost: number,
  gain_loss: number,
  realized_gain_loss?: number,
  day_change?: number,
  day_change_percent?: number,
  sector: string
}

export interface PortfolioData {
    portfolio: any; // Replace 'any' with a more specific type if you have one
    holdings: Holding[];
    summary: PortfolioSummary;
}


// Transactions

export interface Transaction {
  id: string,
  user_id: string,
  symbol: string,
  transaction_type: string,
  quantity: number,
  price: number,
  total_amount: number,
  transaction_date: Date,
  notes: string
}

export interface TransactionRequest {
  symbol: string,
  transaction_type: string,
  quantity: number,
  price: number,
  transaction_date: Date
}

export interface TransactionResponse {
  transaction: {
    id: string,
    user_id: string,
    symbol: string,
    transaction_type: string,
    quantity: number,
    price: number,
    total_amount: number,
    transaction_date: Date
  }
}

export interface TransactionsResponse {
  transactions: Transaction[]
}

export interface CashRequest {
  transaction_type: string,
  amount: number,
  transaction_date: Date,
  notes: string
}

// Portfolio Analytics

export interface Performance {
  total_value: number,
  total_cost: number,
  total_gain_loss: number,
  day_change: number,
  day_change_percent: number
}

export interface PortfolioSnapshot {
  date: string,
  total_value: number,
  cumulative_change: number
}

export interface ChartData {
  chart_data: {
    chart_data: PortfolioSnapshot[],
    period_days: number
  },
  days: number,
  period: string 
}
// Market Data

export interface PriceData {
  current_price: number,
  day_change: number,
  day_change_percent: number,
  last_updated: Date,
  previous_close: number,
  symbol: string,
  name?: string;
}

export interface PriceDataResponse {
  price_data: PriceData
}


export interface RefreshResponse {
  message: string,
  updated_count: number,
  timestamp: Date
}

export interface StockSearchResult {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
    current_price?: number;
    previous_close?: number;
    day_change?: number;
    day_change_percent?: number;
}

