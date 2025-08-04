import { Component } from '@angular/core';
import { PriceData } from '../../models/portfolio.model';
// import { SearchResults, SearchSymbol } from '../../models/market.model';
import { PortfolioService } from '../../services/portfolio.service';

@Component({
  selector: 'app-market-overview',
  templateUrl: './market-overview.component.html',
  styleUrl: './market-overview.component.css'
})
export class MarketOverviewComponent {
  indices: PriceData[] = [];

  constructor(private portfolioService: PortfolioService) {}

  ngOnInit(): void {
    this.portfolioService.marketView$.subscribe(data => {
      if (data) {
        this.indices = data;
      }
    });

    this.portfolioService.getMajorIndices();  // Initiates async price fetch
  }

  formatNumber(value: number | string): string {
    return typeof value === 'number' ? `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : value;
  }

  formatPercent(value: number | string): string {
    return typeof value === 'number' ? `${value.toFixed(2)}%` : value;
  }
}
