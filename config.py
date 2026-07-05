import os


class Config:
    """Application configuration.

    Secrets are read from environment variables so the codebase can be
    deployed safely without hardcoding production credentials.
    """

    APP_NAME = "Market Pulse League"

    # Flask session security
    SECRET_KEY = os.getenv("SECRET_KEY", "market-pulse-league-dev-key")

    # Admin access
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "techtradeandchai@gmail.com").strip().lower()
    ADMIN_PASSWORD = os.getenv(
        "MPL_ADMIN_PASSWORD",
        os.getenv("ADMIN_PASSWORD", "admin123"),
    )

    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

    # Paths
    DATA_FOLDER = "data"
    USERS_CSV = os.getenv("USERS_CSV", os.path.join(DATA_FOLDER, "users.csv"))
    UPLOAD_FOLDER = os.path.join("static", "uploads", "chart_screenshots")

    # Cookies
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
