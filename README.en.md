**English** | [简体中文](README.md)

# NFLSHC Account Authorization Center (accounts.nflshcchat.cc.cd)

The unified NFLSHC account authorization center: users sign in / register an NFLSHC account here and authorize third-party applications to access their account information (an OAuth-like consent page).

## Pages

| Page | URL | Description |
| --- | --- | --- |
| Sign in | `/index.html` | Account login, password recovery (email code), account appeal |
| Register | `/register.html` | Create a new account (shares the same account system as the main site) |
| Authorize | `/authorize.html?client_id=&redirect_uri=&scope=&state=` | Where third-party apps send users to confirm authorization |
| My authorizations | `/apps.html` | View and revoke authorized applications |

## Authorization flow

1. The developer's app redirects the user to:
   `https://accounts.nflshcchat.cc.cd/authorize.html?client_id=<app-id>&redirect_uri=<callback>&scope=profile%20email&state=<random-string>`
2. After signing in (or registering), the page shows which information the app is requesting, and the user can select each item.
3. The user clicks "Authorize" → the browser is redirected back to `redirect_uri?code=xxx&state=xxx`.
4. The developer's server exchanges `code + client_id + client_secret` at `POST https://worker.nflshcchat.cc.cd/api/oauth/token` for an `access_token`.
5. The developer calls `GET /api/oauth/userinfo` with the `access_token` to read user information (limited to the granted scopes).

For the detailed contract, see `API.md` in the developer platform repository, or visit <https://platform.nflshcchat.cc.cd/guide.html>.

## Security notes

- The account system shares the same D1 database as the nflshcchat main site; passwords are stored as SHA-256 hashes and are never returned by any API.
- Authorization tokens are valid for 2 hours and can be refreshed with a `refresh_token` (30 days); revoking access in "My authorizations" invalidates the token immediately.
- Developers cannot change a user's account status on the main site (ban / freeze / password) through the open-platform APIs.

## Deployment

A pure static site hosted on GitHub Pages with the custom domain `accounts.nflshcchat.cc.cd` (a `CNAME` file in the repository root plus a DNS CNAME record pointing to `user-henry.github.io`).

## Tech stack

Vanilla HTML / CSS / JavaScript — no build step, no third-party dependencies.
- `js/theme.js`: theme management (5 color schemes) + Bearer token storage + request wrapper
- `js/api.js`: API wrapper and common utilities (escaping, SHA-256, toasts, session validation)
- `css/themes.css` / `css/app.css`: theme variables and site styles
