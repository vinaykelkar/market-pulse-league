import csv
from datetime import datetime
from pathlib import Path

import requests
import yfinance as yf

STOCKS_FILE = Path("data/stocks_portfolio.csv")
MUTUAL_FUNDS_FILE = Path("data/mutual_funds_portfolio.csv")

STOCK_FIELDNAMES = [
    "holding_id",
    "ticker",
    "company_name",
    "exchange",
    "quantity",
    "average_buy_price",
    "invested_amount",
    "current_price",
    "current_value",
    "unrealised_pnl",
    "unrealised_pnl_pct",
    "portfolio_tag",
    "notes",
    "last_updated",
]

MF_FIELDNAMES = [
    "holding_id",
    "scheme_code",
    "scheme_name",
    "folio_label",
    "units",
    "average_nav",
    "invested_amount",
    "current_nav",
    "current_value",
    "unrealised_pnl",
    "unrealised_pnl_pct",
    "category",
    "notes",
    "last_updated",
]


def ensure_performance_csvs_exist():
    STOCKS_FILE.parent.mkdir(parents=True, exist_ok=True)

    if not STOCKS_FILE.exists():
        with STOCKS_FILE.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=STOCK_FIELDNAMES)
            writer.writeheader()

    if not MUTUAL_FUNDS_FILE.exists():
        with MUTUAL_FUNDS_FILE.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=MF_FIELDNAMES)
            writer.writeheader()


def safe_float(value, default=0.0):
    try:
        if value in [None, ""]:
            return default
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int(value, default=0):
    try:
        if value in [None, ""]:
            return default
        return int(float(value))
    except (ValueError, TypeError):
        return default


def read_csv_rows(path, fieldnames):
    ensure_performance_csvs_exist()
    rows = []

    with path.open("r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            clean = {field: row.get(field, "") for field in fieldnames}
            rows.append(clean)

    return rows


def write_csv_rows(path, fieldnames, rows):
    ensure_performance_csvs_exist()

    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fieldnames})


def normalise_stock_ticker(ticker, exchange):
    ticker = (ticker or "").strip().upper()
    exchange = (exchange or "").strip().upper()

    if not ticker:
        return ""

    if "." in ticker or ticker.startswith("^"):
        return ticker

    if exchange in ["NSE", ""]:
        return f"{ticker}.NS"

    if exchange == "BSE":
        return f"{ticker}.BO"

    return ticker


def get_yfinance_last_price(ticker):
    if not ticker:
        return 0

    data = yf.Ticker(ticker).history(period="5d")
    if data.empty:
        return 0

    return round(float(data.iloc[-1]["Close"]), 2)


def enrich_stock_row(row):
    quantity = safe_float(row.get("quantity"))
    average_buy_price = safe_float(row.get("average_buy_price"))
    invested_amount = safe_float(row.get("invested_amount")) or quantity * average_buy_price
    current_price = safe_float(row.get("current_price"))
    current_value = quantity * current_price
    unrealised_pnl = current_value - invested_amount
    unrealised_pnl_pct = (unrealised_pnl / invested_amount * 100) if invested_amount else 0

    enriched = dict(row)
    enriched.update({
        "quantity": quantity,
        "average_buy_price": average_buy_price,
        "invested_amount": round(invested_amount, 2),
        "current_price": round(current_price, 2),
        "current_value": round(current_value, 2),
        "unrealised_pnl": round(unrealised_pnl, 2),
        "unrealised_pnl_pct": round(unrealised_pnl_pct, 2),
    })
    return enriched


def enrich_mf_row(row):
    units = safe_float(row.get("units"))
    average_nav = safe_float(row.get("average_nav"))
    invested_amount = safe_float(row.get("invested_amount")) or units * average_nav
    current_nav = safe_float(row.get("current_nav"))
    current_value = units * current_nav
    unrealised_pnl = current_value - invested_amount
    unrealised_pnl_pct = (unrealised_pnl / invested_amount * 100) if invested_amount else 0

    enriched = dict(row)
    enriched.update({
        "units": units,
        "average_nav": round(average_nav, 4),
        "invested_amount": round(invested_amount, 2),
        "current_nav": round(current_nav, 4),
        "current_value": round(current_value, 2),
        "unrealised_pnl": round(unrealised_pnl, 2),
        "unrealised_pnl_pct": round(unrealised_pnl_pct, 2),
    })
    return enriched


def summarise_holdings(rows):
    invested = sum(safe_float(row.get("invested_amount")) for row in rows)
    current_value = sum(safe_float(row.get("current_value")) for row in rows)
    pnl = current_value - invested
    pnl_pct = (pnl / invested * 100) if invested else 0

    return {
        "count": len(rows),
        "invested": round(invested, 2),
        "current_value": round(current_value, 2),
        "pnl": round(pnl, 2),
        "pnl_pct": round(pnl_pct, 2),
    }


def update_stock_prices():
    rows = read_csv_rows(STOCKS_FILE, STOCK_FIELDNAMES)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    updated = 0

    for row in rows:
        ticker = normalise_stock_ticker(row.get("ticker"), row.get("exchange"))
        latest_price = get_yfinance_last_price(ticker)

        if latest_price:
            row["current_price"] = latest_price
            row["last_updated"] = now
            enriched = enrich_stock_row(row)
            for field in ["invested_amount", "current_value", "unrealised_pnl", "unrealised_pnl_pct"]:
                row[field] = enriched[field]
            updated += 1

    write_csv_rows(STOCKS_FILE, STOCK_FIELDNAMES, rows)
    return updated


def fetch_amfi_nav_map():
    response = requests.get(
        "https://www.amfiindia.com/spages/NAVAll.txt",
        timeout=20,
        headers={"User-Agent": "Mozilla/5.0"},
    )
    response.raise_for_status()

    nav_by_code = {}
    nav_by_name = {}

    for line in response.text.splitlines():
        parts = line.split(";")
        if len(parts) < 5 or not parts[0].strip().isdigit():
            continue

        scheme_code = parts[0].strip()
        scheme_name = parts[3].strip()
        nav = safe_float(parts[4])

        if nav:
            nav_by_code[scheme_code] = nav
            nav_by_name[scheme_name.lower()] = nav

    return nav_by_code, nav_by_name


def update_mutual_fund_navs():
    rows = read_csv_rows(MUTUAL_FUNDS_FILE, MF_FIELDNAMES)
    nav_by_code, nav_by_name = fetch_amfi_nav_map()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    updated = 0

    for row in rows:
        scheme_code = (row.get("scheme_code") or "").strip()
        scheme_name = (row.get("scheme_name") or "").strip().lower()

        latest_nav = nav_by_code.get(scheme_code)

        if not latest_nav and scheme_name:
            latest_nav = nav_by_name.get(scheme_name)

        if latest_nav:
            row["current_nav"] = latest_nav
            row["last_updated"] = now
            enriched = enrich_mf_row(row)
            for field in ["invested_amount", "current_value", "unrealised_pnl", "unrealised_pnl_pct"]:
                row[field] = enriched[field]
            updated += 1

    write_csv_rows(MUTUAL_FUNDS_FILE, MF_FIELDNAMES, rows)
    return updated


def get_futures_performance():
    try:
        from services.paper_trading_service import get_summary
        summary = get_summary()
        return {
            "trades": summary.get("trade_count", 0),
            "closed_trades": summary.get("closed_trade_count", 0),
            "net_pnl": summary.get("total_pnl", 0),
            "roi": summary.get("total_pnl_pct", 0),
            "win_rate": summary.get("win_rate", 0),
            "avg_process_score": summary.get("avg_process_score", 0),
            "active_trade": summary.get("active_trade"),
        }
    except Exception:
        return {
            "trades": 0,
            "closed_trades": 0,
            "net_pnl": 0,
            "roi": 0,
            "win_rate": 0,
            "avg_process_score": 0,
            "active_trade": None,
        }


def get_strategy_performance():
    try:
        from services.strategy_trades_service import get_strategy_lab_summary
        summary = get_strategy_lab_summary()
        closed = summary.get("closed_strategies", [])
        open_items = summary.get("open_strategies", [])
        total_capital = sum(safe_float(strategy.get("total_capital_used")) for strategy in closed)
        closed_pnl = safe_float(summary.get("total_closed"))
        roi = (closed_pnl / total_capital * 100) if total_capital else 0

        return {
            "open_strategies": summary.get("open_count", 0),
            "closed_strategies": summary.get("closed_count", 0),
            "total_strategies": len(summary.get("strategies", [])),
            "closed_net_pnl": round(closed_pnl, 2),
            "live_mtm": summary.get("total_unrealised", 0),
            "roi": round(roi, 2),
            "open_items": open_items,
        }
    except Exception:
        return {
            "open_strategies": 0,
            "closed_strategies": 0,
            "total_strategies": 0,
            "closed_net_pnl": 0,
            "live_mtm": 0,
            "roi": 0,
            "open_items": [],
        }


def calculate_meter(summary):
    invested = safe_float(summary.get("invested"))
    pnl_pct = safe_float(summary.get("pnl_pct"))

    if invested <= 0:
        return 0

    return max(0, min(100, round(50 + pnl_pct, 0)))


def get_performance_dashboard():
    ensure_performance_csvs_exist()

    stock_rows = [enrich_stock_row(row) for row in read_csv_rows(STOCKS_FILE, STOCK_FIELDNAMES)]
    mf_rows = [enrich_mf_row(row) for row in read_csv_rows(MUTUAL_FUNDS_FILE, MF_FIELDNAMES)]

    stocks_summary = summarise_holdings(stock_rows)
    mf_summary = summarise_holdings(mf_rows)
    futures = get_futures_performance()
    strategies = get_strategy_performance()

    total_invested = stocks_summary["invested"] + mf_summary["invested"]
    total_current = stocks_summary["current_value"] + mf_summary["current_value"]
    total_pnl = total_current - total_invested
    total_pnl_pct = (total_pnl / total_invested * 100) if total_invested else 0

    return {
        "stocks": {
            "rows": stock_rows,
            "summary": stocks_summary,
            "meter": calculate_meter(stocks_summary),
            "csv_file": str(STOCKS_FILE),
        },
        "mutual_funds": {
            "rows": mf_rows,
            "summary": mf_summary,
            "meter": calculate_meter(mf_summary),
            "csv_file": str(MUTUAL_FUNDS_FILE),
        },
        "futures": futures,
        "strategies": strategies,
        "overall": {
            "invested": round(total_invested, 2),
            "current_value": round(total_current, 2),
            "pnl": round(total_pnl, 2),
            "pnl_pct": round(total_pnl_pct, 2),
        },
    }
