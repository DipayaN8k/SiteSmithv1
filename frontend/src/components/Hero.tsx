"use client";

import Link from "next/link";
import { useRef } from "react";
import { hero, stickers } from "@/lib/site";
import { HandCoded } from "./HandCoded";

function Sticker({ label, x, y, r }: (typeof stickers)[number]) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ dx: 0, dy: 0 });
  const start = useRef<{ px: number; py: number; dx: number; dy: number } | null>(null);

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, ...pos.current };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current || !ref.current) return;
    pos.current = { dx: start.current.dx + e.clientX - start.current.px, dy: start.current.dy + e.clientY - start.current.py };
    ref.current.style.transform = `translate(${pos.current.dx}px, ${pos.current.dy}px) rotate(${r * 1.6}deg) scale(1.08)`;
  };
  const onUp = () => {
    start.current = null;
    if (ref.current) ref.current.style.transform = `translate(${pos.current.dx}px, ${pos.current.dy}px) rotate(${r}deg)`;
  };

  return (
    <div ref={ref} className="sticker" style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${r}deg)` }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <span>{label}</span>
    </div>
  );
}

export function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero__grid">
        {stickers.map((s) => <Sticker key={s.label} {...s} />)}

        <div>
          <h1 className="display hero__title">
            <span>{hero.line1}</span>
            <span className="grad-text">{hero.line2}</span>
          </h1>
          <p className="hero__sub">{hero.sub}</p>
          <div className="hero__ctas">
            <Link className="btn btn--grad" href="/start">Book a project</Link>
            <Link className="btn" href="/work">See our work</Link>
          </div>
          <p className="hero__hint">Every site we ship is typed like this, by a person. Pick a business and watch.</p>
        </div>

        <HandCoded />
      </div>
    </section>
  );
}
