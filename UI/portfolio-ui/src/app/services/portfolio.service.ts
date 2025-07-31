import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { PortfolioData, ChartData, Transaction, TransactionRequest, TransactionResponse, PriceDataResponse, TransactionsResponse, CashRequest } from '../models/portfolio.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private portfolioSubject = new BehaviorSubject<PortfolioData | null>(null);
  portfolio$ = this.portfolioSubject.asObservable();

  private timeSerisSubject = new BehaviorSubject<ChartData | null>(null);
  timeSeries$ = this.timeSerisSubject.asObservable();

  private userIdReady = new BehaviorSubject<boolean>(false);
  userIdReady$ = this.userIdReady.asObservable();

  host: string = "http://localhost:2000/api";

  userID: string | null = null;

  constructor(private http: HttpClient, private supabase: SupabaseService) { 
    this.loadUserId()
  }

  async loadUserId() {
    const { data, error } = await this.supabase.getCurrentUser();
    if (data?.user) {
      this.userID = data.user.id;
      this.userIdReady.next(true); 
    }
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

}
