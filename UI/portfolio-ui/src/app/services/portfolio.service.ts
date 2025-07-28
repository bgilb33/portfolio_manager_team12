import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { PortfolioData, PortfolioSnapshot } from '../models/portfolio.model';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private portfolioSubject = new BehaviorSubject<PortfolioData | null>(null);
  portfolio$ = this.portfolioSubject.asObservable();

  constructor() { 
  }

  fetchPortfolio(): void {
    const mockPortfolio: PortfolioData = {
      portfolio: {
        id: 'user-uuid',
        name: 'My Portfolio',
        full_name: 'John Doe'
      },
      holdings: [
        {
          symbol: 'AAPL',
          quantity: 10,
          average_cost: 145.5,
          current_price: 175.25,
          market_value: 1752.5,
          gain_loss: 297.5
        },
        {
          symbol: 'TSLA',
          quantity: 5,
          average_cost: 600.0,
          current_price: 700.0,
          market_value: 3500.0,
          gain_loss: 500.0
        }
      ],
      totals: {
        total_market_value: 15750.0,
        total_cost_basis: 14200.0,
        total_gain_loss: 1550.0,
        cash_balance: 2500.0
      }
    };


    this.portfolioSubject.next(mockPortfolio);

    //return of(mockPortfolio); // Don't need to do this, it just returns it as an observable but can maybe use it for error checking later
  }

  getTimeSeriesData(): PortfolioSnapshot[] {
    let mockData = [
      { date: '2024-01-01', value: 10000 },
      { date: '2024-01-02', value: 10300 },
      { date: '2024-01-03', value: 10150 },
      { date: '2024-01-04', value: 10700 },
      { date: '2024-01-05', value: 11000 }
    ];

    return mockData;

  }

}
