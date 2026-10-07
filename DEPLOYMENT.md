# Deployment guide

For the engineer taking the site live. Written from reading the code in all three projects and
running them locally. **Nothing here has been deployed to a real host yet**: treat host-specific
settings (Render/Vercel screens, variable names) as a starting point and verify them as you go. Items
marked ⚠️ are things that will bite if missed.

## 1. What you are deploying

Three separate apps, one database:

```
yourcompany.com        → website      (frontend/)  Next.js   → Vercel (or Netlify)
admin.yourcompany.com  → dashboard    (admin/)     Next.js   → Vercel (second project)
api.yourcompany.com    → backend      (backend/)   FastAPI   → Render / Railway / Fly.io / VPS
                                                   └─ managed PostgreSQL
```

One domain is enough: the other two are **subdomains** you create in DNS at no cost. Until you have a
domain, every host gives a free address (`*.vercel.app`, `*.onrender.com`); use those for review.

| Folder | What it is | Runtime | Notes |
| --- | --- | --- | --- |
| `frontend/` | Public marketing site + "Book a project" form | Node ≥ 20.9 (Next 16 requires it) | Static pages + one client form that calls the API |
| `admin/` | Team dashboard (leads, stages, comments, activity) | Node ≥ 20.9 | Has one dynamic route (`/leads/[id]`) so it needs a Node host, not plain static hosting. Vercel/Netlify are fine |
| `backend/saas-landing-page-main/` | API only | Python 3.12 (what CI uses; 3.11+ per its README) | The team's separate repo: `github.com/Kazuto16K/saas-landing-page` |

Details of each app: `frontend/README.md`, `admin/README.md`, the backend's `README.md`,
`ARCHITECTURE.md` and `docs/FRONTEND_API.md`.

**Repos.** Only the backend is a git repo today. `frontend/` and `admin/` are plain folders and need
to be put in git (one repo each, or a monorepo with the "root directory" set per Vercel project) before
a host can build them.

## 2. Order of work

1. Backend + database (you need its URL for everything else)
2. Website and dashboard (each needs the backend URL)
3. Go back to the backend and set the exact website and dashboard URLs in `CORS_ORIGINS`
4. Create team accounts
5. Smoke-test (section 9) and fix the launch checklist (section 8)

## 3. Backend

### 3.1 Database

Create a managed PostgreSQL database (Neon, Supabase, Render, Railway…) and copy its connection
string. `postgres://` and `postgresql://` URLs are both accepted (the backend rewrites them for psycopg 3).
If the provider requires TLS, append `?sslmode=require`. Confirm automatic backups are on.

⚠️ The backend **refuses to start** with `ENV=prod` on SQLite, with a weak `JWT_SECRET`, or with empty
`CORS_ORIGINS`. That is intentional; read the startup error if it fails.

### 3.2 Environment variables

| Variable | Value |
| --- | --- |
| `ENV` | `prod` (use `staging` for a test environment; same safety checks) |
| `DATABASE_URL` | the Postgres URL |
| `JWT_SECRET` | 48+ random chars: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `JWT_EXPIRE_MINUTES` | `60` (default). There is no refresh token, so users re-login after this |
| `CORS_ORIGINS` | `https://yourcompany.com,https://admin.yourcompany.com` (exact origins, `https`, no trailing slash, no paths) |
| `FORWARDED_ALLOW_IPS` | ⚠️ `*` on a managed host. See 3.4 |
| `CONTACT_RATE_LIMIT` / `LOGIN_RATE_LIMIT` | optional, defaults `5/hour` and `10/minute` |
| `EMAIL_CHECK_DELIVERABILITY` | optional, default `true`. The contact form looks up the email's domain in DNS and rejects domains that cannot receive mail. Lookup failures are let through. Set `false` only if the host blocks outbound DNS |

Never commit `.env`. The local `.env` and `dev.db` in the backend folder are for development only and
are git-ignored.

### 3.3 Build and start

Build: `pip install -r requirements.txt`

Start (this is what `ARCHITECTURE.md` specifies):

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers
```

- ⚠️ **Run exactly one worker/instance.** The rate limiter keeps its counters in memory, so several
  workers or instances each get their own counters and the limits stop working.
- Health check path: `GET /health` → `{"status":"ok"}`.
- `alembic upgrade head` runs migrations on every start; it is a no-op when the schema is current. If
  `alembic` can't find the `app` package in your host's shell, set `PYTHONPATH=.`
  (this happened locally).
- There is **no Dockerfile or docker-compose** in the repo. (A docstring in `scripts/manage_users.py`
  mentions `docker compose`; that is stale.) If your host wants a container, write one: Python 3.12 slim,
  install `requirements.txt`, run the start command above.
- On Render: Web Service, runtime Python, set `PYTHON_VERSION=3.12`, build and start commands as above.
- API docs (`/docs`) are disabled when `ENV=prod`. Expect a 404 there.

### 3.4 ⚠️ Rate limiting needs the real visitor IP

The limiter is per client IP (`get_remote_address`). Hosts put a proxy in front of your app, so unless
uvicorn is told to trust that proxy's `X-Forwarded-For` header, **every visitor appears to have the
proxy's IP**. Result: the whole world shares one "5 contact submissions per hour" budget and real
customers get "Too many submissions".

`--proxy-headers` is already in the start command, but uvicorn only trusts it from `127.0.0.1` by
default. On a managed host set `FORWARDED_ALLOW_IPS=*` (only do this when the app is reachable *only*
through the host's proxy, which is the case on Render/Railway/Fly). Verify with test 9.5.

### 3.5 Team accounts

There is no signup, no password reset email, and no roles. Accounts are created from a shell on the
server with the backend's own script (it prompts for the password, 12+ characters, never as an argument):

```bash
python scripts/manage_users.py create --name "Full Name" --email person@company.com
python scripts/manage_users.py list
python scripts/manage_users.py reset-password --email person@company.com
python scripts/manage_users.py deactivate --email person@company.com
```

Use the host's shell/console (Render "Shell", `railway run`, `fly ssh console`). Never run it from a
laptop against the production database. Users cannot be deleted, only deactivated. After first login,
each person should change their password on the dashboard's **Account** page.

⚠️ The local test password in `dev-admin-login.txt` (project root) belongs to the **local** database
only. Do not reuse it, do not commit it, and delete the file when no longer needed.

#### Checklist: your first admin on the live site

The live database starts with **no accounts** (the local `admin@dev.local` login does not exist there), so
the first admin has to be created from the host's shell. Do this once after the backend is deployed:

1. **Backend is up.** `https://api.yourcompany.com/health` returns `{"status":"ok"}` (the start command has
   already applied the migrations).
2. **Open a shell on the host** (Render: the **Shell** tab; Railway: `railway run ...`; Fly: `fly ssh console`;
   VPS: SSH, activate the virtualenv, `cd` into the backend folder). Check you are in the backend folder
   (`ls` shows `scripts/` and `app/`) and that `ENV=prod` and the Postgres `DATABASE_URL` are set on the host,
   not copied from your laptop.
3. **Create the account:**
   ```bash
   python scripts/manage_users.py create --name "Full Name" --email you@yourcompany.com
   ```
   Type a strong password (12+ characters) at the prompt and confirm it. Use a password-manager password,
   not one from this document or `dev-admin-login.txt`.
4. **Confirm it exists:** `python scripts/manage_users.py list` shows your email as `active`.
5. **Sign in** at `https://admin.yourcompany.com`. A wrong password shows "Invalid email or password"; if
   the page can't reach the server, check `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS` (section 7).
6. **Change the password** on the dashboard's **Account** page if someone else typed the first one.
7. **Add the rest of the team** the same way (step 3), one account per person. Send each person their
   password privately (not in a public channel) and ask them to change it on the Account page at first login.
8. **Remove access when someone leaves:** `python scripts/manage_users.py deactivate --email person@company.com`.
   A forgotten password is `reset-password --email ...`; there is no "forgot password" email.
9. **Clean up:** delete your local `dev-admin-login.txt`, and never reuse its password on the live site.

Remember that every account can do everything, including permanently deleting leads (there are no roles
yet), so only create accounts for people you trust with that.

### 3.6 Behaviour to know about

- The backend sends **no email of any kind**. New requests are visible only in the dashboard, so
  someone must check it (see 8.2).
- It stores everything the form collects: name, email, phone, business type (+ "other" text), project
  type, budget, message and consent. The first deploy of this version needs the `0002` migration (the start
  command applies it, see 3.3).
- The contact form rejects emails whose domain doesn't exist (DNS lookup) and a list of known typo
  domains (`gamil.com` and similar, in `app/schemas/contact.py`).
- Team members can **delete a lead** (permanently: its stages, comments, requirements and activity) and
  keep a per-stage **client requirements** checklist (backend / frontend / deployment) on each lead.
  There are no roles yet: every team account can delete.
- Security headers (HSTS, nosniff, frame deny, no-store) are set by the app; it also strips HTML from input.
- Logs go to stdout (`app.audit` logger records account changes). Collect them via the host.

## 4. Website (`frontend/`)

Vercel project settings:

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Framework | Next.js (auto) |
| Install / build | `npm install` / `npm run build` (defaults) |
| Node version | 20.9+ (22 LTS is fine) |
| Env var | `NEXT_PUBLIC_API_URL` = `https://api.yourcompany.com` (no trailing slash) |
| Domain | `yourcompany.com` (+ `www` redirect) |

⚠️ `NEXT_PUBLIC_*` variables are **baked in at build time**. Changing the API URL later requires a
**redeploy**, not just editing the variable. If it is empty, the site silently falls back to a mock API
and form submissions go nowhere; check this first if leads stop arriving.

All backend calls are in `src/lib/api.ts`. Page text, names, prices and contact details are all in
`src/lib/site.ts`.

## 5. Dashboard (`admin/`)

Same as section 4 but:

| Setting | Value |
| --- | --- |
| Root directory | `admin` |
| Env var | `NEXT_PUBLIC_API_URL` = the same API URL |
| Domain | `admin.yourcompany.com` |

- It already ships `noindex` meta and `robots.txt` with `Disallow: /`. Keep it that way, and do not
  link to it from the public site.
- The login token lives in `sessionStorage` (cleared when the tab closes). When the API returns 401
  the dashboard clears it and sends the user to `/login`.
- Optional hardening later: put Cloudflare Access (or similar) in front of `admin.` as a second gate.
  The real protection is the backend's JWT, not the hidden URL.

## 6. DNS and HTTPS

Create the three records at your registrar/DNS host as the hosts instruct (usually a `CNAME` per
subdomain, or an `A` record for the apex). Vercel and Render issue HTTPS certificates automatically.
Use `https://` everywhere: the backend sends HSTS, and browsers block mixed content.

## 7. Wiring it together

After the three URLs exist, set the backend's `CORS_ORIGINS` to exactly
`https://yourcompany.com,https://admin.yourcompany.com` (add `https://www.yourcompany.com` if you serve
www directly) and restart it. A missing origin shows up as a CORS error in the browser console and a
form/login that "does nothing". Only `GET`, `POST`, `PATCH` and `DELETE` are allowed by the backend.

## 8. Before launch

### 8.1 Project details are stored

`project_type`, `budget` and `message` are now stored on the lead and shown in the dashboard (migration
`0002`). Leads received before that migration have these fields empty.

### 8.1b "See your website" previews

The preview library lives in `frontend/src/lib/previews.ts` (copy + colours per business type, three layouts).
It is frontend-only today: nothing is stored when a visitor uses it. When a visitor books from a preview, the
chosen design is written into the form's `message`, so it reaches the team through the stored
`message` (see 8.1). Moving the library to the backend later means a read-only endpoint returning the same shape.

### 8.2 Someone has to watch the dashboard

No emails or notifications are sent. Decide who checks the Leads page and how often. The site promises
"we reply within 24 hours".

### 8.3 Placeholder content to replace

All in `frontend/src/lib/site.ts` unless noted. Search for these before launch:

- Brand name **"Sparrowgen"** (final), email, WhatsApp number, Instagram
  handle, city. ⚠️ The "WhatsApp us" button builds a `wa.me` link from the placeholder number.
- Claims: "Live in 1 week", "Landing pages in 2 days", "Free trial included" on every budget, and the
  "get back to you within 24 hours" line on the form's thank-you screen. Confirm each is true and deliverable.
- Work projects: names, results and the illustrated mockups are invented; replace with real client work
  and screenshots.
- About page team: `frontend/src/app/about/page.tsx` has placeholder names and initials.
- Privacy policy (`frontend/src/app/privacy/page.tsx`) is marked **draft**: needs legal review (the
  consent checkbox links to it; the backend requires consent under India's DPDP Act).
- Not yet built for the main site: favicon / app icon, social share (Open Graph) image, `sitemap.xml`,
  `robots.txt`, analytics. Add them if wanted. If you add analytics, do not send personal data to it
  (backend guide, section 7).

### 8.4 Code hygiene

- Visitors can pick a background (Night, Cream, Lavender) from the button in the top bar; the
  choice is stored in their browser (`localStorage`). `DEFAULT_THEME` in `frontend/src/lib/site.ts` sets
  what first-time visitors see (`"night"`).
- Do not commit: `.env`, `.env.local`, `dev.db`, `.venv`, `dev-admin-login.txt`.

## 9. Smoke tests after deploying

Replace the URLs. All should pass before announcing the site.

1. **Backend up:** `curl https://api.yourcompany.com/health` → `{"status":"ok"}`. `https://api.yourcompany.com/docs` → 404.
2. **CORS:**
   `curl -i -X OPTIONS https://api.yourcompany.com/api/contact -H "Origin: https://yourcompany.com" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"`
   → `access-control-allow-origin: https://yourcompany.com`. Repeat with the `admin.` origin on
   `/auth/login`.
3. **Form end to end:** on the live website, submit "Book a project" with a clearly-labelled test
   (e.g. "DEPLOY TEST"). Expect the success screen.
4. **It reached the database:** sign in at `https://admin.yourcompany.com`, confirm the lead is in
   **Leads**, open it, move Backend to In progress, add a comment, then see all three in **Activity**.
   Then clean up: delete the test lead with the dashboard's **Delete this request** button.
5. **Rate limit is per visitor (⚠️ 3.4):** from two different networks (e.g. laptop and phone data),
   submit the form. Both must succeed. Then check that one network gets "Too many submissions" on the
   6th try while the other still works. If the second network is blocked too, `FORWARDED_ALLOW_IPS` is not set.
6. **Auth:** wrong password → "Invalid email or password"; the 11th attempt within a minute → rate-limit message.
7. **Dashboard is hidden from search:** `https://admin.yourcompany.com/robots.txt` shows `Disallow: /`.
8. **Mobile:** open the live site on a phone; check the hero editor, the scratch ticket (swipe sideways
   to scratch) and the form.
9. **Refresh behaviour:** open the site, scroll, refresh: it must open at the top.

## 10. Operations

- **Redeploy frontends:** push to the connected branch. To roll back, promote a previous deployment in Vercel.
- **Backend schema changes:** edit models, then `alembic revision --autogenerate -m "describe change"`,
  review the generated file, commit, deploy (the start command applies it). Roll back one step with `alembic downgrade -1`.
- **Rotate `JWT_SECRET`:** change it and restart; everyone is signed out.
- **Tests:** backend `pytest` and `ruff check .` run in CI on every push (`.github/workflows/ci.yml`).
  The frontends have no automated tests; verify with `npm run build` and the smoke tests above.
- **Scaling note:** the in-memory rate limiter means a single backend instance. Moving to several needs
  a shared store (e.g. Redis) for the limiter first.

## 11. Local development (for reference)

```bash
# backend (Python 3.11+)
cd backend/saas-landing-page-main
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env     # set JWT_SECRET; CORS_ORIGINS=http://localhost:3000,http://localhost:3001
PYTHONPATH=. alembic upgrade head
uvicorn app.main:app --port 8000

# website  → http://localhost:3000        (frontend/.env.local: NEXT_PUBLIC_API_URL=http://localhost:8000)
cd frontend && npm install && npm run dev

# dashboard → http://localhost:3001       (admin/.env.local: NEXT_PUBLIC_API_URL=http://localhost:8000)
cd admin && npm install && npm run dev
```

Create a local dashboard login with `scripts/manage_users.py create` (as in 3.5).
