import { Component, OnInit, OnDestroy } from '@angular/core';
import { PriceData } from '../../models/portfolio.model';
import { PortfolioService } from '../../services/portfolio.service';
import { WebSocketService, PriceUpdate } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-market-overview',
  templateUrl: './market-overview.component.html',
  styleUrl: './market-overview.component.css'
})
export class MarketOverviewComponent implements OnInit, OnDestroy {
  indices: PriceData[] = [];

  // WebSocket properties
  isStreamingMarketIndices: boolean = false;
  streamingError: string | null = null;
  lastMarketUpdate: Date | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private portfolioService: PortfolioService,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    const marketViewSub = this.portfolioService.marketView$.subscribe(data => {
      if (data) {
        this.indices = data;
        
        // Start streaming for market indices once we have them
        if (this.indices.length > 0 && !this.isStreamingMarketIndices) {
          this.startMarketIndicesStreaming();
        }
      }
    });
    this.subscriptions.push(marketViewSub);

    // Also listen for portfolio changes to restart streaming if needed
    // This ensures market indices keep streaming even after transactions
    const portfolioSub = this.portfolioService.portfolio$.subscribe(portfolioData => {
      console.log('Market Overview: Portfolio data changed', {
        hasPortfolioData: !!portfolioData,
        indicesLength: this.indices.length,
        isStreaming: this.isStreamingMarketIndices
      });
      
      if (portfolioData) {
        // Give a longer delay for market indices since they're loaded separately
        setTimeout(() => {
          console.log('Portfolio changed, ensuring market indices streaming is active...', {
            indicesLength: this.indices.length,
            isCurrentlyStreaming: this.isStreamingMarketIndices
          });
          
          if (this.indices.length > 0) {
            this.startMarketIndicesStreaming();
          } else {
            // If indices aren't loaded yet, force load them and then start streaming
            console.log('Indices not loaded yet, forcing refresh...');
            this.portfolioService.getMajorIndices();
          }
        }, 1500); // Longer delay since market indices load independently
      }
    });
    this.subscriptions.push(portfolioSub);

    this.portfolioService.getMajorIndices();  // Initiates async price fetch
    this.setupWebSocketSubscriptions();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Stop streaming
    this.stopMarketIndicesStreaming();
  }

  refresh(): void {
    this.portfolioService.getMajorIndices();  // Refresh market indices
  }

  formatNumber(value: number | string): string {
    return typeof value === 'number' ? `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : value;
  }

  formatPercent(value: number | string): string {
    return typeof value === 'number' ? `${value.toFixed(2)}%` : value;
  }

  // WebSocket methods
  setupWebSocketSubscriptions(): void {
    // Subscribe to market index updates
    const marketUpdateSub = this.webSocketService.getMarketIndexUpdates().subscribe(update => {
      if (update) {
        this.handleMarketIndexUpdate(update);
        this.lastMarketUpdate = new Date();
      }
    });
    this.subscriptions.push(marketUpdateSub);

    // Subscribe to WebSocket errors
    const errorSub = this.webSocketService.errors$.subscribe(error => {
      if (error) {
        this.streamingError = error;
        console.error('WebSocket error:', error);
      }
    });
    this.subscriptions.push(errorSub);

    // Subscribe to market indices subscription status
    const statusSub = this.webSocketService.marketIndicesSubscriptionStatus$.subscribe(status => {
      if (status) {
        console.log('Market indices subscription status:', status);
        this.isStreamingMarketIndices = status.status === 'subscribed';
      }
    });
    this.subscriptions.push(statusSub);
  }

  startMarketIndicesStreaming(): void {
    console.log('Attempting to start market indices streaming...', {
      isCurrentlyStreaming: this.isStreamingMarketIndices,
      indicesCount: this.indices.length
    });
    
    // Always restart streaming to ensure it's active, regardless of current status
    console.log('Restarting market indices streaming to ensure connection...');
    this.webSocketService.stopMarketIndicesStreaming();
    setTimeout(() => {
      console.log('Starting fresh market indices streaming...');
      this.webSocketService.startMarketIndicesStreaming();
    }, 200); // Slightly longer delay for market indices
  }

  stopMarketIndicesStreaming(): void {
    if (this.isStreamingMarketIndices) {
      console.log('Stopping market indices streaming...');
      this.webSocketService.stopMarketIndicesStreaming();
      this.isStreamingMarketIndices = false;
    }
  }

  handleMarketIndexUpdate(update: PriceUpdate): void {
    console.log('Processing market index update:', update);
    
    // Find the index that matches this symbol
    const indexIndex = this.indices.findIndex(index => index.symbol === update.symbol);
    
    if (indexIndex !== -1) {
      // Update the index with new price data
      const index = this.indices[indexIndex];
      const oldPrice = index.current_price;
      
      // Update price fields
      index.current_price = update.price_data.current_price;
      index.day_change = update.price_data.day_change;
      index.day_change_percent = update.price_data.day_change_percent;
      index.previous_close = update.price_data.previous_close;
      // Convert string to Date for last_updated
      index.last_updated = new Date(update.price_data.last_updated);
      
      // Update the indices array to trigger change detection
      this.indices = [...this.indices];
      
      console.log(`Updated ${index.name}: $${oldPrice} → $${index.current_price} (${index.day_change_percent.toFixed(2)}%)`);
    }
  }

  // Toggle streaming method for UI
  toggleMarketIndicesStreaming(): void {
    if (this.isStreamingMarketIndices) {
      this.stopMarketIndicesStreaming();
    } else {
      this.startMarketIndicesStreaming();
    }
  }




}
