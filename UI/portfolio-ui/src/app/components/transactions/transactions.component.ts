import { Component, OnInit } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioData, PriceData, TransactionRequest } from '../../models/portfolio.model';

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
  showModal: boolean = false;
  statusMessage: string = '';
  statusType: 'success' | 'error' | '' = '';


  constructor(private portfolioService: PortfolioService) { }

  ngOnInit(): void {
    this.portfolioService.portfolio$.subscribe(data => {
      this.portfolio = data;
      console.log(data);
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

    this.showModal = true;
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

    this.showModal = false;
    this.searchQuery = '';
    this.current_stock = null;
    this.tradeType = '';
    this.quantity = null;
  }

  cancelTrade(): void {
    this.showModal = false;
  }

  formatPrice(value: number | undefined | null): string {
    return value != null ? `$${value.toFixed(2)}` : 'N/A';
  }

  formatTotal(): string {
    if (!this.current_stock || !this.quantity) return 'N/A';
    const total = this.current_stock.current_price * this.quantity;
    return `$${total.toFixed(2)}`;
  }

}
