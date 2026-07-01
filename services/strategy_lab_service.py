import csv
from datetime import datetime
from pathlib import Path

DATA_FILE = Path("data/strategy_lab.csv")
DEFAULT_QTY = 65

FIELDNAMES = [
    "strategy_id",
    "strategy_type",
    "status",
    "created_date",
    "created_time",
    "closed_date",
    "closed_time",

    "futures_direction",
    "futures_entry",
    "futures_current",

    "option_1_type",
    "option_1_side",
    "option_1_strike",
    "option_1_entry",
    "option_1_current",

    "option_2_type",
    "option_2_side",
    "option_2_strike",
    "option_2_entry",
    "option_2_current",

    "quantity",
    "margin_used",
    "notes",
]


def ensure_csv_exists():
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

    if not DATA_FILE.exists():
        with DATA_FILE.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=FIELDNAMES)
            writer.writeheader()


def safe_float(value, default=0.0):
    try:
        if value in [None, ""]:
            return default
        return float(value)
    except Exception:
        return default


def safe_int(value, default=0):
    try:
        if value in [None, ""]:
            return default
        return int(float(value))
    except Exception:
        return default


def read_rows():
    ensure_csv_exists()

    rows = []

    with DATA_FILE.open("r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            clean = {field: row.get(field, "") for field in FIELDNAMES}

            clean["strategy_id"] = safe_int(clean["strategy_id"])
            clean["futures_entry"] = safe_float(clean["futures_entry"])
            clean["futures_current"] = safe_float(clean["futures_current"])
            clean["option_1_strike"] = safe_float(clean["option_1_strike"])
            clean["option_1_entry"] = safe_float(clean["option_1_entry"])
            clean["option_1_current"] = safe_float(clean["option_1_current"])
            clean["option_2_strike"] = safe_float(clean["option_2_strike"])
            clean["option_2_entry"] = safe_float(clean["option_2_entry"])
            clean["option_2_current"] = safe_float(clean["option_2_current"])
            clean["quantity"] = safe_int(clean["quantity"], DEFAULT_QTY)
            clean["margin_used"] = safe_float(clean["margin_used"])

            rows.append(clean)

    return rows


def write_rows(rows):
    ensure_csv_exists()

    with DATA_FILE.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDNAMES)
        writer.writeheader()

        for row in rows:
            writer.writerow({field: row.get(field, "") for field in FIELDNAMES})


def next_strategy_id(rows):
    if not rows:
        return 1
    return max(safe_int(row["strategy_id"]) for row in rows) + 1


def option_leg_pnl(side, entry, current, qty):
    side = (side or "").upper()

    if not entry or not current:
        return 0

    if side == "BUY":
        return (current - entry) * qty

    if side == "SELL":
        return (entry - current) * qty

    return 0


def futures_leg_pnl(direction, entry, current, qty):
    direction = (direction or "").upper()

    if not entry or not current:
        return 0

    if direction == "LONG":
        return (current - entry) * qty

    if direction == "SHORT":
        return (entry - current) * qty

    return 0


def estimate_strategy_charges(row):
    """
    Approximate placeholder charges.
    Keep simple for research lab.
    You can later plug broker-specific Zerodha/Upstox formulas here.
    """
    strategy_type = row.get("strategy_type")
    qty = safe_int(row.get("quantity"), DEFAULT_QTY)

    futures_turnover = 0
    option_turnover = 0

    if row.get("futures_direction"):
        futures_entry = safe_float(row.get("futures_entry"))
        futures_current = safe_float(row.get("futures_current"))
        futures_turnover = (futures_entry + futures_current) * qty if futures_current else futures_entry * qty

    for leg in ["option_1", "option_2"]:
        entry = safe_float(row.get(f"{leg}_entry"))
        current = safe_float(row.get(f"{leg}_current"))
        option_turnover += ((entry + current) * qty) if current else (entry * qty)

    brokerage = 40

    if strategy_type == "SHORT_STRANGLE":
        brokerage = 80

    stt_estimate = 0

    if row.get("futures_direction"):
        sell_price = safe_float(row.get("futures_current")) or safe_float(row.get("futures_entry"))
        stt_estimate += sell_price * qty * 0.0005

    for leg in ["option_1", "option_2"]:
        side = row.get(f"{leg}_side")
        sell_price = safe_float(row.get(f"{leg}_current")) or safe_float(row.get(f"{leg}_entry"))

        if side == "SELL":
            stt_estimate += sell_price * qty * 0.001

    exchange = (futures_turnover + option_turnover) * 0.0000173
    sebi = (futures_turnover + option_turnover) * 0.000001
    gst = (brokerage + exchange) * 0.18
    total = brokerage + stt_estimate + exchange + sebi + gst

    return {
        "brokerage": round(brokerage, 2),
        "stt": round(stt_estimate, 2),
        "exchange": round(exchange, 2),
        "sebi": round(sebi, 2),
        "gst": round(gst, 2),
        "total": round(total, 2),
    }


def enrich_row(row):
    qty = safe_int(row.get("quantity"), DEFAULT_QTY)

    futures_pnl = futures_leg_pnl(
        row.get("futures_direction"),
        safe_float(row.get("futures_entry")),
        safe_float(row.get("futures_current")),
        qty,
    )

    option_1_pnl = option_leg_pnl(
        row.get("option_1_side"),
        safe_float(row.get("option_1_entry")),
        safe_float(row.get("option_1_current")),
        qty,
    )

    option_2_pnl = option_leg_pnl(
        row.get("option_2_side"),
        safe_float(row.get("option_2_entry")),
        safe_float(row.get("option_2_current")),
        qty,
    )

    gross_pnl = futures_pnl + option_1_pnl + option_2_pnl
    charges = estimate_strategy_charges(row)
    net_if_closed_now = gross_pnl - charges["total"]

    roi = 0
    margin_used = safe_float(row.get("margin_used"))

    if margin_used:
        roi = (net_if_closed_now / margin_used) * 100

    enriched = dict(row)
    enriched.update({
        "futures_pnl": round(futures_pnl, 2),
        "option_1_pnl": round(option_1_pnl, 2),
        "option_2_pnl": round(option_2_pnl, 2),
        "gross_pnl": round(gross_pnl, 2),
        "charges": charges,
        "net_if_closed_now": round(net_if_closed_now, 2),
        "roi": round(roi, 2),
    })

    return enriched


def get_strategy_summary():
    rows = read_rows()
    strategies = [enrich_row(row) for row in rows]

    open_strategies = [s for s in strategies if s["status"] == "OPEN"]
    closed_strategies = [s for s in strategies if s["status"] == "CLOSED"]

    total_unrealised = sum(s["net_if_closed_now"] for s in open_strategies)
    total_closed = sum(s["net_if_closed_now"] for s in closed_strategies)

    return {
        "strategies": strategies,
        "open_strategies": open_strategies,
        "closed_strategies": closed_strategies,
        "open_count": len(open_strategies),
        "closed_count": len(closed_strategies),
        "total_unrealised": round(total_unrealised, 2),
        "total_closed": round(total_closed, 2),
    }


def create_strategy(form):
    rows = read_rows()
    now = datetime.now()
    strategy_type = form.get("strategy_type")

    row = {
        "strategy_id": next_strategy_id(rows),
        "strategy_type": strategy_type,
        "status": "OPEN",
        "created_date": now.strftime("%Y-%m-%d"),
        "created_time": now.strftime("%H:%M:%S"),
        "closed_date": "",
        "closed_time": "",

        "futures_direction": "",
        "futures_entry": "",
        "futures_current": "",

        "option_1_type": "",
        "option_1_side": "",
        "option_1_strike": "",
        "option_1_entry": "",
        "option_1_current": "",

        "option_2_type": "",
        "option_2_side": "",
        "option_2_strike": "",
        "option_2_entry": "",
        "option_2_current": "",

        "quantity": safe_int(form.get("quantity"), DEFAULT_QTY),
        "margin_used": safe_float(form.get("margin_used")),
        "notes": form.get("notes", ""),
    }

    if strategy_type == "LONG_FUTURE_LONG_PUT":
        row.update({
            "futures_direction": "LONG",
            "futures_entry": safe_float(form.get("futures_entry")),
            "futures_current": safe_float(form.get("futures_entry")),
            "option_1_type": "PE",
            "option_1_side": "BUY",
            "option_1_strike": safe_float(form.get("option_1_strike")),
            "option_1_entry": safe_float(form.get("option_1_entry")),
            "option_1_current": safe_float(form.get("option_1_entry")),
        })

    elif strategy_type == "SHORT_FUTURE_LONG_CALL":
        row.update({
            "futures_direction": "SHORT",
            "futures_entry": safe_float(form.get("futures_entry")),
            "futures_current": safe_float(form.get("futures_entry")),
            "option_1_type": "CE",
            "option_1_side": "BUY",
            "option_1_strike": safe_float(form.get("option_1_strike")),
            "option_1_entry": safe_float(form.get("option_1_entry")),
            "option_1_current": safe_float(form.get("option_1_entry")),
        })

    elif strategy_type == "SHORT_STRANGLE":
        row.update({
            "option_1_type": "CE",
            "option_1_side": "SELL",
            "option_1_strike": safe_float(form.get("option_1_strike")),
            "option_1_entry": safe_float(form.get("option_1_entry")),
            "option_1_current": safe_float(form.get("option_1_entry")),

            "option_2_type": "PE",
            "option_2_side": "SELL",
            "option_2_strike": safe_float(form.get("option_2_strike")),
            "option_2_entry": safe_float(form.get("option_2_entry")),
            "option_2_current": safe_float(form.get("option_2_entry")),
        })

    rows.append(row)
    write_rows(rows)


def update_strategy_prices(strategy_id, form):
    rows = read_rows()

    for row in rows:
        if row["strategy_id"] == strategy_id:
            if row.get("futures_direction"):
                row["futures_current"] = safe_float(form.get("futures_current"))

            if row.get("option_1_type"):
                row["option_1_current"] = safe_float(form.get("option_1_current"))

            if row.get("option_2_type"):
                row["option_2_current"] = safe_float(form.get("option_2_current"))

            row["notes"] = form.get("notes", row.get("notes", ""))

    write_rows(rows)


def close_strategy(strategy_id):
    rows = read_rows()
    now = datetime.now()

    for row in rows:
        if row["strategy_id"] == strategy_id:
            row["status"] = "CLOSED"
            row["closed_date"] = now.strftime("%Y-%m-%d")
            row["closed_time"] = now.strftime("%H:%M:%S")

    write_rows(rows)