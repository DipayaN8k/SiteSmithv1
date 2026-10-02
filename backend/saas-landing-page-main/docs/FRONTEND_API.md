# Frontend API Guide

For developers building the **landing site** (contact form) and the **admin dashboard**. You only need this file; the backend internals are in [../ARCHITECTURE.md](../ARCHITECTURE.md).

Interactive docs while the backend runs locally: `http://localhost:8000/docs` (disabled in production).

## 1. Basics

| | |
| --- | --- |
| Base URL (local) | `http://localhost:8000` |
| Base URL (prod) | `https://api.yourcompany.com` |
| Format | JSON in, JSON out. Send `Content-Type: application/json`. |
| Auth | `Authorization: Bearer <token>` on every endpoint except the three public ones below |
| Dates | ISO 8601 strings, always **UTC** (e.g. `2026-10-02T09:30:00Z`). Convert to local time for display. (With the local SQLite database the `Z` suffix is missing; still treat the value as UTC. Production/Postgres includes it.) |
| IDs | integers |

**Public endpoints (no token):** `POST /api/contact`, `POST /auth/login`, `GET /health`. Everything else returns `401` without a valid token.

### CORS

The browser may only call the API from origins listed in the backend's `CORS_ORIGINS` env var. For local development, ask the backend owner to include your dev URL (e.g. `http://localhost:5173`). Allowed methods: `GET`, `POST`, `PATCH`. A CORS error in the console usually means your origin is not on that list.

### Two separate apps

The landing site must contain **no dashboard code and no login**. The dashboard is a separate app on its own subdomain; give it `<meta name="robots" content="noindex">` and a `robots.txt` with `Disallow: /`.

## 2. Errors

| Status | Meaning | Body |
| --- | --- | --- |
| 400 | Bad request (e.g. wrong current password) | `{"detail": "message"}` |
| 401 | Missing/expired/invalid token, or bad login | `{"detail": "message"}` |
| 404 | Lead or stage not found | `{"detail": "message"}` |
| 422 | Validation failed | see below |
| 429 | Rate limited | `{"error": "Rate limit exceeded: 5 per 1 hour"}` |

`422` from request validation has a **list** in `detail`:

```json
{
  "detail": [
    {"loc": ["body", "email"], "msg": "value is not a valid email address", "type": "value_error"},
    {"loc": ["body"], "msg": "Value error, business_type_other is required when business_type is Other", "type": "value_error"}
  ]
}
```

- `loc[1]` is the field name; use it to show the message next to that input. When `loc` is just `["body"]`, show the message at the form level.
- Some `422` errors raised by business rules (e.g. assigning to an inactive user) have a **string** `detail` instead. Handle both shapes:

```ts
function errorMessage(body: any): string {
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.detail)) return body.detail.map((e: any) => e.msg).join(". ");
  return body?.error ?? "Something went wrong";
}
```

## 3. Landing site: the contact form

### `POST /api/contact` (public, rate-limited to 5 per hour per IP)

Request:

```json
{
  "full_name": "Asha Rao",
  "email": "asha@example.com",
  "phone": "+91 98765 43210",
  "business_type": "Retail",
  "business_type_other": null,
  "consent": true,
  "website": ""
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `full_name` | yes | 1-200 characters. HTML tags are stripped by the server. |
| `email` | yes | valid email |
| `phone` | no | 5-30 characters: digits, spaces and `+ - ( ) .` only. Omit or send `null` if blank. |
| `business_type` | yes | exactly one of: `Retail`, `Healthcare`, `Education`, `Manufacturing`, `IT/Software`, `Finance`, `Real Estate`, `Hospitality`, `Other` |
| `business_type_other` | only if `business_type` is `Other` | max 200 characters. Ignored for any other type. |
| `consent` | yes | must be `true`. Use an unchecked-by-default checkbox with your privacy-policy text next to it (India DPDP Act). |
| `website` | honeypot | **Leave empty.** See below. |

Success: `201`

```json
{"message": "Thanks, your request has been received. Our team will get back to you."}
```

Show a thank-you state. Do **not** promise an email: the system sends no email, the team sees requests in their dashboard.

**Honeypot:** add a text input named `website`, hidden from humans (CSS off-screen, `tabindex="-1"`, `autocomplete="off"`, `aria-hidden="true"`; avoid `display:none`, which some bots detect). Bots fill it in; the server then returns a normal `201` but stores nothing. Always send the field, empty for real users.

**Handle `429`:** show "Too many submissions, please try again later."

Example:

```ts
const res = await fetch(`${API}/api/contact`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(form),
});
if (res.status === 201) showThanks();
else showError(errorMessage(await res.json()));
```

## 4. Dashboard: authentication

### `POST /auth/login` (public, rate-limited to 10 per minute per IP)

```json
{"email": "you@company.com", "password": "..."}
```

`200` → `{"access_token": "<jwt>", "token_type": "bearer"}`. `401` → wrong email/password **or** deactivated account (same message on purpose).

### `GET /auth/me`

Returns the logged-in user: `{"id": 1, "name": "Soumava", "email": "...", "created_at": "..."}`. Call it on app load to check a stored token is still valid.

### `POST /auth/change-password` → `204` (no body)

```json
{"current_password": "...", "new_password": "at-least-12-characters"}
```

`400` wrong current password; `422` new password under 12 characters or the same as the old one. New team members are given a temporary password by an existing teammate; **show a "change password" screen after the first login.**

### Token handling

- The token lasts **60 minutes** (backend setting). There is **no refresh token**: when any call returns `401`, clear the token and send the user to the login page.
- Store it in memory (safest) or `sessionStorage`. Avoid `localStorage` if you can.
- There is **no signup, no "forgot password"** and no roles. Do not build them. Accounts are created by an admin on the server.
- A deactivated user's token stops working immediately (you will get `401`).

A small wrapper keeps this in one place:

```ts
async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (res.status === 401) { logout(); throw new Error("Session expired"); }
  return res;
}
```

## 5. Dashboard: current requests (leads)

### Concepts

- A **lead** is one contact-form submission.
- Every lead has exactly **three stages**, always in this order: `backend`, `frontend`, `deployment`.
- Each stage has a status: `pending`, `in_progress` or `completed`.
- The lead's overall **`status`** is computed by the server (never sent by you): all pending → `pending` (show **red**); all completed → `completed` (**green**); anything else → `in_progress` (**yellow**).
- A lead can be assigned to a team member, and each stage can be assigned separately.
- Stages can be changed in any order. Out-of-order changes succeed and come back with `warnings` (show them as a gentle notice, not an error).

### `GET /api/leads`

Query parameters (all optional):

| Param | Description |
| --- | --- |
| `status` | `pending`, `in_progress` or `completed` (overall status) |
| `q` | search in name and email (case-insensitive, max 200 chars) |
| `page` | starts at 1 (default 1) |
| `page_size` | 1-100 (default 20) |

Newest first. Response:

```json
{
  "items": [
    {
      "id": 7,
      "full_name": "Asha Rao",
      "email": "asha@example.com",
      "phone": "+91 98765 43210",
      "business_type": "Other",
      "business_type_other": "Pet grooming",
      "assigned_to": 2,
      "assigned_to_name": "Priya",
      "consent": true,
      "created_at": "2026-10-02T09:30:00Z",
      "updated_at": "2026-10-02T10:05:00Z",
      "status": "in_progress",
      "duplicate_email": false,
      "stages": [
        {"stage": "backend", "status": "in_progress", "assigned_to": 1, "assigned_to_name": "Soumava", "updated_at": "..."},
        {"stage": "frontend", "status": "pending", "assigned_to": null, "assigned_to_name": null, "updated_at": "..."},
        {"stage": "deployment", "status": "pending", "assigned_to": null, "assigned_to_name": null, "updated_at": "..."}
      ]
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

- `duplicate_email: true` means someone has already submitted with this email. Show a small "repeat contact" badge; the submission is **not** blocked.
- For the business type, show `business_type_other` when `business_type` is `"Other"`.
- Total pages = `ceil(total / page_size)`.

### `GET /api/leads/{id}`

Everything in the list item **plus**:

```json
{
  "...": "all fields above",
  "comments": [
    {"id": 3, "lead_id": 7, "stage": null, "user_id": 1, "user_name": "Soumava", "body": "Called them", "created_at": "..."}
  ],
  "activity": [
    {"id": 12, "lead_id": 7, "user_id": 1, "user_name": "Soumava", "action": "stage_status_changed",
     "stage": "backend", "old_value": "pending", "new_value": "in_progress",
     "message": "Soumava moved Backend: pending → in progress", "created_at": "..."}
  ]
}
```

`comments` are oldest first; `activity` is newest first. `404` if the lead does not exist.

### `GET /api/users`

`[{"id": 1, "name": "Soumava"}, ...]`: active team members only, for the "assign to" dropdowns. Load it once and cache it.

### `PATCH /api/leads/{id}`: assign the lead

```json
{"assigned_to": 2}
```

Send `null` to unassign. The field is required. `422` if the user doesn't exist or is deactivated.

### `PATCH /api/leads/{id}/stages/{stage}`: change a stage

`{stage}` is `backend`, `frontend` or `deployment` (`404` otherwise). Send either or both:

```json
{"status": "in_progress", "assigned_to": 2}
```

- `status`: `pending`, `in_progress` or `completed`.
- `assigned_to`: user id, or `null` to unassign. **Omit the key entirely** to leave the assignee unchanged.
- An empty body `{}` is a `422`. Sending a value that is already set succeeds and changes nothing.

Both PATCH endpoints respond with the updated lead and any warnings, so you can update the UI without refetching:

```json
{
  "lead": { "...": "same shape as a list item" },
  "warnings": ["deployment completed before backend", "deployment completed before frontend"]
}
```

`warnings` is empty when the order is fine. The warnings describe the lead's current state, so they appear on every response while the situation lasts.

### `POST /api/leads/{id}/comments` → `201`

```json
{"body": "Waiting on their logo", "stage": "frontend"}
```

`stage` is optional: omit or `null` for a general comment. `body` is 1-2000 characters (tags are stripped; blank-only is `422`). Returns the new comment (same shape as in the detail response). Comments cannot be edited or deleted.

## 6. Dashboard: activity log

### `GET /api/activity`

| Param | Description |
| --- | --- |
| `lead_id` | only this lead's activity |
| `user_id` | only actions by this team member |
| `limit` | 1-100 (default 50) |
| `before` | return entries older than this entry id (cursor) |

```json
{
  "items": [ { "id": 12, "message": "Soumava moved Backend: pending → in progress", "...": "..." } ],
  "next_before": 5
}
```

Newest first. To load more, call again with `before=<next_before>`. When `next_before` is `null` there is nothing older.

Just render `message`: it is a ready-made sentence. `action` is one of `lead_created`, `stage_status_changed`, `lead_assigned`, `stage_assigned`, `comment_added` if you want an icon. `user_id`/`user_name` are `null` for public actions (a new contact-form submission), so show "System" or similar. Use `lead_id` to link each entry to its lead.

## 7. Security notes for frontend code

- **Render all text from the API as plain text.** Names, comments and activity messages contain user-supplied content; use normal React text rendering and never `dangerouslySetInnerHTML`.
- Customer name, email and phone are personal data; do not log them or send them to third-party analytics.
- Never put tokens or personal data in URLs or query strings.
- Hiding the dashboard URL is not security; the backend's token check is. Still, keep it off search engines (see section 1).

## 8. Quick reference

| Method | Path | Token | Body | Success |
| --- | --- | --- | --- | --- |
| POST | `/api/contact` | no | contact fields | 201 `{message}` |
| GET | `/health` | no | | 200 `{status}` |
| POST | `/auth/login` | no | `{email, password}` | 200 `{access_token, token_type}` |
| GET | `/auth/me` | yes | | 200 user |
| POST | `/auth/change-password` | yes | `{current_password, new_password}` | 204 |
| GET | `/api/users` | yes | | 200 `[{id, name}]` |
| GET | `/api/leads` | yes | query: `status, q, page, page_size` | 200 `{items, total, page, page_size}` |
| GET | `/api/leads/{id}` | yes | | 200 lead + comments + activity |
| PATCH | `/api/leads/{id}` | yes | `{assigned_to}` | 200 `{lead, warnings}` |
| PATCH | `/api/leads/{id}/stages/{stage}` | yes | `{status?, assigned_to?}` | 200 `{lead, warnings}` |
| POST | `/api/leads/{id}/comments` | yes | `{body, stage?}` | 201 comment |
| GET | `/api/activity` | yes | query: `lead_id, user_id, limit, before` | 200 `{items, next_before}` |
