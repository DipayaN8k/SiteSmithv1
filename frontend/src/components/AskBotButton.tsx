"use client";

// Opens the SmithBot chat window (ChatBot.tsx listens for this event).
export const OPEN_BOT_EVENT = "smithbot:open";

export function AskBotButton({ label = "Ask SmithBot" }: { label?: string }) {
  return (
    <button type="button" className="btn btn--grad btn--sm" onClick={() => window.dispatchEvent(new Event(OPEN_BOT_EVENT))}>
      {label}
    </button>
  );
}
