export interface Holding {
  symbol: string;
  quantity: number;
  average_cost: number;
  current_price: number;
  market_value: number;
  gain_loss: number;
}

export interface PortfolioData {
  portfolio: {
    id: string;
    name: string;
    full_name: string;
  };
  holdings: Holding[];
  totals: {
    total_market_value: number;
    total_cost_basis: number;
    total_gain_loss: number;
    cash_balance: number;
  };
}

export interface PortfolioSnapshot {
  date: string,
  total_market_value: number,
  total_gain_loss: number
}
