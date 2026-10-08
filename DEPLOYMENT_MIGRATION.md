# Deployment guide: Node.js backend on Hostinger

This is the deployment guide for the **Node.js + MariaDB/MySQL backend** (`backend-node/`) together with the website and
dashboard, on **Hostinger's Node.js hosting**. It replaces the route in `DEPLOYMENT.md` (Python/FastAPI + PostgreSQL on Render),
which stays in the repository as the obsolete original: Hostinger cannot run Python. How the move was made, and how to go back,
is in `MIGRATION.md`; switching between the two backends is in `BACKEND_SWITCH.md`.

The brand is **Sparrowgen** (chat assistant **SparrowBot**), planned domain **sparrowgen.in**; where those names live is in
`REBRAND.md`. The repository's `netlify.toml` belongs to the earlier plan of hosting the website on Netlify; it does nothing
when the website runs on Hostinger and can stay.

**What has and has not been tested.** Verified on a developer's computer: the 83 backend tests on SQLite, the 64 app-level
tests on a real MariaDB 11.8, a parity test that sent 105 identical requests to the old Python backend and the new Node
backend and found identical answers, and a full run of the unchanged website and dashboard against the Node backend on
MariaDB. **Nothing has been deployed to a real Hostinger account yet**, so treat the hPanel screens, names and limits below as a
starting point and verify them as you go. Items marked ⚠️ are things that will bite if missed. Section 14 lists everything
that could not be confirmed in advance.

## Quick path: the whole job in 12 steps

| # | Step | Where | Details |
| --- | --- | --- | --- |
| 1 | Confirm the plan allows 3 Node.js apps, and that the domain is connected | hPanel | section 1 and 2 |
| 2 | Create the MariaDB/MySQL database and its user, note the 5 values and the version | hPanel, Databases | section 4.2 |
| 3 | Build the upload archives on your computer: `node tools/package.mjs` | your computer | section 3 |
| 4 | Create the **API** Node.js app, upload `backend-node.tar.gz`, set the environment variables | hPanel | section 5 |
| 5 | Start it and read the log: `applied migration 0001_initial`. Open `/health` | hPanel, runtime logs | section 5.3 |
| 6 | **Create the first admin account** (name, email, password) with `--print-sql` and phpMyAdmin | your computer + phpMyAdmin | section 8 |
| 7 | Create the **website** app and the **dashboard** app (set `NEXT_PUBLIC_API_URL` before the first deploy) | hPanel | sections 6 and 7 |
| 8 | Attach the three domains and check HTTPS on each | hPanel | section 9 |
| 9 | Put the exact website and dashboard addresses into the API's `CORS_ORIGINS`, restart the API | hPanel | section 10 |
| 10 | Run the smoke tests, including a real lead and a real sign-in | browser | section 12 |
| 11 | Recommended: run the automated tests against a `..._test` database on Hostinger | your computer | section 4.6 |
| 12 | Work through the launch checklist (names, email, placeholders, legal) | repository | section 11 |

**Three things only the engineer can do** (nobody else can do them for you): create the database and its password in hPanel,
choose the admin password, and set the environment variables on each app. None of these values go in the repository.

## 1. What you are deploying

Three separate Node.js apps and one MySQL database, on one Hostinger hosting plan:

```
sparrowgen.in        → website      (frontend/)  Next.js   → Node.js web app #1
admin.sparrowgen.in  → dashboard    (admin/)     Next.js   → Node.js web app #2
api.sparrowgen.in    → API          (backend-node/)   Node.js   → Node.js web app #3
                                                   └─ MySQL database (hPanel → Databases)
```

One domain is enough: `admin.` and `api.` are subdomains you add in hPanel at no extra cost.

| Folder | What it is | Needs |
| --- | --- | --- |
| `frontend/` | Public site, "Book a project" form, SparrowBot (runs in the visitor's browser, nothing extra to host) | Node 20.9+ (Next 16). Choose Node 22 |
| `admin/` | Team dashboard. Has one dynamic page (`/leads/[id]`), so it is a Node app, not static files | Node 20.9+. Choose Node 22 |
| `backend-node/` | The API for both. Express-free Node server, one dependency (`mysql2`) | Node 18.18+. Choose Node 22 |

Details of each app: `frontend/README.md`, `admin/README.md`, `backend-node/README.md`, and the API contract in
`backend-node/docs/FRONTEND_API.md`.

### What Hostinger supports (from its documentation)

- **Node.js web apps need a Business Web Hosting or a Cloud plan** (Cloud Startup, Professional, Enterprise).
  Cheaper shared plans do not run Node apps. VPS plans do, but need manual command-line setup (not covered here).
- **Node versions 18, 20, 22 and 24.** Frameworks are auto-detected (Next.js, Express and others); anything else is
  deployed as "Other" with a manual entry file.
- **Deploy methods:** GitHub integration (rebuilds on every push), upload an archive (`.zip`, `.tar`, `.tar.gz`, `.tgz`),
  or the Hostinger Connector for VS Code. The project needs a `package.json` and Hostinger runs `npm` for you
  during the deploy.
- **Database: MySQL only.** PostgreSQL and MongoDB are not available on these plans. That is why the backend was
  rewritten for MySQL.
- **Environment variables** are set per app in hPanel. After changing one, press **Restart** on the app.
- ⚠️ **Files under `hbuilds/` and `public_html/` are overwritten on every deploy.** Never keep data or uploads there.
  (This project writes nothing to disk in production; everything is in MySQL.)
- ⚠️ **You need three Node.js apps.** Check how many your plan allows before buying.

## 2. Before you start

- [ ] Hosting plan with Node.js web apps (see above) and room for three apps.
- [ ] A domain, connected to the hosting plan (hPanel → Domains).
- [ ] The repository on GitHub (needed for GitHub deploys; optional if you upload archives).
- [ ] Node 22 on your own computer, to build and test before uploading (`node -v`).
- [ ] A password manager. You will generate a JWT secret, a database password and the first admin password.

## 3. Order of work

1. The MariaDB/MySQL database (section 4: you need its name, user and password for the API)
2. API app (you need its URL for the other two)
3. Website and dashboard apps (each needs the API URL **at build time**)
4. Back to the API: set `CORS_ORIGINS` to the exact website and dashboard addresses, restart
5. Create the first admin account: name, email and password (section 8)
6. Smoke-test (section 12) and work through the launch checklist (section 11)

### How to get each app onto Hostinger

⚠️ Hostinger's documentation expects the app's `package.json` at the **root** of what it deploys and does not
describe choosing a subfolder of a repository. This repository holds three apps, so pick one of these and
**check which works on your account before planning around it**:

1. **Upload archives (recommended, works whatever the GitHub integration allows).** From the repo root run
   `node tools/package.mjs`. It writes `dist/frontend.tar.gz`, `dist/admin.tar.gz` and `dist/backend-node.tar.gz`, each with
   `package.json` at the top level and without `node_modules`, build output or secrets. Upload one per app
   (hPanel → Add website → Node.js Apps → upload your website files). Redeploy by running the script again and
   re-uploading. `node tools/package.mjs backend-node` packs just one app.
2. **GitHub import of the whole repository**, if the import screen lets you set a root/sub directory per app. Then
   pushes redeploy automatically. One hosting plan can connect to only one GitHub account.
3. **One repository per app.** Split the folders into three repositories and import each normally.

## 4. Database (MariaDB / MySQL)

Hostinger's managed database is called **MySQL** in hPanel. The backend works with MySQL and with MariaDB (the same family,
and the one it was tested on: MariaDB 11.8.2). You do not install anything: you create the database in hPanel and give the
API its connection details.

### 4.1 How the backend uses the database

```
visitor's browser --> website   --+
                                    +--> API (Node.js, backend-node/) --> MariaDB / MySQL
team's browser    --> dashboard --+
```

- **Only the API talks to the database.** The website and the dashboard never connect to it, and the database is not
  reachable from the internet.
- **Connection:** the API opens a small pool (up to 5 connections) with the `mysql2` package, using the values in its
  environment variables (section 5.1).
- **Tables are created by the API itself** the first time it starts, and upgraded on later starts when a new version needs a
  change. This is called a migration. When there is nothing new it does nothing. You do not write SQL for this
  (a manual fallback exists, section 4.7).
- **Safe changes:** anything that touches several tables at once (for example creating a lead with its three stages and its
  first activity entry) runs as one transaction: it all saves or none of it does.
- **Text and times:** tables use `utf8mb4` (so names, rupee signs and arrows are safe) and the InnoDB engine. Times are stored
  in UTC and are written by the API, not by the database.
- **Passwords** are stored only as hashes (scrypt). Nobody, including the engineer, can read a password back from the database.
- **What is not stored:** no files or uploads, no login tokens (they are signed and checked, not saved), no emails (the system
  sends none).

| Table | What it holds | Notes |
| --- | --- | --- |
| `users` | Team accounts: `name`, `email` (the sign-in name, unique), `password_hash`, `is_active` | Accounts are never deleted, only deactivated |
| `leads` | One row per booking form: contact details, business type, project type, budget, message, consent, owner, times | Created by the website's form |
| `lead_stages` | Exactly three rows per lead (`backend`, `frontend`, `deployment`) with a status and an assignee | |
| `requirements` | The client's requirements per stage, ticked off when delivered (who ticked it, and when) | |
| `comments` | Team notes on a lead, optionally tied to a stage | Cannot be edited |
| `activity_log` | A readable sentence for every change ("Priya moved Backend: pending to in progress") | Only ever added to; removed only when its lead is deleted |
| `schema_migrations` | Which database versions have been applied | Leave it alone |

The data is plain text and small: thousands of leads fit in a few megabytes.

### 4.2 Create the database in hPanel

1. In hPanel open the website's dashboard, then **Databases**, then **MySQL Databases**.
2. Choose **Create database**, enter a name and confirm. Hostinger adds a prefix, so the real name looks like
   `u123456789_sparrowgen`. A database **user** is created for it as well.
3. Set (or note) the user's **password**. Use a password manager: this password goes into the API's environment variables
   and nowhere else. (If you lose it: **Databases, MySQL Users, Change Password**, then update the API's `DB_PASSWORD` and restart.)
4. Make sure that user has **all privileges** on this database. It needs them because the API creates and changes the tables.
5. Open **phpMyAdmin** (next to the database) and note the **server version** it shows (MariaDB or MySQL, and the number).

Write these values down in the password manager. You will need them in section 5.1:

| Value | Example | Your value |
| --- | --- | --- |
| `DB_HOST` | `127.0.0.1` (`localhost` if that is refused) | |
| `DB_PORT` | `3306` | |
| `DB_NAME` | `u123456789_sparrowgen` | |
| `DB_USER` | `u123456789_sparrowgen` (often the same as the name) | |
| `DB_PASSWORD` | (from the password manager) | |
| Server version | `11.8.x-MariaDB` or `8.x MySQL` | |

⚠️ Use `127.0.0.1` rather than `localhost` for the Node app: Node resolves `localhost` to the IPv6 address and the
connection can be refused. One Hostinger article shows `localhost` for Node apps, so if `127.0.0.1` is refused try `localhost`.

### 4.3 Give the API the connection details

Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` as environment variables on the **API app** (section 5.1) and
restart it. Prefer these five over a single `DATABASE_URL`: a password with characters such as `@` or `#` must be URL-encoded
inside a URL, and mistakes there are hard to spot. Never put these values in a file in the repository.

### 4.4 First start: the tables appear

When the API starts for the first time its runtime log shows:

```
INFO db applied migration 0001_initial
INFO api listening on port ... (production, mysql)
```

Check in phpMyAdmin (select the database in the left tree): there should be **7 tables** (`users`, `leads`, `lead_stages`,
`comments`, `activity_log`, `requirements`, `schema_migrations`), all InnoDB. Then run, on the SQL tab:

```sql
SELECT * FROM schema_migrations;
```

It must list `0001_initial`. On every later start the log says `schema is up to date`.

### 4.5 Using phpMyAdmin day to day

phpMyAdmin is for **looking and for backups**. The dashboard is the tool for changing leads.

- **Look at the data:** click a table, then **Browse**.
- **Useful read-only queries** (SQL tab):

  ```sql
  SELECT id, full_name, email, budget, created_at FROM leads ORDER BY id DESC LIMIT 20;
  SELECT id, name, email, is_active FROM users;
  SELECT COUNT(*) FROM leads;
  ```

- **Do not edit or delete lead rows by hand.** The tables are linked (a lead owns its stages, comments, requirements and
  activity), so manual changes leave the dashboard inconsistent. Use **Delete this request** on the dashboard.
- **The one routine write** you do in phpMyAdmin is running the account SQL from section 8.
- **Back up:** select the database, **Export**, format **SQL**, **Go**. Keep the file somewhere private (it contains personal
  data of people who filled in the form). **Restore:** **Import** the same file into an empty database.

### 4.6 Recommended: run the automated tests against Hostinger's database

The backend's tests have passed on MariaDB 11.8.2 on a developer's computer. Hostinger's version may differ, so repeat them
once against Hostinger itself:

1. Create a **second** database whose name contains `test` (for example `u123456789_sparrowgen_test`), as in 4.2.
2. **Databases, Remote MySQL**: add your computer's public IP and note the remote host name it shows (like `srv1234.hstgr.io`).
3. On your computer, in `backend-node/` (after `npm install`), with your real values (URL-encode special characters in the password):

   ```bash
   export TEST_DATABASE_URL='mysql://USER:PASSWORD@srv1234.hstgr.io:3306/u123456789_sparrowgen_test'
   npm run test:mysql
   ```

   (PowerShell: `$env:TEST_DATABASE_URL = '...'`.)
4. **Pass** means the API works on Hostinger's database. A failure message should be sent to the developer.
5. **Remove your IP from Remote MySQL afterwards**, and close the terminal.

⚠️ Every test drops and recreates all tables in the database you point it at. The tests refuse to run unless the database name
contains `test`. Never point `TEST_DATABASE_URL` at the real database.

### 4.7 If the API cannot create the tables (manual fallback)

If the API's log shows a permission error when it starts (for example `CREATE command denied`), the database user is not allowed
to create tables. Fix the privileges (4.2 step 4). If that is impossible, create the tables by hand:

1. On your computer, in `backend-node/`: `npm run schema`. It prints the complete schema as SQL, including the line that records
   the migration as applied.
2. In phpMyAdmin, on the **empty** database, open the **SQL** tab, paste the whole output and press **Go**.
3. Set `AUTO_MIGRATE=false` on the API app and restart it. The API then never changes the schema itself.

This was tested: the printed SQL builds the same 7 tables and 10 foreign keys the API creates, and the API treats the result as
up to date. The cost of this route is that **future versions that change the tables need new SQL applied by hand** (the
developer provides it with the release).

### 4.8 Changing the database later, and backups

- A new version that needs table changes ships a new migration; the API applies it on the next start (unless `AUTO_MIGRATE=false`).
  **Export the database from phpMyAdmin first** (4.5).
- Turn on and check Hostinger's own backups for the plan, and how long they are kept. This is not confirmed in advance
  (section 14), so do not rely on it alone: also export the database on a regular schedule (for example weekly) and before every
  change. The leads are the business's data.

### 4.9 Limits and sizing

Hostinger publishes per-plan limits, for example a database size cap of about 3 GB on web plans and 6 GB on cloud plans, and a
cap on connections per user (50 on a web plan, more on cloud). The API uses at most 5 connections, and the data is text, so
neither limit is a concern. Check the numbers for your plan on Hostinger's "parameters and limits of hosting plans" page.

### 4.10 Security of the database

- The database user should have rights on **this one database only**, never an account with wider access.
- Keep **Remote MySQL switched off** except during a test (4.6), and remove your IP afterwards.
- The credentials live only in the API app's environment variables. To rotate the password: change it under **MySQL Users**,
  update `DB_PASSWORD`, restart the API.
- Personal data of people who filled in the form lives here and in exports: store exports privately, and see the privacy policy.

### 4.11 Database troubleshooting

| What the API's log shows | Meaning and fix |
| --- | --- |
| `ECONNREFUSED` | Wrong `DB_HOST` or `DB_PORT`, or `localhost` instead of `127.0.0.1` (try the other one) |
| `ER_ACCESS_DENIED_ERROR` | Wrong `DB_USER` or `DB_PASSWORD` (copy them again from the password manager) |
| `ER_BAD_DB_ERROR` (unknown database) | `DB_NAME` is wrong: use the full prefixed name |
| `ER_DBACCESS_DENIED_ERROR` or `CREATE command denied` | The user lacks privileges on this database: fix them (4.2) or use the manual fallback (4.7) |
| `Database is not configured` | The `DB_*` variables are missing on the API app. Add them and restart |
| `Too many connections` | Another app is using the same database user. Give the API its own database and user |
| Question marks or odd characters in names | A table was created by hand with another character set: recreate it with `npm run schema` on an empty database |

## 5. The API (`backend-node/`)

Create a Node.js app, upload `backend-node.tar.gz`, then use these settings:

| Setting | Value |
| --- | --- |
| Node version | 22 |
| Framework | Express.js or "Other" (there is no framework: it is plain Node) |
| Entry file | `server.js` (fallback: `server.cjs`, which just starts it) |
| Build command | none (Hostinger installs the dependencies) |
| Domain | `api.sparrowgen.in` |

### 5.1 Environment variables

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `3306` |
| `DB_USER` | the database user from section 4 |
| `DB_PASSWORD` | its password |
| `DB_NAME` | the database name |
| `JWT_SECRET` | 48+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `CORS_ORIGINS` | `https://sparrowgen.in,https://admin.sparrowgen.in` (exact origins, `https`, no trailing slash, no paths) |
| `TRUST_PROXY_HOPS` | `1` (see 5.2) |
| `JWT_EXPIRE_MINUTES` | optional, default `60`. There is no refresh token, so people sign in again after this |
| `CONTACT_RATE_LIMIT` / `LOGIN_RATE_LIMIT` | optional, defaults `5/hour` and `10/minute` per visitor |
| `EMAIL_CHECK_DELIVERABILITY` | optional, default `true`. Rejects contact-form emails whose domain cannot receive mail. Set `false` only if the host blocks outbound DNS |
| `PORT` | leave unset (see the warning below) |

A single `DATABASE_URL=mysql://user:password@127.0.0.1:3306/dbname` can replace the five `DB_*` values.
Never put the real values in the repository. Restart the app after changing any of them.

⚠️ With `NODE_ENV=production` the API **refuses to start** on a weak `JWT_SECRET` (under 32 characters), with no
database configured, with SQLite, or with empty `CORS_ORIGINS`. That is intentional: read the start-up error in the
app's runtime logs.

⚠️ `PORT`: the API listens on the `PORT` Hostinger provides, and falls back to 8000 if there is none. Hostinger's
documentation does not say how the port is supplied. After the first start, read the runtime log line
`api listening on port N`. If the app is not reachable, ask Hostinger which port the app must use and set `PORT` to it.

### 5.2 ⚠️ Rate limiting needs the real visitor address

Limits are counted per visitor address. Hostinger puts a proxy in front of the app, so the API reads the address from
`X-Forwarded-For`, trusting `TRUST_PROXY_HOPS` proxies. Too low and the whole world appears to be one visitor, so
real customers see "Too many submissions". Too high and a visitor can fake their address. Start with `1` and
**verify with smoke test 5 (section 12)**; change it to `2` or `0` if the test shows otherwise.

The limiter keeps its counters in memory, which is fine because Hostinger runs one process per Node app. If you
ever scale to several processes the limits stop working correctly (they would need a shared store first).

### 5.3 First start

Start (or restart) the app and open its runtime logs. You should see:

```
INFO db applied migration 0001_initial
INFO api listening on port ...
```

Then `https://api.sparrowgen.in/health` must answer `{"status":"ok"}`. On every later start the log says
`schema is up to date`; migrations only run when there is something new. In phpMyAdmin you will now see the
tables `users`, `leads`, `lead_stages`, `comments`, `activity_log`, `requirements` and `schema_migrations`.

## 6. The website (`frontend/`)

| Setting | Value |
| --- | --- |
| Node version | 22 |
| Framework | Next.js (auto-detected) |
| Install / build | `npm install` / `npm run build` (the defaults) |
| Environment variable | `NEXT_PUBLIC_API_URL` = `https://api.sparrowgen.in` (no trailing slash) |
| Domain | `sparrowgen.in` (add a `www` redirect if you like) |

⚠️ `NEXT_PUBLIC_*` variables are **baked in at build time**. Set the variable **before** the deploy, and a later change
needs a **redeploy**, not just editing the variable and restarting. If it is empty the site silently falls back to a
mock and form submissions go nowhere: check this first if leads stop arriving.

All backend calls are in `src/lib/api.ts`. Page text, names, prices and contact details are in `src/lib/site.ts`.
SparrowBot's answers are in `src/lib/bot/sparrowbot.json` (see `BOT.md`); it runs in the browser and needs nothing from
the server.

## 7. The dashboard (`admin/`)

Same as section 6, with:

| Setting | Value |
| --- | --- |
| Environment variable | `NEXT_PUBLIC_API_URL` = the same API address (set before the deploy) |
| Domain | `admin.sparrowgen.in` |

### Keeping the dashboard private

- It is a **separate app on its own subdomain**. The public website contains no dashboard code and no login.
- It ships `noindex` meta tags and a `robots.txt` with `Disallow: /`. Keep it that way and **do not link to it** from
  the public site.
- Hiding the address is not security. The real protection is the API: every dashboard call needs a login token, and
  a deactivated person's token stops working immediately. Tokens are kept in `sessionStorage` (cleared when the tab
  closes) and expire after `JWT_EXPIRE_MINUTES`.
- Only the website and dashboard origins may call the API from a browser (`CORS_ORIGINS`). Keep that list exact.
- Optional second gate: put Cloudflare Access (or similar) in front of `admin.` if your DNS is on a provider that
  offers it. Do not rely on Hostinger's directory password-protection for a Node app unless you have tested that it
  works on one.
- There are **no roles**: every team account can do everything, including permanently deleting leads. Create accounts
  only for people you trust with that, and **deactivate leavers** (section 8).

## 8. Team accounts: how the engineer creates the admin name, email and password

There is **no sign-up page and no "forgot password" email**, on purpose: nobody can create an account except the engineer.
Accounts are made with the script `backend-node/scripts/manage-users.js`.

### 8.1 What an account is

| Field | What it is | Rules |
| --- | --- | --- |
| **Name** | The label shown in the dashboard and in the activity history (for example `dev.admin` or `Priya`) | Required. HTML is stripped |
| **Email** | The **sign-in name**. People sign in with their email address | Required, unique, stored in lower case. A copy with different capitals is the same account |
| **Password** | Used to sign in | **12 to 128 characters.** Stored only as a hash: it cannot be read back, only reset |

⚠️ **There is no separate "username".** If someone says "username", it is the email address. The name is just a display label.

Every account can do everything in the dashboard, including permanently deleting leads (there are no roles). Create accounts only
for people you trust with that, and **deactivate leavers**.

### 8.2 What you need

- A computer with **Node.js 18.18 or newer** (`node -v`) and a copy of the repository (the `backend-node/` folder).
- For method A below (recommended): **nothing else**. No `npm install`, and no connection to the database.
- The API must have started once, so the tables exist (section 4.4).
- A strong password from the password manager. **Do not paste the password into chat, email or a ticket.**

The three ways of working (use **A** unless you have a reason not to):

### A. Generate SQL, then paste it into phpMyAdmin (recommended)

Nothing on your computer connects to the database. The script prints a line of SQL that contains a **hash** of the password, never
the password itself.

1. Open a terminal in the repository and go into `backend-node/`:

   ```bash
   cd backend-node
   node scripts/manage-users.js create --name "dev.admin" --email dev.admin@sparrowgen.in --print-sql
   ```

2. When it asks, type the password twice (nothing is shown while you type). It needs 12 to 128 characters.
3. It prints something like this (the hash here is shortened; the real one is about 130 characters):

   ```sql
   -- Paste into phpMyAdmin (SQL tab) on the production database:
   INSERT INTO users (name, email, password_hash, is_active, created_at) VALUES ('dev.admin', 'dev.admin@sparrowgen.in', 'scrypt$32768$8$1$...$...', 1, '2026-10-08 15:19:54.693');
   ```

4. In hPanel open **Databases, phpMyAdmin**, select the database in the left tree, open the **SQL** tab, paste the whole
   `INSERT` line and press **Go**. It reports `1 row inserted`.
5. Check it, on the SQL tab: `SELECT id, name, email, is_active FROM users;` (one row, `is_active` = 1).
6. Open the dashboard (`https://admin.sparrowgen.in`) and sign in with the **email** and the password you typed.
7. Ask the person to change their password on the dashboard's **Account** page.

Notes:
- On **Windows PowerShell** this works as it is. (Piping a password with `--password-stdin` also works: the script ignores the
  invisible marker PowerShell adds to piped text. Older versions of this script did not, and such an account could not sign in.)
- Run the command **once per person**. Running the same `INSERT` twice fails with a duplicate-email error: that is harmless.
- The script checks the rules before printing anything, so a short password or a missing name is rejected on your computer.

### B. Run the script against the live database from your computer

Use this only if you prefer the script to do the work itself.

1. hPanel, **Databases, Remote MySQL**: allow your computer's IP and note the remote host name.
2. In `backend-node/` run `npm install` once, then (bash):

   ```bash
   DB_HOST=srv1234.hstgr.io DB_USER=<user> DB_PASSWORD='<password>' DB_NAME=<database> \
     node scripts/manage-users.js create --name "Full Name" --email person@company.com
   ```

   On Windows PowerShell set the values first (`$env:DB_HOST = "..."` and so on) instead of the one-line form.
3. **Remove your IP from Remote MySQL afterwards**, and do **not** save these values in a `.env` file: a later local `npm start` would
   then run against the live database.

### C. Over SSH on the server (if it works on your plan)

Hostinger states that `npm` commands cannot be run over SSH. Whether the plain `node` command is available there is unconfirmed.
If it is: connect, `cd` into the API app's folder and run `node scripts/manage-users.js create ...` (without `--print-sql`). If
not, use A.

### 8.3 Day-to-day account tasks

| Task | Command (add `--print-sql` for method A) | What method A prints |
| --- | --- | --- |
| Add a person | `node scripts/manage-users.js create --name "Name" --email x@y.com` | `INSERT INTO users ...` |
| List accounts | `node scripts/manage-users.js list` | method A: `SELECT id, name, email, is_active FROM users;` in phpMyAdmin |
| Forgotten password | `node scripts/manage-users.js reset-password --email x@y.com` | `UPDATE users SET password_hash = '...' WHERE email = 'x@y.com';` |
| Someone leaves | `node scripts/manage-users.js deactivate --email x@y.com` | `UPDATE users SET is_active = 0 WHERE email = 'x@y.com';` |
| Let them back in | `node scripts/manage-users.js activate --email x@y.com` | `UPDATE users SET is_active = 1 WHERE email = 'x@y.com';` |

Accounts are never deleted, only deactivated (old activity keeps showing their name). A deactivated person is blocked
immediately, even if they are signed in.

### 8.4 Handling passwords safely

- Make passwords with the password manager (long and random). Give each person their password through a private channel, never
  a shared chat or email thread, and ask them to change it at first sign-in (Account page).
- Do not keep a list of passwords. If one is forgotten, reset it (8.3) and share the new one privately.
- The runtime logs record who created or changed an account (`app.audit` lines) but **never** a password.
- Sign-ins are rate limited (10 attempts a minute per visitor), and wrong passwords and unknown emails give the same message.

### 8.5 If someone cannot sign in

| What they see | Likely cause |
| --- | --- |
| "Invalid email or password" | A typo, or the account does not exist **in this database**, or it is deactivated (`SELECT is_active FROM users WHERE email = '...';`) |
| The same, for an account you just made | It was created on another database (a local one) or against another backend, or the password typed at the prompt differs from the one being used |
| "Invalid email or password" for everybody | The dashboard is calling a different API: check `NEXT_PUBLIC_API_URL` (it needs a redeploy) |
| A rate-limit message | More than 10 attempts in a minute. Wait a minute |
| Page cannot reach the server / CORS error | `CORS_ORIGINS` is missing the dashboard's exact address, or the API was not restarted |

### 8.6 Checklist: the first admin on the live site

1. API `/health` answers `{"status":"ok"}` and the log shows `applied migration 0001_initial`. phpMyAdmin shows the 7 tables.
2. Create the account with method A (above): name, email, and a password-manager password.
3. Confirm with `SELECT id, name, email, is_active FROM users;`.
4. Sign in at the dashboard. If the page cannot reach the API, check `NEXT_PUBLIC_API_URL` (needs a redeploy) and `CORS_ORIGINS`
   (needs a restart).
5. Change the password on the Account page if someone else typed the first one.
6. Add the rest of the team, one account each. Delete any local test logins (such as a development `dev.admin` account) from your
   notes: **a local test account is never reused on the live site**.

## 9. DNS and HTTPS

Add the subdomains in hPanel and attach each app to its domain: `sparrowgen.in` → website, `admin.` → dashboard,
`api.` → API. Hostinger manages the DNS records when the domain is on the same account; otherwise create the records it
shows you at your registrar. Use `https://` everywhere: the API sends HSTS, and browsers block mixed content.
Confirm that a certificate is issued for each name (the padlock) before moving on.

## 10. Wiring it together

After the three addresses exist: set the API's `CORS_ORIGINS` to exactly
`https://sparrowgen.in,https://admin.sparrowgen.in` (add `https://www.sparrowgen.in` if you serve `www`
directly) and **restart the API**. A missing origin shows up as a CORS error in the browser console and a form or login
that "does nothing". Only `GET`, `POST`, `PATCH` and `DELETE` are allowed.

## 11. Before launch

### 11.1 Someone has to watch the dashboard

The system sends **no email or notification**. New requests show up only on the dashboard's Leads page, so decide who
checks it and how often. The site promises "we reply within 24 hours".

### 11.2 Placeholder content to replace

All in `frontend/src/lib/site.ts` unless noted. Search for these before launch:

- The brand name, email, WhatsApp numbers, Instagram handle and website address. The exact files are listed in `REBRAND.md`
  (the website's `brand`, the dashboard's own copy, the legal pages). Set the real domain and the real email before launch.
  ⚠️ The "WhatsApp us" button builds a `wa.me` link from these.
- The same contact details in SparrowBot: `frontend/src/lib/bot/sparrowbot.json` (`contact`), and every price, timeline and
  policy line in it. They are placeholders. See `BOT.md`.
- Claims: "Live in 1 week", "Landing pages in 2 days", "Free trial included" on the budgets, and "get back to you within
  24 hours" on the form's thank-you screen. Confirm each is true and deliverable.
- Work projects (`site.ts`): check every name, link and result is real.
- About page team (`frontend/src/app/about/page.tsx`).
- The privacy policy (`frontend/src/app/privacy/page.tsx`) is marked **draft** and needs legal review. The consent
  checkbox links to it, and the API requires consent (India's DPDP Act).
- Not built yet: favicon / app icon, a social share (Open Graph) image, `sitemap.xml`, `robots.txt` for the main site,
  analytics. If you add analytics, do not send personal data to it.

### 11.3 Code hygiene

- Visitors pick a background (Night, Cream, Lavender) from the top bar; the choice is kept in their browser.
  `DEFAULT_THEME` in `site.ts` sets what first-time visitors see.
- Never commit: `.env`, `.env.local`, `*.db`, `dev-admin-login.txt`, or anything from `dist/`.

## 12. Smoke tests after deploying

Replace the URLs. All should pass before announcing the site.

1. **API up:** `curl https://api.sparrowgen.in/health` → `{"status":"ok"}`. `curl https://api.sparrowgen.in/docs` → `{"detail":"Not Found"}`.
2. **CORS:**
   `curl -i -X OPTIONS https://api.sparrowgen.in/api/contact -H "Origin: https://sparrowgen.in" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"`
   → `access-control-allow-origin: https://sparrowgen.in`. Repeat with the `admin.` origin on `/auth/login`, and with
   `-H "Access-Control-Request-Method: DELETE"` on `/api/leads/1` (delete must be allowed).
3. **Form end to end:** on the live website submit "Book a project" with a clearly labelled test (for example "DEPLOY TEST")
   and a real email domain. Expect the success screen. A typo such as `me@gamil.com` must be refused with "Did you mean @gmail.com?".
4. **It reached the database:** sign in at the dashboard, confirm the lead is in **Leads** with its project type, budget and
   message, open it, move Backend to In progress, add a comment and a requirement and tick it, then check all of them in
   **Activity**. Clean up with **Delete this request**.
5. **Rate limit is per visitor (⚠️ 5.2):** from two different networks (a laptop and phone data) submit the form. Both must
   succeed. Then make one network submit repeatedly: it gets "Too many submissions" on the 6th valid try while the other still
   works. If the second network is blocked too, `TRUST_PROXY_HOPS` is wrong.
6. **Auth:** wrong password → "Invalid email or password"; the 11th attempt within a minute → a rate-limit message.
7. **Dashboard hidden from search:** `https://admin.sparrowgen.in/robots.txt` shows `Disallow: /`.
8. **Mobile:** open the live site on a phone; check the hero editor, the scratch ticket (swipe sideways to scratch), the
   form and the SparrowBot window.
9. **Refresh behaviour:** open the site, scroll, refresh: it must open at the top.
10. **Restart survives:** restart the API app; the dashboard still lists the leads and the log says `schema is up to date`.

## 13. Operations

- **Redeploy:** build a new archive (`node tools/package.mjs <app>`) and re-upload it, or push to the connected branch if you use
  GitHub deploys. Redeploy the website or dashboard after changing `NEXT_PUBLIC_API_URL`.
- **Database changes:** add a new entry at the **end** of `backend-node/src/db/migrations.js` (never edit one that has shipped) and
  redeploy; it is applied automatically on the next start. Export the database from phpMyAdmin first.
- **Backups:** see section 4.8. Turn on and check Hostinger's backups, and also export the database from phpMyAdmin before any
  schema change and on a regular schedule. The leads are the business's data.
- **Rotate `JWT_SECRET`:** change it and restart the API. Everyone is signed out.
- **Tests:** `cd backend-node && npm test` (needs Node 22.5+). The frontends have no automated tests except `npm run test:bot`
  for SparrowBot; verify them with `npm run build` and the smoke tests above.
- **Logs:** the API writes to the app's runtime logs (account changes appear as `app.audit` lines; passwords are never logged).

### Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Form or login "does nothing", CORS error in the browser console | `CORS_ORIGINS` missing the exact origin, or the API was not restarted |
| Form says it was sent but no lead appears | `NEXT_PUBLIC_API_URL` was empty at build time (the site used its mock). Set it and **redeploy** |
| API will not start, log says `JWT_SECRET must be…` / `Database is not configured` | A production safety check (5.1). Fix the variable and restart |
| `ECONNREFUSED` / `Access denied` in the log | Wrong `DB_*` values, or `DB_HOST` is `localhost` instead of `127.0.0.1`, or the user lacks privileges |
| Everyone gets "Too many submissions" | `TRUST_PROXY_HOPS` too low (5.2) |
| The app is "running" but the address does not answer | The port. See the `PORT` warning in 5.1 |
| Lead emails rejected as "can't receive mail" while the address is real | The host blocks DNS lookups. Set `EMAIL_CHECK_DELIVERABILITY=false` |

## 14. What could not be confirmed in advance

Verify these on a real account before relying on them:

1. That the plan allows **three Node.js apps**, and whether GitHub import can use a subfolder (section 3). The archive route
   avoids the question.
2. How the **port** is supplied to the API (5.1).
3. How many **proxies** sit in front of the app, so the right `TRUST_PROXY_HOPS` (5.2).
4. That **`mysql2` installs and connects** with the defaults on Hostinger, and that the schema creates cleanly on **their**
   database version (check the version in phpMyAdmin). It has been run successfully on MariaDB 11.8.2 on a developer's
   computer. Repeat it on Hostinger: `npm run test:mysql` in `backend-node/` against a `..._test` database (see
   `backend-node/README.md`), and smoke test 4 below.
5. That **Next.js 16** builds on Hostinger with the settings above (it builds locally, see `MIGRATION.md`).
6. Whether **`node` works over SSH**, and the exact names of the **Remote MySQL** and **phpMyAdmin** screens (section 8).
7. Whether Hostinger's backups cover the database, and how long they are kept.
8. Whether the database user Hostinger creates may create and alter tables (it must, for the API to make its own tables; the fallback is section 4.7).

## 15. Local development

```bash
# API: http://localhost:8000 (SQLite file, no MySQL needed; Node 22.5+)
cd backend-node && cp .env.example .env && npm install && npm start

# website: http://localhost:3000   (frontend/.env.local: NEXT_PUBLIC_API_URL=http://localhost:8000)
cd frontend && npm install && npm run dev

# dashboard: http://localhost:3001 (admin/.env.local: NEXT_PUBLIC_API_URL=http://localhost:8000)
cd admin && npm install && npm run dev
```

Create a local dashboard login with `node backend-node/scripts/manage-users.js create --name "You" --email you@example.com`.
Local sign-in details are yours alone: never reuse them on the live site and do not commit them.
