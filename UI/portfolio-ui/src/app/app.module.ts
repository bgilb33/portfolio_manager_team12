import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxApexchartsModule } from 'ngx-apexcharts';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HoldingsComponent } from './components/holdings/holdings.component';
import { GraphsComponent } from './components/graphs/graphs.component';
import { TransactionsComponent } from './components/transactions/transactions.component';
import { MarketOverviewComponent } from './components/market-overview/market-overview.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';
import { AuthComponent } from './components/auth/auth.component';

@NgModule({
  declarations: [
    AppComponent,
    HoldingsComponent,
    GraphsComponent,
    TransactionsComponent,
    MarketOverviewComponent,
    PortfolioComponent,
    AuthComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgxApexchartsModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
