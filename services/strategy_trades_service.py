import csv
from datetime import datetime
from pathlib import Path

DATA_FILE = Path("data/strategy_trades.csv")
DEFAULT_QTY = 65

FIELDNAMES = [
    "strategy_id", "strategy_type", "status",
    "created_date", "created_time", "closed_date", "closed_time",
    "futures_margin_used", "options_margin_used", "total_margin_used",
    "futures_direction", "futures_entry", "futures_current",
    "option_1_type", "option_1_side", "option_1_strike", "option_1_entry", "option_1_current",
    "option_2_type", "option_2_side", "option_2_strike", "option_2_entry", "option_2_current",
    "quantity", "entry_reason", "exit_reason", "notes",
]


def ensure_csv_exists():
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        with DATA_FILE.open("w", newline="", encoding="utf-8") as f:
            csv.DictWriter(f, fieldnames=FIELDNAMES).writeheader()


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

    with DATA_FILE.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            clean = {field: row.get(field, "") for field in FIELDNAMES}

            for field in [
                "strategy_id", "quantity"
            ]:
                clean[field] = safe_int(clean[field], DEFAULT_QTY if field == "quantity" else 0)

            for field in [
                "futures_margin_used", "options_margin_used", "total_margin_used",
                "futures_entry", "futures_current",
                "option_1_strike", "option_1_entry", "option_1_current",
                "option_2_strike", "option_2_entry", "option_2_current",
            ]:
                clean[field] = safe_float(clean[field])

            rows.append(clean)

    return rows


def write_rows(rows):
    ensure_csv_exists()
    with DATA_FILE.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in FIELDNAMES})


def next_strategy_id(rows):
    return 1 if not rows else max(safe_int(r["strategy_id"]) for r in rows) + 1


def futures_pnl(direction, entry, current, qty):
    if not direction or not entry or not current:
        return 0

    if direction == "LONG":
        return (current - entry) * qty

    if direction == "SHORT":
        return (entry - current) * qty

    return 0


def option_pnl(side, entry, current, qty):
    if not side or not entry or not current:
        return 0

    if side == "BUY":
        return (current - entry) * qty

    if side == "SELL":
        return (entry - current) * qty

    return 0


def estimate_charges(row):
    qty = safe_int(row.get("quantity"), DEFAULT_QTY)

    futures_turnover = 0
    option_turnover = 0
    brokerage_orders = 0
    stt = 0

    if row.get("futures_direction"):
        entry = safe_float(row.get("futures_entry"))
        current = safe_float(row.get("futures_current")) or entry

        futures_turnover = (entry + current) * qty
        brokerage_orders += 2

        sell_price = current if row["futures_direction"] == "LONG" else entry
        stt += sell_price * qty * 0.0005

    for leg in ["option_1", "option_2"]:
        side = row.get(f"{leg}_side")
        entry = safe_float(row.get(f"{leg}_entry"))
        current = safe_float(row.get(f"{leg}_current")) or entry

        if side:
            option_turnover += (entry + current) * qty
            brokerage_orders += 2

            if side == "SELL":
                stt += entry * qty * 0.001

    brokerage = brokerage_orders * 20
    exchange = (futures_turnover + option_turnover) * 0.0000173
    sebi = (futures_turnover + option_turnover) * 0.000001
    gst = (brokerage + exchange) * 0.18

    total = brokerage + stt + exchange + sebi + gst

    return {
        "brokerage": round(brokerage, 2),
        "stt": round(stt, 2),
        "exchange": round(exchange, 2),
        "sebi": round(sebi, 2),
        "gst": round(gst, 2),
        "total": round(total, 2),
    }


def enrich(row):
    qty = safe_int(row.get("quantity"), DEFAULT_QTY)

    f_pnl = futures_pnl(
        row.get("futures_direction"),
        safe_float(row.get("futures_entry")),
        safe_float(row.get("futures_current")),
        qty,
    )

    o1_pnl = option_pnl(
        row.get("option_1_side"),
        safe_float(row.get("option_1_entry")),
        safe_float(row.get("option_1_current")),
        qty,
    )

    o2_pnl = option_pnl(
        row.get("option_2_side"),
        safe_float(row.get("option_2_entry")),
        safe_float(row.get("option_2_current")),
        qty,
    )

    gross = f_pnl + o1_pnl + o2_pnl
    charges = estimate_charges(row)
    net = gross - charges["total"]

    total_margin = safe_float(row.get("total_margin_used"))
    roi = (net / total_margin * 100) if total_margin else 0

    enriched = dict(row)
    enriched.update({
        "futures_pnl": round(f_pnl, 2),
        "option_1_pnl": round(o1_pnl, 2),
        "option_2_pnl": round(o2_pnl, 2),
        "gross_pnl": round(gross, 2),
        "charges": charges,
        "net_pnl": round(net, 2),
        "roi": round(roi, 2),
    })
    return enriched


def get_strategy_lab_summary():
    rows = read_rows()
    strategies = [enrich(r) for r in rows]

    open_strategies = [s for s in strategies if s["status"] == "OPEN"]
    closed_strategies = [s for s in strategies if s["status"] == "CLOSED"]

    return {
        "strategies": strategies,
        "open_strategies": open_strategies,
        "closed_strategies": closed_strategies,
        "open_count": len(open_strategies),
        "closed_count": len(closed_strategies),
        "total_unrealised": round(sum(s["net_pnl"] for s in open_strategies), 2),
        "total_closed": round(sum(s["net_pnl"] for s in closed_strategies), 2),
    }


def create_strategy_trade(form):
    rows = read_rows()
    now = datetime.now()
    strategy_type = form.get("strategy_type")

    futures_margin = safe_float(form.get("futures_margin_used"))
    options_margin = safe_float(form.get("options_margin_used"))
    total_margin = futures_margin + options_margin

    row = {
        "strategy_id": next_strategy_id(rows),
        "strategy_type": strategy_type,
        "status": "OPEN",
        "created_date": now.strftime("%Y-%m-%d"),
        "created_time": now.strftime("%H:%M:%S"),
        "closed_date": "",
        "closed_time": "",

        "futures_margin_used": futures_margin,
        "options_margin_used": options_margin,
        "total_margin_used": total_margin,

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
        "entry_reason": form.get("entry_reason", ""),
        "exit_reason": "",
        "notes": form.get("notes", ""),
    }

    if strategy_type == "LONG_FUTURE_LONG_ATM_PUT":
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

    elif strategy_type == "SHORT_FUTURE_LONG_ATM_CALL":
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


def update_strategy_trade_prices(strategy_id, form):
    rows = read_rows()

    for row in rows:
        if row["strategy_id"] == strategy_id and row["status"] == "OPEN":
            if row.get("futures_direction"):
                row["futures_current"] = safe_float(form.get("futures_current"))

            if row.get("option_1_type"):
                row["option_1_current"] = safe_float(form.get("option_1_current"))

            if row.get("option_2_type"):
                row["option_2_current"] = safe_float(form.get("option_2_current"))

            row["notes"] = form.get("notes", row.get("notes", ""))

    write_rows(rows)


def close_strategy_trade(strategy_id, form=None):
    rows = read_rows()
    now = datetime.now()

    for row in rows:
        if row["strategy_id"] == strategy_id and row["status"] == "OPEN":
            if form:
                if row.get("futures_direction"):
                    row["futures_current"] = safe_float(form.get("futures_current"))

                if row.get("option_1_type"):
                    row["option_1_current"] = safe_float(form.get("option_1_current"))

                if row.get("option_2_type"):
                    row["option_2_current"] = safe_float(form.get("option_2_current"))

                row["exit_reason"] = form.get("exit_reason", "Closed manually")
            else:
                row["exit_reason"] = "Closed manually"

            row["status"] = "CLOSED"
            row["closed_date"] = now.strftime("%Y-%m-%d")
            row["closed_time"] = now.strftime("%H:%M:%S")

    write_rows(rows)