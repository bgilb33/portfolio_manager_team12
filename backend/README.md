# Portfolio Management Backend API

## 🚀 **Setup & Installation**

### **Environment Variables**

Create a `.env` file in the backend directory with the following variables:

```env
# Supabase Database Configuration (Required)
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Flask Application Configuration (Optional - has defaults)
PORT=2000
FLASK_DEBUG=True
```

#### **Getting Supabase Credentials:**

1. Go to your [Supabase project dashboard](https://supabase.com/dashboard)
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** for `SUPABASE_URL`
4. Copy the **anon public** key for `SUPABASE_KEY`

### **Installation**

1. **Install Python dependencies:**

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Run the Flask application:**
   ```bash
   python app.py
   ```

The server will start on `http://localhost:2000` (or the port specified in your `.env` file).

---

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

## 🔄 **API Endpoint Categories**

### **📈 Portfolio & User**

#### `GET /api/portfolio/<user_id>`

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
    "total_market_value": 20150.0,
    "total_cost_basis": 18150.0,
    "total_gain_loss": 2000.0,
    "total_gain_loss_percent": 11.02,
    "cash_balance": 15850.0,
    "total_positions": 3
  },
  "portfolio_performance": {
    "total_value": 20150.0,
    "day_change": 140.0,
    "day_change_percent": 0.7
  },
  "holdings": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "quantity": 10,
      "average_cost": 150.0,
      "current_price": 175.25,
      "market_value": 1752.5,
      "total_cost": 1500.0,
      "gain_loss": 252.5
    }
  ]
}
```

#### `PUT /api/portfolio/<user_id>`

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

#### `GET /api/transactions/<user_id>`

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
      "price": 150.0,
      "total_amount": 1500.0,
      "transaction_date": "2025-07-13T12:00:00Z",
      "notes": "Bought 10 shares of Apple"
    }
  ]
}
```

#### `POST /api/transactions/<user_id>`

Creates a new transaction and updates holdings accordingly.

**➡️ Example Request Body:**

```json
{
  "symbol": "MSFT",
  "transaction_type": "BUY",
  "quantity": 10,
  "price": 300.0,
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
    "price": 300.0,
    "total_amount": 3000.0,
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

#### `POST /api/market/prices/refresh/<user_id>`

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

#### `GET /api/performance/<user_id>`

Returns key performance indicators for the portfolio.

**✅ Example Response (200 OK):**

```json
{
  "performance": {
    "total_value": 20150.0,
    "total_cost": 18150.0,
    "total_gain_loss": 2000.0,
    "total_return_percent": 11.02,
    "day_change": 140.0,
    "day_change_percent": 0.7
  }
}
```

#### `GET /api/allocation/<user_id>`

Returns the asset allocation breakdown between stocks and cash.

**✅ Example Response (200 OK):**

```json
{
  "allocation": {
    "Stocks": {
      "value": 4300.0,
      "percentage": 21.3
    },
    "Cash": {
      "value": 15850.0,
      "percentage": 78.7
    }
  }
}
```

#### `GET /api/portfolio/chart/<user_id>/<period>`

Returns historical data points for drawing a portfolio value chart.

**✅ Example Response (200 OK) for `/api/portfolio/chart/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/1M`:**

```json
{
  "chart_data": [
    {
      "date": "2025-07-26",
      "total_value": 19850.75
    },
    {
      "date": "2025-07-27",
      "total_value": 20010.5
    },
    {
      "date": "2025-07-28",
      "total_value": 20150.0
    }
  ],
  "period": "1M"
}
```
