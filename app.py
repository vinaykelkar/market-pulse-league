import os
from datetime import datetime
from functools import wraps

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

# For deployment, set this as an environment variable.
# Example: MPL_ADMIN_PASSWORD="your-strong-password"
ADMIN_PASSWORD = os.environ.get("MPL_ADMIN_PASSWORD", "admin123")

app.config["UPLOAD_FOLDER"] = os.path.join("static", "uploads", "chart_screenshots")
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)


def is_admin_logged_in():
    return session.get("admin_logged_in") is True


def require_admin(view_func):
    @wraps(view_func)
    def wrapped_view(*args, **kwargs):
        if not is_admin_logged_in():
            session["next_url"] = request.path
            return redirect(url_for("admin_login"))
        return view_func(*args, **kwargs)

    return wrapped_view


@app.context_processor
def inject_admin_state():
    return {"is_admin": is_admin_logged_in()}


# =========================================================
# PUBLIC WEBSITE
# =========================================================

@app.route("/")
def home():
    return render_template("home.html")


@app.route("/equity")
def equity():
    """
    Existing Equity page retained exactly as a separate legacy/public page.
    It can be removed later after Performance Dashboard is fully accepted.
    """
    from services.market_data import get_latest_market_data, get_sector_heatmap_data

    market_data = get_latest_market_data()
    sector_heatmap = get_sector_heatmap_data()

    return render_template(
        "equity.html",
        market_data=market_data,
        sector_heatmap=sector_heatmap,
    )


@app.route("/performance-dashboard")
def performance_dashboard():
    from services.performance_dashboard_service import get_performance_dashboard

    dashboard = get_performance_dashboard()
    performance_message = session.pop("performance_message", None)
    performance_error = session.pop("performance_error", None)

    return render_template(
        "performance_dashboard.html",
        dashboard=dashboard,
        performance_message=performance_message,
        performance_error=performance_error,
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
def public_strategy_lab():
    """
    Public Strategy Lab is read-only.
    The editable strategy lab is now available at /admin/strategy-lab.
    """
    summary = get_strategy_lab_summary()
    return render_template("strategy_trades.html", summary=summary)


@app.route("/strategy-trades")
def strategy_trades():
    summary = get_strategy_lab_summary()
    return render_template("strategy_trades.html", summary=summary)


@app.route("/strategy-mobile")
def strategy_mobile():
    summary = get_strategy_lab_summary()

    selected_strategy_id = request.args.get("strategy_id", type=int)
    selected_strategy = None

    if selected_strategy_id:
        for strategy in summary["strategies"]:
            if strategy["strategy_id"] == selected_strategy_id:
                selected_strategy = strategy
                break

    return render_template(
        "strategy_mobile.html",
        summary=summary,
        selected_strategy=selected_strategy,
    )


@app.route("/mutual-funds")
def mutual_funds():
    return render_template("mutual_funds.html")


@app.route("/crypto")
def crypto():
    return render_template("crypto.html")


@app.route("/about")
def about():
    return render_template("contact.html")


@app.route("/contact")
def contact():
    return render_template("contact.html")


# =========================================================
# ADMIN AUTH
# =========================================================

@app.route("/admin/login", methods=["GET", "POST"])
@app.route("/login", methods=["GET", "POST"])
def admin_login():
    error = None

    if request.method == "POST":
        password = request.form.get("password", "")

        if password == ADMIN_PASSWORD:
            session["admin_logged_in"] = True
            next_url = session.pop("next_url", None)
            return redirect(next_url or url_for("admin_dashboard"))

        error = "Invalid admin password."

    return render_template("admin_login.html", error=error)


@app.route("/admin/logout")
@app.route("/logout")
def admin_logout():
    session.pop("admin_logged_in", None)
    session.pop("next_url", None)
    return redirect(url_for("home"))


@app.route("/admin")
@require_admin
def admin_dashboard():
    return render_template("admin_dashboard.html")


# =========================================================
# ADMIN: PERFORMANCE DASHBOARD ACTIONS
# =========================================================

@app.route("/performance-dashboard/update-stocks", methods=["POST"])
@require_admin
def performance_dashboard_update_stocks():
    from services.performance_dashboard_service import update_stock_prices

    try:
        updated_count = update_stock_prices()
        session["performance_message"] = f"Updated latest prices for {updated_count} stock holding(s)."
    except Exception as error:
        session["performance_error"] = f"Stock price update failed: {error}"

    return redirect(url_for("performance_dashboard"))


@app.route("/performance-dashboard/update-mutual-funds", methods=["POST"])
@require_admin
def performance_dashboard_update_mutual_funds():
    from services.performance_dashboard_service import update_mutual_fund_navs

    try:
        updated_count = update_mutual_fund_navs()
        session["performance_message"] = f"Updated latest NAV for {updated_count} mutual fund holding(s)."
    except Exception as error:
        session["performance_error"] = f"Mutual fund NAV update failed: {error}"

    return redirect(url_for("performance_dashboard"))


# =========================================================
# ADMIN: PAPER TRADING
# =========================================================

@app.route("/paper-trading")
def paper_trading_legacy_redirect():
    return redirect(url_for("admin_paper_trading"))


@app.route("/admin/paper-trading")
@require_admin
def admin_paper_trading():
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
        error=None,
    )


@app.route("/paper-trading/open", methods=["POST"])
@require_admin
def open_paper_trade():
    from services.paper_trading_service import open_trade, get_summary

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
        return redirect(url_for("admin_paper_trading"))

    except ValueError as error:
        summary = get_summary()
        return render_template(
            "paper_trading.html",
            summary=summary,
            live_current_price=None,
            active_display_pnl=0,
            error=str(error),
        )


@app.route("/paper-trading/update-live-price", methods=["POST"])
@require_admin
def update_live_price():
    session["live_current_price"] = float(request.form["current_price"])
    return redirect(url_for("admin_paper_trading"))


@app.route("/paper-trading/exit", methods=["POST"])
@require_admin
def exit_paper_trade():
    from services.paper_trading_service import exit_trade, get_summary

    try:
        exit_trade(
            spot_exit_price=float(request.form["spot_exit_price"]),
            futures_exit_price=float(request.form["futures_exit_price"]),
            exit_logic=request.form["exit_logic"],
        )

        session.pop("live_current_price", None)
        return redirect(url_for("admin_paper_trading"))

    except ValueError as error:
        summary = get_summary()
        return render_template(
            "paper_trading.html",
            summary=summary,
            live_current_price=None,
            active_display_pnl=0,
            error=str(error),
        )


# =========================================================
# ADMIN: STRATEGY LAB
# =========================================================

@app.route("/admin/strategy-lab")
@require_admin
def admin_strategy_lab():
    summary = get_strategy_lab_summary()
    return render_template("strategy_lab.html", summary=summary)


@app.route("/strategy-lab/create", methods=["POST"])
@require_admin
def strategy_lab_create():
    create_strategy_trade(request.form)
    return redirect(url_for("admin_strategy_lab"))


@app.route("/strategy-lab/update/<int:strategy_id>", methods=["POST"])
@require_admin
def strategy_lab_update(strategy_id):
    update_strategy_trade_prices(strategy_id, request.form)
    return redirect(url_for("admin_strategy_lab"))


@app.route("/strategy-lab/close/<int:strategy_id>", methods=["POST"])
@require_admin
def strategy_lab_close(strategy_id):
    close_strategy_trade(strategy_id, request.form)
    return redirect(url_for("admin_strategy_lab"))


if __name__ == "__main__":
    app.run(debug=True)
