import { Component, OnInit } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { Holding, PortfolioData } from '../../models/portfolio.model';

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

  constructor(private portfolioService: PortfolioService) { }

  ngOnInit(): void {
    this.portfolioService.portfolio$.subscribe(data => {
      if (data){
        this.portfolio = data;
        this.holdings = data.holdings;
        this.cashBalance = data.portfolio_summary.cash_balance;
        this.totalMarketValue = data.portfolio_summary.total_market_value;
        if (this.holdings.length > 0) {
          this.selectedHolding = this.holdings[0];
        }
      }
      console.log(this.portfolio);
    })
  }

  getNetWorth(): number {
    return this.totalMarketValue + this.cashBalance;
  }

  getCash(): number {
    return this.cashBalance;
  }

  getTotalMarketValue(): number{
    return this.totalMarketValue;
  }

  getTotalInvested(holding: Holding): number {
    return holding.quantity * holding.average_cost;
  }

  selectStock(index: number): void {
    this.selectedHolding = this.holdings[index];
  }
}
