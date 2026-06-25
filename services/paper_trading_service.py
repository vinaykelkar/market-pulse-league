import csv
from datetime import datetime
from pathlib import Path

DATA_FILE = Path("data/paper_trades_v2.csv")
STARTING_CAPITAL = 250000
DEFAULT_QUANTITY = 65

BROKERAGE_PER_ORDER = 20
STT_SELL_SIDE_RATE = 0.0005
EXCHANGE_TXN_RATE = 0.0000173
SEBI_RATE = 0.000001
STAMP_BUY_SIDE_RATE = 0.00002
GST_RATE = 0.18

FIELDNAMES = [
    "trade_id", "event_type", "event_date", "event_time", "instrument", "direction",
    "spot_price", "futures_price", "quantity", "stop_loss", "target", "status",
    "trend_bias", "structure", "ema_alignment", "key_level_context", "entry_type",
    "stop_type", "reward_context", "gap_context", "trade_direction_alignment",
    "process_score", "process_grade", "chart_screenshot", "entry_logic", "exit_logic"
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
    except (ValueError, TypeError):
        return default


def safe_int(value, default=0):
    try:
        if value in [None, ""]:
            return default
        return int(float(value))
    except (ValueError, TypeError):
        return default


def read_events():
    ensure_csv_exists()
    events = []

    with DATA_FILE.open("r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            if not row.get("trade_id"):
                continue

            event = {key: row.get(key, "") for key in FIELDNAMES}

            event["trade_id"] = safe_int(event["trade_id"])
            event["spot_price"] = safe_float(event["spot_price"])
            event["futures_price"] = safe_float(event["futures_price"])
            event["quantity"] = safe_int(event["quantity"])
            event["stop_loss"] = safe_float(event["stop_loss"])
            event["target"] = safe_float(event["target"])
            event["process_score"] = safe_float(event["process_score"])

            events.append(event)

    return events


def write_events(events):
    ensure_csv_exists()

    with DATA_FILE.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDNAMES)
        writer.writeheader()

        for event in events:
            writer.writerow({key: event.get(key, "") for key in FIELDNAMES})


def get_next_trade_id(events):
    if not events:
        return 1
    return max(safe_int(event["trade_id"]) for event in events) + 1


def is_imported_trade(entry):
    process_fields = [
        "trend_bias",
        "structure",
        "ema_alignment",
        "key_level_context",
        "entry_type",
        "stop_type",
        "reward_context",
        "gap_context",
        "trade_direction_alignment",
        "process_grade",
        "chart_screenshot",
        "entry_logic",
    ]

    return all(not entry.get(field) for field in process_fields)


def calculate_process_score(
    direction,
    structure,
    ema_alignment,
    key_level_context,
    entry_type,
    stop_type,
    reward_context,
    gap_context,
    trade_direction_alignment,
):
    direction = direction.upper()
    score = 0

    if trade_direction_alignment == "With Trend":
        score += 2
    elif trade_direction_alignment == "Neutral":
        score += 1

    if direction == "LONG" and structure == "HHHL":
        score += 1.5
    elif direction == "SHORT" and structure == "LHLL":
        score += 1.5
    elif structure == "Mixed":
        score += 0.5

    if direction == "LONG" and ema_alignment == "Bullish":
        score += 1
    elif direction == "SHORT" and ema_alignment == "Bearish":
        score += 1
    elif ema_alignment == "Mixed":
        score += 0.5

    if direction == "LONG":
        if key_level_context in ["Above Support", "At Support"]:
            score += 1.5
        elif key_level_context == "Mid Range":
            score += 0.5

    if direction == "SHORT":
        if key_level_context in ["Below Resistance", "At Resistance"]:
            score += 1.5
        elif key_level_context == "Mid Range":
            score += 0.5

    score += {
        "Pullback": 2,
        "Breakout": 1.5,
        "Reversal": 1,
        "Chase": 0,
    }.get(entry_type, 0)

    score += {
        "Structural": 1,
        "Fixed Points": 0.5,
        "Unknown": 0,
    }.get(stop_type, 0)

    score += {
        "Good": 1,
        "Average": 0.5,
        "Poor": 0,
        "Unknown": 0,
    }.get(reward_context, 0)

    score += {
        "Gap Up Supports Trade": 0.5,
        "Gap Down Supports Trade": 0.5,
        "No Gap": 0.25,
        "Not Applicable": 0.25,
        "Gap Against Trade": 0,
    }.get(gap_context, 0)

    return min(round(score, 2), 10)


def get_process_grade(score):
    if score >= 9:
        return "Elite"
    if score >= 8:
        return "A"
    if score >= 7:
        return "B"
    if score >= 6:
        return "C"
    return "Avoid"


def validate_risk(direction, futures_entry_price, stop_loss, target):
    direction = direction.upper()

    if direction == "LONG":
        if stop_loss >= futures_entry_price:
            raise ValueError("For LONG trade, stop loss must be below futures entry price.")
        if target <= futures_entry_price:
            raise ValueError("For LONG trade, target must be above futures entry price.")

    if direction == "SHORT":
        if stop_loss <= futures_entry_price:
            raise ValueError("For SHORT trade, stop loss must be above futures entry price.")
        if target >= futures_entry_price:
            raise ValueError("For SHORT trade, target must be below futures entry price.")


def estimate_charges(direction, entry_price, exit_price, quantity):
    buy_price = entry_price if direction == "LONG" else exit_price
    sell_price = exit_price if direction == "LONG" else entry_price

    buy_turnover = buy_price * quantity
    sell_turnover = sell_price * quantity
    total_turnover = buy_turnover + sell_turnover

    brokerage = BROKERAGE_PER_ORDER * 2
    stt = sell_turnover * STT_SELL_SIDE_RATE
    exchange_txn = total_turnover * EXCHANGE_TXN_RATE
    sebi = total_turnover * SEBI_RATE
    stamp = buy_turnover * STAMP_BUY_SIDE_RATE
    gst = (brokerage + exchange_txn) * GST_RATE

    total = brokerage + stt + exchange_txn + sebi + stamp + gst

    return {
        "brokerage": round(brokerage, 2),
        "stt": round(stt, 2),
        "exchange_txn": round(exchange_txn, 2),
        "sebi": round(sebi, 2),
        "stamp": round(stamp, 2),
        "gst": round(gst, 2),
        "total": round(total, 2),
    }


def get_open_entry():
    events = read_events()
    exited_trade_ids = {event["trade_id"] for event in events if event["event_type"] == "EXIT"}

    for event in events:
        if event["event_type"] == "ENTRY" and event["trade_id"] not in exited_trade_ids:
            return event

    return None


def open_trade(
    instrument,
    direction,
    spot_entry_price,
    futures_entry_price,
    quantity,
    stop_loss,
    target,
    trend_bias,
    structure,
    ema_alignment,
    key_level_context,
    entry_type,
    stop_type,
    reward_context,
    gap_context,
    trade_direction_alignment,
    chart_screenshot,
    entry_logic,
):
    events = read_events()

    if get_open_entry():
        raise ValueError("Close the current trade before opening a new trade.")

    validate_risk(direction, futures_entry_price, stop_loss, target)

    process_score = calculate_process_score(
        direction=direction,
        structure=structure,
        ema_alignment=ema_alignment,
        key_level_context=key_level_context,
        entry_type=entry_type,
        stop_type=stop_type,
        reward_context=reward_context,
        gap_context=gap_context,
        trade_direction_alignment=trade_direction_alignment,
    )

    now = datetime.now()
    trade_id = get_next_trade_id(events)

    events.append({
        "trade_id": trade_id,
        "event_type": "ENTRY",
        "event_date": now.strftime("%Y-%m-%d"),
        "event_time": now.strftime("%H:%M:%S"),
        "instrument": instrument,
        "direction": direction.upper(),
        "spot_price": spot_entry_price,
        "futures_price": futures_entry_price,
        "quantity": quantity,
        "stop_loss": stop_loss,
        "target": target,
        "status": "OPEN",
        "trend_bias": trend_bias,
        "structure": structure,
        "ema_alignment": ema_alignment,
        "key_level_context": key_level_context,
        "entry_type": entry_type,
        "stop_type": stop_type,
        "reward_context": reward_context,
        "gap_context": gap_context,
        "trade_direction_alignment": trade_direction_alignment,
        "process_score": process_score,
        "process_grade": get_process_grade(process_score),
        "chart_screenshot": chart_screenshot,
        "entry_logic": entry_logic,
        "exit_logic": "",
    })

    write_events(events)


def exit_trade(spot_exit_price, futures_exit_price, exit_logic):
    events = read_events()
    open_entry = get_open_entry()

    if not open_entry:
        raise ValueError("No open trade found.")

    now = datetime.now()

    events.append({
        "trade_id": open_entry["trade_id"],
        "event_type": "EXIT",
        "event_date": now.strftime("%Y-%m-%d"),
        "event_time": now.strftime("%H:%M:%S"),
        "instrument": open_entry["instrument"],
        "direction": open_entry["direction"],
        "spot_price": spot_exit_price,
        "futures_price": futures_exit_price,
        "quantity": open_entry["quantity"],
        "stop_loss": "",
        "target": "",
        "status": "CLOSED",
        "trend_bias": "",
        "structure": "",
        "ema_alignment": "",
        "key_level_context": "",
        "entry_type": "",
        "stop_type": "",
        "reward_context": "",
        "gap_context": "",
        "trade_direction_alignment": "",
        "process_score": "",
        "process_grade": "",
        "chart_screenshot": "",
        "entry_logic": "",
        "exit_logic": exit_logic,
    })

    write_events(events)


def build_trades():
    events = read_events()

    entries = [event for event in events if event["event_type"] == "ENTRY"]
    exits = {event["trade_id"]: event for event in events if event["event_type"] == "EXIT"}

    trades = []

    for entry in entries:
        exit_event = exits.get(entry["trade_id"])
        imported_trade = is_imported_trade(entry)

        direction = entry.get("direction") or "Unknown"
        futures_entry_price = safe_float(entry.get("futures_price"))
        spot_entry_price = safe_float(entry.get("spot_price"))
        quantity = safe_int(entry.get("quantity"))

        spot_exit_price = ""
        futures_exit_price = ""
        futures_points = 0
        gross_pnl = 0
        net_pnl = 0
        holding_minutes = ""
        exit_logic = ""

        charges = {
            "brokerage": 0,
            "stt": 0,
            "exchange_txn": 0,
            "sebi": 0,
            "stamp": 0,
            "gst": 0,
            "total": 0,
        }

        status = "OPEN"

        if exit_event:
            status = "CLOSED"
            futures_exit_price = safe_float(exit_event.get("futures_price"))
            spot_exit_price = safe_float(exit_event.get("spot_price"))
            exit_logic = exit_event.get("exit_logic") or ""

            if direction == "LONG":
                futures_points = futures_exit_price - futures_entry_price
                gross_pnl = futures_points * quantity
            elif direction == "SHORT":
                futures_points = futures_entry_price - futures_exit_price
                gross_pnl = futures_points * quantity

            charges = estimate_charges(
                direction=direction,
                entry_price=futures_entry_price,
                exit_price=futures_exit_price,
                quantity=quantity,
            )

            net_pnl = gross_pnl - charges["total"]

            try:
                entry_dt = datetime.strptime(
                    f"{entry['event_date']} {entry['event_time']}",
                    "%Y-%m-%d %H:%M:%S"
                )
                exit_dt = datetime.strptime(
                    f"{exit_event['event_date']} {exit_event['event_time']}",
                    "%Y-%m-%d %H:%M:%S"
                )
                holding_minutes = round((exit_dt - entry_dt).total_seconds() / 60, 1)
            except ValueError:
                holding_minutes = ""

        trades.append({
            "trade_id": entry["trade_id"],
            "entry_date": entry.get("event_date") or "",
            "entry_time": entry.get("event_time") or "",
            "exit_date": exit_event.get("event_date") if exit_event else "",
            "exit_time": exit_event.get("event_time") if exit_event else "",
            "holding_minutes": holding_minutes,

            "instrument": entry.get("instrument") or "Unknown",
            "direction": direction,

            "spot_entry_price": spot_entry_price,
            "spot_exit_price": spot_exit_price,
            "futures_entry_price": futures_entry_price,
            "futures_exit_price": futures_exit_price,
            "futures_points": round(futures_points, 2),

            "quantity": quantity,
            "stop_loss": entry.get("stop_loss") or "Unknown",
            "target": entry.get("target") or "Unknown",
            "status": status,

            "trend_bias": entry.get("trend_bias") or "Unknown",
            "structure": entry.get("structure") or "Unknown",
            "ema_alignment": entry.get("ema_alignment") or "Unknown",
            "key_level_context": entry.get("key_level_context") or "Unknown",
            "entry_type": entry.get("entry_type") or "Unknown",
            "stop_type": entry.get("stop_type") or "Unknown",
            "reward_context": entry.get("reward_context") or "Unknown",
            "gap_context": entry.get("gap_context") or "Unknown",
            "trade_direction_alignment": entry.get("trade_direction_alignment") or "Unknown",

            "process_score": "Imported" if imported_trade else (entry.get("process_score") or 0),
            "process_grade": "Imported" if imported_trade else (entry.get("process_grade") or "Unknown"),
            "chart_screenshot": entry.get("chart_screenshot") or "",

            "entry_logic": entry.get("entry_logic") or ("Imported Trade" if imported_trade else ""),
            "exit_logic": exit_logic or ("Imported Trade" if imported_trade and exit_event else ""),

            "gross_pnl": round(gross_pnl, 2),
            "brokerage": charges["brokerage"],
            "stt": charges["stt"],
            "exchange_txn": charges["exchange_txn"],
            "sebi": charges["sebi"],
            "stamp": charges["stamp"],
            "gst": charges["gst"],
            "estimated_charges": charges["total"],
            "net_pnl": round(net_pnl, 2),
            "pnl": round(net_pnl, 2),
        })

    return trades


def get_summary():
    trades = build_trades()

    total_net_pnl = sum(safe_float(trade["net_pnl"]) for trade in trades)
    closed_trades = [trade for trade in trades if trade["status"] == "CLOSED"]
    open_trades = [trade for trade in trades if trade["status"] == "OPEN"]
    wins = [trade for trade in closed_trades if safe_float(trade["net_pnl"]) > 0]

    win_rate = (len(wins) / len(closed_trades) * 100) if closed_trades else 0

    return {
        "starting_capital": STARTING_CAPITAL,
        "current_capital": round(STARTING_CAPITAL + total_net_pnl, 2),
        "total_pnl": round(total_net_pnl, 2),
        "total_pnl_pct": round((total_net_pnl / STARTING_CAPITAL) * 100, 2),
        "trade_count": len(trades),
        "closed_trade_count": len(closed_trades),
        "win_rate": round(win_rate, 2),
        "active_trade": open_trades[0] if open_trades else None,
        "trades": trades,
    }