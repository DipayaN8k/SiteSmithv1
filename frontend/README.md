# Agency website — frontend

Next.js 16 (App Router) + TypeScript + plain CSS. Fonts: Bricolage Grotesque (display) + Instrument Sans (body) + Geist Mono (accent only: labels, nav, captions, code). Palette: Instagram gradient on a Night (deep purple-black) background — `DEFAULT_THEME` in `site.ts`. Positioning: "AI can make a website. We make yours." — hand-coded by engineers, AI used as a tool. No backend integration yet; all API calls are mocked.

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
| All backend calls (currently mocked) | `src/lib/api.ts` |
| Design tokens (colors, type, spacing) | `src/app/globals.css` (`:root`) |
| Hero hand-coding editor (code types itself, site builds line by line) | `src/components/HandCoded.tsx` |
| Scratch ticket (3D tilt, coin teaser, reveals at 20%) | `src/components/ScratchServices.tsx` |
| Spark hunt (hidden collectibles → perk) | `src/components/Sparks.tsx` |
| Start-a-project wizard | `src/components/StartWizard.tsx` |

## Pages

- `/` — hero with hand-coding editor, scratch ticket (services), work, stats, process, FAQ, contact CTA
- `/why-us` — "Not prompted. Engineered." comparison + process
- `/work` — filterable project grid
- `/about` — studio + team
- `/start` — 3-question wizard (project type, business type, budget + timing) + contact form with consent and honeypot. Accepts `?plan=` and `?perk=`
- `/privacy` — draft privacy policy (linked from the consent checkbox; needs legal review)

## The flywheel

1. **Hook** — the hero editor shows a site being hand-coded line by line; the scratch card hides the services; draggable stickers.
2. **Explore** — 5 sparks are hidden across the site (hero, scratch card, work, process, footer). A counter appears after the first one.
3. **Reward** — finding all 5 unlocks a perk code.
4. **Convert** — "Claim with a project" opens the wizard with the perk code attached.
5. **Share** — "Dare a friend to beat it" shares the site with the visitor's spark-hunt time.

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

**Open question for the backend team:** `project_type`, `budget`, `timeline`, `message` and `perk_code` are sent but the backend has no fields for them yet, so it ignores them. Only name, email, phone, business type and consent are stored today.

## Placeholder content to replace before launch

- Brand name "Sitesmith", email, WhatsApp, Instagram, city
- Project names, results and the illustrated mockups (swap for real screenshots)
- Stats, team names and initials
- Testimonials and pricing were removed on purpose until real ones exist
- Perk offer (`perk` in `site.ts`)
