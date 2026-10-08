# Migration: Python (FastAPI + PostgreSQL) to Node.js (MariaDB / MySQL)

**Why.** Hostinger's Node.js hosting cannot run Python, so the backend was rewritten in Node.js with a MariaDB/MySQL
database, which Hostinger offers. The website, SparrowBot and the dashboard are **unchanged**: not one file in `frontend/`
or `admin/` was edited. They talk to the new backend exactly as they talked to the old one.

| | Old (kept, now obsolete) | New |
| --- | --- | --- |
| Folder | `backend/saas-landing-page-main/` | `backend-node/` |
| Language / framework | Python 3.11, FastAPI | Node.js 18.18+ (22 recommended), plain `node:http` |
| Database | PostgreSQL (SQLite for local use) | MariaDB / MySQL (SQLite only for local use and tests) |
| Dependencies | FastAPI, SQLAlchemy, Alembic, argon2, PyJWT, slowapi, email-validator, psycopg | **one**: `mysql2` |
| Where it can run | Render, Railway, Fly, a VPS | Hostinger Business/Cloud Node.js hosting, or anywhere with Node |

The Python code and its tests were **not modified or removed**. They remain as the reference implementation and as the
way back (see `BACKEND_SWITCH.md`).

Related documents: `DEPLOYMENT_MIGRATION.md` (putting the Node backend live on Hostinger), `BACKEND_SWITCH.md`
(switching between the two backends), `backend-node/README.md` and `backend-node/docs/FRONTEND_API.md`.

## 1. How the migration was done

1. Read the whole Python backend (routes, schemas, services, security, tests, `docs/FRONTEND_API.md`) and wrote down its
   exact behaviour: paths, status codes, validation messages, the shape of 422 errors, activity messages, rate-limit wording.
2. Re-implemented it in Node with **only Node's built-in modules** (HTTP server, `crypto` for passwords and JWT, `dns` for
   the email check) plus `mysql2` for the database, so there is nothing native to compile on shared hosting.
3. Ported the Python test suite and extended it (83 tests).
4. Proved the two backends are interchangeable with a **parity test** (section 3).
5. Ran the unchanged website and dashboard against the Node backend on a real MariaDB, and built both for production.

## 2. Endpoints: old to new

The same 16 endpoints, at the same addresses, with the same requests and responses. **No endpoint was added, removed,
renamed or changed**, so the frontend's API-call code needed no change.

| Method | Path | Sign-in | Success | Changed? |
| --- | --- | --- | --- | --- |
| GET | `/health` | no | 200 `{"status":"ok"}` | no |
| POST | `/api/contact` | no | 201 `{message}` | no |
| POST | `/auth/login` | no | 200 `{access_token, token_type}` | no |
| GET | `/auth/me` | yes | 200 user | no |
| POST | `/auth/change-password` | yes | 204 | no |
| GET | `/api/users` | yes | 200 `[{id, name}]` | no |
| GET | `/api/leads` | yes | 200 `{items, total, page, page_size}` | no |
| GET | `/api/leads/{id}` | yes | 200 lead + comments + activity + requirements | no |
| PATCH | `/api/leads/{id}` | yes | 200 `{lead, warnings}` | no |
| DELETE | `/api/leads/{id}` | yes | 204 | no |
| PATCH | `/api/leads/{id}/stages/{stage}` | yes | 200 `{lead, warnings}` | no |
| POST | `/api/leads/{id}/comments` | yes | 201 comment | no |
| POST | `/api/leads/{id}/requirements` | yes | 201 item | no |
| PATCH | `/api/leads/{id}/requirements/{rid}` | yes | 200 item | no |
| DELETE | `/api/leads/{id}/requirements/{rid}` | yes | 204 | no |
| GET | `/api/activity` | yes | 200 `{items, next_before}` | no |

Errors are identical too: `{"detail": "..."}` for 400/401/404, a `detail` list with `loc` and `msg` for 422, and
`{"error": "Rate limit exceeded: 5 per 1 hour"}` for 429.

The only address that disappears is FastAPI's interactive `/docs` page (it was already switched off in production). The
contract is written down in `backend-node/docs/FRONTEND_API.md`.

**What you change to use the new backend is not code but one setting:** `NEXT_PUBLIC_API_URL` in the website and in the
dashboard (for example `https://api.sparrowgen.in`), plus `CORS_ORIGINS` on the backend. If the address `api.sparrowgen.in`
simply points at the Node backend, not even that changes (`BACKEND_SWITCH.md`).

## 3. How it was verified

| Check | Result |
| --- | --- |
| Backend tests on SQLite (`cd backend-node && npm test`) | 83 of 83 pass |
| The same app-level tests on a real **MariaDB 11.8.2** (`npm run test:mysql`) | 64 of 64 pass |
| **Parity test**: the same 105 requests sent to the Python backend and the Node backend, every answer compared (status, body, key headers, error messages) | **105 of 105 identical**, Node on SQLite and again with Node on MariaDB |
| Website booking form, as a visitor: typo email refused with "Did you mean @gmail.com?", then accepted, success screen; the real DNS email check on | works; stored correctly in MariaDB including `₹` and `→` |
| Dashboard in a browser: wrong password message, sign in, lead list, open a lead, add and tick a requirement, post a comment, change a stage, assign an owner, activity feed, delete the lead | works; the delete removed every related row |
| Production builds (`npm run build`) of the website and the dashboard, then `npm start` | both build with no warnings and serve; the dashboard is still `noindex` with `Disallow: /` |
| SparrowBot tests (`cd frontend && npm run test:bot`) | 30 of 30 pass (the bot runs in the browser and never calls the backend) |

**Bugs the verification found and fixed in the new backend:** a hidden byte-order mark that Windows PowerShell adds to piped
text (made accounts created with `--password-stdin` unable to sign in); the Python rule that rejects reserved email domains
such as `.test`; the exact browser pre-flight (CORS) reply and header list; the position reported for malformed JSON; and a
missing `Vary: Origin` header.

**Re-run it yourself**, from `backend-node/`:

```bash
npm test                                   # 83 tests on SQLite
TEST_DATABASE_URL="mysql://user:pass@127.0.0.1:3306/sparrowgen_test" npm run test:mysql   # on MariaDB/MySQL
# parity: start both backends on EMPTY databases (rate limits and the DNS check off), then
PARITY_EMAIL=you@example.test PARITY_PASSWORD=... node scripts/parity.mjs http://localhost:8001 http://localhost:8002
```

The parity script's header explains the set-up (both backends fresh, the same two accounts in each).

## 4. What is different inside (invisible to the website and dashboard)

| Area | Python backend | Node backend |
| --- | --- | --- |
| Password hashing | argon2 | scrypt (built into Node). Old hashes do not verify; accounts are created again |
| Login tokens | JWT HS256 | JWT HS256, same claims (`sub`, `iat`, `exp`). Tokens are **not** interchangeable between backends because each has its own `JWT_SECRET` |
| Database changes | Alembic migrations | built-in migrations in `src/db/migrations.js`, applied on every start (`AUTO_MIGRATE`) |
| Creating accounts | `scripts/manage_users.py` | `scripts/manage-users.js`, with `--print-sql` to produce SQL for phpMyAdmin |
| Timestamps | with `Z` on PostgreSQL, without on SQLite | always with `Z` (UTC) |
| Interactive docs | `/docs` (off in production) | none |
| Process model | any number of workers | one process (the rate limiter keeps its counters in memory, same as before) |

### Settings: old name to new name

| Python (`.env`) | Node (`.env` / hPanel variables) |
| --- | --- |
| `ENV=prod` | `NODE_ENV=production` |
| `DATABASE_URL=postgresql://...` | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (or `DATABASE_URL=mysql://user:pass@host:3306/db`) |
| `JWT_SECRET`, `JWT_EXPIRE_MINUTES` | same names |
| `CORS_ORIGINS` | same name |
| `CONTACT_RATE_LIMIT`, `LOGIN_RATE_LIMIT`, `RATE_LIMIT_ENABLED` | same names |
| `EMAIL_CHECK_DELIVERABILITY` | same name |
| `FORWARDED_ALLOW_IPS=*` | `TRUST_PROXY_HOPS=1` (number of proxies in front of the app) |
| start command `alembic upgrade head && uvicorn ...` | `node server.js` (entry file `server.js`); migrations run by themselves |
| (none) | `PORT` (the host supplies it; locally 8000), `AUTO_MIGRATE` |

### Database tables

The same seven tables and columns (`users`, `leads`, `lead_stages`, `comments`, `activity_log`, `requirements`, plus
`schema_migrations` in place of Alembic's `alembic_version`). Text is `utf8mb4`, times are stored as UTC `DATETIME(3)`,
and booleans as `TINYINT(1)`. Foreign keys are enforced (10 of them).

## 5. Data

**Nothing is carried over between the two databases**, by design: the new database starts empty. Leads, comments,
requirements, activity and **dashboard accounts** in the PostgreSQL database stay there. After switching, create the team's
accounts again with `scripts/manage-users.js` (`DEPLOYMENT_MIGRATION.md`, section 8). If the live Python site already holds
real leads, export them from PostgreSQL first; no import tool was written.

## 6. Going back

The Python backend is still in the repository. To return to it, point the website and dashboard at it and recreate its
accounts: the step-by-step is in **`BACKEND_SWITCH.md`**. Python needs a host that runs it (Render, Railway, Fly, a VPS);
Hostinger's Node plans cannot.

## 7. Not done yet

- **Deployed on Hostinger:** not yet. Everything above ran on a developer's computer. The list of Hostinger details to
  confirm (plan limits, the port, the number of proxies, the database version, SSH) is `DEPLOYMENT_MIGRATION.md`, section 14.
- **Hostinger's database version:** tested on MariaDB 11.8.2; check the version shown in phpMyAdmin and repeat
  `npm run test:mysql` against it.
- **Domain, email and the Hostinger plan:** `sparrowgen.in` is planned but not bought; see `REBRAND.md` for what to update.
- **Roles, outgoing email, and logging unanswered SparrowBot questions** were never part of the backend and are not added.

## 8. What was added in this migration

```
backend-node/                the new backend (source, 83 tests, scripts, docs)
tools/package.mjs            bundles each app into an upload archive for Hostinger
MIGRATION.md                 this file
DEPLOYMENT_MIGRATION.md      deployment on Hostinger
BACKEND_SWITCH.md            switching between the two backends
.gitignore                   one added line (dist/)
```

Nothing else in the repository was changed: `frontend/`, `admin/`, `backend/saas-landing-page-main/`, `DEPLOYMENT.md`,
`REBRAND.md`, `BOT.md` and `netlify.toml` are exactly as they were.
