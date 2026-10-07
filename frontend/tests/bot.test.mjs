// Run with: npm run test:bot  (uses Node's built-in test runner, no extra packages)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createBot, initialState, normalize } from "../src/lib/bot/engine.ts";

const config = JSON.parse(readFileSync(new URL("../src/lib/bot/sparrowbot.json", import.meta.url), "utf8"));
const bot = createBot(config, () => 0); // rand=0 -> always the first canned reply

const ask = (text, state = initialState) => bot.reply(text, state);
const labels = (m) => m.message.buttons.map((b) => b.label);
const isHandoff = (m) =>
  m.message.text === config.fallback.replies[0] &&
  m.message.buttons.some((b) => b.kind === "link" && b.href.startsWith("https://wa.me/")) &&
  m.message.buttons.some((b) => b.kind === "link" && b.href === "/start");

test("config is internally consistent", () => {
  const ids = new Set(config.topics.map((t) => t.id));
  assert.equal(ids.size, config.topics.length, "duplicate topic id");
  for (const id of config.welcome.quick_replies) assert.ok(ids.has(id), `welcome quick_reply ${id}`);
  const specs = [
    ...config.topics.flatMap((t) => t.buttons ?? []),
    ...(config.exits.buttons ?? []),
    ...(config.fallback.buttons ?? []),
  ];
  for (const s of specs) {
    if (typeof s === "string" && s.startsWith("topic:")) assert.ok(ids.has(s.slice(6)), `button ${s}`);
    else if (typeof s === "string") assert.ok(["whatsapp", "book", "email", "call", "instagram"].includes(s), `button ${s}`);
  }
  for (const t of config.topics) assert.ok(t.answer || t.ask, `topic ${t.id} needs answer or ask`);
});

test("welcome shows quick replies", () => {
  const w = bot.welcome();
  assert.match(w.text, /SparrowBot/);
  assert.equal(w.buttons.length, config.welcome.quick_replies.length);
});

test("delivery asks what you need, then gives the estimate", () => {
  const first = ask("how long will it take?");
  assert.match(first.message.text, /what are you looking to build/i);
  assert.deepEqual(labels(first), ["Landing page", "Business website", "Online store", "Redesign"]);
  assert.ok(first.state.pending);
  const second = ask("Online store", first.state);
  assert.match(second.message.text, /1 to 2 weeks/);
  assert.equal(second.state.pending, null);
});

test("typed free-text answers to the question work too", () => {
  const first = ask("how many days for delivery");
  const second = ask("i want to sell products online", first.state);
  assert.match(second.message.text, /weeks/);
});

test("pricing asks, then gives a range", () => {
  const first = ask("how much does a website cost");
  const second = ask("landing page", first.state);
  assert.match(second.message.text, /₹5k – ₹10k/);
});

test("changing topic mid-question works", () => {
  const first = ask("how long does it take");
  const second = ask("what is your phone number", first.state);
  assert.match(second.message.text, /\+91 62918 45804/);
});

test("contact, social, budgets and services include the details", () => {
  assert.match(ask("contact number please").message.text, /\+91 62918 45804/);
  assert.match(ask("do you have instagram").message.text, /@sparrowgen\.in/);
  assert.match(ask("what budget do you work with").message.text, /Under ₹5k/);
  const services = ask("what services do you offer").message.text;
  assert.match(services, /Domain and hosting/);
  assert.match(ask("do you handle deployment and hosting").message.text, /domain and hosting/i);
});

test("contact answer offers WhatsApp, email, call, instagram buttons with real links", () => {
  const hrefs = ask("how do i contact you").message.buttons.map((b) => b.href);
  assert.ok(hrefs.some((h) => h.startsWith("https://wa.me/916291845804?text=")));
  assert.ok(hrefs.includes("mailto:hello@sparrowgen.in"));
  assert.ok(hrefs.includes("tel:+916291845804"));
  assert.ok(hrefs.includes("https://instagram.com/sparrowgen.in"));
});

test("answers right away when the question already names the project type", () => {
  const price = ask("landing page price");
  assert.match(price.message.text, /₹5k – ₹10k/);
  assert.equal(price.state.pending, null);
  assert.match(ask("how long to build an online shop").message.text, /1 to 2 weeks/);
});

test("common questions land on the right topic", () => {
  const cases = {
    "is hosting included": /domain and hosting/i,
    "how do i pay": /payment schedule/i,
    "do you give gst invoice": /payment schedule/i,
    "who are you": /SparrowBot/,
    "are you a bot": /SparrowBot/,
    "can i see a sample": /free preview/i,
    "where is your office": /Kolkata/,
    "will you maintain it after launch": /after launch/i,
    "i dont like the design": /approve the design/i,
    "can you make an online shop for my clothes": /mobile-first/i,
    "what budget do you work with": /Under ₹5k/,
  };
  for (const [q, re] of Object.entries(cases)) assert.match(ask(q).message.text, re, q);
});

test("a generic answer like 'a website' picks Business website, but specific words win", () => {
  const q = ask("how much does it cost");
  assert.match(ask("I want a website", q.state).message.text, /₹10k – ₹15k/);
  assert.match(ask("how much to redesign my website").message.text, /₹5k – ₹15k/);
  assert.match(ask("how long for an online store website").message.text, /1 to 2 weeks/);
});

test("never asks the same question twice: it remembers the project type", () => {
  let r = ask("how much does it cost");
  r = ask("Online store", r.state);
  assert.match(r.message.text, /₹10k – ₹15k/);
  assert.equal(r.state.project, "Online store");
  // later, a different question reuses the answer instead of asking again
  r = bot.topic("delivery", r.state);
  assert.match(r.message.text, /1 to 2 weeks/);
  assert.equal(r.state.pending, null);
});

test("follow-up buttons never send the visitor in circles", () => {
  let r = ask("how much does it cost");
  r = ask("Landing page", r.state);
  assert.ok(r.message.buttons.some((b) => b.topic === "budgets"), "budgets offered after pricing");
  r = bot.topic("budgets", r.state);
  assert.ok(!r.message.buttons.some((b) => b.topic === "pricing"), "pricing must not be offered again");
  assert.ok(r.message.buttons.some((b) => b.href === "/start"), "still ends with Book");
});

test("clicking Pricing, Budgets, Pricing, Budgets ends in an answer every time", () => {
  let r = bot.topic("pricing");
  r = ask("Redesign", r.state);
  for (const id of ["budgets", "pricing", "budgets", "pricing", "delivery"]) {
    r = bot.topic(id, r.state);
    assert.equal(r.state.pending, null, `${id} left a question hanging`);
    assert.doesNotMatch(r.message.text, /what do you need|what are you looking to build/i, id);
  }
});

test("pricing answers tell unhappy visitors to contact WhatsApp", () => {
  const first = ask("how much does it cost");
  for (const label of ["Landing page", "Business website", "Online store", "Redesign"]) {
    const r = ask(label, first.state);
    assert.match(r.message.text, /Not happy with the pricing\? Contact us on WhatsApp \(\+91 62918 45804\)/, label);
    assert.ok(r.message.buttons.some((b) => b.href?.startsWith("https://wa.me/")), `${label} has a WhatsApp button`);
  }
  const budgets = ask("what budget do you work with");
  assert.match(budgets.message.text, /Not happy with the pricing/);
  assert.ok(budgets.message.buttons.some((b) => b.href?.startsWith("https://wa.me/")));
});

test("price complaints go to WhatsApp, not back into the pricing question", () => {
  for (const q of [
    "it is too expensive", "can you give a discount", "I am not satisfied with the pricing", "can I negotiate the price",
    "that's over my budget", "I can't afford this", "any cheaper option",
  ]) {
    const r = ask(q);
    assert.match(r.message.text, /contact us on WhatsApp/i, q);
    assert.equal(r.state.pending, null, q);
    assert.ok(r.message.buttons.some((b) => b.href?.startsWith("https://wa.me/")), q);
  }
});

test("the extra FAQ topics each answer their question", () => {
  const cases = {
    "will it work on mobile": /mobile-first/,
    "is my site safe from hackers": /HTTPS/,
    "do I own the code": /belong to you/,
    "how many pages do I get": /5 to 15 pages/,
    "can you do hindi": /multilingual/,
    "can you integrate google maps": /Google Maps/,
    "do I pay yearly for hosting": /yearly charges/,
    "how fast will you reply": /within a day/,
    "can you build a booking system": /custom features/,
    "do you build mobile apps": /mobile app/,
    "who will build my website": /in-house/,
    "do you work with clients in dubai": /anywhere/,
    "can you sign an nda": /NDA/,
    "what if I want to cancel": /stop at any point/,
    "can I get a refund": /stop at any point/,
    "can I have a business email": /hello@yourbusiness\.com/,
    "will you teach me to use it": /short guide/,
    "do you have reviews": /testimonials/,
    "can i trust you": /testimonials/,
    "do you build online stores": /mobile-first/,
  };
  for (const [q, re] of Object.entries(cases)) assert.match(ask(q).message.text, re, q);
});

test("older topics still route correctly after the new FAQs", () => {
  const cases = {
    "how do i contact you": /WhatsApp or phone/,
    "is hosting included": /domain and hosting/i,
    "what services do you offer": /Here's what we provide/,
    "how do i pay": /payment schedule/,
    "show me your work": /Work page/,
    "where are you based": /Kolkata/,
    "i dont like the design": /approve the design/i,
    "talk to a person": /contact our team/,
  };
  for (const [q, re] of Object.entries(cases)) assert.match(ask(q).message.text, re, q);
});

test("phrases also match their plural", () => {
  assert.match(ask("do you build online stores").message.text, /mobile-first/);
});

test("a first-time visitor gets context: the welcome says who we are, buttons make sense alone", () => {
  const w = bot.welcome();
  assert.match(w.text, /SparrowBot/);
  assert.match(w.text, /Sparrowgen/, "brand is filled in");
  assert.match(w.text, /websites/i, "says what we build");
  assert.doesNotMatch(w.text, /[{}]/, "no unfilled placeholders");
  for (const b of w.buttons) {
    assert.ok(b.label.split(" ").length >= 4, `starter button too short: ${b.label}`);
    assert.doesNotMatch(b.label, /it/i, `starter button relies on context ("it"): ${b.label}`);
  }
});

test("every topic title stands on its own (no 'it' that needs context)", () => {
  for (const t of config.topics) assert.doesNotMatch(t.title, /it/i, t.title);
});

test("no answer shows an unfilled {placeholder} or 'undefined'", () => {
  for (const t of config.topics) {
    const r = bot.topic(t.id);
    for (const text of [r.message.text, ...(t.ask?.options ?? []).map((o) => bot.reply(o.label, r.state).message.text)]) {
      assert.doesNotMatch(text, /[{}]|undefined/, `${t.id}: ${text}`);
    }
  }
});

test("typos still match", () => {
  assert.match(ask("pricng").message.text, /what do you need/i);
  assert.match(ask("whats the deliverry time").message.text, /what are you looking to build/i);
});

test("greetings and goodbyes", () => {
  assert.equal(ask("hi").message.text, config.greetings.replies[0]);
  assert.equal(ask("Hello!!").message.text, config.greetings.replies[0]);
  assert.equal(ask("thanks").message.text, config.exits.replies[0]);
  assert.equal(ask("ok bye").message.text, config.exits.replies[0]);
});

test("a greeting plus a question answers the question", () => {
  assert.match(ask("hi, how long does a site take").message.text, /what are you looking to build/i);
});

test("garbage and out-of-domain questions hand off to WhatsApp / Book", () => {
  for (const q of ["asdfghjkl", "???", "!!!!", "12345", "what is the weather today", "tell me a joke", "who won the world cup", "🙂🙂", "qwerty uiop zxcv"]) {
    assert.ok(isHandoff(ask(q)), `expected handoff for: ${q}`);
  }
  assert.ok(isHandoff(ask("")));
  assert.ok(isHandoff(ask("x".repeat(config.settings.max_input_length + 1))));
});

test("ignoring the question twice hands off instead of looping", () => {
  const first = ask("how long does it take");
  const second = ask("asdf", first.state);
  assert.match(second.message.text, /pick one/i);
  const third = ask("qwerty", second.state);
  assert.ok(isHandoff(third));
  assert.equal(third.state.pending, null);
});

test("topic buttons work and unknown ids hand off", () => {
  assert.match(bot.topic("process").message.text, /four steps/);
  assert.ok(isHandoff(bot.topic("nope")));
});

test("normalize strips punctuation and apostrophes", () => {
  assert.equal(normalize("  Don't  LIKE it!! "), "dont like it");
});

test("a topic you add yourself is picked up (no code changes)", () => {
  const extended = structuredClone(config);
  extended.topics.push({ id: "warranty", title: "Is there a warranty?", keywords: ["warranty", "guaranty", "bug fixes", "free fixes"], answer: "Yes, 30 days of free fixes.", buttons: ["whatsapp"] });
  const b = createBot(extended, () => 0);
  assert.match(b.reply("is there any warranty").message.text, /30 days of free fixes/);
});
