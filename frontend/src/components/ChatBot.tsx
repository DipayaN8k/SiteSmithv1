"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createBot, initialState, type BotConfig, type BotMessage, type BotState, type Button } from "@/lib/bot/engine";
import raw from "@/lib/bot/smithbot.json";
import { OPEN_BOT_EVENT } from "@/components/AskBotButton";
import { brand } from "@/lib/site";

// Everything the bot says lives in src/lib/bot/smithbot.json (see README.md next to it).
// Name and contact details always come from `brand` in lib/site.ts, so a rename is one edit.
const rawConfig = raw as unknown as BotConfig;
const bot = createBot({
  ...rawConfig,
  settings: { ...rawConfig.settings, bot_name: brand.botName },
  contact: {
    ...rawConfig.contact,
    brand: brand.name,
    email: brand.email,
    instagram: brand.instagram,
    instagram_url: brand.instagramUrl,
    whatsapp: brand.whatsapp,
    whatsapp_2: brand.whatsapp2,
    phone: brand.whatsapp,
    city: brand.city,
  },
});
const { bot_name: BOT_NAME, typing_delay_ms: TYPING_MS, max_input_length: MAX_LEN } = bot.config.settings;

type Msg = { id: number; from: "bot" | "me"; text: string; buttons?: Button[] };

function ChatLink({ b }: { b: Extract<Button, { kind: "link" }> }) {
  if (b.href.startsWith("/")) return <Link href={b.href} className="bot__chip bot__chip--link">{b.label}</Link>;
  const external = b.href.startsWith("http");
  return (
    <a href={b.href} className="bot__chip bot__chip--link" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {b.label}
    </a>
  );
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [state, setState] = useState<BotState>(initialState);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const nextId = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const push = (from: Msg["from"], m: string | BotMessage) =>
    setMsgs((cur) => [...cur, { id: nextId.current++, from, ...(typeof m === "string" ? { text: m } : m) }]);

  // Greet the first time the chat is opened.
  useEffect(() => {
    if (open && msgs.length === 0) push("bot", bot.welcome());
    if (open) inputRef.current?.focus();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [msgs, typing]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Other parts of the page (e.g. the "Ask SmithBot" button in the FAQ) open the chat with this event.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_BOT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_BOT_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Show the visitor's message, wait a beat like a person would, then answer.
  const respond = (shown: string, answer: () => { message: BotMessage; state: BotState }) => {
    if (typing) return;
    push("me", shown);
    setTyping(true);
    timer.current = setTimeout(() => {
      const r = answer();
      setState(r.state);
      setTyping(false);
      push("bot", r.message);
    }, TYPING_MS);
  };

  // Clear the conversation (and what the bot remembers) and greet again.
  const startOver = () => {
    if (timer.current) clearTimeout(timer.current);
    setTyping(false);
    setInput("");
    setState(initialState);
    nextId.current = 1;
    setMsgs([{ id: nextId.current++, from: "bot", ...bot.welcome() }]);
    inputRef.current?.focus();
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    respond(text, () => bot.reply(text, state));
  };

  const click = (b: Button) => {
    if (b.kind === "topic") respond(b.label, () => bot.topic(b.topic, state));
    else if (b.kind === "say") respond(b.label, () => bot.reply(b.label, state));
  };

  const lastBotId = [...msgs].reverse().find((m) => m.from === "bot")?.id;

  return (
    <>
      {!open && (
        <button type="button" className="bot__launch" onClick={() => setOpen(true)} aria-label={`Chat with ${BOT_NAME}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
          <span>Ask {BOT_NAME}</span>
        </button>
      )}

      {open && (
        <section className="bot" role="dialog" aria-label={`${BOT_NAME} chat`}>
          <header className="bot__head">
            <div>
              <strong>{BOT_NAME}</strong>
              <span>Quick answers, no waiting</span>
            </div>
            <div className="bot__actions">
              {msgs.length > 1 && (
                <button type="button" className="bot__restart" onClick={startOver}>Start over</button>
              )}
              <button type="button" className="bot__close" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
            </div>
          </header>

          <div className="bot__log" ref={logRef} role="log" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`bot__msg bot__msg--${m.from}`}>
                <p>{m.text}</p>
                {m.from === "bot" && m.id === lastBotId && !typing && m.buttons && m.buttons.length > 0 && (
                  <div className="bot__chips">
                    {m.buttons.map((b, i) =>
                      b.kind === "link"
                        ? <ChatLink key={i} b={b} />
                        : <button key={i} type="button" className="bot__chip" onClick={() => click(b)}>{b.label}</button>,
                    )}
                  </div>
                )}
              </div>
            ))}
            {typing && <div className="bot__msg bot__msg--bot bot__typing" aria-label={`${BOT_NAME} is typing`}><i /><i /><i /></div>}
          </div>

          <form className="bot__form" onSubmit={send}>
            <label className="sr-only" htmlFor="bot-input">Your question</label>
            <input id="bot-input" ref={inputRef} value={input} maxLength={MAX_LEN} autoComplete="off"
              placeholder="Type your question…" onChange={(e) => setInput(e.target.value)} />
            <button type="submit" className="btn btn--grad btn--sm" disabled={!input.trim() || typing}>Send</button>
          </form>
          <p className="bot__note">Automated answers for general guidance, not a quote. Chats aren&apos;t saved. <Link href="/terms#chat-assistant">Terms</Link></p>
        </section>
      )}
    </>
  );
}
