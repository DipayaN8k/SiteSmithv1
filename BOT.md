# SmithBot: how to add and change rules

SmithBot is the chat assistant on the public website (the "Ask SmithBot" button, bottom-right of every page).
It is a **rule-based bot**: no AI, no server, no API key, no running cost. It runs in the visitor's browser and
only says what is written in one file:

```
frontend/src/lib/bot/smithbot.json
```

You can add, change or remove answers there **without touching any code**. This guide explains how.

> ⚠️ Every price, timeline, payment line and policy currently in the file is a **placeholder**. Replace them
> with real ones before launch.

## 1. Where things live

| File | What it is |
| --- | --- |
| `frontend/src/lib/bot/smithbot.json` | **The only file you normally edit.** All answers and settings |
| `frontend/src/lib/bot/engine.ts` | The matching logic. Has no content of its own |
| `frontend/src/components/ChatBot.tsx` | The chat bubble and window, mounted in `frontend/src/app/layout.tsx` |
| `frontend/tests/bot.test.mjs` | Automated checks. Run them after every edit (section 8) |
| `frontend/src/lib/bot/README.md` | Shorter reference that sits next to the file |

## 2. How the bot decides what to say

1. The visitor's message is lower-cased and stripped of punctuation.
2. It is scored against the `keywords` of every topic:
   - a **phrase** of two or more words (e.g. `"how long"`) scores **3** when it appears in the message;
   - a **single word** (e.g. `"pricing"`) scores **2**, and also matches longer forms (`"websites"` matches
     `"website"`) and one-letter typos (`"pricng"`);
   - each word the visitor typed counts once.
3. The topic with the highest score wins, if it reaches `settings.min_score` (default **2**). On a tie, the
   topic that comes **first** in the file wins.
4. If the topic has an `ask` block, the bot first asks a question and answers from the option chosen
   (section 4). If the visitor already named it ("landing page price"), the question is skipped.
5. If no topic matches, short messages are checked for greetings ("hi") and goodbyes ("thanks"). Anything
   else is **gibberish or out of scope**, so the bot sends the `fallback` reply: *please contact us on
   WhatsApp or book a project*, with those two buttons.

## 3. Adding a new question and answer

Open `smithbot.json`, find the `"topics"` list and add an object. Mind the commas between items.

```json
{
  "id": "warranty",
  "title": "Is there a warranty?",
  "keywords": ["warranty", "guarantee", "bug fixes", "free fixes", "if something breaks"],
  "answer": "Yes, we fix bugs for free for 30 days after launch.",
  "buttons": ["whatsapp", "topic:pricing"]
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Short unique name, no spaces. Other topics link to it as `"topic:warranty"` |
| `title` | yes | The label on a button when another topic links here |
| `keywords` | yes | Words or phrases visitors might use (section 5) |
| `answer` | yes (unless `ask`) | What the bot replies. `\n` makes a new line |
| `buttons` | no | Buttons shown under the answer (section 6) |

To show it as one of the starter buttons when the chat opens, add its `id` to `welcome.quick_replies`.

### Values you can drop into any answer

Write these in an answer and the bot fills them in from the file:

| Write | Becomes |
| --- | --- |
| `{whatsapp}` `{phone}` `{email}` | The values in the `contact` section |
| `{instagram}` `{city}` `{hours}` | Same |
| `{budgets}` | The list in `budgets`, joined with " · " |
| `{pricing_note}` | The sentence in `pricing_note` at the top of the file: *"Not happy with the pricing? Contact us on WhatsApp ... "*. Already used in every pricing and budget answer. Put it in any answer where you want to invite unhappy visitors to WhatsApp, and edit the sentence once to change it everywhere |
| `{services}` | The list in `services`, as bullet points |

Change a phone number once in `contact` and every answer updates. Keep it in sync with `brand` in
`frontend/src/lib/site.ts`, which the rest of the website uses.

## 4. A question that asks first (timelines, pricing)

Use `ask` instead of `answer` when the reply depends on something the visitor hasn't said yet. This is how
"How long will it take?" first asks what they are building, then gives an estimate.

```json
{
  "id": "revision_cost",
  "title": "Do revisions cost extra?",
  "keywords": ["extra revisions", "more revisions", "revision cost"],
  "ask": {
    "question": "Which stage are you asking about?",
    "options": [
      { "label": "Before launch", "keywords": ["before", "design stage"], "answer": "Revisions before launch are free." },
      { "label": "After launch",  "keywords": ["after", "later"],         "answer": "Small fixes are free for 30 days." }
    ]
  },
  "buttons": ["whatsapp"]
}
```

- Each option's `label` becomes a button the visitor can tap.
- An option's `keywords` help when the visitor types instead of tapping.
- If the visitor ignores the question twice, the bot gives up politely with the fallback reply.
- The `buttons` list is shown under the final answer.
- **Weak keywords (optional).** `"weak_keywords"` on an option are generic words that pick that option only
  when the visitor is *answering the question* and nothing more specific matched. For example "I want a
  website" picks "Business website", while "redesign my website" still picks "Redesign". They are never used
  to skip the question on a fresh message.

### The bot remembers (so it never loops)

- **It asks each thing once.** When the visitor tells it their project type (any option of any `ask`
  topic), the bot remembers it. Later `ask` topics reuse the answer instead of asking again, so someone who
  asks about price and then about timeline gets the timeline straight away. **For this to work, keep the
  option `label`s identical across topics** (the same four labels in `delivery` and `pricing`). A new `ask`
  topic should reuse those labels.
- **Follow-up buttons skip what was already covered.** If someone has seen *Pricing*, other topics won't offer
  a "How much does it cost?" button again, so Pricing, Budgets and Delivery can't send a visitor round in a
  circle. Link buttons (`whatsapp`, `book`, `email` and so on) always stay, so there is always a way forward.
- Typing a clear question on another topic while the bot is waiting for an answer switches topic and drops
  the pending question.

## 5. Writing good keywords

Keywords decide whether a question reaches the right answer.

- **Cover the different ways people ask.** For delivery time: `"how long"`, `"deadline"`, `"turnaround"`,
  `"ready by"`, `"how soon"`.
- **Use phrases for intent, single words for subjects.** `"how much does"` shows someone is asking about
  price. `"warranty"` is specific enough alone.
- **Avoid common words** such as `"time"`, `"page"`, `"online"`, `"order"`, `"work"`. They appear in
  unrelated questions and send them to the wrong topic.
- **No need to list plurals or small typos.** `"website"` already covers `"websites"` and `"websit"`
  (for words of five or more letters).
- **Apostrophes are ignored.** Write `"dont like"`, not `"don't like"`.
- **Don't repeat the same idea in many overlapping keywords.** Each phrase that matches adds to the score,
  so a topic with ten near-identical phrases can overpower a better one.

## 6. Buttons

Buttons go in a topic's `buttons` list (and in `fallback.buttons` and `exits.buttons`).

| Write | Shows |
| --- | --- |
| `"whatsapp"` | "Chat on WhatsApp". Opens WhatsApp with your `contact.whatsapp_prefill` text |
| `"book"` | "Book a project" (goes to `/start`) |
| `"email"` | "Email us" (opens the visitor's mail app) |
| `"call"` | "Call us" |
| `"instagram"` | "Instagram" (opens `contact.instagram_url`) |
| `"topic:<id>"` | A button that asks the bot about another topic, e.g. `"topic:pricing"` |
| `{ "label": "See our work", "href": "/work" }` | Any link. A path starting with `/` stays on the site, and `https://...` opens a new tab |

## 7. Other things you can edit

| Section | What to change |
| --- | --- |
| `settings` | `bot_name`, `typing_delay_ms` (the "typing…" pause), `min_score` (raise to 3 to make matching stricter), `max_input_length` |
| `contact` | WhatsApp, phone, email, Instagram, city, hours |
| `pricing_note` | The reusable "not happy with the pricing? contact us on WhatsApp" sentence (see the table in section 3) |
| `budgets` | The budget ranges you work with |
| `services` | Your features and services, including deployment |
| `welcome` | The opening message and the starter buttons |
| `greetings` | `triggers` (words that count as hello) and one-line `replies`, picked at random |
| `exits` | The same for thanks and goodbye |
| `fallback` | The reply for gibberish and off-topic messages. Keep a WhatsApp and a Book button here |

To change the timeline estimates or prices, edit the `answer` lines inside the `delivery` and `pricing`
topics (under `ask` then `options`). To remove an answer, delete its object and any `"topic:<id>"` button
that points to it (the tests flag a broken one).

Any key starting with `_` (like `_help`) is a note and is ignored, so you can leave reminders to yourself.

### Topics that are already in the file

Replace the placeholder answers, or delete any topic you don't want:

| Area | Topic ids |
| --- | --- |
| Money | `pricing`, `pricing_concern` (too expensive, discount, negotiate), `budgets`, `payment`, `renewal` (yearly domain and hosting charges), `cancel` (cancel and refunds) |
| Timeline and process | `delivery`, `process`, `response_time`, `revisions`, `book` |
| What you offer | `services`, `pages`, `ecommerce`, `custom` (booking, logins, web or mobile apps), `integrations`, `languages`, `seo`, `mobile` |
| Domain and hosting | `deployment`, `business_email`, `security`, `ownership` |
| After launch | `editing`, `training` |
| Trust | `why`, `team`, `reviews`, `privacy` (NDA), `preview`, `work` |
| Contact | `contact`, `whatsapp`, `social`, `location`, `outside_india`, `human`, `about_bot` |
| Content | `content` |

`pricing_concern` sits right before `pricing` on purpose: when both match, the earlier one wins, so "that's too
expensive" goes to WhatsApp instead of back into the pricing question.

## 8. After every edit

1. **Keep the file valid JSON.** Commas between items, double quotes only, **no comma after the last item**.
   An error here stops the website from building.
2. **Run the checks** from the `frontend/` folder:

   ```bash
   npm run test:bot
   ```

   They verify that topic ids are unique, every button link points to a real topic, every topic has an
   answer, and a set of sample questions still lands on the right answer. The checks need Node 22.18 or newer (they run the TypeScript engine directly). The website itself builds on Node 20.9+, so an older Node can still run the site but not these checks.
3. **Try it on the site.** In dev mode (`npm run dev`) a page refresh picks up the change.
4. **Wrong answer?** If a question goes to the wrong topic, add more specific keywords (prefer phrases) to the
   right one, or move it earlier in the list so it wins ties. If a topic steals questions, remove its vaguest
   keywords. Add the failing question to `frontend/tests/bot.test.mjs` so it stays fixed.
5. **Commit** `smithbot.json` with the rest of your changes. Nothing else needs a rebuild step beyond the
   normal website deploy.

## 9. What the bot cannot do

- It doesn't understand meaning, only the keywords you give it. A new way of phrasing a question may not
  match until you add it.
- It remembers only the project type and which topics were covered, for the current chat window. It doesn't save the conversation, and a page refresh starts over.
- It doesn't send anything to your backend, so you won't see unanswered questions. When it can't answer, it
  hands the visitor to WhatsApp or the booking form.

If you outgrow keywords later, the engine can be swapped for a smarter matcher without changing this JSON
file or the chat window.

## 10. Start over

The chat window has a **Start over** button in its header (it appears once the conversation has started). It
clears the messages and also what the bot remembers (the project type and which topics were covered), then
shows the greeting and starter buttons again. Closing and reopening the window keeps the conversation;
refreshing the page starts fresh.

## 11. Appearance

The window, bubbles and buttons use the website's theme colours, so it looks right in **Night, Cream and
Lavender**. The header and the visitor's message bubbles use a slightly deeper gradient so white text stays
readable on every theme. The styles are in `frontend/src/app/globals.css` under "SmithBot".
