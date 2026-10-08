# Backend API (Node.js + MariaDB / MySQL)

The API behind Sparrowgen's contact form and the team dashboard. It is a Node.js rewrite of the earlier
Python/FastAPI backend (still in `../backend/saas-landing-page-main/`, now obsolete) and answers **exactly** like it
(same paths, status codes, messages and error shapes), so `frontend/` and `admin/` run unchanged. It is built to run
on Hostinger's Node.js hosting with a MariaDB/MySQL database. How it was migrated, and how to switch back, is in
`../MIGRATION.md` and `../BACKEND_SWITCH.md`.

| | |
| --- | --- |
| Runtime | Node.js 18.18 or newer (Hostinger offers 18, 20, 22 and 24; use 22) |
| Database | MySQL / MariaDB in production (Hostinger's only database). SQLite for local development and tests |
| Dependencies | One: `mysql2`. HTTP server, password hashing (scrypt), JWT, rate limiting and validation use Node's own modules |
| API contract | [docs/FRONTEND_API.md](docs/FRONTEND_API.md) |
| Deploying | [../DEPLOYMENT_MIGRATION.md](../DEPLOYMENT_MIGRATION.md) |

## Run it locally

```bash
cd backend
cp .env.example .env        # defaults work for local use: no MySQL needed, it uses a SQLite file
npm install                 # installs mysql2 (only needed for MySQL, but it is the one dependency)
npm start                   # http://localhost:8000
```

The first start creates the tables. Create a login for the dashboard (there is no sign-up page):

```bash
node scripts/manage-users.js create --name "Your Name" --email you@example.com
```

Then run the website (`frontend/`, port 3000) and the dashboard (`admin/`, port 3001) with
`NEXT_PUBLIC_API_URL=http://localhost:8000` in each one's `.env.local`.

Local SQLite needs Node 22.5+ (it uses the built-in `node:sqlite`). To use MySQL locally instead, set
`DB_HOST`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` (or `DATABASE_URL=mysql://user:pass@127.0.0.1:3306/db`).

## Tests

```bash
npm test        # needs Node 22.5+; uses an in-memory SQLite database, no network, no installs
```

About 80 tests cover the contact form, login, leads, stages, comments, requirements, the activity feed,
CORS, rate limits, error shapes, the migrations and the account script.

By default the tests run on SQLite. The MySQL driver and the MySQL form of the schema share all the SQL, but
SQLite does not exercise them, so **run the suite once on a real MySQL before launch**:

```bash
# a database whose name contains "test" (every test drops and recreates all tables in it!)
export TEST_DATABASE_URL='mysql://user:password@host:3306/yourprefix_test'     # PowerShell: $env:TEST_DATABASE_URL = '...'
npm run test:mysql        # the same app-level tests, one file at a time, on MySQL
```

Special characters in the password must be URL-encoded (`@` becomes `%40`). The tests refuse to run on a
database whose name does not contain `test`.

## Configuration

Everything is an environment variable (a local `.env` file is read if present; on Hostinger use the web
app's *Environment variables* screen). See `.env.example` for the full list.

| Variable | Meaning |
| --- | --- |
| `NODE_ENV` | `production` turns on the safety checks below. Anything else is development |
| `PORT` | Port to listen on. Hostinger provides it; locally it defaults to 8000 |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | MySQL connection (use `127.0.0.1`, not `localhost`). Or one `DATABASE_URL` |
| `JWT_SECRET` | 32+ random characters. Signs login tokens |
| `JWT_EXPIRE_MINUTES` | Token lifetime, default 60 (no refresh tokens: people sign in again) |
| `CORS_ORIGINS` | Exact website and dashboard origins, comma separated |
| `TRUST_PROXY_HOPS` | Reverse proxies in front of the app, default 1. Needed so rate limits count real visitors |
| `CONTACT_RATE_LIMIT` `LOGIN_RATE_LIMIT` | Defaults `5/hour` and `10/minute` per visitor |
| `EMAIL_CHECK_DELIVERABILITY` | Default `true`: reject contact-form emails whose domain cannot receive mail |
| `AUTO_MIGRATE` | Default `true`: create/upgrade tables on every start (it does nothing when up to date) |

With `NODE_ENV=production` the server refuses to start on a weak `JWT_SECRET`, on SQLite, with no database
configured, or with empty `CORS_ORIGINS`. That is intentional: read the start-up error.

## Layout

```
server.js                 entry file (Hostinger: "Entry file"). server.cjs is a fallback that just starts it.
src/config.js             environment -> settings, production checks
src/http/                 router, CORS, auth, validation, rate limiter
src/routes/index.js       every endpoint
src/services/             business rules (leads, activity, users)
src/db/                   MySQL and SQLite drivers, schema, migrations
src/core/                 passwords + tokens, email checks, text cleaning
scripts/manage-users.js   create / list / reset / deactivate team accounts
scripts/migrate.js        apply migrations without starting the server
scripts/print-schema.js   `npm run schema`: print the whole schema as SQL (fallback for phpMyAdmin)
scripts/parity.mjs        compare this backend with the Python one, request by request
tests/                    node:test suite
```

## Team accounts

There is no sign-up and no "forgot password" email. Accounts are made by whoever deploys the site:

```bash
node scripts/manage-users.js create --name "Full Name" --email person@company.com   # asks for the password
node scripts/manage-users.js list
node scripts/manage-users.js reset-password --email person@company.com
node scripts/manage-users.js deactivate --email person@company.com
node scripts/manage-users.js activate   --email person@company.com
```

Add `--print-sql` to any of them to get SQL for phpMyAdmin instead of touching a database (this is the
easiest route on Hostinger, see `../DEPLOYMENT_MIGRATION.md`). The password is typed at a hidden prompt or piped with
`--password-stdin`; it is never an argument. Users cannot be deleted, only deactivated.

## Database changes

Migrations live in `src/db/migrations.js`. Add a new entry **at the end** of the list (never edit one that
has shipped); it is applied on the next start. The schema is written once and generated for both MySQL and
SQLite.

## What differs from the Python backend

- Passwords are hashed with scrypt (built into Node) instead of argon2. Existing Python password hashes are
  not compatible; the database is new, so accounts are simply created again.
- There is no `/docs` page; `docs/FRONTEND_API.md` is the contract.
- Timestamps always carry a `Z` (UTC) suffix.
- Everything else (endpoints, validation messages, activity messages, rate-limit wording) is the same. This is proved by
  `scripts/parity.mjs`, which sends the same requests to both backends and compares every answer (105 of 105 identical).

## Parity test

```bash
# start the Python and the Node backend on EMPTY databases with RATE_LIMIT_ENABLED=false and EMAIL_CHECK_DELIVERABILITY=false,
# with the same two accounts in each (PARITY_EMAIL as id 1 and priya@example.test as id 2), then:
PARITY_EMAIL=you@example.test PARITY_PASSWORD=... node scripts/parity.mjs http://localhost:8001 http://localhost:8002
```
