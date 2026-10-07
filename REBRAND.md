# Renaming the agency and connecting the domain

The name is final: **Sparrowgen** (chat assistant: **SparrowBot**), planned domain **sparrowgen.in**. These are already set in
the files below. If anything changes again, or when the domain is bought, update these places. Everything else (every page, the legal pages, the booking form, the chat assistant,
the footer and browser tab titles) reads from these and updates by itself.

## 1. When the name is decided

| File | What to change |
| --- | --- |
| `frontend/src/lib/site.ts` → `brand` | `name`, `botName` (e.g. "&lt;Name&gt;Bot"), `instagram`, `instagramUrl` |
| `admin/src/lib/brand.ts` | `BRAND_NAME` (the dashboard is a separate app, so it has its own copy) |
| `frontend/src/lib/legal.ts` | `businessName` if the registered name differs (e.g. "Name LLP"), `businessStatus`, `address` |
| `frontend/src/components/Logo.tsx` | Only if the logo mark itself changes (the sparrow). The name next to it updates by itself |
| `frontend/src/app/icon.svg` | Browser tab icon, only if the mark changes |

Optional: the chat assistant's text lives in `frontend/src/lib/bot/sparrowbot.json`. Its name and contact
details are filled in from `site.ts` automatically, so you only edit that file to change answers.

## 2. When the domain is bought

| Where | What to change |
| --- | --- |
| `frontend/src/lib/site.ts` → `brand` | `email` (e.g. `hello@yourname.in`), `website` (e.g. `https://yourname.in`) |
| `frontend/src/lib/legal.ts` → `grievanceOfficer.email` | The inbox Anoranya reads for privacy and customer complaints (e.g. `privacy@yourname.in`) |
| Netlify → Domain management | Add the domain, follow its DNS steps; HTTPS is automatic |
| Render (backend) → `CORS_ORIGINS` | `https://yourname.in,https://admin.yourname.in` (see `DEPLOYMENT.md`) |
| Netlify (website) → `NEXT_PUBLIC_API_URL` | The backend address, once it is live |

Then create the email inbox at your domain provider (or Google Workspace / Zoho Mail) and send a test email to it.

## 3. After any change to the legal pages

- Update `lastUpdated` in `frontend/src/lib/legal.ts`. If the change affects what data we collect, also tell
  existing clients.
- Never add Google Analytics, a Meta Pixel or any tracking tool without first updating the Cookie Policy and
  adding a consent banner (Accept / Reject).

## 4. Check before pushing

```bash
cd frontend && npx tsc --noEmit && npx next build
```

Then open the site and check: home page, footer, `/privacy`, `/terms`, `/cookies`, the booking form's last step,
and the chat assistant's greeting.
