-- =============================================================================
-- DUMMY DATA SCRIPT FOR PORTFOLIO MANAGEMENT SYSTEM
-- =============================================================================
--
-- Instructions:
-- 1. Sign up a user in your application to create an entry in `auth.users`.
-- 2. Get the `id` (UUID) of that user from the `auth.users` table.
-- 3. Find and replace all occurrences of the placeholder UUID:
--    '75e44b0b-bb72-4e18-bb79-830fd6bfcdca'
--    with your actual user ID.
-- 4. Run this entire script in your Supabase SQL Editor.
--
-- =============================================================================

-- Step 1: Define the assets we will be trading (if they don't exist)
-- These are universal and not tied to a user.
INSERT INTO assets (symbol, name, asset_type)
VALUES
    ('AAPL', 'Apple Inc.', 'STOCK'),
    ('GOOGL', 'Alphabet Inc.', 'STOCK'),
    ('TSLA', 'Tesla Inc.', 'STOCK'),
    ('CASH', 'Cash', 'CASH')
ON CONFLICT (symbol) DO NOTHING;

-- Step 2: Update the user's profile
-- This links our data to the Supabase authenticated user.
-- !! IMPORTANT: Replace the placeholder UUID with your actual user ID. !!
INSERT INTO user_profiles (id, full_name)
VALUES
    ('75e44b0b-bb72-4e18-bb79-830fd6bfcdca', 'Test User')
ON CONFLICT (id) DO UPDATE SET full_name = 'Test User';

-- Step 3: Create a transaction history for the user
-- This simulates how the user's holdings were acquired.
-- !! IMPORTANT: Replace the placeholder UUID with your actual user ID. !!
INSERT INTO transactions (user_id, symbol, transaction_type, quantity, price, total_amount, transaction_date, notes)
VALUES
    -- Initial deposit to fund the account
    ('75e44b0b-bb72-4e18-bb79-830fd6bfcdca', 'CASH', 'DEPOSIT', 20000, 1.00, 20000.00, NOW() - INTERVAL '20 days', 'Initial funding'),
    -- A few buy transactions
    ('75e44b0b-bb72-4e18-bb79-830fd6bfcdca', 'AAPL', 'BUY', 10, 150.00, 1500.00, NOW() - INTERVAL '15 days', 'Bought 10 shares of Apple'),
    ('75e44b0b-bb72-4e18-bb79-830fd6bfcdca', 'GOOGL', 'BUY', 5, 130.00, 650.00, NOW() - INTERVAL '10 days', 'Bought 5 shares of Google'),
    ('75e44b0b-bb72-4e18-bb79-830fd6bfcdca', 'TSLA', 'BUY', 8, 250.00, 2000.00, NOW() - INTERVAL '5 days', 'Bought 8 shares of Tesla');

-- Step 4: Set the user's current holdings
-- This represents the final state of the portfolio after the transactions.
-- The backend logic would normally calculate this, but we set it here for testing.
-- !! IMPORTANT: Replace the placeholder UUID with your actual user ID. !!
INSERT INTO holdings (user_id, symbol, quantity, average_cost)
VALUES
    -- Stock holdings based on the transactions above
    ('75e44b0b-bb72-4e18-bb79-830fd6bfcdca', 'AAPL', 10, 150.00),
    ('75e44b0b-bb72-4e18-bb79-830fd6bfcdca', 'GOOGL', 5, 130.00),
    ('75e44b0b-bb72-4e18-bb79-830fd6bfcdca', 'TSLA', 8, 250.00),
    -- Remaining cash balance: 20000 (deposit) - 1500 (AAPL) - 650 (GOOGL) - 2000 (TSLA) = 15850
    ('75e44b0b-bb72-4e18-bb79-830fd6bfcdca', 'CASH', 15850, 1.00)
ON CONFLICT (user_id, symbol) DO UPDATE SET
    quantity = EXCLUDED.quantity,
    average_cost = EXCLUDED.average_cost;

-- Step 5: Cache some current market prices for the assets
-- This allows the portfolio to be valued without calling an external API every time.
INSERT INTO market_prices (symbol, current_price, previous_close, day_change, day_change_percent)
VALUES
    ('AAPL', 175.25, 173.10, 2.15, 1.24),
    ('GOOGL', 140.50, 142.00, -1.50, -1.06),
    ('TSLA', 260.00, 255.50, 4.50, 1.76)
ON CONFLICT (symbol) DO UPDATE SET
    current_price = EXCLUDED.current_price,
    previous_close = EXCLUDED.previous_close,
    day_change = EXCLUDED.day_change,
    day_change_percent = EXCLUDED.day_change_percent,
    last_updated = NOW();

-- Step 6: Create a few historical portfolio snapshots
-- This data is used for the portfolio performance charts.
-- !! IMPORTANT: Replace the placeholder UUID with your actual user ID. !!
INSERT INTO portfolio_snapshots (user_id, date, total_value)
VALUES
    ('75e44b0b-bb72-4e18-bb79-830fd6bfcdca', NOW() - INTERVAL '3 days', 19850.75),
    ('75e44b0b-bb72-4e18-bb79-830fd6bfcdca', NOW() - INTERVAL '2 days', 20010.50),
    ('75e44b0b-bb72-4e18-bb79-830fd6bfcdca', NOW() - INTERVAL '1 day', 20150.00)
ON CONFLICT (user_id, date) DO UPDATE SET
    total_value = EXCLUDED.total_value;

-- =============================================================================
-- SCRIPT COMPLETE
-- =============================================================================
