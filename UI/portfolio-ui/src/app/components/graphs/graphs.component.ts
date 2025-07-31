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

  gainLossChartOptions: LineChartOptions = {
    series: [],
    chart: { type: 'line' },
    xaxis: {},
    yaxis: {},
    title: {}
  };

  pieChartOptions: PieChartOptions = {
    series: [],
    chart: { type: 'pie'},
    labels: [],
    responsive: [],
    title: {}
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

      this.pieChartOptions = {
        series: this.portfolio.holdings.map(h => h.market_value),
        chart: {
          type: 'pie',
          height: '250px',
          //width: '100%'
        },
        labels: this.portfolio.holdings.map(h => h.symbol),
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

        this.gainLossChartOptions = {
          series: [
            {
              name: 'Cumulative Change',
              data: this.timeSeriesData.map(d => ({ x: d.date, y: d.cumulative_change }))
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
            text: 'Gain/Loss Over Time'
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
