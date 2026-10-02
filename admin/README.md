# Admin dashboard

Internal tool for the team: sign in, see every website request (lead), assign it, move its
Backend → Frontend → Deployment stages, comment, and read the activity log.

It is a **separate app** from the public website (backend guide, section 1), on its own port, with
`noindex` meta and `robots.txt` set to `Disallow: /`.

Next.js 16 + React 19 + TypeScript, plain CSS. No UI or state libraries.

## Run

The backend must be running (see ../frontend/README.md) with `http://localhost:3001` in its `CORS_ORIGINS`.

```bash
npm install
npm run dev      # http://localhost:3001
npm run build
```

`.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:8000`

## Screens

| Path | What |
| --- | --- |
| `/login` | Team sign-in (no sign-up, no password reset: the backend has none) |
| `/` | Leads: status filter (red pending, yellow in progress, green completed), search, pages |
| `/leads/[id]` | Contact, lead owner, per-stage status + assignee, ordering warnings, comments, activity |
| `/activity` | All activity, filter by team member, "Load older" |
| `/account` | Change password (12+ characters) |

## Notes

- All backend calls are in `src/lib/api.ts`. The token lives in `sessionStorage` only, never in a URL.
  A 401 clears it and sends the user to `/login`.
- All API text is rendered as plain text (no `dangerouslySetInnerHTML`).
- Accounts are created on the server: `python scripts/manage_users.py create --name ... --email ...` in the backend repo.
