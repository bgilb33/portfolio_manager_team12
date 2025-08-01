import { Component, OnInit } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioData, PriceData, TransactionRequest, Transaction, CashRequest, StockSearchResult } from '../../models/portfolio.model';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.css'
})
export class TransactionsComponent implements OnInit {

  portfolio: PortfolioData | null = null;

  current_stock: PriceData | null = null;
  searchError: boolean = false;

  searchQuery: string = '';
  searchResults: StockSearchResult[] = [];
  tradeType: string = '';
  quantity: number | null = null;
  showConfirmationModal: boolean = false;
  statusMessage: string = '';
  statusType: 'success' | 'error' | '' = '';

  transactions: Transaction[] = [];
  showTransactionsModal: boolean = false;

  cashAmount: number | null = null;
  cashTransactionType: string = '';
  showCashTransactionModal: boolean = false;
  cashStatusMessage: string = '';
  cashStatusType: 'success' | 'error' | '' = '';

  constructor(private portfolioService: PortfolioService) { }

  ngOnInit(): void {
    this.portfolioService.portfolio$.subscribe(data => {
      this.portfolio = data;
    })

    this.portfolioService.userIdReady$.subscribe(ready => {
      if (ready) {
        this.portfolioService.getUserTransactions().subscribe(data => {
          this.transactions = data.transactions;
        })
      }
    })
  }

  onSearchChange(): void {
    if (this.searchQuery.length > 1) {
      this.portfolioService.searchStocks(this.searchQuery).subscribe(data => {
        this.searchResults = data.results;
      });
    } else {
      this.searchResults = [];
    }
  }

  selectStock(stock: StockSearchResult): void {
    this.searchQuery = stock.symbol;
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

  searchStock(): void {
    this.portfolioService.getStockPrice(this.searchQuery).subscribe({
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

  triggerSearchError(): void {
    this.current_stock = null;
    this.searchError = true;
    setTimeout(() => {
      this.searchError = false;
    }, 3000);
  }

  submitTrade(): void {
    if (!this.current_stock || !this.quantity || !this.tradeType) {
      alert("Please complete all trade fields.");
      return;
    }

    this.showConfirmationModal = true;
  }

  confirmTrade(): void {
    if (this.current_stock?.symbol && this.quantity) {
      let transactionRequest: TransactionRequest = {
        symbol: this.current_stock?.symbol,
        transaction_type: this.tradeType,
        quantity: this.quantity,
        price: this.current_stock?.current_price,
        transaction_date: new Date()
      }

      this.portfolioService.createTransaction(transactionRequest).subscribe({
        next: (data) => {
          this.displayTradeResult(data.transaction.id != null);
        },
        error: (error) => {
          console.error("Trade Error:", error);
          if (error.error && error.error.error) {
            this.statusMessage = error.error.error;
          } else if (error.error && error.error.detail) {
            this.statusMessage = error.error.detail;
          } else if (error.message) {
            this.statusMessage = error.message;
          } else {
            this.statusMessage = 'Trade failed. Please try again.';
          }
          this.statusType = 'error';
          setTimeout(() => {
            this.statusMessage = '';
            this.statusType = '';
          }, 5000);
        }
      })
    }

    this.showConfirmationModal = false;
    this.searchQuery = '';
    this.current_stock = null;
    this.tradeType = '';
    this.quantity = null;
  }

  displayTradeResult(success: boolean) {
    if (success) {
      this.statusMessage = 'Trade submitted successfully.';
      this.statusType = 'success';
      this.portfolioService.getPortfolio().subscribe();
      this.portfolioService.getTimeSeriesData().subscribe();
      setTimeout(() => {
        this.statusMessage = '';
        this.statusType = '';
      }, 5000);
    }
    else {
      this.statusType = 'error';
      this.statusMessage = 'Trade failed. Please try again.';
      setTimeout(() => {
        this.statusMessage = '';
        this.statusType = '';
      }, 5000);
    }
  }

  cancelTrade(): void {
    this.showConfirmationModal = false;
    this.showConfirmationModal = false;
    this.searchQuery = '';
    this.current_stock = null;
    this.tradeType = '';
    this.quantity = null;
  }

  submitCashTransaction(): void {
    if (!this.cashAmount || !this.cashTransactionType) {
      alert("Please complete all trade fields.");
      return;
    }
    this.showCashTransactionModal = true;
  }

  confirmCashTransaction(): void {

    if (this.cashAmount && this.cashTransactionType != '') {
      let transactionRequest: CashRequest = {
        transaction_type: this.cashTransactionType,
        amount: this.cashAmount,
        transaction_date: new Date(),
        notes: ""
      }

      this.portfolioService.createCashTransaction(transactionRequest).subscribe({
        next: (data) => {
          if (data.transaction.id != null) {
            this.cashStatusMessage = 'Transaction submitted successfully.';
            this.cashStatusType = 'success';
            this.portfolioService.getPortfolio().subscribe();
          }
          else {
            this.cashStatusMessage = 'Trade failed. Please try again.';
            this.cashStatusType = 'error';
          }
        },
        error: (error) => {
          console.error("Cash Transaction Error:", error);
          if (error.error && error.error.error) {
            this.cashStatusMessage = error.error.error;
          } else if (error.error && error.error.detail) {
            this.cashStatusMessage = error.error.detail;
          } else if (error.message) {
            this.cashStatusMessage = error.message;
          } else {
            this.cashStatusMessage = 'Transaction failed. Please try again.';
          }
          this.cashStatusType = 'error';
        }
      })
    }

    this.showCashTransactionModal = false;
    this.cashAmount = null;
    this.cashTransactionType = '';
  }

  cancelCashTransaction(): void {
    this.showCashTransactionModal = false;
    this.showCashTransactionModal = false;
    this.cashAmount = null;
    this.cashTransactionType = '';
  }

  formatPrice(value: number | undefined | null): string {
    return value != null ? `${value.toFixed(2)}` : 'N/A';
  }

  formatTotal(): string {
    if (!this.current_stock || !this.quantity) return 'N/A';
    const total = this.current_stock.current_price * this.quantity;
    return `${total.toFixed(2)}`;
  }

  openTransactionModal(): void {
    this.showTransactionsModal = true;
  }

  closeTransactionModal(): void {
    this.showTransactionsModal = false;
  }

}
