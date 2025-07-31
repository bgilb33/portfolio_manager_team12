import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { PortfolioData, ChartData, Transaction, TransactionRequest, TransactionResponse, PriceDataResponse, TransactionsResponse, CashRequest, PriceData } from '../models/portfolio.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private portfolioSubject = new BehaviorSubject<PortfolioData | null>(null);
  portfolio$ = this.portfolioSubject.asObservable();

  private timeSerisSubject = new BehaviorSubject<ChartData | null>(null);
  timeSeries$ = this.timeSerisSubject.asObservable();

  private marketSubject = new BehaviorSubject<PriceData [] | null>(null);
  marketView$ = this.marketSubject.asObservable();

  host: String = "http://localhost:2000/api";
  userID: String = "75e44b0b-bb72-4e18-bb79-830fd6bfcdca";

  constructor(private http: HttpClient) { 
  }

  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  getPortfolio(): void {
    this.http.get<PortfolioData>(`${this.host}/portfolio/${this.userID}`, this.httpOptions)
      .subscribe((portfolio: PortfolioData) => {
        this.portfolioSubject.next(portfolio);
    });
  }

  // Set as a year for now, will make it changeable via UI later on

  getTimeSeriesData(): void {
    this.http.get<ChartData>(`${this.host}/portfolio/chart/${this.userID}/1Y`, this.httpOptions)
    .subscribe((chartData: ChartData) => {
      console.log("CHART", chartData)
      this.timeSerisSubject.next(chartData);
    });
  }

  getUserTransactions(): Observable<TransactionsResponse> {
    return this.http.get<TransactionsResponse>(`${this.host}/transactions/${this.userID}`, this.httpOptions);
  }

  getStockPrice(ticker: string): Observable<PriceDataResponse> {
    return this.http.get<PriceDataResponse>(`${this.host}/market/price/${ticker}`);
  }

  createTransaction(transaction: TransactionRequest): Observable<TransactionResponse> {
    return this.http.post<TransactionResponse>(`${this.host}/transactions/${this.userID}`, transaction, this.httpOptions);
  }

  createCashTransaction(transaction: CashRequest): Observable<TransactionResponse> {
    console.log("CALLING")
    return this.http.post<TransactionResponse>(`${this.host}/transactions/${this.userID}`, transaction, this.httpOptions);
  }
  getMajorIndices(): void {
    const indices = [
        { symbol: '^GSPC', name: 'S&P 500' },
        { symbol: '^DJI', name: 'Dow Jones' },
      { symbol: '^IXIC', name: 'NASDAQ' }
    ];
    
    const symbols: PriceData[] = [];

    
    indices.forEach(index => {
        this.getStockPrice(index.symbol).subscribe({
            next: (response: PriceDataResponse) => {
                console.log(response);
                const data = response.price_data;
                symbols.push({
                    current_price: data.current_price,
                    day_change: data.day_change,
                    day_change_percent: data.day_change_percent,
                    last_updated: data.last_updated,
                    previous_close: data.previous_close,
                    symbol: index.symbol,
                    name: index.name
                });
            
                if (symbols.length === indices.length) {
                    this.marketSubject.next(symbols);
                }
            },
            error: () => {
                console.warn("ERROR");
            }


        });
    });
    }

}
