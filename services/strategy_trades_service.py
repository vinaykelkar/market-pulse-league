import csv
from datetime import datetime
from pathlib import Path

DATA_FILE = Path("data/strategy_trades.csv")
LOT_SIZE = 65

FIELDNAMES = [
    "strategy_id", "strategy_type", "status",
    "created_date", "created_time", "closed_date", "closed_time",

    "futures_lots", "futures_qty", "futures_margin_used",
    "options_lots", "option_1_qty", "option_2_qty",
    "option_premium_paid", "options_margin_used", "total_capital_used",

    "futures_direction", "futures_entry", "futures_current",

    "option_1_type", "option_1_side", "option_1_strike",
    "option_1_entry", "option_1_current",

    "option_2_type", "option_2_side", "option_2_strike",
    "option_2_entry", "option_2_current",

    "entry_reason", "exit_reason", "notes",
]


def ensure_csv_exists():
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        with DATA_FILE.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
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

    with DATA_FILE.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            clean = {field: row.get(field, "") for field in FIELDNAMES}

            int_fields = [
                "strategy_id", "futures_lots", "futures_qty",
                "options_lots", "option_1_qty", "option_2_qty",
            ]

            float_fields = [
                "futures_margin_used", "option_premium_paid",
                "options_margin_used", "total_capital_used",
                "futures_entry", "futures_current",
                "option_1_strike", "option_1_entry", "option_1_current",
                "option_2_strike", "option_2_entry", "option_2_current",
            ]

            for field in int_fields:
                clean[field] = safe_int(clean[field])

            for field in float_fields:
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
    if not direction or not entry or not current or not qty:
        return 0

    if direction == "LONG":
        return (current - entry) * qty

    if direction == "SHORT":
        return (entry - current) * qty

    return 0


def option_pnl(side, entry, current, qty):
    if not side or not entry or not current or not qty:
        return 0

    if side == "BUY":
        return (current - entry) * qty

    if side == "SELL":
        return (entry - current) * qty

    return 0


def estimate_charges(row):
    futures_turnover = 0
    option_turnover = 0
    brokerage_orders = 0
    stt = 0

    futures_qty = safe_int(row.get("futures_qty"))
    option_1_qty = safe_int(row.get("option_1_qty"))
    option_2_qty = safe_int(row.get("option_2_qty"))

    if row.get("futures_direction"):
        entry = safe_float(row.get("futures_entry"))
        current = safe_float(row.get("futures_current")) or entry

        futures_turnover = (entry + current) * futures_qty
        brokerage_orders += 2

        sell_price = current if row["futures_direction"] == "LONG" else entry
        stt += sell_price * futures_qty * 0.0005

    if row.get("option_1_side"):
        entry = safe_float(row.get("option_1_entry"))
        current = safe_float(row.get("option_1_current")) or entry

        option_turnover += (entry + current) * option_1_qty
        brokerage_orders += 2

        if row.get("option_1_side") == "SELL":
            stt += entry * option_1_qty * 0.001

    if row.get("option_2_side"):
        entry = safe_float(row.get("option_2_entry"))
        current = safe_float(row.get("option_2_current")) or entry

        option_turnover += (entry + current) * option_2_qty
        brokerage_orders += 2

        if row.get("option_2_side") == "SELL":
            stt += entry * option_2_qty * 0.001

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
    futures_qty = safe_int(row.get("futures_qty"))
    option_1_qty = safe_int(row.get("option_1_qty"))
    option_2_qty = safe_int(row.get("option_2_qty"))

    f_pnl = futures_pnl(
        row.get("futures_direction"),
        safe_float(row.get("futures_entry")),
        safe_float(row.get("futures_current")),
        futures_qty,
    )

    o1_pnl = option_pnl(
        row.get("option_1_side"),
        safe_float(row.get("option_1_entry")),
        safe_float(row.get("option_1_current")),
        option_1_qty,
    )

    o2_pnl = option_pnl(
        row.get("option_2_side"),
        safe_float(row.get("option_2_entry")),
        safe_float(row.get("option_2_current")),
        option_2_qty,
    )

    gross = f_pnl + o1_pnl + o2_pnl
    charges = estimate_charges(row)
    net = gross - charges["total"]

    total_capital = safe_float(row.get("total_capital_used"))
    roi = (net / total_capital * 100) if total_capital else 0

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

    futures_lots = safe_int(form.get("futures_lots"), 0)
    options_lots = safe_int(form.get("options_lots"), 0)

    futures_qty = futures_lots * LOT_SIZE
    option_1_qty = options_lots * LOT_SIZE
    option_2_qty = options_lots * LOT_SIZE

    futures_margin = safe_float(form.get("futures_margin_used"))
    options_margin = safe_float(form.get("options_margin_used"))

    option_1_entry = safe_float(form.get("option_1_entry"))
    option_2_entry = safe_float(form.get("option_2_entry"))

    option_premium_paid = 0
    total_capital_used = 0

    row = {
        "strategy_id": next_strategy_id(rows),
        "strategy_type": strategy_type,
        "status": "OPEN",
        "created_date": now.strftime("%Y-%m-%d"),
        "created_time": now.strftime("%H:%M:%S"),
        "closed_date": "",
        "closed_time": "",

        "futures_lots": futures_lots,
        "futures_qty": futures_qty,
        "futures_margin_used": futures_margin,

        "options_lots": options_lots,
        "option_1_qty": option_1_qty,
        "option_2_qty": 0,

        "option_premium_paid": 0,
        "options_margin_used": 0,
        "total_capital_used": 0,

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

        "entry_reason": form.get("entry_reason", ""),
        "exit_reason": "",
        "notes": form.get("notes", ""),
    }

    if strategy_type == "LONG_FUTURE_LONG_ATM_PUT":
        option_premium_paid = option_1_entry * option_1_qty
        total_capital_used = futures_margin + option_premium_paid

        row.update({
            "option_premium_paid": option_premium_paid,
            "options_margin_used": 0,
            "total_capital_used": total_capital_used,

            "futures_direction": "LONG",
            "futures_entry": safe_float(form.get("futures_entry")),
            "futures_current": safe_float(form.get("futures_entry")),

            "option_1_type": "PE",
            "option_1_side": "BUY",
            "option_1_strike": safe_float(form.get("option_1_strike")),
            "option_1_entry": option_1_entry,
            "option_1_current": option_1_entry,
        })

    elif strategy_type == "SHORT_FUTURE_LONG_ATM_CALL":
        option_premium_paid = option_1_entry * option_1_qty
        total_capital_used = futures_margin + option_premium_paid

        row.update({
            "option_premium_paid": option_premium_paid,
            "options_margin_used": 0,
            "total_capital_used": total_capital_used,

            "futures_direction": "SHORT",
            "futures_entry": safe_float(form.get("futures_entry")),
            "futures_current": safe_float(form.get("futures_entry")),

            "option_1_type": "CE",
            "option_1_side": "BUY",
            "option_1_strike": safe_float(form.get("option_1_strike")),
            "option_1_entry": option_1_entry,
            "option_1_current": option_1_entry,
        })

    elif strategy_type == "SHORT_STRANGLE":
        total_capital_used = options_margin

        row.update({
            "futures_lots": 0,
            "futures_qty": 0,
            "futures_margin_used": 0,

            "option_2_qty": option_2_qty,
            "option_premium_paid": 0,
            "options_margin_used": options_margin,
            "total_capital_used": total_capital_used,

            "option_1_type": "CE",
            "option_1_side": "SELL",
            "option_1_strike": safe_float(form.get("option_1_strike")),
            "option_1_entry": option_1_entry,
            "option_1_current": option_1_entry,

            "option_2_type": "PE",
            "option_2_side": "SELL",
            "option_2_strike": safe_float(form.get("option_2_strike")),
            "option_2_entry": option_2_entry,
            "option_2_current": option_2_entry,
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