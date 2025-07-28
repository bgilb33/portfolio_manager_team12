# Portfolio Management System

A **portfolio-focused** portfolio management system with Flask REST API backend, Angular frontend, and Supabase integration. Designed for personal portfolio tracking with user-input transactions and real-time market valuation.

## 🎯 **System Design Philosophy**

- **User Input Transactions**: Users manually enter their actual buy/sell data
- **Portfolio-Focused**: Tracks only portfolio performance with charts not individual assets
- **Real-time Valuation**: yfinance only used for current price refresh

---

## 🏗️ **Project Structure**

```
MSCSF-Proj/
├── backend/                     # Flask REST API
│   ├── app.py                  # Main Flask application
│   ├── services/               # Business logic services
│   │   ├── auth_service.py     # Supabase authentication
│   │   ├── portfolio_service.py # Portfolio management
│   │   ├── holdings_service.py # Holdings & calculations
│   │   ├── transaction_service.py # Transaction processing
│   │   ├── market_service.py   # Market data & price refresh
│   │   └── analytics_service.py # Portfolio analytics
│   ├── utils/                  # Utility functions
│   │   ├── database.py         # Supabase client
│   │   └── validators.py       # Input validation
│   ├── README.md              # Backend setup guide
│   └── env_example.txt        # Environment template
├── database/                   # Database schemas
│   ├── dbschema.sql           # Original schema
│   ├── enhanced_schema.sql    # Production schema
│   └── schema.png             # Database diagram
├── UI/                        # Frontend (Angular)
│   ├── Figma_UI.pdf          # UI design mockups
│   └── portfolio-ui/         # Angular application
├── BACKEND_REQUIREMENTS.md    # Detailed backend specs
└── requirements.txt           # Python dependencies
```

---

## 🔄 **User Flows & System Interactions**

### **Flow 1: User Login & Portfolio Load**

#### **User Action**: Login and view portfolio dashboard

**Frontend → Backend Flow:**

```
1. User enters email/password
   ↓
2. Frontend: supabase.auth.signIn()
   ↓
3. Supabase returns JWT token
   ↓
4. Frontend: GET /api/portfolio (with Bearer token)
   ↓
5. Backend: get_portfolio_details(user_id)
```

**Backend Function Calls:**

```python
# 1. Authentication
verify_user_token(jwt_token)
  └── Supabase: Validate JWT

# 2. Portfolio data
get_portfolio_details(user_id)
  ├── get_user_portfolio(user_id)
  │   └── DB: SELECT * FROM user_profiles WHERE id = user_id
  ├── get_user_holdings(user_id)
  │   ├── DB: SELECT * FROM holdings WHERE user_id = user_id
  │   └── get_cached_price(symbol) for each holding
  │       └── DB: SELECT * FROM market_prices WHERE symbol = ?
  ├── calculate_portfolio_totals(user_id)
  │   └── Aggregate holdings market values
  └── calculate_portfolio_performance(user_id)
      └── Calculate gains/losses, percentages
```

**Database Queries:**

```sql
-- User verification (automatic via JWT)
-- User profile
SELECT * FROM user_profiles WHERE id = 'user-uuid';

-- User holdings with cached prices
SELECT h.*, mp.current_price, mp.day_change_percent
FROM holdings h
LEFT JOIN market_prices mp ON h.symbol = mp.symbol
WHERE h.user_id = 'user-uuid';

```

**Response Data:**

```json
{
  "portfolio": {
    "id": "user-uuid",
    "name": "My Portfolio",
    "full_name": "John Doe"
  },
  "holdings": [
    {
      "symbol": "AAPL",
      "quantity": 10,
      "average_cost": 145.5, // User's actual cost
      "current_price": 175.25, // From cached market_prices
      "market_value": 1752.5,
      "gain_loss": 297.5
    }
  ],
  "totals": {
    "total_market_value": 15750.0,
    "total_cost_basis": 14200.0, // User's actual investment
    "total_gain_loss": 1550.0,
    "cash_balance": 2500.0
  }
}
```

---

### **Flow 2: Adding a Transaction (User Input Only)**

#### **User Action**: User enters "Bought 5 TSLA at $250.75 on Jan 10th"

**Frontend → Backend Flow:**

```
1. User fills transaction form
   ↓
2. Frontend: POST /api/transactions
   Body: {
     "symbol": "TSLA",
     "transaction_type": "BUY",
     "quantity": 5,
     "price": 250.75,           // USER'S ACTUAL PRICE
     "transaction_date": "2024-01-10",
     "notes": "Morning dip purchase"
   }
   ↓
3. Backend: process_transaction(user_id, data)
```

**Backend Function Calls:**

```python
# Transaction processing (NO yfinance calls!)
process_transaction(user_id, transaction_data)
  └── process_buy_transaction(user_id, "TSLA", 5, 250.75, "2024-01-10")
      ├── validate_inputs()
      ├── update_holding_for_buy(user_id, "TSLA", 5, 250.75)
      │   ├── DB: SELECT * FROM holdings WHERE user_id = ? AND symbol = 'TSLA'
      │   └── DB: UPSERT holdings (calculate new average_cost)
      ├── update_cash_balance(user_id, -1253.75)
      │   └── DB: UPDATE holdings SET quantity = quantity - 1253.75 WHERE symbol = 'CASH'
      └── create_transaction_record(...)
          └── DB: INSERT INTO transactions (user_id, symbol, price, quantity...)
```

**Database Queries:**

```sql
-- Check existing holding
SELECT * FROM holdings
WHERE user_id = 'user-uuid' AND symbol = 'TSLA';

-- Update/create holding with USER'S cost basis
INSERT INTO holdings (user_id, symbol, quantity, average_cost)
VALUES ('user-uuid', 'TSLA', 5, 250.75)
ON CONFLICT (user_id, symbol) DO UPDATE SET
  quantity = holdings.quantity + 5,
  average_cost = ((holdings.quantity * holdings.average_cost) + (5 * 250.75))
                 / (holdings.quantity + 5);

-- Record transaction with USER'S data
INSERT INTO transactions (user_id, symbol, transaction_type, quantity, price, total_amount)
VALUES ('user-uuid', 'TSLA', 'BUY', 5, 250.75, 1253.75);

-- Update cash balance
UPDATE holdings
SET quantity = quantity - 1253.75
WHERE user_id = 'user-uuid' AND symbol = 'CASH';
```

---

### **Flow 3: Refreshing Market Prices**

#### **User Action**: Click "Refresh Prices" button

**Frontend → Backend Flow:**

```
1. User clicks refresh button
   ↓
2. Frontend: POST /api/market/prices/refresh
   ↓
3. Backend: refresh_all_prices(user_id)
```

**Backend Function Calls:**

```python
# Price refresh (ONLY time yfinance is called)
refresh_all_prices(user_id)
  ├── get_user_symbols(user_id)
  │   └── DB: SELECT DISTINCT symbol FROM holdings WHERE user_id = ? AND symbol != 'CASH'
  └── For each symbol:
      ├── fetch_current_price(symbol)  # yfinance API call
      │   └── yf.Ticker(symbol).info['currentPrice']
      └── cache_price(symbol, price_data)
          └── DB: UPSERT market_prices SET current_price = ?, last_updated = NOW()
```

**Database Queries:**

```sql
-- Get user's unique symbols
SELECT DISTINCT symbol FROM holdings
WHERE user_id = 'user-uuid'
AND symbol != 'CASH'
AND quantity > 0;

-- Update cached prices for each symbol
INSERT INTO market_prices (symbol, current_price, previous_close, day_change, last_updated)
VALUES ('AAPL', 175.25, 173.10, 2.15, NOW())
ON CONFLICT (symbol) DO UPDATE SET
  current_price = EXCLUDED.current_price,
  previous_close = EXCLUDED.previous_close,
  day_change = EXCLUDED.day_change,
  last_updated = EXCLUDED.last_updated;
```

**External API Calls:**

```python
# yfinance calls (only during refresh)
for symbol in ['AAPL', 'TSLA', 'GOOGL']:  # User's holdings
    ticker = yf.Ticker(symbol)
    current_price = ticker.info['currentPrice']
    # Cache the result
```

---

### **Flow 4: Portfolio Performance Chart**

#### **User Action**: View portfolio performance over time

**Frontend → Backend Flow:**

```
1. User clicks "1 Month" chart
   ↓
2. Frontend: GET /api/portfolio/chart/1M
   ↓
3. Backend: get_portfolio_value_history(user_id, 30)
```

**Backend Function Calls:**

```python
# Portfolio chart data
get_portfolio_chart(period='1M')
  └── get_portfolio_value_history(user_id, 30)
      └── DB: SELECT date, total_value FROM portfolio_snapshots
              WHERE user_id = ? AND date >= (NOW() - 30 days)
```

**Database Queries:**

```sql
-- Get portfolio value snapshots
SELECT date, total_value
FROM portfolio_snapshots
WHERE user_id = 'user-uuid'
AND date >= (CURRENT_DATE - INTERVAL '30 days')
ORDER BY date;
```

**Response Data:**

```json
{
  "chart_data": [
    { "date": "2024-01-01", "total_value": 15200.0 },
    { "date": "2024-01-02", "total_value": 15350.0 },
    { "date": "2024-01-15", "total_value": 15750.0 }
  ],
  "period": "1M",
  "days": 30
}
```

---

### **Flow 5: Creating Portfolio Snapshot**

#### **Background Process**: Store daily portfolio value

**Backend Function Calls:**

```python
# Daily snapshot creation (can be automated)
create_portfolio_snapshot()
  ├── calculate_portfolio_totals(user_id)
  │   ├── get_user_holdings(user_id)
  │   └── Sum market values using cached prices
  └── store_portfolio_snapshot(user_id, portfolio_value, date)
      └── DB: INSERT INTO portfolio_snapshots (user_id, date, total_value)
```

**Database Queries:**

```sql
-- Store daily portfolio value
INSERT INTO portfolio_snapshots (user_id, date, total_value)
VALUES ('user-uuid', '2024-01-15', 15750.00)
ON CONFLICT (user_id, date) DO UPDATE SET
  total_value = EXCLUDED.total_value;
```

---

## 📊 **Data Flow Summary**

### **Transaction Entry (User Input)**

```
User Data → Holdings (Cost Basis) → No API Calls
```

### **Portfolio Viewing (Cached Prices)**

```
Holdings + Cached Prices → Portfolio Value → Fast Display
```

### **Price Refresh (yfinance)**

```
User Holdings → yfinance API → Update Cache → Refresh Complete
```

### **Performance Tracking (Snapshots)**

```
Daily Portfolio Value → Portfolio Snapshots → Historical Charts
```

---

## 🔑 **Key Features**

### **Portfolio-Focused**

- Track YOUR portfolio performance, not stock research
- User cost basis vs current market values
- Portfolio-level analytics and charts

### **User Input Transactions**

- Manual entry of actual buy/sell prices
- No dependency on market data for transaction entry
- Accurate cost basis tracking

### **Smart Price Management**

- Cached prices for fast portfolio viewing
- On-demand price refresh via yfinance

### **Real-time Analytics**

- Portfolio value over time
- Asset allocation breakdown
- Gain/loss calculations

---

## 📚 **API Endpoints**

### **Portfolio & User**

- `GET /api/portfolio` - Get complete portfolio data, including holdings and performance.
- `PUT /api/portfolio` - Update user profile information.

### **Transactions**

- `GET /api/transactions` - Get transaction history.
- `POST /api/transactions` - Add new transaction (user input only).
- `GET /api/transactions/<id>` - Get a specific transaction.

### **Market Data**

- `GET /api/market/search/<query>` - Search for stock symbols.
- `GET /api/market/price/<symbol>` - Get the current price for a symbol.
- `POST /api/market/prices/refresh` - Refresh prices for the user's holdings.

### **Analytics**

- `GET /api/performance` - Get portfolio performance metrics.
- `GET /api/allocation` - Get asset allocation breakdown.
- `GET /api/portfolio/chart/<period>` - Get portfolio value chart data.
- `POST /api/portfolio/snapshot` - Store a snapshot of the current portfolio value.
