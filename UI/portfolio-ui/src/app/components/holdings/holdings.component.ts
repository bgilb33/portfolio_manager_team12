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
  selectedHolding: Holding | null = null;

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
        if (this.holdings.length > 0) {
          this.selectedHolding = this.holdings[0];
        } else {
          this.selectedHolding = null;
        }
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

  selectStock(index: number): void {
    this.selectedHolding = this.holdings[index];
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
