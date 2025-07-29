import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { PortfolioData, ChartData } from '../models/portfolio.model';

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
      portfolio_info: {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        full_name: "Test User",
        created_at: new Date("2025-07-28"),
        portfolio_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        name: "My Portfolio"
      },
      portfolio_summary: {
        total_market_value: 20150.00,
        total_cost_basis: 18150.00,
        total_gain_loss: 2000.00,
        total_gain_loss_percent: 11.02,
        cash_balance: 15850.00,
        total_positions: 3
      },
      portfolio_performance: {
        total_value: 20150.00,
        day_change: 140.00,
        day_change_percent: 0.70
      },
      holdings: [
        {
          symbol: "AAPL",
          name: "Apple Inc.",
          quantity: 10,
          average_cost: 150.00,
          current_price: 175.25,
          market_value: 1752.50,
          total_cost: 1500.00,
          gain_loss: 252.50
        }
      ]
    }


    this.portfolioSubject.next(mockPortfolio);

    //return of(mockPortfolio); // Don't need to do this, it just returns it as an observable but can maybe use it for error checking later
  }

  getTimeSeriesData(): ChartData {
    let mockData = [
      { date: '2024-01-01', total_value: 10000,  total_gain_loss: 0},
      { date: '2024-01-02', total_value: 10300, total_gain_loss: 300 },
      { date: '2024-01-03', total_value: 10150, total_gain_loss: 150 },
      { date: '2024-01-04', total_value: 10700, total_gain_loss: 700 },
      { date: '2024-01-05', total_value: 11000, total_gain_loss: 1000 }
    ];

    let chart = {
      chart_data: mockData,
      period: "6M"
    }

    return chart;

  }

}
