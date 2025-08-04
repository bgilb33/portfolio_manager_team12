import { Component } from '@angular/core';
import { PriceData, StockSearchResult, WatchlistData, WatchlistDataResponse } from '../../models/portfolio.model';
import { PortfolioService } from '../../services/portfolio.service';

@Component({
  selector: 'app-watchlist',
  templateUrl: './watchlist.component.html',
  styleUrl: './watchlist.component.css'
})
export class WatchlistComponent {
  watchlist: WatchlistData[] = [];
  newSymbol: string = "";
  editModal: boolean = false;

  searchResults: StockSearchResult[] = [];
  current_stock: PriceData | null = null;
  searchError: boolean = false;

  constructor (private portfolioService: PortfolioService){}

  ngOnInit(): void{
    this.loadWatchlist()
  }

  loadWatchlist(): void{
    this.portfolioService.getWatchlist().subscribe({
      next: (res: WatchlistDataResponse) => {
        this.watchlist = res.watchlist;
      },
      error: (err) => {
        console.log("error in watchlist" + err);
      }
    });
  }

  addSymbol() {
    if (!this.newSymbol.trim()) return;
    this.portfolioService.addToWatchlist(this.newSymbol.trim().toUpperCase()).subscribe({
      next: () => {
        this.newSymbol = '';
        this.loadWatchlist();
      },
      error: () => {
        console.log("error in watchlist2");
      }
    });

    this.newSymbol = '';
    this.current_stock = null;
  }

  removeSymbol(symbol: string) {
    this.portfolioService.removeFromWatchlist(symbol).subscribe({
      next: () => {
        this.loadWatchlist();
      },
      error: () => {
        console.log("error in watchlist3");
      }
    });
  }

  openEdit(): void{
    this.editModal = true;
  }

  closeEdit(): void{
    this.editModal = false;
  }

  onSearchChange(): void {
    if (this.newSymbol.length > 1) {
      this.portfolioService.searchStocks(this.newSymbol).subscribe(data => {
        this.searchResults = data.results;
      });
    } else {
      this.searchResults = [];
    }
  }

  searchStock(): void {
    this.portfolioService.getStockPrice(this.newSymbol).subscribe({
      next: (data) => {
        if (data && data.price_data) {
          this.current_stock = data.price_data;
          this.searchError = false;
        } else {
          this.triggerSearchError();
        }
      },
      error: () => {
        this.triggerSearchError();
      }
    });
  }

  selectStock(stock: StockSearchResult): void {
    this.newSymbol = stock.symbol;
    this.searchResults = [];
    
    // Use the stock data from search results to get fresh price and company name
    this.portfolioService.getStockPrice(stock.symbol).subscribe({
      next: (data) => {
        if (data && data.price_data) {
          // Ensure we have the company name from the search result
          this.current_stock = {
            ...data.price_data,
            name: stock.name || data.price_data.name
          };
          this.searchError = false;
        } else {
          this.triggerSearchError();
        }
      },
      error: () => {
        this.triggerSearchError();
      }
    });
  }

  triggerSearchError(): void {
    this.current_stock = null;
    this.searchError = true;
    setTimeout(() => {
      this.searchError = false;
    }, 3000);
  }
  
}
