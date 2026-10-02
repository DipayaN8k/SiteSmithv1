"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_THEME, THEME_KEY, THEMES, type Theme } from "@/lib/site";

const Sun = () => (
  <svg className="theme__sun" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </svg>
);
const Moon = () => (
  <svg className="theme__moon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
  </svg>
);

// Nav button that lets visitors pick Night (dark) or a light background: Lavender, Beige, Bright.
// The choice is remembered in this browser only (localStorage).
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = document.documentElement.dataset.theme as Theme | undefined; // set before paint by the script in layout.tsx
    if (t && THEMES.some((x) => x.id === t)) setTheme(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const choose = (t: Theme) => {
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    setOpen(false);
  };

  const current = THEMES.find((x) => x.id === theme) ?? THEMES[0];

  return (
    <div className="theme" ref={ref}>
      <button className="theme__btn" aria-haspopup="true" aria-expanded={open}
        aria-label={`Background: ${current.label}. Change background`} onClick={() => setOpen(!open)}>
        {/* both icons render; CSS shows the right one straight from <html data-theme>, so no wrong icon flashes on load */}
        <Moon /><Sun />
      </button>
      {open && (
        <div className="theme__menu" role="radiogroup" aria-label="Background">
          <div className="theme__title">Background</div>
          {THEMES.map((t) => (
            <button key={t.id} role="radio" aria-checked={t.id === theme} className="theme__opt" onClick={() => choose(t.id)}>
              <span className="theme__swatch" style={{ background: t.swatch }} />
              <span className="theme__name">{t.label}</span>
              <span className="theme__mode">{t.mode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
