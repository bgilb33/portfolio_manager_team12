import { Component, OnInit, OnDestroy } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { WebSocketService, PriceUpdate } from '../../services/websocket.service';
import { Holding, PortfolioData, NewsData, NewsArticle } from '../../models/portfolio.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-holdings',
  templateUrl: './holdings.component.html',
  styleUrl: './holdings.component.css'
})
export class HoldingsComponent implements OnInit, OnDestroy {

  portfolio: PortfolioData | null = null;
  holdings : Holding[] = [];
  cashBalance: number = 0;
  totalMarketValue: number = 0;
  
  // Tooltip properties
  tooltipVisible: boolean = false;
  tooltipHolding: Holding | null = null;

  // News properties
  newsData: NewsData | null = null;
  isLoadingNews: boolean = false;
  activeTab: 'details' | 'news' = 'details';

  // WebSocket properties
  isStreaming: boolean = false;
  streamingError: string | null = null;
  lastPriceUpdate: Date | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private portfolioService: PortfolioService,
    private webSocketService: WebSocketService
  ) { }

  ngOnInit(): void {
    // Subscribe to portfolio data
    const portfolioSub = this.portfolioService.portfolio$.subscribe(data => {
      if (data){
        const oldSymbols = this.holdings.map(h => h.symbol);
        this.portfolio = data;
        // Filter out holdings with zero quantity and cash holdings
        this.holdings = data.holdings.filter(holding => 
          holding.quantity > 0 && holding.symbol !== 'CASH'
        );
        this.cashBalance = data.summary.cash_balance;
        this.totalMarketValue = data.summary.total_market_value;
        
        const newSymbols = this.holdings.map(h => h.symbol);
        
        // Check if symbols have changed (new holdings added or removed)
        const symbolsChanged = oldSymbols.length !== newSymbols.length || 
                              !oldSymbols.every(symbol => newSymbols.includes(symbol));
        
        // Start or restart price streaming if we have holdings
        if (this.holdings.length > 0) {
          if (!this.isStreaming || symbolsChanged) {
            console.log('Holdings symbols changed, restarting price streaming...', { oldSymbols, newSymbols });
            this.stopPriceStreaming();
            setTimeout(() => {
              this.startPriceStreaming();
            }, 500); // Small delay to ensure cleanup
          }
        } else if (this.isStreaming) {
          // No holdings, stop streaming
          this.stopPriceStreaming();
        }
      }
    });
    this.subscriptions.push(portfolioSub);
    
    // Subscribe to WebSocket connection status
    const connectionSub = this.webSocketService.connected$.subscribe(connected => {
      console.log('WebSocket connection status:', connected);
      if (connected) {
        this.streamingError = null;
      }
    });
    this.subscriptions.push(connectionSub);
    
    // Subscribe to price updates
    const priceUpdateSub = this.webSocketService.getPriceUpdates().subscribe(update => {
      if (update) {
        this.handlePriceUpdate(update);
        this.lastPriceUpdate = new Date();
      }
    });
    this.subscriptions.push(priceUpdateSub);
    
    // Subscribe to WebSocket errors
    const errorSub = this.webSocketService.errors$.subscribe(error => {
      if (error) {
        this.streamingError = error;
        console.error('WebSocket error:', error);
      }
    });
    this.subscriptions.push(errorSub);
    
    // Subscribe to subscription status
    const statusSub = this.webSocketService.subscriptionStatus$.subscribe(status => {
      if (status) {
        console.log('Subscription status update:', status);
        this.isStreaming = status.status === 'subscribed';
      }
    });
    this.subscriptions.push(statusSub);
    
    // Trigger initial portfolio fetch (like other components do)
    this.portfolioService.getPortfolio().subscribe({
      next: (data) => {
        console.log('Portfolio data loaded successfully');
      },
      error: (error) => {
        console.error('Error loading portfolio:', error);
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Stop price streaming
    this.stopPriceStreaming();
  }

  getNetWorth(): number {
    // Net worth = stocks (at market value) + cash
    const stocksValue = this.getTotalMarketValue();
    return stocksValue + this.cashBalance;
  }

  getCash(): number {
    return this.cashBalance;
  }

  getTotalMarketValue(): number{
    // Calculate stocks value by summing only non-cash holdings at current market prices
    return this.holdings
      .filter(holding => holding.symbol !== 'CASH')
      .reduce((sum, holding) => sum + holding.market_value, 0);
  }

  getTotalCostBasis(): number {
    // Calculate stocks value based on average cost (total cost basis)
    return this.holdings
      .filter(holding => holding.symbol !== 'CASH')
      .reduce((sum, holding) => sum + holding.total_cost, 0);
  }

  getStocksAtCost(): number {
    // Return stocks value based on average cost instead of market value
    return this.getTotalCostBasis();
  }

  getUnrealizedGainLoss(): number {
    // Unrealized gain/loss = Net worth - (Stocks at cost + Cash)
    const netWorth = this.getNetWorth();
    const stocksAtCost = this.getStocksAtCost();
    const cash = this.getCash();
    return netWorth - (stocksAtCost + cash);
  }

  getRealizedGainLoss(): number {
    return this.portfolio?.summary.total_realized_gain_loss || 0;
  }

  getTotalInvested(holding: Holding): number {
    return holding.quantity * holding.average_cost;
  }

  // Helper to calculate percent change from average cost to current price
  getCostBasisPercentChange(holding: Holding): number | null {
    if (holding.average_cost && holding.current_price && holding.average_cost !== 0) {
      return ((holding.current_price - holding.average_cost) / holding.average_cost) * 100;
    }
    return null;
  }

  // Get holdings with positive percent change from cost basis
  getGainers(): Holding[] {
    return this.holdings
      .filter(h => this.getCostBasisPercentChange(h) !== null && this.getCostBasisPercentChange(h)! > 0)
      .sort((a, b) => (this.getCostBasisPercentChange(b) || 0) - (this.getCostBasisPercentChange(a) || 0))
      .slice(0, 3);
  }

  // Get holdings with negative percent change from cost basis
  getLosers(): Holding[] {
    return this.holdings
      .filter(h => this.getCostBasisPercentChange(h) !== null && this.getCostBasisPercentChange(h)! < 0)
      .sort((a, b) => (this.getCostBasisPercentChange(a) || 0) - (this.getCostBasisPercentChange(b) || 0))
      .slice(0, 3);
  }

  // Show tooltip for a holding
  showTooltip(event: Event, holding: Holding): void {
    event.stopPropagation();
    this.tooltipHolding = holding;
    this.tooltipVisible = true;
    this.activeTab = 'details'; // Reset to details tab when opening
  }

  // Hide tooltip
  hideTooltip(): void {
    this.tooltipVisible = false;
    this.tooltipHolding = null;
    this.newsData = null;
    this.activeTab = 'details';
  }

  // Load news for a holding
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

  // Switch to news tab
  showNews(symbol: string): void {
    if (!symbol || !this.tooltipHolding) return;
    this.activeTab = 'news';
    this.loadNews(symbol);
  }

  // Switch to details tab
  showDetails(): void {
    this.activeTab = 'details';
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

  // WebSocket management methods
  startPriceStreaming(): void {
    if (!this.isStreaming && this.holdings.length > 0) {
      console.log('Starting price streaming for holdings...');
      this.webSocketService.startPriceStreaming();
    }
  }

  stopPriceStreaming(): void {
    if (this.isStreaming) {
      console.log('Stopping price streaming...');
      this.webSocketService.stopPriceStreaming();
      this.isStreaming = false;
    }
  }

  handlePriceUpdate(update: PriceUpdate): void {
    console.log('Processing price update:', update);
    
    // Find the holding that matches this symbol
    const holdingIndex = this.holdings.findIndex(h => h.symbol === update.symbol);
    
    if (holdingIndex !== -1) {
      // Update the holding with new price data
      const holding = this.holdings[holdingIndex];
      const oldPrice = holding.current_price;
      
      // Update price fields
      holding.current_price = update.price_data.current_price;
      holding.day_change = update.price_data.day_change;
      holding.day_change_percent = update.price_data.day_change_percent;
      
      // Recalculate market value
      holding.market_value = holding.quantity * holding.current_price;
      
      // Recalculate gain/loss
      holding.gain_loss = holding.market_value - holding.total_cost;
      
      // Update the holdings array to trigger change detection
      this.holdings = [...this.holdings];
      
      // If the tooltip is showing this holding, update it too
      if (this.tooltipHolding && this.tooltipHolding.symbol === update.symbol) {
        this.tooltipHolding = { ...holding };
      }
      
      console.log(`Updated ${update.symbol}: $${oldPrice} → $${holding.current_price} (${holding.day_change_percent.toFixed(2)}%)`);
    }
  }



  // Toggle streaming method for UI
  toggleStreaming(): void {
    if (this.isStreaming) {
      this.stopPriceStreaming();
    } else {
      this.startPriceStreaming();
    }
  }




}
