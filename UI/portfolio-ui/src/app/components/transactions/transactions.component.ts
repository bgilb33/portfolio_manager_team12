import { Component, OnInit } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioData, PriceData } from '../../models/portfolio.model';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.css'
})
export class TransactionsComponent implements OnInit {

  portfolio: PortfolioData | null = null;
  current_stock: PriceData | null = null;
  searchQuery: string = '';


  constructor(private portfolioService: PortfolioService) { }

  ngOnInit(): void {
    this.portfolioService.portfolio$.subscribe(data => {
      this.portfolio = data;
      console.log(data);
    })
  }

  searchStock(): void {
    this.portfolioService.getStockPrice(this.searchQuery).subscribe(data => {
      console.log(data);
      this.current_stock = data.price_data;
    })
  }

}
