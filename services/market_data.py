import yfinance as yf


MARKET_TICKERS = {
    "nifty": "^NSEI",
    "bank_nifty": "^NSEBANK",
    "india_vix": "^INDIAVIX",
    "brent_crude": "BZ=F",
    "usd_inr": "INR=X",
    "us_10y": "^TNX",
}


def get_latest_market_data():
    results = {}

    for key, ticker in MARKET_TICKERS.items():
        data = yf.Ticker(ticker).history(period="5d")

        if data.empty or len(data) < 2:
            results[key] = None
            continue

        latest = data.iloc[-1]
        previous = data.iloc[-2]

        latest_close = float(latest["Close"])
        previous_close = float(previous["Close"])

        change_pct = ((latest_close - previous_close) / previous_close) * 100

        results[key] = {
            "ticker": ticker,
            "value": latest_close,
            "change_pct": change_pct,
            "latest_date": str(data.index[-1].date()),
            "previous_date": str(data.index[-2].date()),
        }

    return results