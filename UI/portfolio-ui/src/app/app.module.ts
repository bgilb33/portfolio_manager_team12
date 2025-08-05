import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxApexchartsModule } from 'ngx-apexcharts';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthComponent } from './components/auth/auth.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';
import { HoldingsComponent } from './components/holdings/holdings.component';
import { GraphsComponent } from './components/graphs/graphs.component';
import { TransactionsComponent } from './components/transactions/transactions.component';
import { MarketOverviewComponent } from './components/market-overview/market-overview.component';
import { WatchlistComponent } from './components/watchlist/watchlist.component';
import { ChatComponent } from './components/chat/chat.component';

@NgModule({
  declarations: [
    AppComponent,
    AuthComponent,
    PortfolioComponent,
    HoldingsComponent,
    GraphsComponent,
    TransactionsComponent,
    MarketOverviewComponent,
    WatchlistComponent,
    ChatComponent
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
