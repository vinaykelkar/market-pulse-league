# Market Pulse League - Public/Admin Structure

This version keeps existing CSV storage and existing trade/strategy data intact.

## Public website

- `/` - Home
- `/performance-dashboard` - Performance Dashboard
- `/trade-journal` - Public trade journal
- `/strategy-lab` - Public read-only strategy lab
- `/strategy-trades` - Public read-only strategy trades
- `/journal-mobile` - Mobile journal view
- `/strategy-mobile` - Mobile strategy view
- `/contact` or `/about` - About/contact

## Admin panel

- `/admin/login` or `/login` - Admin login
- `/admin` - Admin home
- `/admin/paper-trading` - Paper trading entry/update/exit
- `/admin/strategy-lab` - Strategy creation/update/close
- `/performance-dashboard` - Admin sees update buttons after login

## Default local admin password

For local development, the default password is:

```text
admin123
```

For deployment, set an environment variable instead:

```text
MPL_ADMIN_PASSWORD=your-strong-password
SECRET_KEY=your-random-secret-key
```

## Compatibility

- Existing `data/paper_trades*.csv` files are untouched.
- Existing `data/strategy_trades.csv` and `data/strategy_price_updates.csv` are untouched.
- No database added.
- CSV structure is preserved.
- Admin protection is added around write/update routes.

## Important route change

`/strategy-lab` is now public read-only.
The editable version is now:

```text
/admin/strategy-lab
```

`/paper-trading` redirects to:

```text
/admin/paper-trading
```
