import { Component, OnInit } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { Holding, PortfolioData } from '../../models/portfolio.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-holdings',
  templateUrl: './holdings.component.html',
  styleUrl: './holdings.component.css'
})
export class HoldingsComponent {

  portfolio: PortfolioData | null = null;
  holdings : Holding[] = [];
  cashBalance: number = 0;
  totalMarketValue: number = 0;
  
  // Tooltip properties
  tooltipVisible: boolean = false;
  tooltipHolding: Holding | null = null;

  isRefreshing: boolean = false;

  constructor(private portfolioService: PortfolioService) { }

  ngOnInit(): void {
    this.portfolioService.portfolio$.subscribe(data => {
      if (data){
        this.portfolio = data;
        // Filter out holdings with zero quantity and cash holdings
        this.holdings = data.holdings.filter(holding => 
          holding.quantity > 0 && holding.symbol !== 'CASH'
        );
        this.cashBalance = data.summary.cash_balance;
        this.totalMarketValue = data.summary.total_market_value;
      }
    })
  }

  getNetWorth(): number {
    // Net worth = stocks (at market value) + cash
    const stocksValue = this.getTotalMarketValue();
    return stocksValue + this.cashBalance;
  }

  getCash(): number {
    return this.cashBalance;
  }

  getTotalMarketValue(): number{
    // Calculate stocks value by summing only non-cash holdings at current market prices
    return this.holdings
      .filter(holding => holding.symbol !== 'CASH')
      .reduce((sum, holding) => sum + holding.market_value, 0);
  }

  getTotalCostBasis(): number {
    // Calculate stocks value based on average cost (total cost basis)
    return this.holdings
      .filter(holding => holding.symbol !== 'CASH')
      .reduce((sum, holding) => sum + holding.total_cost, 0);
  }

  getStocksAtCost(): number {
    // Return stocks value based on average cost instead of market value
    return this.getTotalCostBasis();
  }

  getUnrealizedGainLoss(): number {
    // Unrealized gain/loss = Net worth - (Stocks at cost + Cash)
    const netWorth = this.getNetWorth();
    const stocksAtCost = this.getStocksAtCost();
    const cash = this.getCash();
    return netWorth - (stocksAtCost + cash);
  }

  getRealizedGainLoss(): number {
    return this.portfolio?.summary.total_realized_gain_loss || 0;
  }

  getTotalInvested(holding: Holding): number {
    return holding.quantity * holding.average_cost;
  }

  // Helper to calculate percent change from average cost to current price
  getCostBasisPercentChange(holding: Holding): number | null {
    if (holding.average_cost && holding.current_price && holding.average_cost !== 0) {
      return ((holding.current_price - holding.average_cost) / holding.average_cost) * 100;
    }
    return null;
  }

  // Get holdings with positive percent change from cost basis
  getGainers(): Holding[] {
    return this.holdings
      .filter(h => this.getCostBasisPercentChange(h) !== null && this.getCostBasisPercentChange(h)! > 0)
      .sort((a, b) => (this.getCostBasisPercentChange(b) || 0) - (this.getCostBasisPercentChange(a) || 0))
      .slice(0, 3);
  }

  // Get holdings with negative percent change from cost basis
  getLosers(): Holding[] {
    return this.holdings
      .filter(h => this.getCostBasisPercentChange(h) !== null && this.getCostBasisPercentChange(h)! < 0)
      .sort((a, b) => (this.getCostBasisPercentChange(a) || 0) - (this.getCostBasisPercentChange(b) || 0))
      .slice(0, 3);
  }

  // Show tooltip for a holding
  showTooltip(event: Event, holding: Holding): void {
    event.stopPropagation();
    this.tooltipHolding = holding;
    this.tooltipVisible = true;
  }

  // Hide tooltip
  hideTooltip(): void {
    this.tooltipVisible = false;
    this.tooltipHolding = null;
  }

  refresh(): void {
    this.isRefreshing = true;
    this.portfolioService.refreshHoldings().subscribe(data => {
      if (data) {
        forkJoin([
          this.portfolioService.getPortfolio(),
          this.portfolioService.getTimeSeriesData(),
          this.portfolioService.getWatchlist()
        ]).subscribe(() => {
          this.isRefreshing = false;
        });
      }
    })
  }
}
