import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxApexchartsModule } from 'ngx-apexcharts';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HoldingsComponent } from './components/holdings/holdings.component';
import { GraphsComponent } from './components/graphs/graphs.component';
import { TransactionsComponent } from './components/transactions/transactions.component';
import { MarketOverviewComponent } from './components/market-overview/market-overview.component';
import { SignupComponent } from './components/signup/signup.component';
import { SigninComponent } from './components/signin/signin.component';
import { AuthLayoutComponent } from './components/auth-layout/auth-layout.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';

@NgModule({
  declarations: [
    AppComponent,
    HoldingsComponent,
    GraphsComponent,
    TransactionsComponent,
    MarketOverviewComponent,
    SignupComponent,
    SigninComponent,
    AuthLayoutComponent,
    PortfolioComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgxApexchartsModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }