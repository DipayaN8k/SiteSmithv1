"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { services } from "@/lib/site";

// Reveal after 20% is scratched — enough to feel the scratch, short enough that nobody gives up.
const REVEAL_AT = 0.2;
// Fixed ticket number on the stub. 999 = charm number: reads as "under a thousand", feels lucky and rare.
const TICKET_NO = "No. 999";
const BRUSH = (w: number) => Math.max(56, w / 16);

// A holographic lottery ticket: foil gradient, light bands, faint "?" pattern, a stub with a ticket number.
function paintCover(canvas: HTMLCanvasElement) {
  const w = canvas.clientWidth, h = canvas.clientHeight; // layout size — unaffected by the 3D tilt
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.body);
  const display = css.getPropertyValue("--font-display") || "system-ui";
  const body = css.getPropertyValue("--font-body") || "system-ui";
  const mono = css.getPropertyValue("--font-mono") || "monospace";
  const wide = w > 600;

  ctx.globalCompositeOperation = "source-over";
  const g = ctx.createLinearGradient(0, h, w, 0);
  g.addColorStop(0, "#feda75");
  g.addColorStop(0.25, "#fa7e1e");
  g.addColorStop(0.5, "#d62976");
  g.addColorStop(0.75, "#962fbf");
  g.addColorStop(1, "#4f5bd5");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // holographic light bands
  for (const [x0, alpha, width] of [[0.18, 0.16, 0.08], [0.32, 0.1, 0.03], [0.62, 0.14, 0.06], [0.78, 0.08, 0.02]] as const) {
    const band = ctx.createLinearGradient(w * x0, 0, w * (x0 + width) + h * 0.4, h);
    band.addColorStop(0, "rgba(255,255,255,0)");
    band.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
    band.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, w, h);
  }

  // faint "?" pattern — something is hidden here
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.font = `800 26px ${display}, sans-serif`;
  ctx.textAlign = "center";
  for (let y = 30, row = 0; y < h + 30; y += 54, row++) {
    for (let x = (row % 2) * 36 + 18; x < w + 30; x += 72) ctx.fillText("?", x, y);
  }

  // foil glitter
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < (w * h) / 700; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.1 + rand() * 0.3})`;
    ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
  }

  // ticket stub with perforation + number (wide screens)
  const stub = wide ? Math.min(150, w * 0.17) : 0;
  if (wide) {
    ctx.fillStyle = "rgba(20,12,28,0.18)";
    ctx.fillRect(0, 0, stub, h);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.setLineDash([2, 7]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(stub, 14); ctx.lineTo(stub, h - 14); ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(stub / 2 + 6, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `600 18px ${mono}, monospace`;
    ctx.fillText(TICKET_NO, 0, -10);
    ctx.font = `500 11px ${mono}, monospace`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("ONE CARD PER VISITOR", 0, 12);
    ctx.restore();
  }

  const cx = stub + (w - stub) / 2;
  const big = Math.max(38, Math.min((w - stub) / 8, 96));
  const cy = Math.min(h / 2, 200) - 10;
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(40,0,40,0.35)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#fff";
  ctx.font = `800 ${big}px ${display}, sans-serif`;
  ctx.fillText("Scratch me", cx, cy);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `600 ${Math.max(14, big * 0.22)}px ${body}, sans-serif`;
  ctx.fillText("3 things inside. One is exactly what you need.", cx, cy + Math.max(big * 0.55, 30));

  const pill = wide ? "Drag with your mouse — or your finger" : "Swipe sideways to scratch";
  ctx.font = `600 13px ${body}, sans-serif`;
  const pw = ctx.measureText(pill).width + 52;
  const py = cy + Math.max(big * 1.05, 74);
  ctx.fillStyle = "rgba(20,12,28,0.85)";
  ctx.beginPath();
  ctx.roundRect(cx - pw / 2, py - 17, pw, 34, 17);
  ctx.fill();
  // little coin icon in the pill
  const coin = ctx.createLinearGradient(cx - pw / 2 + 12, py - 8, cx - pw / 2 + 28, py + 8);
  coin.addColorStop(0, "#fff3c4");
  coin.addColorStop(1, "#e8a10c");
  ctx.fillStyle = coin;
  ctx.beginPath(); ctx.arc(cx - pw / 2 + 20, py, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText(pill, cx - pw / 2 + 36, py + 5);
}

function Confetti() {
  const colors = ["#feda75", "#fa7e1e", "#d62976", "#962fbf", "#4f5bd5"];
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 4 }}>
      {Array.from({ length: 36 }).map((_, i) => {
        const x = Math.random() * 100;
        const d = 0.9 + Math.random() * 0.9;
        return (
          <span
            key={i}
            style={{
              position: "absolute", left: `${x}%`, top: "-10px",
              width: 6 + Math.random() * 6, height: 10 + Math.random() * 8,
              background: colors[i % colors.length], borderRadius: 2,
              animation: `confetti ${d}s cubic-bezier(.2,.7,.4,1) ${Math.random() * 0.25}s forwards`,
              ["--dx" as string]: `${(Math.random() - 0.5) * 160}px`,
              ["--rot" as string]: `${Math.random() * 720 - 360}deg`,
            }}
          />
        );
      })}
      <style>{`@keyframes confetti { to { transform: translate(var(--dx), 420px) rotate(var(--rot)); opacity: 0; } }`}</style>
    </div>
  );
}

export function ScratchServices() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const coinRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);
  const teased = useRef(false);
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const [scratching, setScratching] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const paint = () => { if (!done && moves.current === 0) paintCover(c); };
    document.fonts?.ready.then(paint);
    paint();
    const ro = new ResizeObserver(() => { if (!drawing.current) paint(); });
    ro.observe(c);
    return () => ro.disconnect();
  }, [done]);

  const reveal = useCallback(() => {
    setDone(true);
    setPct(1);
  }, []);

  const measure = () => {
    const c = canvasRef.current!;
    const { data } = c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
    let clear = 0, total = 0;
    for (let i = 3; i < data.length; i += 4 * 40) { total++; if (data[i] < 40) clear++; }
    const p = clear / total;
    setPct(p);
    if (p >= REVEAL_AT) reveal();
  };

  const strokeTo = (x: number, y: number, width: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return; // card was removed (page left) while the teaser was still running
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = width;
    ctx.beginPath();
    const from = last.current ?? { x, y };
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(x + 0.1, y);
    ctx.stroke();
    last.current = { x, y };
  };

  // offsetX/Y are in the canvas's own coordinates, so scratching stays accurate while the card is tilted.
  const scratchAt = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    strokeTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY, BRUSH(c.clientWidth));
    if (++moves.current % 8 === 0) measure();
  };

  // Teaser: the first time the card comes into view, a coin scratches a small corner by itself.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let coinTimer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || teased.current || done) return;
      teased.current = true;
      io.disconnect();
      timer = setTimeout(() => {
        const w = c.clientWidth, h = c.clientHeight;
        const pts = [[0.93, 0.72], [0.82, 0.8], [0.92, 0.86], [0.8, 0.93], [0.9, 0.98]].map(([px, py]) => ({ x: px * w, y: py * h }));
        const coin = coinRef.current;
        const dur = 1100;
        const t0 = performance.now();
        last.current = null;
        moves.current += 1; // the teaser counts as scratching, so a later repaint of the cover can't erase it
        if (coin) coin.dataset.on = "true";
        const step = (t: number) => {
          if (drawing.current) { if (coin) coin.dataset.on = "false"; return; }
          // Safari can stamp the first frame slightly *before* t0, so clamp progress to 0..1
          // (a negative value used to index pts[-1] and crash).
          const k = Math.max(0, Math.min(1, (t - t0) / dur));
          const f = k * (pts.length - 1);
          const i = Math.max(0, Math.min(pts.length - 2, Math.floor(f)));
          const p = { x: pts[i].x + (pts[i + 1].x - pts[i].x) * (f - i), y: pts[i].y + (pts[i + 1].y - pts[i].y) * (f - i) };
          strokeTo(p.x, p.y, 30);
          if (coin) coin.style.transform = `translate(${p.x - 18}px, ${p.y - 18}px) rotate(${k * 300}deg)`;
          if (k < 1) raf = requestAnimationFrame(step);
          else { last.current = null; coinTimer = setTimeout(() => { if (coin) coin.dataset.on = "false"; }, 400); }
        };
        raf = requestAnimationFrame(step);
      }, 600);
    }, { threshold: 0.6 });
    io.observe(c);
    // Stop everything if the visitor leaves the page mid-animation.
    return () => { io.disconnect(); cancelAnimationFrame(raf); clearTimeout(timer); clearTimeout(coinTimer); };
  }, [done]);

  // 3D tilt + glare that follows the cursor (mouse only; flattens while scratching).
  const onTilt = (e: React.PointerEvent) => {
    const el = ticketRef.current;
    if (!el || e.pointerType !== "mouse" || done) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  };
  const resetTilt = () => {
    const el = ticketRef.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
  };

  return (
    <section id="services" className="section">
      <div className="wrap">
        <p className="kicker">What we build</p>
        <h2 className="display h2">What&apos;s under<br />the card?</h2>
        <p className="lede">Three things are hidden under this ticket. One of them is exactly what your business needs.</p>

        <div className="ticket-stage" data-done={done} onPointerMove={onTilt} onPointerLeave={resetTilt}>
          <div className="ticket" ref={ticketRef} data-scratching={scratching} data-done={done}>
            <div className="scratch">
              <div className="scratch__grid" aria-hidden={!done}>
                {services.map((s) => (
                  <article key={s.title} className={`svc svc--${s.tone}`}>
                    <h3 className="display svc__title">{s.title}</h3>
                    <p className="svc__line">{s.line}</p>
                    <ul>{s.points.map((p) => <li key={p}>{p}</li>)}</ul>
                  </article>
                ))}
              </div>
              <canvas
                ref={canvasRef}
                className="scratch__canvas"
                data-done={done}
                aria-label="Scratch card covering our services. Use the Show me button below to reveal."
                role="img"
                onPointerDown={(e) => { drawing.current = true; setScratching(true); resetTilt(); last.current = null; (e.target as HTMLElement).setPointerCapture(e.pointerId); scratchAt(e); }}
                onPointerMove={(e) => { if (drawing.current) scratchAt(e); }}
                onPointerUp={() => { drawing.current = false; setScratching(false); last.current = null; measure(); }}
                onPointerCancel={() => { drawing.current = false; setScratching(false); last.current = null; }}
              />
              <div className="scratch__glare" aria-hidden="true" />
              <div className="scratch__coin" ref={coinRef} aria-hidden="true" />
              {pct > 0 && <div className="scratch__progress" data-done={done}>{Math.min(99, Math.round((pct / REVEAL_AT) * 100))}% revealed</div>}
              {done && <Confetti />}
            </div>
          </div>
        </div>

        {!done && (
          <p className="scratch__skip">Rather not scratch? <button onClick={reveal}>Just show me</button></p>
        )}
      </div>
    </section>
  );
}
