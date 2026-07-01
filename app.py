import os
from datetime import datetime

from flask import Flask, render_template, request, redirect, url_for, session
from werkzeug.utils import secure_filename

from services.strategy_trades_service import (
    get_strategy_lab_summary,
    create_strategy_trade,
    update_strategy_trade_prices,
    close_strategy_trade,
)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "market-pulse-league-dev-key")

app.config["UPLOAD_FOLDER"] = os.path.join("static", "uploads", "chart_screenshots")
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)


@app.route("/")
def home():
    return render_template("home.html")


@app.route("/equity")
def equity():
    from services.market_data import get_latest_market_data, get_sector_heatmap_data

    market_data = get_latest_market_data()
    sector_heatmap = get_sector_heatmap_data()

    return render_template(
        "equity.html",
        market_data=market_data,
        sector_heatmap=sector_heatmap
    )


@app.route("/mutual-funds")
def mutual_funds():
    return render_template("mutual_funds.html")


@app.route("/crypto")
def crypto():
    return render_template("crypto.html")


@app.route("/contact")
def contact():
    return render_template("contact.html")


@app.route("/paper-trading")
def paper_trading():
    from services.paper_trading_service import get_summary

    summary = get_summary()

    active_trade = summary.get("active_trade")
    live_current_price = session.get("live_current_price")
    active_display_pnl = 0

    if active_trade:
        if live_current_price is None:
            live_current_price = active_trade["futures_entry_price"]

        if active_trade["direction"] == "LONG":
            active_display_pnl = (
                float(live_current_price) - float(active_trade["futures_entry_price"])
            ) * int(active_trade["quantity"])
        else:
            active_display_pnl = (
                float(active_trade["futures_entry_price"]) - float(live_current_price)
            ) * int(active_trade["quantity"])

    return render_template(
        "paper_trading.html",
        summary=summary,
        live_current_price=live_current_price,
        active_display_pnl=round(active_display_pnl, 2),
        error=None
    )


@app.route("/paper-trading/open", methods=["POST"])
def open_paper_trade():
    from services.paper_trading_service import open_trade

    try:
        chart_file = request.files.get("chart_screenshot")
        chart_path = ""

        if chart_file and chart_file.filename:
            filename = secure_filename(chart_file.filename)
            filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}"
            save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            chart_file.save(save_path)
            chart_path = f"uploads/chart_screenshots/{filename}"
        else:
            raise ValueError("Chart screenshot is mandatory for new trades.")

        open_trade(
            instrument=request.form["instrument"],
            direction=request.form["direction"],
            spot_entry_price=float(request.form["spot_entry_price"]),
            futures_entry_price=float(request.form["futures_entry_price"]),
            quantity=int(request.form["quantity"]),
            stop_loss=float(request.form["stop_loss"]),
            target=float(request.form["target"]),
            trend_bias=request.form["trend_bias"],
            structure=request.form["structure"],
            ema_alignment=request.form["ema_alignment"],
            key_level_context=request.form["key_level_context"],
            entry_type=request.form["entry_type"],
            stop_type=request.form["stop_type"],
            reward_context=request.form["reward_context"],
            gap_context=request.form["gap_context"],
            trade_direction_alignment=request.form["trade_direction_alignment"],
            chart_screenshot=chart_path,
            entry_logic=request.form["entry_logic"],
        )

        session.pop("live_current_price", None)
        return redirect(url_for("paper_trading"))

    except ValueError as error:
        from services.paper_trading_service import get_summary

        summary = get_summary()
        return render_template(
            "paper_trading.html",
            summary=summary,
            live_current_price=None,
            active_display_pnl=0,
            error=str(error)
        )


@app.route("/paper-trading/update-live-price", methods=["POST"])
def update_live_price():
    session["live_current_price"] = float(request.form["current_price"])
    return redirect(url_for("paper_trading"))


@app.route("/paper-trading/exit", methods=["POST"])
def exit_paper_trade():
    from services.paper_trading_service import exit_trade

    try:
        exit_trade(
            spot_exit_price=float(request.form["spot_exit_price"]),
            futures_exit_price=float(request.form["futures_exit_price"]),
            exit_logic=request.form["exit_logic"],
        )

        session.pop("live_current_price", None)
        return redirect(url_for("paper_trading"))

    except ValueError as error:
        from services.paper_trading_service import get_summary

        summary = get_summary()
        return render_template(
            "paper_trading.html",
            summary=summary,
            live_current_price=None,
            active_display_pnl=0,
            error=str(error)
        )

@app.route("/trade-journal")
def trade_journal():
    from services.paper_trading_service import get_summary

    summary = get_summary()
    return render_template("trade_journal.html", summary=summary)


@app.route("/journal-mobile")
def journal_mobile():
    from services.paper_trading_service import get_summary

    summary = get_summary()
    return render_template("journal_mobile.html", summary=summary)
    
@app.route("/strategy-lab")
def strategy_lab():
    summary = get_strategy_lab_summary()
    return render_template("strategy_lab.html", summary=summary)


@app.route("/strategy-lab/create", methods=["POST"])
def strategy_lab_create():
    create_strategy_trade(request.form)
    return redirect(url_for("strategy_lab"))


@app.route("/strategy-lab/update/<int:strategy_id>", methods=["POST"])
def strategy_lab_update(strategy_id):
    update_strategy_trade_prices(strategy_id, request.form)
    return redirect(url_for("strategy_lab"))


@app.route("/strategy-lab/close/<int:strategy_id>", methods=["POST"])
def strategy_lab_close(strategy_id):
    close_strategy_trade(strategy_id)
    return redirect(url_for("strategy_lab"))


@app.route("/strategy-trades")
def strategy_trades():
    summary = get_strategy_lab_summary()
    return render_template("strategy_trades.html", summary=summary)

if __name__ == "__main__":
    app.run(debug=True)