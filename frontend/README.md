# Agency website — frontend

Next.js 16 (App Router) + TypeScript + plain CSS. Fonts: Bricolage Grotesque (display) + Instrument Sans (body) + Geist Mono (accent only: labels, nav, captions, code). Palette: Instagram gradient with a background picker in the top bar (Night by default, plus Cream, Lavender) — `THEMES` / `DEFAULT_THEME` in `site.ts`. Positioning: "More customers. Not more templates." — hand-coded by engineers (AI only as a tool, never leading the message). The "Book a project" form posts to the backend (see "Backend integration" below); with no `NEXT_PUBLIC_API_URL` set it falls back to a mock.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

## Where things live

| What | File |
| --- | --- |
| Brand name, copy, services, projects, prices, FAQs | `src/lib/site.ts` |
| All backend calls (real API; mock only if `NEXT_PUBLIC_API_URL` is empty) | `src/lib/api.ts` |
| Design tokens (colors, type, spacing) | `src/app/globals.css` (`:root`) |
| Hero hand-coding editor (code types itself, site builds line by line) | `src/components/HandCoded.tsx` |
| Scratch ticket (3D tilt, coin teaser, reveals at 20%) | `src/components/ScratchServices.tsx` |
| Start-a-project wizard | `src/components/StartWizard.tsx` |

## Pages

- `/` — hero with hand-coding editor, scratch ticket (services), work, process, FAQ, contact CTA
- `/preview` — **"See your website" (main USP):** business name + type (+ what they do) → 7 ready-made designs (Bold, Clean, Editorial, Showcase, Split, Soft, Luxe; filter Light/Dark) with their name in, desktop/mobile toggle, "book it" pre-fills the booking form. Designs library: `src/lib/previews.ts` (8 categories incl. a generic "Something else"). Home page has a teaser that hands the typed name to /preview.
- `/why-us` — "Not prompted. Engineered." comparison + process
- `/work` — filterable project grid
- `/about` — studio + team
- `/start` — 3-question wizard (project type, business type, budget + timing) + contact form with consent and honeypot. Pre-filled when the visitor comes from a /preview design
- `/privacy` — draft privacy policy (linked from the consent checkbox; needs legal review)

## How visitors are pulled in

1. **Hook** — the hero code editor builds a site line by line; the scratch ticket hides the services.
2. **See it** — "See your website first" (/preview) shows four designs (Bold, Clean, Luxe, Complete) with real photos and motion, with the visitor's own business name.
3. **Convert** — "I like this one — book it" opens the booking form with business type and chosen design pre-filled.

## Backend integration (done)

The form posts to the backend's `POST /api/contact` (see `src/lib/api.ts`). Set `NEXT_PUBLIC_API_URL` in `.env.local` (local: `http://localhost:8000`). Leave it empty to run standalone with a mock.

Run both locally:

```bash
# terminal 1 — backend (Python 3.11+)
cd backend/saas-landing-page-main
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # set JWT_SECRET; add http://localhost:3000 to CORS_ORIGINS
PYTHONPATH=. alembic upgrade head
uvicorn app.main:app --port 8000

# terminal 2 — website
cd frontend && npm install && npm run dev
```

Before production: set the backend's `CORS_ORIGINS` to the live site address and `NEXT_PUBLIC_API_URL` to the live API address.

**Open question for the backend team:** `project_type`, `budget` and `message` are sent but the backend has no fields for them yet, so it ignores them. Only name, email, phone, business type and consent are stored today.

## Placeholder content to replace before launch

- Brand name "Sitesmith", email, WhatsApp, Instagram, city
- Project names, results and the illustrated mockups (swap for real screenshots)
- Team names and initials
- Testimonials and pricing were removed on purpose until real ones exist
