"use client";

import { useEffect, useRef, useState } from "react";
import { stats } from "@/lib/site";

function Count({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setN(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / 1200);
        setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  return <span ref={ref}>{n}{suffix}</span>;
}

export function Stats() {
  return (
    <section className="stats" aria-label="Studio numbers">
      <div className="stats__grid">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat__n"><Count to={s.value} suffix={s.suffix} /></div>
            <div className="stat__l">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
