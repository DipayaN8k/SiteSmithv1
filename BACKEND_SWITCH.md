# Switching between the two backends

The repository holds two backends that answer **identically** (see `MIGRATION.md`):

| | Folder | Needs |
| --- | --- | --- |
| **Node.js** (current choice, runs on Hostinger) | `backend-node/` | Node 18.18+, MariaDB / MySQL |
| **Python** (obsolete, kept as the way back) | `backend/saas-landing-page-main/` | Python 3.11+, PostgreSQL, a host that runs Python |

The website and the dashboard never know which one they are talking to. They only know **one address**, `NEXT_PUBLIC_API_URL`.
So switching means making that address lead to the other backend, and making sure the other backend is ready.

**Data does not follow.** Each backend has its own database. After a switch the new side starts with whatever its own database
holds: usually empty. Create the team's accounts there. Everyone must sign in again, because the two backends sign tokens with
different secrets.

## Choose how to switch

### A. Move the address (recommended: no rebuild, nothing in the frontend changes)

Keep `NEXT_PUBLIC_API_URL` as a fixed name, for example `https://api.sparrowgen.in`, in both the website and the dashboard, and
change **where that name points**.

- In the domain's DNS (or in Hostinger's domain panel), point `api` at the other backend's host (a CNAME or A record).
- The other host must serve HTTPS for `api.sparrowgen.in` (a certificate for that name).
- Wait for DNS to refresh (minutes to a few hours; lower the record's TTL a day before a planned switch).
- No website or dashboard rebuild is needed.

### B. Change the setting and rebuild

`NEXT_PUBLIC_API_URL` is **baked into the website and the dashboard when they are built**. Changing it means:

1. Set `NEXT_PUBLIC_API_URL` to the other backend's address, in **both** the website app and the dashboard app (hPanel
   environment variables, Netlify, or a local `.env.local`).
2. Rebuild and redeploy **both** (restarting is not enough).
3. If the website is built without it, it silently falls back to a mock and form submissions go nowhere; a dashboard built without it tries `http://localhost:8000` and sign-in fails.

## The other backend must be ready first

| Check | Node backend | Python backend |
| --- | --- | --- |
| Running and answering `GET /health` with `{"status":"ok"}` | `node server.js` on Hostinger | `uvicorn app.main:app` on its host |
| Database exists and is migrated | MariaDB/MySQL; tables are created on first start | PostgreSQL; `alembic upgrade head` |
| `CORS_ORIGINS` lists the exact website and dashboard addresses (`https`, no trailing slash) | yes, then restart | yes, then restart |
| `JWT_SECRET` set (32+ random characters, different from the other backend's) | yes | yes |
| Team accounts created | `node scripts/manage-users.js create ...` (or `--print-sql` for phpMyAdmin) | `python scripts/manage_users.py create ...` |
| The real visitor address reaches the app (so rate limits are per visitor) | `TRUST_PROXY_HOPS=1` | `FORWARDED_ALLOW_IPS=*` |

The full settings of each: `MIGRATION.md` section 4 (old name to new name), `DEPLOYMENT_MIGRATION.md` (Node on Hostinger),
`DEPLOYMENT.md` (Python on Render).

## Python to Node (the migration)

1. Deploy `backend-node/` and its MariaDB database (`DEPLOYMENT_MIGRATION.md`). Create the accounts.
2. Smoke test it directly (below).
3. Switch with method A or B.
4. Run the smoke test again from the live website.
5. Keep the Python backend running for a few days if you can, so you can switch back (see the next section).

## Node back to Python (reverting)

1. Make sure the Python backend runs somewhere that supports Python (Render, Railway, Fly, a VPS: **not** Hostinger's Node
   plans) with its PostgreSQL database migrated and its accounts created.
2. Set its `CORS_ORIGINS` to the website and dashboard addresses.
3. Switch with method A (point `api.sparrowgen.in` at it) or B (change `NEXT_PUBLIC_API_URL` and rebuild both frontends).
4. Smoke test (below). Leads submitted while the Node backend was live stay in the MariaDB database; they do not appear in the
   Python database.

## Smoke test after any switch

1. `curl https://api.sparrowgen.in/health` returns `{"status":"ok"}`.
2. From a browser on the website: submit "Book a project" with a labelled test (and a real email domain). Expect the success
   screen. Try `me@gamil.com` too: it must be refused with "Did you mean @gmail.com?".
3. Sign in to the dashboard with an account that exists **on that backend**. The test lead is in the list; open it, add a
   requirement, tick it, add a comment, then delete the lead.
4. Check there is no CORS error in the browser console.

## Running both at once (to compare)

Run the Node backend on one address and the Python backend on another (for example `api` and `api-old`), and compare them with
`backend-node/scripts/parity.mjs`: it sends the same requests to both and reports any difference. Both must start from empty
databases with the rate limits and the DNS check off (the header of the script explains it).

## If something goes wrong

| Symptom | Likely cause |
| --- | --- |
| Form or login "does nothing", CORS error in the console | The new backend's `CORS_ORIGINS` is missing the exact origin, or it was not restarted |
| The form says it was sent but no lead appears, or the dashboard cannot sign in | The frontends were built without the right `NEXT_PUBLIC_API_URL` (method B): set it and **redeploy** both |
| Dashboard login says "Invalid email or password" right after switching | The account does not exist on that backend yet: create it |
| Everyone gets "Too many submissions" | The proxy setting (`TRUST_PROXY_HOPS` / `FORWARDED_ALLOW_IPS`) is wrong, so all visitors look alike |
| It works for you but not after DNS change for others | DNS has not refreshed everywhere yet (wait for the TTL) |
