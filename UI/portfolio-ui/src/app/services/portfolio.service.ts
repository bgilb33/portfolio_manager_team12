import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, of, tap, throwError } from 'rxjs';
import { PortfolioData, ChartData, Transaction, TransactionRequest, TransactionResponse, PriceDataResponse, TransactionsResponse, CashRequest, PriceData, StockSearchResult, RefreshResponse, WatchlistData, WatchlistDataResponse } from '../models/portfolio.model';
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

  private marketSubject = new BehaviorSubject<PriceData [] | null>(null);
  marketView$ = this.marketSubject.asObservable();

  private watchlistSubject = new BehaviorSubject<WatchlistData [] | null>(null);
  watchlist$ = this.watchlistSubject.asObservable();

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

  getPortfolio(): Observable<PortfolioData> {
    return this.http.get<PortfolioData>(`${this.host}/portfolio/${this.userID}`, this.httpOptions).pipe(
      tap((portfolio: PortfolioData) => {
        this.portfolioSubject.next(portfolio);
      }),
      catchError(error => {
        if (error.status === 500) {
          console.error('Server error occurred while fetching portfolio:', error.message);
        } else {
          console.warn('Unexpected error:', error);
        }
        return throwError(() => new Error('Failed to load portfolio.'));
      })
    );
  }


  // Set as a year for now, will make it changeable via UI later on

  getTimeSeriesData(period: string = '1Y'): Observable<ChartData> {
    return this.http.get<ChartData>(`${this.host}/portfolio/chart/${this.userID}/${period}`, this.httpOptions).pipe(
      tap((chartData: ChartData) => {
        this.timeSerisSubject.next(chartData);
      }),
      catchError(error => {
        if (error.status === 500) {
          console.error('Server error occurred while fetching chart data:', error.message);
        }
        else {
          console.log('Unexpected error:', error.message);
        }
        return throwError(() => new Error('Failed to load portfolio.'));
      })
    );
  }


  getUserTransactions(): Observable<TransactionsResponse> {
    return this.http.get<TransactionsResponse>(`${this.host}/transactions/${this.userID}`, this.httpOptions).pipe(
      catchError(error => {
        if (error.status === 400) {
          console.warn('Client error while fetching user transactions:', error.error?.error || error.message);
        } else if (error.status === 500) {
          console.error('Server error while fetching user transactions:', error.error?.error || error.message);
        } else {
          console.error('Unexpected error:', error);
        }
        return throwError(() =>
          new Error('Could not fetch transactions. Please try again later.')
        );
      })
    );
  }

  getStockPrice(ticker: string): Observable<PriceDataResponse> {
    return this.http.get<PriceDataResponse>(`${this.host}/market/price/${ticker}`).pipe(
      catchError(error => {
        if (error.status === 500) {
          console.error('Server error while fetching stock price:', error.message);
        }
        else {
          console.error('Unexpected error:', error.message);
        }

        return throwError(() => 
          new Error('Failed to load stock price.')
        )
      })
    );
  }

  searchStocks(query: string): Observable<{results: StockSearchResult[]}> {
    return this.http.get<{results: StockSearchResult[]}>(`${this.host}/market/search/${query}?fuzzy=true`).pipe(
      catchError(error => {
        if (error.status === 500) {
          console.error('Server error while searching stocks:', error.message);
        }
        else {
          console.error('Unexpected error:', error.message);
        }

        return throwError(() => 
          new Error('Failed to load search results.')
        )
      })
    );
  }

  createTransaction(transaction: TransactionRequest): Observable<TransactionResponse> {
    return this.http.post<TransactionResponse>(`${this.host}/transactions/${this.userID}`, transaction, this.httpOptions).pipe(
      catchError(error => {
        if (error.status === 500) {
          console.log('Server error while creating stock transaction:', error.message);
        }
        else {
          console.log('Unexpected error:', error.message);
        }

        // Preserve the original error message from the backend
        return throwError(() => error)
      })
    );
  }

  createCashTransaction(transaction: CashRequest): Observable<TransactionResponse> {
    return this.http.post<TransactionResponse>(`${this.host}/transactions/${this.userID}`, transaction, this.httpOptions).pipe(
      catchError(error => {
        if (error.status === 500) {
          console.log('Server error while creating cash transaction:', error.message);
        }
        else {
          console.log('Unexpected error:', error.message);
        }

        // Preserve the original error message from the backend
        return throwError(() => error)
      })      
    );
  }

  refreshHoldings(): Observable<RefreshResponse> {
    return this.http.post<RefreshResponse>(`${this.host}/market/prices/refresh/${this.userID}`, {}, this.httpOptions).pipe(
      catchError(error => {
        if (error.status === 500) {
          console.log('Server error while refreshing data:', error.message);
        }
        else {
          console.log('Unexpected error:', error.message);
        }

        return throwError(() => 
          new Error('Failed to refresh data.')
        )
      })      
    );
  }

  updateSectorInfo(): Observable<any> {
    return this.http.post<any>(`${this.host}/market/sectors/update/${this.userID}`, {}, this.httpOptions).pipe(
      catchError(error => {
        if (error.status === 500) {
          console.log('Server error while updating sector info:', error.message);
        }
        else {
          console.log('Unexpected error:', error.message);
        }

        return throwError(() => 
          new Error('Failed to update server info.')
        )
      }) 
    );
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

  getWatchlist(): Observable<WatchlistDataResponse> {
    return this.http.get<WatchlistDataResponse>(`${this.host}/watchlist/${this.userID}`, this.httpOptions).pipe(
      tap((res: WatchlistDataResponse) => {
        this.watchlistSubject.next(res.watchlist);
      }),
      catchError(error => {
        if (error.status === 500) {
          console.error('Server error occurred while fetchin watchlist:', error.message);
        } else {
          console.warn('Unexpected error:', error);
        }
        return throwError(() => new Error('Failed to load watchlist.'));
      })  
    );
  }

  addToWatchlist(symbol: string): Observable<any> {
    return this.http.post(`${this.host}/watchlist/${this.userID}`, { symbol }, this.httpOptions).pipe(
      catchError(error => {
        if (error.status === 500) {
          console.error('Server error occurred while adding to watchlist:', error.message);
        } else {
          console.warn('Unexpected error:', error);
        }
        return throwError(() => new Error('Failed to add to watchlist.'));
      })
    );
  }

  removeFromWatchlist(symbol: string): Observable<any> {
    return this.http.delete(`${this.host}/watchlist/${this.userID}/${symbol}`, this.httpOptions).pipe(
      catchError(error => {
        if (error.status === 500) {
          console.error('Server error occurred while removing from watchlist:', error.message);
        } else {
          console.warn('Unexpected error:', error);
        }
        return throwError(() => new Error('Failed to remove from watchlist.'));
      })
    );
  }

}
