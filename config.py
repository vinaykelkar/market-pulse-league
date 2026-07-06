import os


class Config:
    APP_NAME = "Market Pulse League"

    # Flask session signing key. Set this in Render Environment Variables.
    SECRET_KEY = os.getenv("SECRET_KEY", "market-pulse-league-dev-key")

    # Admin fallback credentials. Keep MPL_ADMIN_PASSWORD temporary until you are happy with normal login.
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "techtradeandchai@gmail.com").strip().lower()
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "techtradeandchai").strip().lower()
    ADMIN_PASSWORD = os.getenv("MPL_ADMIN_PASSWORD", "admin123")

    # CSV paths
    DATA_FOLDER = "data"
    USERS_CSV = os.path.join(DATA_FOLDER, "users.csv")

    # Uploads
    UPLOAD_FOLDER = os.path.join("static", "uploads", "chart_screenshots")
