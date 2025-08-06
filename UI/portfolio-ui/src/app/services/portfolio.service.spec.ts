import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PortfolioService } from './portfolio.service';
import { SupabaseService } from './supabase.service';
import { PortfolioData, PriceDataResponse, ChartData, StockSearchResult, TransactionRequest, TransactionResponse, CashRequest, RefreshResponse, PriceData } from '../models/portfolio.model';
import { TransactionsResponse } from '../models/portfolio.model';
import { of } from 'rxjs';


describe('PortfolioService', () => {
  let service: PortfolioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {

    const supabaseSpy = jasmine.createSpyObj('SupabaseService', ['getCurrentUser']);


    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PortfolioService,
        { provide: SupabaseService, useValue: supabaseSpy }
      ]
    });


    service = TestBed.inject(PortfolioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });


  // getPortfolio Tests

  it('should return user portfolio', () => {
    service.userID = 'user123'
    const mockResponse: PortfolioData = {
      "holdings": [
          {
              "average_cost": 173.72,
              "current_price": 179.415,
              "day_change": 5.695,
              "day_change_percent": 3.2783,
              "gain_loss": 28.475,
              "market_value": 897.075,
              "name": "NVIDIA Corporation",
              "quantity": 5,
              "realized_gain_loss": 0,
              "sector": "Technology",
              "symbol": "NVDA",
              "total_cost": 868.6
          },
          {
              "average_cost": 154.27,
              "current_price": 160.57,
              "day_change": 6.3,
              "day_change_percent": 4.0837,
              "gain_loss": 63,
              "market_value": 1605.7,
              "name": "Palantir Technologies Inc.",
              "quantity": 10,
              "realized_gain_loss": 0,
              "sector": "Technology",
              "symbol": "PLTR",
              "total_cost": 1542.7
          },
          {
              "average_cost": 1,
              "current_price": 1,
              "day_change": 0,
              "day_change_percent": 0,
              "gain_loss": 0,
              "market_value": 9585.98,
              "name": "Cash",
              "quantity": 9585.98,
              "realized_gain_loss": 0,
              "sector": "",
              "symbol": "CASH",
              "total_cost": 9585.98
          },
          {
              "average_cost": 952.52,
              "current_price": 950.6988,
              "day_change": -1.8212,
              "day_change_percent": -0.1912,
              "gain_loss": -5.4636,
              "market_value": 2852.0964,
              "name": "Costco Wholesale Corporation",
              "quantity": 3,
              "realized_gain_loss": 0,
              "sector": "Consumer Defensive",
              "symbol": "COST",
              "total_cost": 2857.56
          }
      ],
      "portfolio": {
          "created_at": "2025-07-31T20:17:29.312573+00:00",
          "description": "Personal investment portfolio",
          "full_name": "User",
          "id": "4632193a-fbb9-454e-8424-22b5266ff73e",
          "name": "My Portfolio",
          "portfolio_id": "4632193a-fbb9-454e-8424-22b5266ff73e",
          "updated_at": "2025-07-31T20:17:29.312573+00:00"
      },
      "summary": {
          "cash_balance": 9585.98,
          "total_cost_basis": 14854.839999999998,
          "total_gain_loss": 86.01140000000123,
          "total_gain_loss_percent": 0.5790126315732869,
          "total_market_value": 14940.8514,
          "total_positions": 3,
          "total_realized_gain_loss": 0
      }
    }

    let observableResult: PortfolioData | undefined;
    let subjectResult: PortfolioData | null = null;

    service.getPortfolio().subscribe(result => {
      observableResult = result
    })

    service.portfolio$.subscribe(result => {
      subjectResult = result
    })

    const req = httpMock.expectOne(`http://localhost:2000/api/portfolio/${service.userID}`)
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(mockResponse)

    expect(observableResult).toEqual(mockResponse);
    expect(subjectResult).not.toBeNull();
    expect(subjectResult!).toEqual(mockResponse);
  });

  it('should handle error when fetching portfolio fails', () => {
    service.userID = 'user123';

    let errorMessage: string | null = null;

    service.getPortfolio().subscribe({
      next: () => fail('Expected error, but got success'),
      error: (err) => {
        errorMessage = err.message;
      }
    });

    const req = httpMock.expectOne(`http://localhost:2000/api/portfolio/${service.userID}`);
    expect(req.request.method).toBe('GET');
    req.flush({ error: 'Internal server error' }, { status: 500, statusText: 'Server Error' });

    expect(errorMessage!).toBe('Failed to load portfolio.');
  });


  // getTimeSeriesData Tests

  it('should return time series data correctly', () => {
    service.userID = 'user123';

    const mockResponse: ChartData = {
      chart_data: {
        chart_data: [
          {
            "date": "2025-07-26",
            "total_value": 19850.75,
            "cumulative_change": 0
          },
          {
            "date": "2025-07-27",
            "total_value": 20010.5,
            "cumulative_change": 159.75
          },
          {
            "date": "2025-07-28",
            "total_value": 20150.0,
            "cumulative_change": 299.25
          }
        ],
        period_days: 360
      },
      days: 360,
      period: '1Y'
    }

    let observableResult: ChartData | undefined;
    let subjectResult: ChartData | null = null;

    service.getTimeSeriesData().subscribe(result => {
      observableResult = result
    })

    service.timeSeries$.subscribe(result => {
      subjectResult = result
    })

    const req = httpMock.expectOne(`http://localhost:2000/api/portfolio/chart/${service.userID}/1Y`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(mockResponse)

    expect(observableResult).toEqual(mockResponse);
    expect(subjectResult).not.toBeNull();
    expect(subjectResult!).toEqual(mockResponse);

  });

  it('should handle error when fetching time series data fails', () => {
    service.userID = 'user123';

    let errorMessage: string | null = null;

    service.getTimeSeriesData().subscribe({
      next: () => fail('Expected error, got success'),
      error: (err) => {
        errorMessage = err.message;
      }
    });

    const req = httpMock.expectOne(`http://localhost:2000/api/portfolio/chart/${service.userID}/1Y`);
    req.flush({ error: 'Chart generation failed' }, { status: 500, statusText: 'Server Error' });

    expect(errorMessage!).toBe('Failed to load portfolio.');
  });


  // getUserTransaction Tests

  it('should fetch user transactions correctly', () => {
    service.userID = 'user123';

    const mockResponse: TransactionsResponse = {
      transactions: [
        {
          id: 'tx1',
          user_id: 'user123',
          symbol: 'AAPL',
          transaction_type: 'BUY',
          quantity: 5,
          price: 200,
          total_amount: 1000,
          transaction_date: new Date(),
          notes: ''
        },
        {
          id: 'tx2',
          user_id: 'user123',
          symbol: 'NVDA',
          transaction_type: 'SELL',
          quantity: 5,
          price: 200,
          total_amount: 1000,
          transaction_date: new Date(),
          notes: ''
        },
      ]
    };

    service.getUserTransactions().subscribe(response => {
      expect(response).toEqual(mockResponse);
      expect(response.transactions.length).toBe(2);
      expect(response.transactions[0].symbol).toBe('AAPL');
      expect(response.transactions[1].symbol).toBe('NVDA');
    });

    const req = httpMock.expectOne(`http://localhost:2000/api/transactions/${service.userID}`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(mockResponse);
  });

  it('should handle error when fetching user transactions fails', () => {
    service.userID = 'user123';

    let errorMessage: string | null = null;

    service.getUserTransactions().subscribe({
      next: () => fail('Expected error, got success'),
      error: (err) => {
        errorMessage = err.message;
      }
    });

    const req = httpMock.expectOne(`http://localhost:2000/api/transactions/${service.userID}`);
    req.flush({ error: 'Database error' }, { status: 500, statusText: 'Server Error' });

    expect(errorMessage!).toBe('Could not fetch transactions. Please try again later.');
  });


  // getStockPrice Tests

  it('should fetch stock price by ticker', () => {
    const mockResponse: PriceDataResponse = {
      price_data: {
        current_price: 420.69,
        day_change: 2.5,
        day_change_percent: 0.6,
        last_updated: new Date(),
        previous_close: 418.19,
        symbol: 'AAPL',
        name: 'Apple Inc.'
      }
    };

    service.getStockPrice('AAPL').subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('http://localhost:2000/api/market/price/AAPL');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle error when fetching stock price fails', () => {
    let errorMessage: string | null = null;

    service.getStockPrice('AAPL').subscribe({
      next: () => fail('Expected error, got success'),
      error: (err) => {
        errorMessage = err.message;
      }
    });

    const req = httpMock.expectOne('http://localhost:2000/api/market/price/AAPL');
    req.flush({ error: 'Stock data unavailable' }, { status: 500, statusText: 'Server Error' });

    expect(errorMessage!).toBe('Failed to load stock price.');
  });


  // searchStocks Tests

  it('should complete stock search', () => {
    const mockResponse = {
      results: [
      {
        symbol: "COST",
        name: "Costco Wholesale Corporation",
        exchange: "NMS",
        type: "EQUITY",
        current_price: 942.28,
        previous_close: 940.00,
        day_change: 2.28,
        day_change_percent: 1.02
      }]
    }

    service.searchStocks("COST").subscribe(result => {
      expect(result).toEqual(mockResponse)
    });

    const req = httpMock.expectOne('http://localhost:2000/api/market/search/COST?fuzzy=true');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle error when searching stocks fails', () => {
    let errorMessage: string | null = null;

    service.searchStocks('COST').subscribe({
      next: () => fail('Expected error, got success'),
      error: (err) => {
        errorMessage = err.message;
      }
    });

    const req = httpMock.expectOne('http://localhost:2000/api/market/search/COST?fuzzy=true');
    req.flush({ error: 'Search failed' }, { status: 500, statusText: 'Server Error' });

    expect(errorMessage!).toBe('Failed to load search results.');
  });


  // createTransaction Tests

  it('should purchase a stock', () => {
    service.userID = 'user123';
    
    const mockRequest: TransactionRequest = {
      symbol: 'AAPL',
      transaction_type: 'BUY',
      quantity: 1,
      price: 204.04,
      transaction_date: new Date()
    }

    const mockResponse: TransactionResponse = {
      transaction: {
        id: 'tx1',
        user_id: 'user123',
        symbol: 'AAPL',
        transaction_type: 'BUY',
        quantity: 1,
        price: 204.04,
        total_amount: 204.04,
        transaction_date: new Date()
      }
    }

    service.createTransaction(mockRequest).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`http://localhost:2000/api/transactions/${service.userID}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockRequest);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');

    req.flush(mockResponse);
  })

  it('should handle error when creating stock transaction fails', () => {
    service.userID = 'user123';

    const request = {
      symbol: 'AAPL',
      transaction_type: 'BUY',
      quantity: 1,
      price: 204.04,
      transaction_date: new Date()
    };

    let errorMessage: string | null = null;

    service.createTransaction(request).subscribe({
      next: () => fail('Expected error, got success'),
      error: (err) => {
        errorMessage = err.message;
      }
    });

    const req = httpMock.expectOne(`http://localhost:2000/api/transactions/${service.userID}`);
    req.flush({ error: 'Transaction failed' }, { status: 500, statusText: 'Server Error' });

    expect(errorMessage!).toBe('Failed to create transaction.');
  });


  // createCashTransaction Tests

  it('should deposit cash', () => {
    service.userID = 'user123';

    const mockRequest: CashRequest = {
      transaction_type: 'DEPOSIT',
      amount: 200.00,
      transaction_date: new Date(),
      notes: ''
    };

    const mockResponse: TransactionResponse = {
      transaction: {
        id: 'tx1',
        user_id: 'user123',
        symbol: 'CASH',
        transaction_type: 'DEPOSIT',
        quantity: 1.0,
        price: 200.00,
        total_amount: 200.00,
        transaction_date: new Date(),
      }
    }

    service.createCashTransaction(mockRequest).subscribe(result => {
      expect(result).toEqual(mockResponse);
    })

    const req = httpMock.expectOne(`http://localhost:2000/api/transactions/${service.userID}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockRequest);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');

    req.flush(mockResponse);
  })

  it('should handle error when creating cash transaction fails', () => {
    service.userID = 'user123';

    const request = {
      transaction_type: 'DEPOSIT',
      amount: 500,
      transaction_date: new Date(),
      notes: ''
    };

    let errorMessage: string | null = null;

    service.createCashTransaction(request).subscribe({
      next: () => fail('Expected error, got success'),
      error: (err) => {
        errorMessage = err.message;
      }
    });

    const req = httpMock.expectOne(`http://localhost:2000/api/transactions/${service.userID}`);
    req.flush({ error: 'Failed to deposit' }, { status: 500, statusText: 'Server Error' });

    expect(errorMessage!).toBe('Failed to create transaction.');
  });


  // refreshHoldings Tests

  it('should refresh holdings', () => {
    service.userID = 'user123';

    const mockResponse: RefreshResponse = {
      message: 'Updated prices for 4 symbols.',
      updated_count: 4,
      timestamp: new Date()
    }

    service.refreshHoldings().subscribe(result => {
      expect(result).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`http://localhost:2000/api/market/prices/refresh/${service.userID}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');

    req.flush(mockResponse);
  })

  it('should handle error when refreshing holdings fails', () => {
    service.userID = 'user123';

    let errorMessage: string | null = null;

    service.refreshHoldings().subscribe({
      next: () => fail('Expected error, got success'),
      error: (err) => {
        errorMessage = err.message;
      }
    });

    const req = httpMock.expectOne(`http://localhost:2000/api/market/prices/refresh/${service.userID}`);
    req.flush({ error: 'Failed to update prices' }, { status: 500, statusText: 'Server Error' });

    expect(errorMessage!).toBe('Failed to refresh data.');
  });


  // getMajorIndeces Tests

  it('should fetch and aggregate major indices', fakeAsync(() => {
    const mockResponses: Record<string, PriceDataResponse> = {
      '^GSPC': {
        price_data: {
          current_price: 5000,
          day_change: 10,
          day_change_percent: 0.2,
          last_updated: new Date(),
          previous_close: 4990,
          symbol: '^GSPC',
          name: 'S&P 500'
        }
      },
      '^DJI': {
        price_data: {
          current_price: 35000,
          day_change: 200,
          day_change_percent: 0.57,
          last_updated: new Date(),
          previous_close: 34800,
          symbol: '^DJI',
          name: 'Dow Jones'
        }
      },
      '^IXIC': {
        price_data: {
          current_price: 15000,
          day_change: 150,
          day_change_percent: 1.0,
          last_updated: new Date(),
          previous_close: 14850,
          symbol: '^IXIC',
          name: 'NASDAQ'
        }
      }
    };


    spyOn(service, 'getStockPrice').and.callFake((symbol: string) => {
      return of(mockResponses[symbol]);
    });

    let result: PriceData[] | null = null;
    service.marketView$.subscribe(data => {
      result = data;
    });

    service.getMajorIndices();
    tick(); // Simulate passage of time for all async observables

    expect(service.getStockPrice).toHaveBeenCalledTimes(3);
    expect(result!.length).toBe(3);

    // Optional: check exact contents
    expect(result!).toEqual([
      jasmine.objectContaining({ symbol: '^GSPC', name: 'S&P 500' }),
      jasmine.objectContaining({ symbol: '^DJI', name: 'Dow Jones' }),
      jasmine.objectContaining({ symbol: '^IXIC', name: 'NASDAQ' }),
    ]);
  }));


  // updateSectorInfo Tests

  it('should update sector information for the user', () => {
    service.userID = 'user123';

    const mockResponse = { message: 'Sectors updated' };

    service.updateSectorInfo().subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`http://localhost:2000/api/market/sectors/update/${service.userID}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockResponse);
  });

});