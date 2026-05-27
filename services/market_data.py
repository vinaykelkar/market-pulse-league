import yfinance as yf


MARKET_TICKERS = {
    "nifty": "^NSEI",
    "bank_nifty": "^NSEBANK",
    "india_vix": "^INDIAVIX",
    "brent_crude": "BZ=F",
    "usd_inr": "INR=X",
    "us_10y": "^TNX",
}


SECTOR_TICKERS = {
    "Banking": "^NSEBANK",
    "IT": "^CNXIT",
    "Auto": "^CNXAUTO",
    "Pharma": "^CNXPHARMA",
    "FMCG": "^CNXFMCG",
    "Metal": "^CNXMETAL",
    "Realty": "^CNXREALTY",
    "Energy": "^CNXENERGY",
}


def get_ticker_snapshot(ticker):
    data = yf.Ticker(ticker).history(period="5d")

    if data.empty or len(data) < 2:
        return None

    latest = data.iloc[-1]
    previous = data.iloc[-2]

    latest_close = float(latest["Close"])
    previous_close = float(previous["Close"])

    change_pct = ((latest_close - previous_close) / previous_close) * 100

    return {
        "ticker": ticker,
        "value": latest_close,
        "change_pct": change_pct,
        "latest_date": str(data.index[-1].date()),
        "previous_date": str(data.index[-2].date()),
    }


def get_latest_market_data():
    results = {}

    for key, ticker in MARKET_TICKERS.items():
        results[key] = get_ticker_snapshot(ticker)

    return results


def get_sector_heatmap_data():
    sector_data = []

    for sector_name, ticker in SECTOR_TICKERS.items():
        snapshot = get_ticker_snapshot(ticker)

        if snapshot is None:
            sector_data.append({
                "name": sector_name,
                "ticker": ticker,
                "change_pct": None,
                "css_class": "neutral",
            })
            continue

        change_pct = snapshot["change_pct"]

        if change_pct >= 1.5:
            css_class = "strong-positive"
        elif change_pct > 0:
            css_class = "positive"
        elif change_pct <= -1.0:
            css_class = "strong-negative"
        elif change_pct < 0:
            css_class = "negative"
        else:
            css_class = "neutral"

        sector_data.append({
            "name": sector_name,
            "ticker": ticker,
            "change_pct": change_pct,
            "css_class": css_class,
        })

    sector_data.sort(
        key=lambda item: item["change_pct"] if item["change_pct"] is not None else -999,
        reverse=True
    )

    return sector_data