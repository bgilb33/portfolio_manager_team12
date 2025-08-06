import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WatchlistComponent } from './watchlist.component';
import { PortfolioService } from '../../services/portfolio.service';
import { SupabaseService } from '../../services/supabase.service';
import { PriceData, StockSearchResult, WatchlistData } from '../../models/portfolio.model';
import { FormsModule } from '@angular/forms';

describe('WatchlistComponent (with real PortfolioService)', () => {
  let component: WatchlistComponent;
  let fixture: ComponentFixture<WatchlistComponent>;
  let httpMock: HttpTestingController;
  let portfolioService: PortfolioService;

  const mockUserID = 'user123';

  const mockWatchlistData: WatchlistData[] = [
    {
      fiftyTwoWeekHigh: 1,
      fiftyTwoWeekLow: 1,
      high: 1,
      low: 1,
      marketCap: 1,
      name: 'Apple Inc.',
      open: 1,
      previousClose: 1,
      recommendations: [{
        buy: 1,
        hold: 1,
        period: "x",
        sell: 1,
        strongBuy: 1,
        strongSell: 1
      }],
      symbol: 'AAPL'
    }
  ];

  const mockSearchResults: StockSearchResult[] = [{
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    exchange: 'NASDAQ',
    type: 'Equity',
    current_price: 1,
    previous_close: 1,
    day_change: 1,
    day_change_percent: 1
  }]

  const mockPriceData: PriceData = {
    current_price: 1,
    day_change: 1,
    day_change_percent: 1,
    last_updated: new Date(),
    previous_close: 1,
    symbol: 'AAPL',
    name: 'Apple Inc.'
  }

  const mockSearchResult: StockSearchResult = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    type: 'Equity',
    current_price: 1,
    previous_close: 1,
    day_change: 1,
    day_change_percent: 1
  }

  beforeEach(async () => {
    const supabaseSpy = jasmine.createSpyObj('SupabaseService', ['getCurrentUser']);
    supabaseSpy.getCurrentUser.and.returnValue({ id: mockUserID });

    await TestBed.configureTestingModule({
      declarations: [WatchlistComponent],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [
        PortfolioService,
        { provide: SupabaseService, useValue: supabaseSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WatchlistComponent);
    component = fixture.componentInstance;
    portfolioService = TestBed.inject(PortfolioService);
    httpMock = TestBed.inject(HttpTestingController);

    portfolioService.userID = mockUserID;

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  
    const req = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}`);
    expect(req.request.method).toBe('GET');
    req.flush({ watchlist: mockWatchlistData });
  });

  it('should load the watchlist data from service', () => {
    const req = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}`);
    expect(req.request.method).toBe('GET');
    req.flush({ watchlist: mockWatchlistData });

    expect(component.watchlist.length).toBe(mockWatchlistData.length);
    expect(component.watchlist[0].symbol).toBe('AAPL');
  });

  it('should add a new symbol to watchlist', () => {
    const req = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}`);
    expect(req.request.method).toBe('GET');
    req.flush({ watchlist: mockWatchlistData });

    const newSymbol = 'TSLA';
    const updatedWatchlist = [
      ...mockWatchlistData,
      {
        fiftyTwoWeekHigh: 1,
        fiftyTwoWeekLow: 1,
        high: 1,
        low: 1,
        marketCap: 1,
        name: 'Tesla, Inc.',
        open: 1,
        previousClose: 1,
        recommendations: [{
          buy: 1, hold: 1, period: "x", sell: 1, strongBuy: 1, strongSell: 1
        }],
        symbol: 'TSLA'
      }
    ];

    component.newSymbol = newSymbol;
    component.addSymbol();

    const postReq = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({ symbol: newSymbol });
    postReq.flush(null);

    const getReq = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({ watchlist: updatedWatchlist });

    expect(component.watchlist.some(w => w.symbol === 'TSLA')).toBeTrue();
  });

  it('should remove a symbol from the watchlist', () => {
    const req = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}`);
    expect(req.request.method).toBe('GET');
    req.flush({ watchlist: mockWatchlistData });

    component.watchlist = [
      ...mockWatchlistData,
      {
        fiftyTwoWeekHigh: 1,
        fiftyTwoWeekLow: 1,
        high: 1,
        low: 1,
        marketCap: 1,
        name: 'Tesla, Inc.',
        open: 1,
        previousClose: 1,
        recommendations: [{
          buy: 1, hold: 1, period: "x", sell: 1, strongBuy: 1, strongSell: 1
        }],
        symbol: 'TSLA'
      }
    ];

    component.removeSymbol('TSLA');

    const deleteReq = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}/TSLA`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    const getReq = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}`);
    getReq.flush({ watchlist: mockWatchlistData });
    expect(component.watchlist.some(w => w.symbol === 'TSLA')).toBeFalse();
  });

  it('should open edit modal', () => {
    const req = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}`);
    expect(req.request.method).toBe('GET');
    req.flush({ watchlist: mockWatchlistData });

    component.openEdit();
    expect(component.editModal).toBeTrue();
  });

  it('should close edit modal', () => {
    const req = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}`);
    expect(req.request.method).toBe('GET');
    req.flush({ watchlist: mockWatchlistData });

    component.closeEdit();
    expect(component.editModal).toBeFalse();
  });

  it('should update searchResults on input change if length > 1', () => {
    const req = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}`);
    expect(req.request.method).toBe('GET');
    req.flush({ watchlist: mockWatchlistData });

    component.newSymbol = 'GOOGL';
    component.onSearchChange();

    const req2 = httpMock.expectOne(`http://localhost:2000/api/market/search/${component.newSymbol}?fuzzy=true`);
    expect(req2.request.method).toBe('GET');
    req2.flush({ results: mockSearchResults });
    

    expect(component.searchResults.length).toBeGreaterThan(0);
    expect(component.searchResults[0].symbol).toBe('GOOGL');
  })

  it('should not update searchResults on input change if length <= 1', () => {
    const req = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}`);
    expect(req.request.method).toBe('GET');
    req.flush({ watchlist: mockWatchlistData });

    component.newSymbol = 'B';
    component.onSearchChange();

    const req2 = httpMock.expectNone(`http://localhost:2000/api/market/search/${component.newSymbol}?fuzzy=true`);
    expect(component.searchResults.length).toBe(0);
  })

  it('should set curren_stock if search was successful', () => {
    const req = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}`);
    expect(req.request.method).toBe('GET');
    req.flush({ watchlist: mockWatchlistData });

    component.newSymbol = 'AAPL';
    component.searchStock();

    const req2 = httpMock.expectOne(`http://localhost:2000/api/market/price/${component.newSymbol}`);
    expect(req2.request.method).toBe('GET');
    req2.flush({ price_data: mockPriceData });

    expect(component.current_stock?.symbol).toBe('AAPL');
  })

  it('should set current_stock to null, set searchError to true, and reset it after 3 seconds', fakeAsync(() => {
    const req = httpMock.expectOne(`http://localhost:2000/api/watchlist/${mockUserID}`);
    expect(req.request.method).toBe('GET');
    req.flush({ watchlist: mockWatchlistData });

    component.current_stock = mockPriceData;
    component.searchError = false;
  
    component.triggerSearchError();
  
    expect(component.current_stock).toBeNull();
    expect(component.searchError).toBeTrue();
  
    tick(3000);
  
    expect(component.searchError).toBeFalse();
  }));
  

});

