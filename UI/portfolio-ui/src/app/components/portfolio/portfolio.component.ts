import { Component } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css'
})
export class PortfolioComponent {
  isLoading = true;

  constructor(private portfolioService: PortfolioService) {}
  ngOnInit(): void {
    this.portfolioService.userIdReady$.subscribe(ready => {
      if (ready) {
        forkJoin([
          this.portfolioService.getPortfolio(),
          this.portfolioService.getTimeSeriesData()
        ]).subscribe(() => {
          this.isLoading = false;
        });
      }
    });
  }
}
