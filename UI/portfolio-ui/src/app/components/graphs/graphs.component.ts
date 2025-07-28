import { Component, OnInit } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioData, PortfolioSnapshot } from '../../models/portfolio.model';
import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexTitleSubtitle, ApexNonAxisChartSeries, ApexResponsive } from 'ngx-apexcharts';

export type LineChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  title: ApexTitleSubtitle;
};

export type PieChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  responsive: ApexResponsive[];
  title: ApexTitleSubtitle;
};

@Component({
  selector: 'app-graphs',
  templateUrl: './graphs.component.html',
  styleUrl: './graphs.component.css'
})
export class GraphsComponent implements OnInit {

  portfolioValueChartOptions: LineChartOptions = {
    series: [],
    chart: { type: 'line' },
    xaxis: {},
    title: {}
  };

  pieChartOptions: PieChartOptions = {
    series: [],
    chart: { type: 'pie'},
    labels: [],
    responsive: [],
    title: {}
  }

  timeSeriesData: PortfolioSnapshot[] | null = null;

  portfolio: PortfolioData | null = null;

  constructor(private portfolioService: PortfolioService) {}
  
  ngOnInit(): void {
    // Getting portfolio data
    this.portfolioService.portfolio$.subscribe(data => {
      this.portfolio = data;
    });

    // Getting time series data
    this.timeSeriesData = this.portfolioService.getTimeSeriesData();
    
    // Setting portfolio chart options
    this.portfolioValueChartOptions = {
      series: [
        {
          name: 'Portfolio Value',
          data: this.timeSeriesData.map(d => ({ x: d.date, y: d.value }))
        }
      ],
      chart: {
        type: 'line',
        height: '250px',
        width: '100%',
        toolbar: {
          show: false
        }
      },
      title: {
        text: 'Portfolio Value Over Time'
      },
      xaxis: {
        type: 'datetime'
      }
    };

    if (this.portfolio) {
      this.pieChartOptions = {
        series: this.portfolio.holdings.map(h => h.market_value).concat(this.portfolio.totals.cash_balance),
        chart: {
          type: 'pie',
          height: 320
        },
        labels: this.portfolio.holdings.map(h => h.symbol).concat('CASH'),
        title: {
          text: 'Holdings Allocation'
        },
        responsive: [
          {
            breakpoint: 480,
            options: {
              chart: { width: 300 },
              legend: { position: 'bottom' }
            }
          }
        ]
      };
    }

  };

}
