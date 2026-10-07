"use client";

import { brand } from "@/lib/site";

// Opens the chat assistant window (ChatBot.tsx listens for this event).
export const OPEN_BOT_EVENT = "sparrowbot:open";

export function AskBotButton({ label = `Ask ${brand.botName}` }: { label?: string }) {
  return (
    <button type="button" className="btn btn--grad btn--sm" onClick={() => window.dispatchEvent(new Event(OPEN_BOT_EVENT))}>
      {label}
    </button>
  );
}
