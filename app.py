from flask import Flask, render_template

app = Flask(__name__)


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


if __name__ == "__main__":
    app.run(debug=True)