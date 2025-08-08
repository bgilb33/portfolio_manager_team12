import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { SupabaseService } from './supabase.service';

export interface PriceUpdate {
  symbol: string;
  price_data: {
    symbol: string;
    current_price: number;
    previous_close: number;
    day_change: number;
    day_change_percent: number;
    last_updated: string;
    timestamp: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private connected = new BehaviorSubject<boolean>(false);
  private priceUpdates = new BehaviorSubject<PriceUpdate | null>(null);
  private watchlistUpdates = new BehaviorSubject<PriceUpdate | null>(null);
  private marketIndexUpdates = new BehaviorSubject<PriceUpdate | null>(null);
  private subscriptionStatus = new BehaviorSubject<any>(null);
  private watchlistSubscriptionStatus = new BehaviorSubject<any>(null);
  private marketIndicesSubscriptionStatus = new BehaviorSubject<any>(null);
  private streamStatus = new BehaviorSubject<any>(null);
  private errors = new BehaviorSubject<string | null>(null);

  public connected$ = this.connected.asObservable();
  public priceUpdates$ = this.priceUpdates.asObservable();
  public watchlistUpdates$ = this.watchlistUpdates.asObservable();
  public marketIndexUpdates$ = this.marketIndexUpdates.asObservable();
  public subscriptionStatus$ = this.subscriptionStatus.asObservable();
  public watchlistSubscriptionStatus$ = this.watchlistSubscriptionStatus.asObservable();
  public marketIndicesSubscriptionStatus$ = this.marketIndicesSubscriptionStatus.asObservable();
  public streamStatus$ = this.streamStatus.asObservable();
  public errors$ = this.errors.asObservable();

  private readonly serverUrl = 'http://localhost:2000';
  private userID: string | null = null;

  constructor(private supabase: SupabaseService) {
    this.loadUserId();
  }

  async loadUserId() {
    const { data, error } = await this.supabase.getCurrentUser();
    if (data?.user) {
      this.userID = data.user.id;
    }
  }

  connect(): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Connecting to WebSocket server...');
    
    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.connected.next(true);
      this.errors.next(null);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      this.connected.next(false);
    });

    this.socket.on('connected', (data) => {
      console.log('Server confirmation:', data);
    });

    this.socket.on('price_update', (data: PriceUpdate) => {
      console.log('Price update received:', data);
      this.priceUpdates.next(data);
    });

    this.socket.on('watchlist_price_update', (data: PriceUpdate) => {
      console.log('Watchlist price update received:', data);
      this.watchlistUpdates.next(data);
    });

    this.socket.on('market_index_update', (data: PriceUpdate) => {
      console.log('Market index update received:', data);
      this.marketIndexUpdates.next(data);
    });

    this.socket.on('subscription_status', (data) => {
      console.log('Subscription status:', data);
      this.subscriptionStatus.next(data);
    });

    this.socket.on('watchlist_subscription_status', (data) => {
      console.log('Watchlist subscription status:', data);
      this.watchlistSubscriptionStatus.next(data);
    });

    this.socket.on('market_indices_subscription_status', (data) => {
      console.log('Market indices subscription status:', data);
      this.marketIndicesSubscriptionStatus.next(data);
    });

    this.socket.on('stream_status', (data) => {
      console.log('Stream status:', data);
      this.streamStatus.next(data);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.errors.next(error.message || 'WebSocket error occurred');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.errors.next('Failed to connect to price streaming service');
      this.connected.next(false);
    });
  }

  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting from WebSocket server...');
      this.socket.disconnect();
      this.socket = null;
      this.connected.next(false);
    }
  }

  subscribeToPrices(): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected');
      this.errors.next('WebSocket not connected');
      return;
    }

    if (!this.userID) {
      console.error('User ID not available');
      this.errors.next('User ID not available');
      return;
    }

    console.log('Subscribing to price updates for user:', this.userID);
    this.socket.emit('subscribe_prices', { user_id: this.userID });
  }

  unsubscribeFromPrices(): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected');
      return;
    }

    if (!this.userID) {
      console.error('User ID not available');
      return;
    }

    console.log('Unsubscribing from price updates for user:', this.userID);
    this.socket.emit('unsubscribe_prices', { user_id: this.userID });
  }

  getStreamStatus(): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit('get_stream_status');
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Helper method to start the complete flow
  startPriceStreaming(): void {
    if (!this.isConnected()) {
      this.connect();
      
      // Wait for connection then subscribe
      const connectionSub = this.connected$.subscribe(connected => {
        if (connected && this.userID) {
          setTimeout(() => {
            this.subscribeToPrices();
            connectionSub.unsubscribe(); // Clean up this one-time subscription
          }, 500); // Small delay to ensure connection is fully established
        }
      });
    } else {
      this.subscribeToPrices();
    }
  }

  // Subscribe to watchlist symbols
  subscribeToWatchlist(symbols: string[]): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected');
      this.errors.next('WebSocket not connected');
      return;
    }

    if (!this.userID) {
      console.error('User ID not available');
      this.errors.next('User ID not available');
      return;
    }

    console.log('Subscribing to watchlist symbols:', symbols);
    this.socket.emit('subscribe_watchlist', { 
      user_id: this.userID,
      symbols: symbols 
    });
  }

  // Subscribe to market indices
  subscribeToMarketIndices(): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected');
      this.errors.next('WebSocket not connected');
      return;
    }

    console.log('Subscribing to market indices...');
    this.socket.emit('subscribe_market_indices', {
      symbols: ['^GSPC', '^DJI', '^IXIC']  // S&P 500, Dow Jones, NASDAQ
    });
  }

  // Unsubscribe from watchlist
  unsubscribeFromWatchlist(): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected');
      return;
    }

    if (!this.userID) {
      console.error('User ID not available');
      return;
    }

    console.log('Unsubscribing from watchlist...');
    this.socket.emit('unsubscribe_watchlist', { user_id: this.userID });
  }

  // Unsubscribe from market indices
  unsubscribeFromMarketIndices(): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected');
      return;
    }

    console.log('Unsubscribing from market indices...');
    this.socket.emit('unsubscribe_market_indices');
  }

  // Helper method to stop the complete flow
  stopPriceStreaming(): void {
    this.unsubscribeFromPrices();
    setTimeout(() => {
      this.disconnect();
    }, 500); // Small delay to ensure unsubscribe is processed
  }

  // Get the current price updates observable
  getPriceUpdates(): Observable<PriceUpdate | null> {
    return this.priceUpdates$;
  }

  // Get watchlist price updates observable
  getWatchlistUpdates(): Observable<PriceUpdate | null> {
    return this.watchlistUpdates$;
  }

  // Get market index updates observable
  getMarketIndexUpdates(): Observable<PriceUpdate | null> {
    return this.marketIndexUpdates$;
  }

  // Start watchlist streaming
  startWatchlistStreaming(symbols: string[]): void {
    if (!this.isConnected()) {
      this.connect();
      
      const connectionSub = this.connected$.subscribe(connected => {
        if (connected && this.userID) {
          setTimeout(() => {
            this.subscribeToWatchlist(symbols);
            connectionSub.unsubscribe(); // Clean up this one-time subscription
          }, 500);
        }
      });
    } else {
      this.subscribeToWatchlist(symbols);
    }
  }

  // Start market indices streaming
  startMarketIndicesStreaming(): void {
    if (!this.isConnected()) {
      this.connect();
      
      this.connected$.subscribe(connected => {
        if (connected) {
          setTimeout(() => {
            this.subscribeToMarketIndices();
          }, 500);
        }
      });
    } else {
      this.subscribeToMarketIndices();
    }
  }

  // Stop watchlist streaming
  stopWatchlistStreaming(): void {
    this.unsubscribeFromWatchlist();
  }

  // Stop market indices streaming
  stopMarketIndicesStreaming(): void {
    this.unsubscribeFromMarketIndices();
  }

  // Clear current price update
  clearPriceUpdate(): void {
    this.priceUpdates.next(null);
  }

  // Clear watchlist update
  clearWatchlistUpdate(): void {
    this.watchlistUpdates.next(null);
  }

  // Clear market index update
  clearMarketIndexUpdate(): void {
    this.marketIndexUpdates.next(null);
  }

  // Clear errors
  clearErrors(): void {
    this.errors.next(null);
  }
}