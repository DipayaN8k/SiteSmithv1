// SmithBot engine: turns a visitor's text into a reply using only smithbot.json.
// Pure functions, no imports, so it is easy to test (see frontend/tests/bot.test.mjs).

type ButtonSpec = string | { label: string; href: string };
type AskOption = { label: string; keywords?: string[]; weak_keywords?: string[]; answer: string };
export type Topic = {
  id: string;
  title: string;
  keywords: string[];
  answer?: string;
  ask?: { question: string; options: AskOption[] };
  buttons?: ButtonSpec[];
};
export type BotConfig = {
  settings: { bot_name: string; typing_delay_ms: number; min_score: number; max_input_length: number };
  contact: Record<string, string>;
  pricing_note?: string; // reusable sentence: write {pricing_note} in any answer
  budgets: string[];
  services: string[];
  welcome: { message: string; quick_replies: string[] };
  greetings: { triggers: string[]; replies: string[] };
  exits: { triggers: string[]; replies: string[]; buttons?: ButtonSpec[] };
  fallback: { replies: string[]; buttons?: ButtonSpec[] };
  topics: Topic[];
};

/** What the chat UI renders under a message. */
export type Button =
  | { kind: "link"; label: string; href: string }  // opens a page, WhatsApp, mailto, tel...
  | { kind: "topic"; label: string; topic: string } // asks the bot about a topic
  | { kind: "say"; label: string };                 // sends the label as the visitor's reply
export type BotMessage = { text: string; buttons: Button[] };
export type BotState = {
  pending: { topicId: string; misses: number } | null; // a question we asked and are waiting on
  project: string | null;  // the project type they already told us (an option label), so we never ask twice
  visited: string[];       // topics already answered, so follow-up buttons don't send them in circles
};
export const initialState: BotState = { pending: null, project: null, visited: [] };

// ---------- text helpers ----------

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, "") // don't -> dont, let's -> lets
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** How well `text` matches a list of keywords. Phrases count most; one-letter typos still match. */
export function score(text: string, keywords: string[]): number {
  const norm = normalize(text);
  if (!norm) return 0;
  const padded = ` ${norm} `;
  const tokens = norm.split(" ");
  let total = 0;
  const used = new Set<string>(); // each typed word scores once, so "include" + "included" don't double up
  for (const raw of keywords) {
    const k = normalize(raw);
    if (!k) continue;
    if (k.includes(" ")) {
      if (padded.includes(` ${k} `) || padded.includes(` ${k}s `)) total += 3; // "online store" also matches "online stores"
      continue;
    }
    const hit =
      tokens.find((t) => t === k) ??
      (k.length >= 4 ? tokens.find((t) => t.startsWith(k)) : undefined) ?? // website -> websites
      (k.length >= 5 ? tokens.find((t) => t.length >= 5 && editDistance(t, k) <= (k.length >= 8 ? 2 : 1)) : undefined); // pricng -> pricing
    if (hit && !used.has(hit)) { used.add(hit); total += 2; }
  }
  return total;
}

function pick<T>(list: T[], rand: () => number): T {
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

// ---------- the bot ----------

export function createBot(config: BotConfig, rand: () => number = Math.random) {
  const { contact, settings } = config;
  const topics = new Map(config.topics.map((t) => [t.id, t]));

  const fill = (text: string) =>
    text
      .replace(/\{bot_name\}/g, settings.bot_name)
      .replace(/\{pricing_note\}/g, config.pricing_note ?? "")
      .replace(/\{budgets\}/g, config.budgets.join(" · "))
      .replace(/\{services\}/g, config.services.map((s) => `• ${s}`).join("\n"))
      .replace(/\{(\w+)\}/g, (m, key: string) => contact[key] ?? m);

  const digits = (s: string) => s.replace(/\D/g, "");

  function button(spec: ButtonSpec): Button | null {
    if (typeof spec !== "string") return { kind: "link", label: spec.label, href: spec.href };
    if (spec.startsWith("topic:")) {
      const t = topics.get(spec.slice(6));
      return t ? { kind: "topic", label: t.title, topic: t.id } : null;
    }
    switch (spec) {
      case "whatsapp": {
        const text = contact.whatsapp_prefill ? `?text=${encodeURIComponent(contact.whatsapp_prefill)}` : "";
        return { kind: "link", label: "Chat on WhatsApp", href: `https://wa.me/${digits(contact.whatsapp ?? "")}${text}` };
      }
      case "book": return { kind: "link", label: "Book a project", href: "/start" };
      case "email": return { kind: "link", label: "Email us", href: `mailto:${contact.email}` };
      case "call": return { kind: "link", label: "Call us", href: `tel:+${digits(contact.phone ?? "")}` };
      case "instagram": return { kind: "link", label: "Instagram", href: contact.instagram_url };
      default: return null;
    }
  }

  /** Follow-up buttons. Topics already covered are left out, so Pricing -> Budgets -> Pricing can't loop. */
  const buttons = (specs: ButtonSpec[] = [], seen: string[] = []): Button[] =>
    specs
      .filter((spec) => !(typeof spec === "string" && spec.startsWith("topic:") && seen.includes(spec.slice(6))))
      .map(button)
      .filter((b): b is Button => b !== null);

  const remember = (state: BotState, topicId: string, project?: string | null): BotState => ({
    pending: null,
    project: project ?? state.project,
    visited: state.visited.includes(topicId) ? state.visited : [...state.visited, topicId],
  });

  function ask(topic: Topic, state: BotState): { message: BotMessage; state: BotState } {
    return {
      message: {
        text: fill(topic.ask!.question),
        buttons: topic.ask!.options.map((o) => ({ kind: "say" as const, label: o.label })),
      },
      state: { ...state, pending: { topicId: topic.id, misses: state.pending?.topicId === topic.id ? state.pending.misses : 0 } },
    };
  }

  /** Which option of an 'ask' topic the text names, if any. */
  function chooseOption(topic: Topic, text: string, allowWeak = false): AskOption | null {
    let chosen: AskOption | null = null;
    let chosenScore = 0;
    for (const o of topic.ask?.options ?? []) {
      const s = normalize(o.label) === normalize(text) ? 99 : score(text, [o.label, ...(o.keywords ?? [])]);
      if (s > chosenScore) { chosen = o; chosenScore = s; }
    }
    if (chosenScore >= settings.min_score) return chosen;
    // Nothing specific matched. When they are answering our question, generic words ("a website")
    // pick an option as a last resort. In a fresh question they don't, so we still ask.
    if (!allowWeak) return null;
    return topic.ask?.options.find((o) => o.weak_keywords && score(text, o.weak_keywords) > 0) ?? null;
  }

  function answerTopic(topic: Topic, state: BotState, text?: string) {
    if (topic.ask) {
      // Skip the question when they already said which one: in this message ("landing page price")
      // or earlier in the chat (asked about price, now asks about time).
      const direct =
        (text ? chooseOption(topic, text) : null) ??
        topic.ask.options.find((o) => state.project !== null && normalize(o.label) === normalize(state.project)) ??
        null;
      if (direct) {
        return {
          message: { text: fill(direct.answer), buttons: buttons(topic.buttons, [...state.visited, topic.id]) },
          state: remember(state, topic.id, direct.label),
        };
      }
      return ask(topic, state);
    }
    return {
      message: { text: fill(topic.answer ?? ""), buttons: buttons(topic.buttons, [...state.visited, topic.id]) },
      state: remember(state, topic.id),
    };
  }

  const fallback = (state: BotState = initialState) => ({
    message: { text: fill(pick(config.fallback.replies, rand)), buttons: buttons(config.fallback.buttons) },
    state: { ...state, pending: null },
  });

  /** Best topic for the text, or null when nothing clears the minimum score. */
  function bestTopic(text: string): Topic | null {
    let best: Topic | null = null;
    let bestScore = 0;
    for (const t of config.topics) {
      const s = score(text, t.keywords);
      if (s > bestScore) { best = t; bestScore = s; }
    }
    return bestScore >= settings.min_score ? best : null;
  }

  const welcome = (): BotMessage => ({
    text: fill(config.welcome.message),
    buttons: config.welcome.quick_replies.map((id) => button(`topic:${id}`)).filter((b): b is Button => b !== null),
  });

  return {
    config,
    welcome,

    /** The visitor clicked a topic button. */
    topic(id: string, state: BotState = initialState) {
      const t = topics.get(id);
      return t ? answerTopic(t, state) : fallback(state);
    },

    /** The visitor typed (or clicked an option). */
    reply(input: string, state: BotState = initialState): { message: BotMessage; state: BotState } {
      const text = input.trim();
      if (!text || text.length > settings.max_input_length) return fallback(state);

      // Mid-question ("What are you looking to build?"): try to read the answer first.
      if (state.pending) {
        const t = topics.get(state.pending.topicId);
        if (t?.ask) {
          const chosen = chooseOption(t, text, true);
          if (chosen) {
            return {
              message: { text: fill(chosen.answer), buttons: buttons(t.buttons, [...state.visited, t.id]) },
              state: remember(state, t.id, chosen.label),
            };
          }
          // Not an answer. A clear question on another topic wins; otherwise re-ask once, then give up politely.
          const other = bestTopic(text);
          if (!other && state.pending.misses < 1) {
            return {
              message: { text: "Please pick one of these so I can give you the right answer.", buttons: t.ask.options.map((o) => ({ kind: "say" as const, label: o.label })) },
              state: { ...state, pending: { topicId: t.id, misses: state.pending.misses + 1 } },
            };
          }
          if (!other) return fallback(state);
          return answerTopic(other, { ...state, pending: null }, text);
        }
      }

      const topic = bestTopic(text);
      if (topic) return answerTopic(topic, state, text);

      // Nothing about the business matched: friendly small talk, otherwise hand off to a human.
      const tokens = normalize(text);
      const isShort = tokens.split(" ").length <= 4;
      if (isShort && score(text, config.greetings.triggers) > 0) {
        return { message: { text: fill(pick(config.greetings.replies, rand)), buttons: welcome().buttons }, state: { ...state, pending: null } };
      }
      if (isShort && score(text, config.exits.triggers) > 0) {
        return { message: { text: fill(pick(config.exits.replies, rand)), buttons: buttons(config.exits.buttons) }, state: { ...state, pending: null } };
      }
      return fallback(state);
    },
  };
}
