import { Component, OnInit } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioData, ChartData, PortfolioSnapshot } from '../../models/portfolio.model';
import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexTitleSubtitle, ApexNonAxisChartSeries, ApexResponsive, ApexYAxis, ApexPlotOptions } from 'ngx-apexcharts';

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

export type TreemapChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  title: ApexTitleSubtitle;
  responsive: ApexResponsive[];
  plotOptions?: ApexPlotOptions;
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

  sectorChartOptions: TreemapChartOptions = {
    series: [],
    chart: {
      type: 'treemap',
      height: '250px',
    },
    title: {
      text: 'Sector Allocation'
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: { width: 300 },
        }
      }
    ]
  };

  chartData: ChartData | null = null;
  timeSeriesData: PortfolioSnapshot[] | null = null;

  // Time range options
  timeRanges = [
    { label: '1W', value: '1W' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
    { label: '1Y', value: '1Y' },
    { label: 'MAX', value: 'MAX' }
  ];
  selectedPeriod: string = '1M';

  portfolio: PortfolioData | null = null;

  constructor(private portfolioService: PortfolioService) {}
  
  ngOnInit(): void {
    // Getting portfolio data
    this.portfolioService.portfolio$.subscribe(data => {
      if (!data) return;
      this.portfolio = data;
      console.log('Portfolio data received:', data);
      console.log('Holdings:', data.holdings);

      // Filter out holdings with zero quantity for the pie chart
      const activeHoldings = this.portfolio.holdings.filter(h => h.quantity > 0);
      console.log('Active holdings:', activeHoldings);

      this.holdingsChartOptions = {
        series: activeHoldings.map(h => h.market_value),
        chart: {
          type: 'pie',
          height: '225px',
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

      const sectorMap = new Map<string, { totalValue: number, totalDayChange: number, count: number }>();
      activeHoldings.forEach(holding => {
        if (holding.symbol != "CASH") {
          console.log(`Processing holding: ${holding.symbol}, sector: ${holding.sector}, market_value: ${holding.market_value}, day_change: ${holding.day_change}`);
          if (holding.sector && holding.sector.trim() !== '') {
            const current = sectorMap.get(holding.sector) || { totalValue: 0, totalDayChange: 0, count: 0 };
            current.totalValue += holding.market_value;
            current.totalDayChange += (holding.day_change || 0) * holding.quantity; // Weight by quantity
            current.count += 1;
            sectorMap.set(holding.sector, current);
          } else {
            console.warn(`Holding ${holding.symbol} has no sector information`);
            // Add to "Unknown" category instead of ignoring
            const current = sectorMap.get('Unknown') || { totalValue: 0, totalDayChange: 0, count: 0 };
            current.totalValue += holding.market_value;
            current.totalDayChange += (holding.day_change || 0) * holding.quantity;
            current.count += 1;
            sectorMap.set('Unknown', current);
          }
        }
      })

      console.log('Sector map:', sectorMap);
      console.log('Sector map entries:', Array.from(sectorMap.entries()));

      // Convert sectorMap to treemap format with colors based on average day change
      const treemapData = Array.from(sectorMap.entries()).map(([sector, data]) => ({
        x: sector,
        y: data.totalValue,
        fillColor: this.getSectorColor(data.totalDayChange)
      }));

      this.sectorChartOptions = {
        series: [
          {
            data: treemapData
          }
        ],
        chart: {
          type: 'treemap',
          height: '225px',
          toolbar: {
            show: false
          }
        },
        title: {
          text: 'Sector Allocation'
        },
        responsive: [
          {
            breakpoint: 480,
            options: {
              chart: { width: 300 },
            }
          }
        ]
      };
    });

    // Load initial time series data
    this.loadTimeSeriesData();
  }

  loadTimeSeriesData(): void {
    this.portfolioService.getTimeSeriesData(this.selectedPeriod).subscribe(data => {
      if (data?.chart_data) {
        this.chartData = data;
        this.timeSeriesData = data?.chart_data.chart_data;

        // Determine date format based on period
        let dateFormat: Intl.DateTimeFormatOptions;
        switch (this.selectedPeriod) {
          case '1W':
            dateFormat = { weekday: 'short', month: 'short', day: 'numeric' };
            break;
          case '1M':
            dateFormat = { month: 'short', day: 'numeric' };
            break;
          case '3M':
          case '6M':
            dateFormat = { month: 'short', day: 'numeric' };
            break;
          case '1Y':
          case 'MAX':
            dateFormat = { month: 'short', year: '2-digit' };
            break;
          default:
            dateFormat = { month: 'short', day: 'numeric' };
        }

        //Setting graphs
        const dates = this.timeSeriesData.map(d =>
          new Date(d.date).toLocaleDateString('en-US', dateFormat)
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
            height: '280px',
            toolbar: {
              show: false
            }
          },
          title: {
            text: 'Portfolio Value Over Time',
            style: {
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937'
            }
          },
          xaxis: {
            categories: dates,
            labels: {
              style: {
                colors: '#6b7280',
                fontSize: '12px'
              },
              rotate: -45,
              rotateAlways: true
            }
          },
          yaxis: {
            labels: {
              formatter: function (value: number) {
                return '$' + value.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                });
              },
              style: {
                colors: '#6b7280',
                fontSize: '12px'
              }
            }
          }
        };
      }
    });
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod = period;
    this.loadTimeSeriesData();
  }

  getSectorColor(totalDayChange: number): string {
    // If total day change is positive (green), negative (red)
    return totalDayChange >= 0 ? '#10B981' : '#EF4444';
  }

}
