import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { PortfolioData, ChartData, Transaction, TransactionRequest, TransactionResponse, PriceDataResponse, TransactionsResponse, CashRequest } from '../models/portfolio.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private portfolioSubject = new BehaviorSubject<PortfolioData | null>(null);
  portfolio$ = this.portfolioSubject.asObservable();

  private timeSerisSubject = new BehaviorSubject<ChartData | null>(null);
  timeSeries$ = this.timeSerisSubject.asObservable();

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

}
