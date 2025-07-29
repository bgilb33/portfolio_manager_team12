# Portfolio Management Backend API

### **Service Layer Structure**

```
app.py (Flask routes)
├── services/
│   ├── auth_service.py        # Supabase JWT authentication
│   ├── portfolio_service.py   # Portfolio management (user-focused)
│   ├── holdings_service.py    # Holdings calculations & totals
│   ├── transaction_service.py # User transaction processing
│   ├── market_service.py      # Price caching & refresh
│   └── analytics_service.py   # Portfolio-level analytics
└── utils/
    ├── database.py           # Supabase client wrapper
    └── validators.py         # Input validation helpers
```

### **Data Flow Design**

```
Transaction Entry (User Input) → Holdings (Cost Basis) → No API Calls
Portfolio Viewing (Fast) → Cached Prices → Quick Display
Price Refresh (On-Demand) → yfinance API → Update Cache
Performance Tracking → Portfolio Snapshots → Historical Charts
```

---

## 📊 **Database Schema (Portfolio-Focused)**

### **Core Tables**

```sql
-- User management
user_profiles (id, full_name, created_at)

-- Portfolio holdings (user's actual cost basis)
holdings (user_id, symbol, quantity, average_cost)

-- Transaction history (user's actual trades)
transactions (user_id, symbol, type, quantity, price, date)

-- Cached market prices (for current valuation)
market_prices (symbol, current_price, day_change, last_updated)

-- Portfolio value snapshots (for historical charts)
portfolio_snapshots (user_id, date, total_value)
```



---

## 🔄 **API Endpoint Categories**

### **🔐 Authentication Required**

All endpoints except `/health` and `/api/market/search` require a JWT `Authorization: Bearer <token>` header.

---

### **📈 Portfolio & User**

#### `GET /api/portfolio`
Returns the user's complete portfolio, including holdings, summary totals, and performance metrics.

**✅ Example Response (200 OK):**
```json
{
  "portfolio_info": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "full_name": "Test User",
    "created_at": "2025-07-28T12:00:00Z",
    "portfolio_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "name": "My Portfolio"
  },
  "portfolio_summary": {
    "total_market_value": 20150.00,
    "total_cost_basis": 18150.00,
    "total_gain_loss": 2000.00,
    "total_gain_loss_percent": 11.02,
    "cash_balance": 15850.00,
    "total_positions": 3
  },
  "portfolio_performance": {
    "total_value": 20150.00,
    "day_change": 140.00,
    "day_change_percent": 0.70
  },
  "holdings": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "quantity": 10,
      "average_cost": 150.00,
      "current_price": 175.25,
      "market_value": 1752.50,
      "total_cost": 1500.00,
      "gain_loss": 252.50
    }
  ]
}
```

#### `PUT /api/portfolio`
Updates the user's profile information.

**➡️ Example Request Body:**
```json
{
  "full_name": "Test User Updated"
}
```

**✅ Example Response (200 OK):**
```json
{
  "portfolio": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "full_name": "Test User Updated",
    "created_at": "2025-07-28T12:00:00Z"
  }
}
```

---

### **💰 Transactions**

#### `GET /api/transactions`
Returns a paginated list of the user's transaction history.

**✅ Example Response (200 OK):**
```json
{
  "transactions": [
    {
      "id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
      "user_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "symbol": "AAPL",
      "transaction_type": "BUY",
      "quantity": 10,
      "price": 150.00,
      "total_amount": 1500.00,
      "transaction_date": "2025-07-13T12:00:00Z",
      "notes": "Bought 10 shares of Apple"
    }
  ]
}
```

#### `POST /api/transactions`
Creates a new transaction and updates holdings accordingly.

**➡️ Example Request Body:**
```json
{
    "symbol": "MSFT",
    "transaction_type": "BUY",
    "quantity": 10,
    "price": 300.00,
    "transaction_date": "2025-07-28T12:00:00Z"
}
```

**✅ Example Response (201 Created):**
```json
{
  "transaction": {
    "id": "c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13",
    "user_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "symbol": "MSFT",
    "transaction_type": "BUY",
    "quantity": 10,
    "price": 300.00,
    "total_amount": 3000.00,
    "transaction_date": "2025-07-28T12:00:00Z"
  }
}
```

---

### **📊 Market Data**

#### `GET /api/market/search/<query>`
Searches for stock symbols.

**✅ Example Response (200 OK) for `/api/market/search/MSFT`:**
```json
{
  "results": [
    {
      "symbol": "MSFT",
      "name": "Microsoft Corporation",
      "currency": "USD"
    }
  ]
}
```

#### `POST /api/market/prices/refresh`
Refreshes the cached market prices for all holdings in the user's portfolio.

**✅ Example Response (200 OK):**
```json
{
    "message": "Updated prices for 3 symbols",
    "updated_count": 3,
    "timestamp": "2025-07-28T14:30:00Z"
}
```

---

### **📈 Portfolio Analytics**

#### `GET /api/performance`
Returns key performance indicators for the portfolio.

**✅ Example Response (200 OK):**
```json
{
  "performance": {
    "total_value": 20150.00,
    "total_cost": 18150.00,
    "total_gain_loss": 2000.00,
    "total_return_percent": 11.02,
    "day_change": 140.00,
    "day_change_percent": 0.70
  }
}
```

#### `GET /api/allocation`
Returns the asset allocation breakdown between stocks and cash.

**✅ Example Response (200 OK):**
```json
{
  "allocation": {
    "Stocks": {
      "value": 4300.00,
      "percentage": 21.3
    },
    "Cash": {
      "value": 15850.00,
      "percentage": 78.7
    }
  }
}
```

#### `GET /api/portfolio/chart/<period>`
Returns historical data points for drawing a portfolio value chart.

**✅ Example Response (200 OK) for `/api/portfolio/chart/1M`:**
```json
{
  "chart_data": [
    {
      "date": "2025-07-26",
      "total_value": 19850.75
    },
    {
      "date": "2025-07-27",
      "total_value": 20010.50
    },
    {
      "date": "2025-07-28",
      "total_value": 20150.00
    }
  ],
  "period": "1M"
}
```

---
