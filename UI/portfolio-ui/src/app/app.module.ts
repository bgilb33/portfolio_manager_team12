import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HoldingsComponent } from './holdings/holdings.component';
import { GraphsComponent } from './graphs/graphs.component';
import { TransactionsComponent } from './transactions/transactions.component';
import { MarketOverviewComponent } from './market-overview/market-overview.component';

@NgModule({
  declarations: [
    AppComponent,
    HoldingsComponent,
    GraphsComponent,
    TransactionsComponent,
    MarketOverviewComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
