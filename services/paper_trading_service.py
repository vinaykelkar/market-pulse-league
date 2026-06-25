import csv
from datetime import datetime
from pathlib import Path


DATA_FILE = Path("data/paper_trades_v2.csv")
STARTING_CAPITAL = 250000
DEFAULT_QUANTITY = 65

FIELDNAMES = [
    "trade_id",
    "event_type",
    "event_date",
    "event_time",
    "instrument",
    "direction",
    "spot_price",
    "futures_price",
    "quantity",
    "stop_loss",
    "target",
    "status",
    "trend_bias",
    "structure",
    "ema_alignment",
    "key_level_context",
    "entry_type",
    "stop_type",
    "reward_context",
    "gap_context",
    "trade_direction_alignment",
    "process_score",
    "process_grade",
    "chart_screenshot",
    "entry_logic",
    "exit_logic",
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
    except ValueError:
        return default


def safe_int(value, default=0):
    try:
        if value in [None, ""]:
            return default
        return int(float(value))
    except ValueError:
        return default


def read_events():
    ensure_csv_exists()
    events = []

    with DATA_FILE.open("r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            if not row.get("trade_id"):
                continue

            normalized = {key: row.get(key, "") for key in FIELDNAMES}

            normalized["trade_id"] = safe_int(normalized["trade_id"])
            normalized["spot_price"] = safe_float(normalized["spot_price"])
            normalized["futures_price"] = safe_float(normalized["futures_price"])
            normalized["quantity"] = safe_int(normalized["quantity"])
            normalized["stop_loss"] = safe_float(normalized["stop_loss"])
            normalized["target"] = safe_float(normalized["target"])
            normalized["process_score"] = safe_float(normalized["process_score"])

            events.append(normalized)

    return events


def write_events(events):
    ensure_csv_exists()

    with DATA_FILE.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDNAMES)
        writer.writeheader()

        for event in events:
            clean_event = {key: event.get(key, "") for key in FIELDNAMES}
            writer.writerow(clean_event)


def get_next_trade_id(events):
    if not events:
        return 1

    return max(safe_int(event["trade_id"]) for event in events) + 1


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
        if not stop_loss < futures_entry_price:
            raise ValueError("For LONG trade, stop loss must be below futures entry price.")
        if not target > futures_entry_price:
            raise ValueError("For LONG trade, target must be above futures entry price.")

    if direction == "SHORT":
        if not stop_loss > futures_entry_price:
            raise ValueError("For SHORT trade, stop loss must be above futures entry price.")
        if not target < futures_entry_price:
            raise ValueError("For SHORT trade, target must be below futures entry price.")


def get_open_entry():
    events = read_events()

    entries = [e for e in events if e["event_type"] == "ENTRY"]
    exits = [e for e in events if e["event_type"] == "EXIT"]

    exited_trade_ids = {e["trade_id"] for e in exits}

    for entry in entries:
        if entry["trade_id"] not in exited_trade_ids:
            return entry

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

    process_grade = get_process_grade(process_score)

    now = datetime.now()
    trade_id = get_next_trade_id(events)

    entry_event = {
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
        "process_grade": process_grade,
        "chart_screenshot": chart_screenshot,
        "entry_logic": entry_logic,
        "exit_logic": "",
    }

    events.append(entry_event)
    write_events(events)


def exit_trade(spot_exit_price, futures_exit_price, exit_logic):
    events = read_events()
    open_entry = get_open_entry()

    if not open_entry:
        raise ValueError("No open trade found.")

    now = datetime.now()

    exit_event = {
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
    }

    events.append(exit_event)
    write_events(events)


def build_trades():
    events = read_events()

    entries = [e for e in events if e["event_type"] == "ENTRY"]
    exits = [e for e in events if e["event_type"] == "EXIT"]

    exit_map = {e["trade_id"]: e for e in exits}

    trades = []

    for entry in entries:
        exit_event = exit_map.get(entry["trade_id"])

        futures_entry_price = safe_float(entry["futures_price"])
        spot_entry_price = safe_float(entry["spot_price"])
        quantity = safe_int(entry["quantity"])

        if exit_event:
            futures_exit_price = safe_float(exit_event["futures_price"])
            spot_exit_price = safe_float(exit_event["spot_price"])
            status = "CLOSED"

            if entry["direction"] == "LONG":
                pnl = (futures_exit_price - futures_entry_price) * quantity
            else:
                pnl = (futures_entry_price - futures_exit_price) * quantity

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

            exit_logic = exit_event.get("exit_logic", "")

        else:
            futures_exit_price = ""
            spot_exit_price = ""
            status = "OPEN"
            pnl = 0
            holding_minutes = ""
            exit_logic = ""

        trades.append({
            "trade_id": entry["trade_id"],
            "entry_date": entry["event_date"],
            "entry_time": entry["event_time"],
            "exit_date": exit_event["event_date"] if exit_event else "",
            "exit_time": exit_event["event_time"] if exit_event else "",
            "holding_minutes": holding_minutes,
            "instrument": entry.get("instrument") or "Unknown",
            "direction": entry.get("direction") or "Unknown",
            "spot_entry_price": spot_entry_price,
            "spot_exit_price": spot_exit_price,
            "futures_entry_price": futures_entry_price,
            "futures_exit_price": futures_exit_price,
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
            "process_score": entry.get("process_score") or 0,
            "process_grade": entry.get("process_grade") or "Unknown",
            "chart_screenshot": entry.get("chart_screenshot") or "",
            "entry_logic": entry.get("entry_logic") or "",
            "exit_logic": exit_logic,
            "pnl": round(pnl, 2),
        })

    return trades


def get_summary():
    trades = build_trades()

    total_pnl = sum(safe_float(trade["pnl"]) for trade in trades)
    closed_trades = [trade for trade in trades if trade["status"] == "CLOSED"]
    open_trades = [trade for trade in trades if trade["status"] == "OPEN"]

    wins = [trade for trade in closed_trades if safe_float(trade["pnl"]) > 0]
    win_rate = (len(wins) / len(closed_trades) * 100) if closed_trades else 0

    return {
        "starting_capital": STARTING_CAPITAL,
        "current_capital": round(STARTING_CAPITAL + total_pnl, 2),
        "total_pnl": round(total_pnl, 2),
        "total_pnl_pct": round((total_pnl / STARTING_CAPITAL) * 100, 2),
        "trade_count": len(trades),
        "closed_trade_count": len(closed_trades),
        "win_rate": round(win_rate, 2),
        "active_trade": open_trades[0] if open_trades else None,
        "trades": trades,
    }