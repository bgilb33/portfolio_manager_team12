import { Component } from '@angular/core';
import { WatchlistData, WatchlistDataResponse } from '../../models/portfolio.model';
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
  
}
