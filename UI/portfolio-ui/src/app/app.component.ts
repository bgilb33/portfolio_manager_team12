import { Component, OnInit } from '@angular/core';
import { PortfolioService } from './services/portfolio.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit{
  title = 'portfolio-ui';

  constructor(private portfolioService: PortfolioService) {}

  ngOnInit(): void {
      this.portfolioService.getPortfolio();
      this.portfolioService.getTimeSeriesData();
  }
}
