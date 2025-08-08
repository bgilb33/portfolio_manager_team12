import { Component, OnInit, OnDestroy } from '@angular/core';
import { PriceData, StockSearchResult, WatchlistData, WatchlistDataResponse, NewsData } from '../../models/portfolio.model';
import { PortfolioService } from '../../services/portfolio.service';
import { WebSocketService, PriceUpdate } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-watchlist',
  templateUrl: './watchlist.component.html',
  styleUrl: './watchlist.component.css'
})
export class WatchlistComponent implements OnInit, OnDestroy {
  watchlist: WatchlistData[] = [];
  newSymbol: string = "";
  editModal: boolean = false;

  searchResults: StockSearchResult[] = [];
  current_stock: PriceData | null = null;
  searchError: boolean = false;

  // News properties
  newsModalVisible: boolean = false;
  newsData: NewsData | null = null;
  isLoadingNews: boolean = false;
  selectedSymbol: string = '';

  // WebSocket properties
  isStreamingWatchlist: boolean = false;
  streamingError: string | null = null;
  lastWatchlistUpdate: Date | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor (
    private portfolioService: PortfolioService,
    private webSocketService: WebSocketService
  ){}

  ngOnInit(): void{
    this.loadWatchlist();
    this.setupWebSocketSubscriptions();
    
    // Listen for portfolio changes to ensure watchlist streaming persists
    // This ensures watchlist keeps streaming even after transactions
    const portfolioSub = this.portfolioService.portfolio$.subscribe(portfolioData => {
      console.log('Watchlist: Portfolio data changed', {
        hasPortfolioData: !!portfolioData,
        watchlistLength: this.watchlist.length,
        isStreaming: this.isStreamingWatchlist
      });
      
      if (portfolioData) {
        // Delay slightly to ensure watchlist is loaded
        setTimeout(() => {
          if (this.watchlist.length > 0) {
            console.log('Portfolio changed, ensuring watchlist streaming is active...');
            this.startWatchlistStreaming();
          } else {
            console.log('Portfolio changed but watchlist is empty, skipping streaming restart');
          }
        }, 1000); // Increased delay to ensure watchlist is loaded
      }
    });
    this.subscriptions.push(portfolioSub);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Stop streaming
    this.stopWatchlistStreaming();
  }

  refresh(): void {
    this.loadWatchlist();
  }

  loadWatchlist(): void{
    const oldSymbols = this.watchlist.map(item => item.symbol);
    
    this.portfolioService.getWatchlist().subscribe({
      next: (res: WatchlistDataResponse) => {
        this.watchlist = res.watchlist;
        const newSymbols = this.watchlist.map(item => item.symbol);
        
        // Check if symbols have changed
        const symbolsChanged = oldSymbols.length !== newSymbols.length || 
                              !oldSymbols.every(symbol => newSymbols.includes(symbol));
        
        // Restart streaming if symbols changed or start if not streaming
        if (this.watchlist.length > 0) {
          if (!this.isStreamingWatchlist || symbolsChanged) {
            console.log('Watchlist symbols changed, restarting streaming...', { oldSymbols, newSymbols });
            this.stopWatchlistStreaming();
            setTimeout(() => {
              this.startWatchlistStreaming();
            }, 500); // Small delay to ensure cleanup
          }
        } else if (this.isStreamingWatchlist) {
          // No watchlist items, stop streaming
          this.stopWatchlistStreaming();
        }
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
        this.current_stock = null;
        this.loadWatchlist(); // This will automatically restart streaming with new symbols
      },
      error: () => {
        console.log("error in watchlist2");
      }
    });
  }

  removeSymbol(symbol: string) {
    this.portfolioService.removeFromWatchlist(symbol).subscribe({
      next: () => {
        this.loadWatchlist(); // This will automatically restart streaming with updated symbols
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

  // Show news modal for a stock
  showNews(symbol: string): void {
    if (!symbol) return;
    this.selectedSymbol = symbol;
    this.newsModalVisible = true;
    this.loadNews(symbol);
  }

  // Hide news modal
  hideNews(): void {
    this.newsModalVisible = false;
    this.newsData = null;
    this.selectedSymbol = '';
  }

  // Load news for a stock
  loadNews(symbol: string): void {
    if (!symbol) return;
    
    this.isLoadingNews = true;
    this.newsData = null;
    
    this.portfolioService.getStockNews(symbol, 10, 'news').subscribe({
      next: (data) => {
        this.newsData = data;
        this.isLoadingNews = false;
      },
      error: (error) => {
        console.error('Error loading news:', error);
        this.isLoadingNews = false;
      }
    });
  }

  // Format date for news articles
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // WebSocket methods
  setupWebSocketSubscriptions(): void {
    // Subscribe to watchlist price updates
    const watchlistUpdateSub = this.webSocketService.getWatchlistUpdates().subscribe(update => {
      if (update) {
        this.handleWatchlistPriceUpdate(update);
        this.lastWatchlistUpdate = new Date();
      }
    });
    this.subscriptions.push(watchlistUpdateSub);

    // Subscribe to WebSocket errors
    const errorSub = this.webSocketService.errors$.subscribe(error => {
      if (error) {
        this.streamingError = error;
        console.error('WebSocket error:', error);
      }
    });
    this.subscriptions.push(errorSub);

    // Subscribe to watchlist subscription status
    const statusSub = this.webSocketService.watchlistSubscriptionStatus$.subscribe(status => {
      if (status) {
        console.log('Watchlist subscription status:', status);
        this.isStreamingWatchlist = status.status === 'subscribed';
      }
    });
    this.subscriptions.push(statusSub);
  }

  startWatchlistStreaming(): void {
    console.log('Attempting to start watchlist streaming...', {
      isCurrentlyStreaming: this.isStreamingWatchlist,
      watchlistLength: this.watchlist.length,
      symbols: this.watchlist.map(item => item.symbol)
    });
    
    if (this.watchlist.length > 0) {
      const symbols = this.watchlist.map(item => item.symbol);
      
      if (!this.isStreamingWatchlist) {
        console.log('Starting watchlist streaming for symbols:', symbols);
        this.webSocketService.startWatchlistStreaming(symbols);
      } else {
        console.log('Watchlist streaming already active, ensuring connection...');
        // Even if we think we're streaming, restart it to be safe
        this.webSocketService.stopWatchlistStreaming();
        setTimeout(() => {
          this.webSocketService.startWatchlistStreaming(symbols);
        }, 100);
      }
    }
  }

  stopWatchlistStreaming(): void {
    if (this.isStreamingWatchlist) {
      console.log('Stopping watchlist streaming...');
      this.webSocketService.stopWatchlistStreaming();
      this.isStreamingWatchlist = false;
    }
  }

  handleWatchlistPriceUpdate(update: PriceUpdate): void {
    console.log('Processing watchlist price update:', update);
    
    // Find the watchlist item that matches this symbol
    const itemIndex = this.watchlist.findIndex(item => item.symbol === update.symbol);
    
    if (itemIndex !== -1) {
      // Update the watchlist item with new price data
      const item = this.watchlist[itemIndex];
      const oldPrice = item.current_price;
      
      // Update price fields
      item.current_price = update.price_data.current_price;
      item.day_change = update.price_data.day_change;
      item.day_change_percent = update.price_data.day_change_percent;
      item.previousClose = update.price_data.previous_close;
      item.last_updated = update.price_data.last_updated;
      
      // Update the watchlist array to trigger change detection
      this.watchlist = [...this.watchlist];
      
      console.log(`Updated watchlist ${update.symbol}: $${oldPrice} → $${item.current_price} (${item.day_change_percent?.toFixed(2) || 0}%)`);
    }
  }

  // Toggle streaming method for UI
  toggleWatchlistStreaming(): void {
    if (this.isStreamingWatchlist) {
      this.stopWatchlistStreaming();
    } else {
      this.startWatchlistStreaming();
    }
  }




  
}
