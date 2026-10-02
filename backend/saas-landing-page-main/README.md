# SaaS Landing Backend

Backend API for our SaaS landing site and its internal team dashboard. Visitors submit a contact form; each submission becomes a lead that the team tracks through three stages (Backend → Frontend → Deployment) with comments and an activity log. The frontends (React + TypeScript) live in separate repos. This repo is the API only.

There is **no email of any kind** (no auto-reply, no notifications) and **no public accounts**. The dashboard is the only way the team sees new requests, and team accounts are created from the command line.

**Docs map**

- [docs/FRONTEND_API.md](docs/FRONTEND_API.md): how to use the API from the landing site and admin dashboard (for frontend developers).
- [ARCHITECTURE.md](ARCHITECTURE.md): how the backend is designed and why (diagrams, data model, security, extending it).
- This file: running, testing and deploying the backend.

**Architecture at a glance:** three parts: landing site (public form), admin dashboard (team only) and this FastAPI API in front of one PostgreSQL database. Routes in `app/api/routes/` stay thin, business rules live in `app/services/`, and every change writes a readable row to an append-only activity log in the same transaction. Overall lead status is computed from its three stages, not stored.

## Tech stack

Python 3.12 · FastAPI · Pydantic v2 · SQLAlchemy 2.0 + Alembic · PostgreSQL (SQLite for quick local runs only) · JWT + argon2 · SlowAPI rate limiting · pytest + httpx

## Local setup

Prerequisite: Python 3.11+ (3.12 recommended). No Docker or database server needed locally; dev uses SQLite.

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt

cp .env.example .env               # then set JWT_SECRET and DATABASE_URL=sqlite:///./dev.db
python -c "import secrets; print(secrets.token_urlsafe(48))"   # use this for JWT_SECRET

alembic upgrade head
uvicorn app.main:app --reload      # http://localhost:8000/docs (docs disabled when ENV=prod)
```

Create the first team user (prompts for the password, 12+ characters):

```bash
python scripts/manage_users.py create --name "Your Name" --email you@company.com
```

## Tests and lint

```bash
pytest                # uses an in-memory SQLite DB; no services required
ruff check .
```

CI (`.github/workflows/ci.yml`) runs both on every push.

## Common commands

| Task | Command |
| --- | --- |
| Run migrations | `alembic upgrade head` |
| New migration after editing models | `alembic revision --autogenerate -m "describe change"` (review the file!) |
| Roll back one migration | `alembic downgrade -1` |
| Tests | `pytest` |
| Lint | `ruff check .` (add `--fix` to auto-fix) |

## Deploying (PostgreSQL)

Local dev uses SQLite; staging and production use PostgreSQL. The app refuses to start with `ENV=staging|prod` on SQLite.

1. **Create a Postgres database.** A managed one is simplest (Neon, Supabase, Render, Railway, or your VPS provider's). Copy its connection string.
2. **Set environment variables on the backend host:**
   - `ENV=prod`
   - `DATABASE_URL=<connection string>`: `postgres://` and `postgresql://` URLs are accepted. If the provider needs TLS, append `?sslmode=require`.
   - `JWT_SECRET=<48+ random characters>`
   - `CORS_ORIGINS=https://yourcompany.com,https://admin.yourcompany.com`
3. **Install and migrate:** `pip install -r requirements.txt` then `alembic upgrade head`.
4. **Start with a single worker** (the rate limiter is in-memory):
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers`
5. **Create the team accounts** with `scripts/manage_users.py` in the server's shell (see below).
6. **Back up the database.** Managed Postgres providers usually do this for you; check that it is enabled.

Vercel is suitable for the two React frontends only. The backend needs a host that keeps a long-running Python process (a VPS, Render, Railway, Fly.io).

## Adding a team member

All account management goes through `scripts/manage_users.py`. Passwords are prompted with `getpass`, never passed as arguments, so they stay out of shell history. There is no signup page and no email-based reset.

```bash
python scripts/manage_users.py create --name "Name" --email name@company.com
python scripts/manage_users.py reset-password --email name@company.com
python scripts/manage_users.py deactivate --email name@company.com
python scripts/manage_users.py list
```

**Run it inside the deployed environment, never from a laptop against the production database:**

- Local: run the commands above in your activated virtualenv (this touches only your local SQLite file).
- Deployed: SSH into the server (VPS) or open the hosting platform's shell for the backend service, activate the app's virtualenv, and run the same commands there.

Onboarding: an existing teammate runs `create` with a temporary password and shares it over a private channel; the new member logs in and changes it via `POST /auth/change-password`. Create the founding team's accounts this way right after the first deploy.

`deactivate` blocks login and invalidates existing tokens immediately but never deletes the user, because comments and activity rows reference them. Create, reset and deactivate each write an audit line to the application log (not to `activity_log`).

## Project structure

```
README.md, ARCHITECTURE.md, .env.example
app/
  main.py          FastAPI app, middleware (CORS, security headers), router wiring
  core/            config (env vars), security (JWT, hashing), limiter, sanitize, logging, constants
  api/
    deps.py        get_current_user (JWT + active-user check)
    routes/        contact, auth, leads, comments, activity, users, health
  models/          SQLAlchemy models (users, leads, lead_stages, comments, activity_log)
  schemas/         Pydantic request/response models and validation
  services/        activity.py (log_activity), leads.py (business rules), users.py
  db/              Base and session
alembic/           migrations
scripts/           manage_users.py
tests/             pytest suite
docs/              FRONTEND_API.md (API guide for frontend developers)
```

## Configuration

Environment variables (see `.env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRE_MINUTES`, `CORS_ORIGINS` (comma-separated landing + admin origins), `ENV` (`dev`/`staging`/`prod`). With `ENV=staging|prod` the app refuses to start on a weak `JWT_SECRET`, SQLite, or empty `CORS_ORIGINS`. Optional: `CONTACT_RATE_LIMIT` (default `5/hour`), `LOGIN_RATE_LIMIT` (default `10/minute`).

Behind a reverse proxy (Render, Fly, etc.) set `FORWARDED_ALLOW_IPS` to the proxy's address so rate limits see real client IPs.

## Frontend notes

- The admin site (`admin.yourcompany.com`) should ship a `noindex` meta tag and a `robots.txt` with `Disallow: /`. The real protection is the backend's JWT, not URL secrecy.
- Activity messages, names and comments are stored as plain text (HTML tags are stripped on input). Render them as text, never as raw HTML.
