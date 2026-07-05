import csv
import os
from datetime import datetime


USER_FIELDNAMES = [
    "email",
    "name",
    "picture",
    "role",
    "first_login",
    "last_login",
]


def _now_string():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def ensure_users_csv(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)

    if not os.path.exists(path):
        with open(path, "w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=USER_FIELDNAMES)
            writer.writeheader()


def read_users(path):
    ensure_users_csv(path)

    with open(path, "r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        return list(reader)


def write_users(path, users):
    ensure_users_csv(path)

    with open(path, "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=USER_FIELDNAMES)
        writer.writeheader()
        for user in users:
            writer.writerow({field: user.get(field, "") for field in USER_FIELDNAMES})


def upsert_google_user(path, email, name, picture, admin_email):
    if not email:
        raise ValueError("Google login did not return an email address.")

    email = email.strip().lower()
    admin_email = (admin_email or "").strip().lower()
    role = "admin" if email == admin_email else "user"
    now = _now_string()

    users = read_users(path)
    existing_user = None

    for user in users:
        if user.get("email", "").strip().lower() == email:
            existing_user = user
            break

    if existing_user:
        existing_user["name"] = name or existing_user.get("name", "")
        existing_user["picture"] = picture or existing_user.get("picture", "")
        existing_user["role"] = role
        existing_user["last_login"] = now
    else:
        users.append({
            "email": email,
            "name": name or "",
            "picture": picture or "",
            "role": role,
            "first_login": now,
            "last_login": now,
        })

    write_users(path, users)

    return {
        "email": email,
        "name": name or "",
        "picture": picture or "",
        "role": role,
    }
