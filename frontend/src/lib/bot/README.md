# LoopBot

A small rule-based chat assistant that runs entirely in the visitor's browser. No server, no API key, no cost.
Everything it says comes from **`loopbot.json`**. You can change answers, prices, timelines and add new questions
without touching any code.

| File | What it is |
| --- | --- |
| `loopbot.json` | **The only file you normally edit.** All answers, contact details, budgets, greetings |
| `engine.ts` | The matching logic. Reads the JSON, no content of its own |
| `../../components/ChatBot.tsx` | The chat bubble and window (mounted in `app/layout.tsx`) |
| `../../../tests/bot.test.mjs` | Tests. Run with `npm run test:bot` from `frontend/` |

> ⚠️ Every number, price, timeline and policy in the JSON is a **placeholder**. Replace them with real ones
> before launch. Keep contact details in sync with `brand` in `src/lib/site.ts`.

## How it answers

1. **Topic match.** The visitor's message is cleaned up and scored against every topic's `keywords`.
   Phrases (two or more words, like `"how long"`) score 3, single words 2, and one-letter typos still count.
   The best topic wins if it reaches `settings.min_score` (default 2). On a tie, the topic that comes
   **first** in the file wins.
2. **Questions that need details.** A topic with an `ask` block first asks something ("What are you looking
   to build?") and answers from the chosen option. If the visitor already said it ("landing page price"), the
   bot skips the question.
3. **Small talk.** If no topic matches, short messages are checked against `greetings` and `exits`.
4. **Everything else** (gibberish, off-topic, empty or too long): the `fallback` reply, which sends them to
   **WhatsApp / Book a project**. If a visitor ignores a question twice, they also get the fallback.

## loopbot.json sections

| Section | Purpose |
| --- | --- |
| `settings` | Bot name, typing delay (ms), `min_score`, longest message accepted |
| `contact` | WhatsApp, phone, email, Instagram, city, hours. Used as `{whatsapp}` `{phone}` `{email}` `{instagram}` `{city}` `{hours}` in answers and for the buttons |
| `pricing_note` | A reusable sentence ("Not happy with the pricing? Contact us on WhatsApp..."). Write `{pricing_note}` in any answer to include it |
| `budgets` | The budget ranges you work with. Shows up as `{budgets}` |
| `services` | Your features and services (including deployment). Shows up as `{services}` |
| `welcome` | First message, plus `quick_replies`: topic ids shown as buttons |
| `greetings` | `triggers` (words that count as hello) and one-line `replies` (picked at random) |
| `exits` | Same for thanks and goodbye, with optional `buttons` |
| `fallback` | What to say for gibberish or off-topic, plus `buttons` |
| `topics` | The questions and answers. This is the big one |

Any key that starts with `_` (like `_help`) is a note and is ignored.

## Adding a question

Add an object to the `topics` array:

```json
{
  "id": "warranty",
  "title": "Is there a warranty?",
  "keywords": ["warranty", "guarantee", "bug fixes", "free fixes"],
  "answer": "Yes, 30 days of free fixes after launch.",
  "buttons": ["whatsapp", "topic:pricing"]
}
```

- `id`: a unique short name with no spaces. Other topics link to it as `"topic:warranty"`.
- `title`: shown on the button when another topic links to this one.
- `keywords`: the words people might use. Add plenty. Use short phrases for intent (`"how much does"`) and
  single words for subjects (`"warranty"`). Avoid very common words (`"time"`, `"page"`), because they
  match the wrong questions.
- `answer`: the reply. You can use `{whatsapp}`, `{budgets}` and the other tokens, and `\n` for a new line.
- `buttons` (optional): see below.

Add the id to `welcome.quick_replies` if you want it as a starter button.

### A question that asks first (like timeline and pricing)

Use `ask` instead of `answer`:

```json
{
  "id": "revisions_cost",
  "title": "Do revisions cost extra?",
  "keywords": ["extra revisions", "more revisions"],
  "ask": {
    "question": "Which stage are you asking about?",
    "options": [
      { "label": "Before launch",  "keywords": ["before", "design stage"], "answer": "Revisions before launch are free." },
      { "label": "After launch",   "keywords": ["after", "later"],         "answer": "Small fixes are free for 30 days." }
    ]
  },
  "buttons": ["whatsapp"]
}
```

Each option's `label` becomes a button. `keywords` help match what people type instead of clicking.

Keep option `label`s identical across `ask` topics (e.g. the same four project types in `delivery` and `pricing`): the bot remembers the visitor's choice and reuses it, so it never asks the same question twice. Optional `weak_keywords` are generic words that only count when the visitor is answering the question. See `BOT.md` at the repo root for the full guide.

### Buttons

| Value | Shows |
| --- | --- |
| `"whatsapp"` | Chat on WhatsApp (opens `wa.me` with `contact.whatsapp_prefill`) |
| `"book"` | Book a project (`/start`) |
| `"email"` / `"call"` / `"instagram"` | mailto / tel / your Instagram page |
| `"topic:<id>"` | A button that asks the bot about another topic |
| `{ "label": "See our work", "href": "/work" }` | Any link. Paths starting with `/` stay on the site |

## Changing prices and timelines

They are the `answer` lines inside the `delivery` and `pricing` topics' `ask.options`. To change the
budget list, edit `budgets`.

## After editing

1. Keep the file valid JSON: commas between items, double quotes, no trailing comma.
2. Run `npm run test:bot` from `frontend/`. It checks the JSON is consistent (unique ids, no broken
   button links) and the bot still answers correctly.
3. Try it on the site. A page refresh picks up the change in dev mode.
4. If a question goes to the wrong topic, add more specific keywords to the right topic. Prefer phrases
   over single words. If two topics tie, move the right one earlier in the list.
