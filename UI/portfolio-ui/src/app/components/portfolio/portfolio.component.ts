import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.css']
})
export class PortfolioComponent implements OnInit {

  constructor(
    private portfolioService: PortfolioService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.portfolioService.fetchPortfolio();
  }

  logout() {
    this.authService.signOut().then(() => {
      this.router.navigate(['/signin']);
    });
  }

}