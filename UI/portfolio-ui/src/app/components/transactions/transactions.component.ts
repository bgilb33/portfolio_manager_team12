import { Component, OnInit } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioData, PriceData, TransactionRequest, Transaction, CashRequest } from '../../models/portfolio.model';

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
      console.log(data);
    })

    this.portfolioService.userIdReady$.subscribe(ready => {
      if (ready) {
        this.portfolioService.getUserTransactions().subscribe(data => {
          this.transactions = data.transactions;
          console.log(this.transactions);
        })
      }
    })
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

      this.portfolioService.createTransaction(transactionRequest).subscribe(data => {
        console.log("Trade Data:", data);
        if (data.transaction.id != null) {
          this.statusMessage = 'Trade submitted successfully.';
          this.statusType = 'success';
          this.portfolioService.getPortfolio();
          this.portfolioService.getTimeSeriesData();
        }
        else {
          this.statusMessage = 'Trade failed. Please try again.';
          this.statusType = 'error';
        }
      })
    }

    this.showConfirmationModal = false;
    this.searchQuery = '';
    this.current_stock = null;
    this.tradeType = '';
    this.quantity = null;
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

      this.portfolioService.createCashTransaction(transactionRequest).subscribe(data => {
        console.log("CASH:", data);
        if (data.transaction.id != null) {
          this.cashStatusMessage = 'Transaction submitted successfully.';
          this.cashStatusType = 'success';
          this.portfolioService.getPortfolio();
        }
        else {
          this.cashStatusMessage = 'Trade failed. Please try again.';
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
    return value != null ? `$${value.toFixed(2)}` : 'N/A';
  }

  formatTotal(): string {
    if (!this.current_stock || !this.quantity) return 'N/A';
    const total = this.current_stock.current_price * this.quantity;
    return `$${total.toFixed(2)}`;
  }

  openTransactionModal(): void {
    this.showTransactionsModal = true;
  }

  closeTransactionModal(): void {
    this.showTransactionsModal = false;
  }

}
