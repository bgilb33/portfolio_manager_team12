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

  constructor(private portfolioService: PortfolioService) { }

  ngOnInit(): void {
    this.portfolioService.portfolio$.subscribe(data => {
      if (data){
        this.portfolio = data;
        this.holdings = data.holdings;
        this.cashBalance = data.totals.cash_balance;
        this.totalMarketValue = data.totals.total_market_value;
        console.log(data);
      }
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
}
