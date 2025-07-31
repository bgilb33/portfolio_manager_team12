import { Component } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css'
})
export class PortfolioComponent {
  constructor(private portfolioService: PortfolioService) {}
  ngOnInit(): void {
    this.portfolioService.userIdReady$.subscribe(ready => {
      if (ready) {
        this.portfolioService.getPortfolio();
        this.portfolioService.getTimeSeriesData();
      }
    });
  }
}
