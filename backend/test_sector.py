#!/usr/bin/env python3
"""
Simple test script to verify sector information fetching
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.market_service import fetch_sector_info

def test_sector_fetching():
    """Test fetching sector information for some common stocks"""
    test_symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN']
    
    print("Testing sector information fetching...")
    print("=" * 50)
    
    for symbol in test_symbols:
        print(f"\nTesting {symbol}:")
        try:
            sector_info = fetch_sector_info(symbol)
            print(f"  Symbol: {sector_info['symbol']}")
            print(f"  Name: {sector_info['name']}")
            print(f"  Sector: {sector_info['sector']}")
        except Exception as e:
            print(f"  Error: {e}")
    
    print("\n" + "=" * 50)
    print("Test completed!")

if __name__ == "__main__":
    test_sector_fetching() 