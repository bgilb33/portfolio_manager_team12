import { Component, OnInit } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioData, ChartData, PortfolioSnapshot } from '../../models/portfolio.model';
import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexTitleSubtitle, ApexNonAxisChartSeries, ApexResponsive, ApexYAxis } from 'ngx-apexcharts';

export type LineChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
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
    yaxis: {},
    title: {}
  };


  holdingsChartOptions: PieChartOptions = {
    series: [],
    chart: { type: 'pie'},
    labels: [],
    responsive: [],
    title: {},
  }

  sectorChartOptions: PieChartOptions = {
    series: [],
    chart: { type: 'pie'},
    labels: [],
    responsive: [],
    title: {},
  }

  chartData: ChartData | null = null;
  timeSeriesData: PortfolioSnapshot[] | null = null;


  portfolio: PortfolioData | null = null;

  constructor(private portfolioService: PortfolioService) {}
  
  ngOnInit(): void {
    // Getting portfolio data
    this.portfolioService.portfolio$.subscribe(data => {
      if (!data) return;
      this.portfolio = data;

      // Filter out holdings with zero quantity for the pie chart
      const activeHoldings = this.portfolio.holdings.filter(h => h.quantity > 0);

      this.holdingsChartOptions = {
        series: activeHoldings.map(h => h.market_value),
        chart: {
          type: 'pie',
          height: '250px',
          //width: '100%'
        },
        labels: activeHoldings.map(h => h.symbol),
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

      const sectorMap = new Map<string, number>();
      activeHoldings.forEach(holding => {
        if (holding.symbol != "CASH") {
          const current = sectorMap.get(holding.sector) || 0;
          sectorMap.set(holding.sector, current + holding.market_value);
        }
      })

      this.sectorChartOptions = {
        series: Array.from(sectorMap.values()),
        chart: {
          type: 'pie',
          height: '250px',
          //width: '100%'
        },
        labels: Array.from(sectorMap.keys()),
        title: {
          text: 'Sector Allocation'
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

    });

    this.portfolioService.timeSeries$.subscribe(data => {
      if (data?.chart_data) {
        this.chartData = data;
        this.timeSeriesData = data?.chart_data.chart_data;

        //Setting graphs
        const dates = this.timeSeriesData.map(d =>
          new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );

        this.portfolioValueChartOptions = {
          series: [
            {
              name: 'Portfolio Value',
              data: this.timeSeriesData.map(d => ({ x: d.date, y: d.total_value }))
            }
          ],
          chart: {
            type: 'line',
            height: '250px',
            //width: '100%',
            toolbar: {
              show: false
            }
          },
          title: {
            text: 'Portfolio Value Over Time'
          },
          xaxis: {
            categories: dates
          },
          yaxis: {
            labels: {
              formatter: function (value: number) {
                return '$' + value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                });
              }
            }
          }
        };
      }
    })

  };

}
