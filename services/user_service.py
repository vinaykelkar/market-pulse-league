import csv
import os
import re
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from werkzeug.security import check_password_hash, generate_password_hash


USER_FIELDNAMES = [
    "user_id",
    "username",
    "full_name",
    "email",
    "password_hash",
    "role",
    "created_at",
    "last_login",
    "is_active",
]


USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_]{3,30}$")


def now_string() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def normalize_username(username: str) -> str:
    return (username or "").strip().lower()


def ensure_users_csv(users_csv: str) -> None:
    os.makedirs(os.path.dirname(users_csv), exist_ok=True)

    if not os.path.exists(users_csv):
        with open(users_csv, "w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=USER_FIELDNAMES)
            writer.writeheader()
        return

    # Backward-compatible header repair if file exists but is empty.
    if os.path.getsize(users_csv) == 0:
        with open(users_csv, "w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=USER_FIELDNAMES)
            writer.writeheader()


def read_users(users_csv: str) -> List[Dict[str, str]]:
    ensure_users_csv(users_csv)

    with open(users_csv, "r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        users = []
        for row in reader:
            normalized = {field: row.get(field, "") for field in USER_FIELDNAMES}
            users.append(normalized)
        return users


def write_users(users_csv: str, users: List[Dict[str, str]]) -> None:
    ensure_users_csv(users_csv)

    with open(users_csv, "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=USER_FIELDNAMES)
        writer.writeheader()
        for user in users:
            writer.writerow({field: user.get(field, "") for field in USER_FIELDNAMES})


def find_user_by_email(users_csv: str, email: str) -> Optional[Dict[str, str]]:
    target_email = normalize_email(email)
    for user in read_users(users_csv):
        if normalize_email(user.get("email")) == target_email:
            return user
    return None


def find_user_by_username(users_csv: str, username: str) -> Optional[Dict[str, str]]:
    target_username = normalize_username(username)
    for user in read_users(users_csv):
        if normalize_username(user.get("username")) == target_username:
            return user
    return None


def find_user_by_identifier(users_csv: str, identifier: str) -> Optional[Dict[str, str]]:
    identifier = (identifier or "").strip()
    if "@" in identifier:
        return find_user_by_email(users_csv, identifier)
    return find_user_by_username(users_csv, identifier)


def validate_signup_input(
    username: str,
    full_name: str,
    email: str,
    password: str,
    confirm_password: str,
) -> Tuple[str, str, str]:
    username = normalize_username(username)
    full_name = (full_name or "").strip()
    email = normalize_email(email)

    if not USERNAME_PATTERN.match(username):
        raise ValueError("Username must be 3-30 characters and can contain only letters, numbers and underscore.")

    if len(full_name) < 2:
        raise ValueError("Full name is required.")

    if "@" not in email or "." not in email:
        raise ValueError("Please enter a valid email address.")

    if len(password or "") < 8:
        raise ValueError("Password must be at least 8 characters.")

    if password != confirm_password:
        raise ValueError("Password and confirm password do not match.")

    return username, full_name, email


def create_user(
    users_csv: str,
    username: str,
    full_name: str,
    email: str,
    password: str,
    confirm_password: str,
    admin_email: str,
    admin_username: str,
) -> Dict[str, str]:
    username, full_name, email = validate_signup_input(
        username=username,
        full_name=full_name,
        email=email,
        password=password,
        confirm_password=confirm_password,
    )

    users = read_users(users_csv)

    if any(normalize_username(user.get("username")) == username for user in users):
        raise ValueError("This username is already taken.")

    if any(normalize_email(user.get("email")) == email for user in users):
        raise ValueError("This email is already registered.")

    role = "admin" if email == normalize_email(admin_email) or username == normalize_username(admin_username) else "user"

    user = {
        "user_id": str(uuid.uuid4()),
        "username": username,
        "full_name": full_name,
        "email": email,
        "password_hash": generate_password_hash(password),
        "role": role,
        "created_at": now_string(),
        "last_login": "",
        "is_active": "1",
    }

    users.append(user)
    write_users(users_csv, users)
    return user


def authenticate_user(users_csv: str, identifier: str, password: str) -> Optional[Dict[str, str]]:
    user = find_user_by_identifier(users_csv, identifier)

    if not user:
        return None

    if user.get("is_active") not in ("1", "true", "TRUE", "True", ""):
        return None

    if not check_password_hash(user.get("password_hash", ""), password or ""):
        return None

    users = read_users(users_csv)
    for existing_user in users:
        if existing_user.get("user_id") == user.get("user_id"):
            existing_user["last_login"] = now_string()
            user = existing_user
            break

    write_users(users_csv, users)
    return user
