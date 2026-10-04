"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { accentInk, DEFAULT_FONT, paletteFor, photo, type Category, type DesignId, type FontId } from "@/lib/previews";
import { elegant, statement } from "@/lib/previewFonts";
import "./preview-site.css";

// One ready-made website design, filled in with the visitor's business name and real photos.
// The layout reacts to the preview frame's width (CSS container queries), so the desktop/mobile
// toggle shows a real responsive layout. Scroll reveals, parallax, counters and the progress bar run
// against the frame's own scroll area, so the preview behaves like a real site while you scroll inside it.

type Ctx = { cat: Category; name: string; title: string; text: string; initial: string };
type Props = { cat: Category; design: DesignId; name: string; about?: string; theme?: string; font?: FontId };

export function PreviewSite({ cat, design, name, about, theme = "original", font }: Props) {
  const p = paletteFor(cat, design, theme);
  const vars = {
    "--ps-bg": p.bg, "--ps-surface": p.surface, "--ps-text": p.text,
    "--ps-muted": p.muted, "--ps-accent": p.accent, "--ps-accent-text": p.accentText, "--ps-accent-ink": accentInk(p),
  } as React.CSSProperties;
  const ctx: Ctx = {
    cat, name,
    title: cat.heroTitle.replace("{name}", name),
    text: about?.trim() || cat.heroText,
    initial: name.trim().charAt(0).toUpperCase() || "Y",
  };
  const root = useRef<HTMLDivElement>(null);
  useMotion(root);
  const look = { ui: cat.visual === "ui", name };

  return (
    <div ref={root} className={`ps ps--${design} ${elegant.variable} ${statement.variable}`} data-font={font ?? DEFAULT_FONT[design]} style={vars}>
      <div className="ps-progress" aria-hidden="true"><i /></div>
      <Look.Provider value={look}>
        {design === "bold" && <Bold {...ctx} />}
        {design === "clean" && <Clean {...ctx} />}
        {design === "luxe" && <Luxe {...ctx} />}
        {design === "complete" && <Complete {...ctx} />}
      </Look.Provider>
    </div>
  );
}

/* ---------- motion ---------- */

// Reveal-on-scroll ([data-reveal] gets .is-in), count-up numbers ([data-count]),
// scroll progress + parallax (--sp, --sy) and pointer tilt/glow ([data-tilt], [data-glow]).
function useMotion(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // A new design starts at its top, like opening a new site.
    const viewport = el.closest<HTMLElement>(".frame__viewport");
    if (viewport) viewport.scrollTop = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = el.querySelectorAll<HTMLElement>("[data-reveal], [data-count]");
    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("is-in"));
      return;
    }

    el.querySelectorAll<HTMLElement>("[data-count]").forEach((c) => { c.textContent = `0${c.dataset.suffix ?? ""}`; });
    const timers: number[] = [];
    // A "wipe" image starts fully clipped, which the observer counts as invisible, so watch its container instead.
    const targets = new Map<Element, HTMLElement[]>();
    nodes.forEach((n) => {
      const watch = n.dataset.reveal === "wipe" && n.parentElement ? n.parentElement : n;
      targets.set(watch, [...(targets.get(watch) ?? []), n]);
    });
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        for (const n of targets.get(e.target) ?? []) {
          n.classList.add("is-in");
          if (n.dataset.count) timers.push(countUp(n));
        }
      }
    }, { root: viewport, threshold: 0.05 });
    targets.forEach((_, watch) => io.observe(watch));

    let frame = 0;
    const onScroll = () => {
      if (!viewport || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const max = viewport.scrollHeight - viewport.clientHeight;
        el.style.setProperty("--sy", String(viewport.scrollTop));
        el.style.setProperty("--sp", String(max > 0 ? viewport.scrollTop / max : 0));
      });
    };
    viewport?.addEventListener("scroll", onScroll, { passive: true });

    const onMove = (e: PointerEvent) => {
      const t = (e.target as Element).closest<HTMLElement>("[data-tilt], [data-glow]");
      if (!t || !el.contains(t)) return;
      const r = t.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      t.style.setProperty("--mx", `${x * 100}%`);
      t.style.setProperty("--my", `${y * 100}%`);
      if (t.hasAttribute("data-tilt")) {
        t.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
        t.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
      }
    };
    const onLeave = (e: PointerEvent) => {
      const t = (e.target as Element).closest?.<HTMLElement>("[data-tilt]");
      if (t && !t.contains(e.relatedTarget as Node)) { t.style.setProperty("--rx", "0deg"); t.style.setProperty("--ry", "0deg"); }
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerout", onLeave);

    return () => {
      io.disconnect();
      timers.forEach((t) => cancelAnimationFrame(t));
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerout", onLeave);
    };
  }, [root]);
}

function countUp(n: HTMLElement) {
  const target = Number(n.dataset.count);
  const decimals = String(target).includes(".") ? 1 : 0;
  const suffix = n.dataset.suffix ?? "";
  const start = performance.now();
  let raf = 0;
  const tick = (t: number) => {
    const k = Math.min(1, (t - start) / 1400);
    n.textContent = `${(target * (1 - Math.pow(1 - k, 3))).toFixed(decimals)}${suffix}`;
    if (k < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return raf;
}

// Scroll the preview frame (not the page) to a section of the mini site.
const jump = (id: string) => (e: React.MouseEvent<HTMLElement>) => {
  const vp = e.currentTarget.closest(".frame__viewport");
  const target = vp?.querySelector<HTMLElement>(`[data-anchor="${id}"]`);
  if (!vp || !target) return;
  const top = target.getBoundingClientRect().top - vp.getBoundingClientRect().top + vp.scrollTop - 64;
  vp.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
};

/* ---------- shared pieces ---------- */

const fmt = (n: number) => (String(n).includes(".") ? n.toFixed(1) : String(n));
const d = (n: number) => ({ "--d": n }) as React.CSSProperties;

// "ui" businesses (IT) swap photos for designed product visuals; see TechArt below.
const Look = createContext({ ui: false, name: "" });
type ArtKind = "mesh" | "code" | "terminal" | "dash" | "graph" | "nodes";
const ITEM_ART: ArtKind[] = ["code", "nodes", "terminal"];

function Img({ src, w, alt = "", eager, className, art }: { src: string; w: number; alt?: string; eager?: boolean; className?: string; art?: ArtKind }) {
  const { ui, name } = useContext(Look);
  if (ui && art) return <TechArt kind={art} name={name} className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`ps-img ${className ?? ""}`} src={photo(src, w)} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" draggable={false} />;
}

// Headline with the last word highlighted (accent colour; italic in the Elegant font).
function Title({ text }: { text: string }) {
  const words = text.split(" ");
  const last = words.pop();
  return <>{words.join(" ")} <em className="ps-em">{last}</em></>;
}

// Section heading whose words slide up one by one when scrolled into view.
function Split({ text, className = "ps__h2" }: { text: string; className?: string }) {
  return (
    <h2 className={`${className} split`} data-reveal>
      {text.split(" ").map((w, i) => <span className="w" key={i}><span style={{ "--i": i } as React.CSSProperties}>{w}</span></span>)}
    </h2>
  );
}

function Logo({ initial, name }: { initial: string; name: string }) {
  return <span className="ps__logo"><b>{initial}</b>{name}</span>;
}

function Nav({ cat, name, initial, className = "", links }: Ctx & { className?: string; links?: string[] }) {
  return (
    <header className={`ps__nav ${className}`}>
      <Logo initial={initial} name={name} />
      <span className="ps__links">{(links ?? cat.nav).map((n) => <span key={n}>{n}</span>)}</span>
      <span className="ps__btn ps__btn--sm">{cat.cta}</span>
    </header>
  );
}

function Stats({ cat, className }: { cat: Category; className: string }) {
  return (
    <section className={className}>
      {cat.stats.map((s, i) => (
        <div key={s.label} data-reveal style={d(i)}>
          <strong data-count={s.n} data-suffix={s.suffix}>{fmt(s.n)}{s.suffix}</strong>
          <span>{s.label}</span>
        </div>
      ))}
    </section>
  );
}

const ICONS = [
  "M12 3l2.4 5.6L20 9.3l-4.3 3.9 1.2 5.8L12 16.1 7.1 19l1.2-5.8L4 9.3l5.6-.7z",
  "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  "M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z",
  "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
];

function Features({ cat, title = "Why people choose us" }: { cat: Category; title?: string }) {
  return (
    <section className="ps__section">
      <Split text={title} />
      <div className="ps-bento">
        {cat.features.map(([t, txt], i) => (
          <article key={t} className="ps-bento__card" data-reveal data-glow style={d(i)}>
            {i === 0 && <Img src={cat.photos.gallery[1]} w={700} className="ps-bento__bg" art="graph" />}
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d={ICONS[i]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>
            <h3>{t}</h3>
            <p>{txt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Steps({ cat }: { cat: Category }) {
  return (
    <section className="ps__section">
      <Split text="How it works" />
      <ol className="ps-steps" data-reveal>
        {cat.steps.map(([t, txt], i) => (
          <li key={t} style={d(i)}>
            <span className="ps-steps__n">{i + 1}</span>
            <h3>{t}</h3>
            <p>{txt}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Team({ cat, title = "Meet the team" }: { cat: Category; title?: string }) {
  return (
    <section className="ps__section">
      <Split text={title} />
      <div className="ps-team">
        {cat.team.map(([role, src], i) => (
          <figure key={role} data-reveal style={d(i)}>
            <div className="ps-team__img"><Img src={src} w={600} alt={role} /></div>
            <figcaption><strong>{role}</strong><span>Your team photo here</span></figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Platforms({ cat }: { cat: Category }) {
  const list = [...cat.platforms, ...cat.platforms];
  return (
    <div className="ps-platforms" aria-label={`Find us on ${cat.platforms.join(", ")}`}>
      <span className="ps-platforms__label">Find us on</span>
      <div className="ps-platforms__mask" aria-hidden="true">
        <div className="ps-platforms__track">{list.map((p, i) => <span key={i}>{p}</span>)}</div>
      </div>
    </div>
  );
}

function Footer({ name, initial, cat }: Ctx) {
  return (
    <footer className="ps-foot">
      <div className="ps-foot__grid">
        <div>
          <Logo initial={initial} name={name} />
          <p>{cat.aboutText}</p>
        </div>
        <div><h4>Explore</h4>{[...new Set([...cat.nav, "Contact"])].map((n) => <span key={n}>{n}</span>)}</div>
        <div><h4>Visit</h4><span>{cat.hours}</span><span>Directions on Google Maps</span></div>
        <div><h4>Follow</h4>{cat.platforms.slice(0, 3).map((n) => <span key={n}>{n}</span>)}</div>
      </div>
      <div className="ps-foot__big" aria-hidden="true">{name}</div>
      <div className="ps-foot__bottom"><span>© {new Date().getFullYear()} {name}</span><span>Privacy · Terms</span></div>
    </footer>
  );
}

// "Selected work": short case-study cards, used instead of a photo gallery for ui businesses.
function Cases({ cat, anchor }: { cat: Category; anchor?: string }) {
  return (
    <section className="ps__section" data-anchor={anchor}>
      <Split text="Selected work" />
      <div className="ps-cases">
        {(cat.cases ?? []).map(([t, txt, tags], i) => (
          <article key={t} className="ps-cases__card" data-reveal data-glow style={d(i)}>
            <span className="ps-cases__n">Case study 0{i + 1}</span>
            <h3>{t}</h3>
            <p>{txt}</p>
            <div className="ps-cases__tags">{tags.map((g) => <span key={g}>{g}</span>)}</div>
            <span className="c-card__link">Read the case study <Arrow /></span>
          </article>
        ))}
      </div>
    </section>
  );
}

function Stack({ items }: { items: string[] }) {
  return (
    <div className="ps-stack" aria-label={`Built with ${items.join(", ")}`}>
      <div className="ps-stack__track" aria-hidden="true">{[...items, ...items].map((t, i) => <span key={i}>{t}</span>)}</div>
    </div>
  );
}

// Designed product visuals (no stock photos): code, terminal, dashboard, uptime graph, architecture.
function TechArt({ kind, name, className = "" }: { kind: ArtKind; name: string; className?: string }) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "yourcompany";
  if (kind === "mesh") return <div className={`ta-mesh ${className}`} aria-hidden="true"><i /><i /><i /></div>;
  const win = (title: string, body: React.ReactNode, dark = true) => (
    <div className={`ta ${className}`} aria-hidden="true">
      <div className={`ta-win ${dark ? "ta-win--dark" : ""}`}>
        <div className="ta-win__bar"><i /><i /><i /><span>{title}</span></div>
        <div className="ta-win__body">{body}</div>
      </div>
    </div>
  );
  const lines = (rows: React.ReactNode[]) => rows.map((r, i) => <div className="ta-line" key={i} style={{ "--i": i } as React.CSSProperties}>{r}</div>);
  switch (kind) {
    case "code":
      return win(`${slug}/app.ts`, lines([
        <><b className="k">const</b> app = <b className="f">createApp</b>({"{"}</>,
        <>&nbsp;&nbsp;name: <b className="s">&quot;{name}&quot;</b>,</>,
        <>&nbsp;&nbsp;region: <b className="s">&quot;ap-south-1&quot;</b>,</>,
        <>&nbsp;&nbsp;replicas: <b className="n">3</b>,</>,
        <>{"}"});</>,
        <><b className="c">{"// p95 latency 120ms · 0 errors"}</b></>,
        <>app.<b className="f">deploy</b>();<i className="ta-caret" /></>,
      ]));
    case "terminal":
      return win("terminal", lines([
        <><b className="c">$</b> git push origin main</>,
        <><b className="ok">✓</b> Build passed <b className="c">(42s)</b></>,
        <><b className="ok">✓</b> 318 tests passed</>,
        <><b className="ok">✓</b> Deployed to production</>,
        <><b className="c">→</b> https://{slug}.com<i className="ta-caret" /></>,
      ]));
    case "dash":
      return win(`${slug} · dashboard`, (
        <div className="ta-dash">
          <div className="ta-dash__kpis">
            <div><span>Active users</span><strong>12,480</strong><em>+18%</em></div>
            <div><span>Orders today</span><strong>1,204</strong><em>+6%</em></div>
          </div>
          <div className="ta-bars">{[38, 52, 46, 64, 58, 76, 90].map((h, i) => <i key={i} style={{ "--h": `${h}%`, "--i": i } as React.CSSProperties} />)}</div>
        </div>
      ), false);
    case "graph":
      return win("uptime · 30 days", (
        <div className="ta-graph">
          <strong>99.98%</strong><span>uptime this month</span>
          <svg viewBox="0 0 200 60" preserveAspectRatio="none"><path pathLength={1} d="M0 44 C20 40 30 30 50 34 S80 18 100 22 S140 10 160 14 S190 6 200 8" /></svg>
        </div>
      ));
    case "nodes":
      return win("architecture", (
        <div className="ta-nodes">
          <svg viewBox="0 0 200 110" preserveAspectRatio="none" aria-hidden="true"><path d="M50 27 H150 M50 27 V83 M150 27 V83 M50 83 H150" /></svg>
          {["Web app", "API", "Database", "Queue"].map((t, i) => <span key={t} style={{ "--i": i } as React.CSSProperties}>{t}</span>)}
        </div>
      ));
  }
}

const Arrow = () => <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12h13m-5-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Check = () => <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/* ---------- Bold: dark, full-bleed photo, words rise in, moving marquees ---------- */

function Bold(c: Ctx) {
  const { cat, title, text } = c;
  const { ui } = useContext(Look);
  return (
    <>
      <section className="b-hero">
        <div className="b-hero__bg ps-parallax"><Img src={cat.photos.hero[0]} w={1600} eager art="mesh" /></div>
        {ui && <div className="ps-hero-art" aria-hidden="true"><TechArt kind="code" name={c.name} /></div>}
        <Nav {...c} className="ps__nav--over" />
        <div className="b-hero__text">
          <p className="ps__eyebrow rise">{cat.id === "other" ? c.name : cat.label}</p>
          <h1 className="b-hero__title">
            {title.split(" ").map((w, i) => <span className="word" key={i}><span style={d(i)}>{w}</span></span>)}
          </h1>
          <p className="ps__lead rise" style={d(4)}>{text}</p>
          <div className="ps__ctas rise" style={d(5)}>
            <span className="ps__btn">{cat.cta} <Arrow /></span>
            <span className="ps__btn ps__btn--ghost">Contact us</span>
          </div>
        </div>
      </section>

      <section className="ps__section">
        <Split text={cat.sectionTitle} />
        <div className="b-cards">
          {cat.items.map((it, i) => (
            <article className="b-card" key={it.title} data-reveal style={d(i)}>
              <div className="ps-tilt" data-tilt>
                <div className="b-card__img"><Img src={cat.photos.items[i]} w={700} alt={it.title} art={ITEM_ART[i]} /></div>
                <div className="b-card__body">
                  <span className="b-card__n">0{i + 1}</span>
                  <h3>{it.title}</h3>
                  <p>{it.text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Stats cat={cat} className="b-stats" />
      <Features cat={cat} />

      {ui && cat.stack ? <Stack items={cat.stack} /> : (
        <div className="b-strip" aria-hidden="true">
          <div className="b-strip__track">
            {[...cat.photos.gallery, ...cat.photos.gallery].map((g, i) => <Img key={i} src={g} w={500} />)}
          </div>
        </div>
      )}

      <section className="b-about">
        <div className="b-about__img" data-reveal="wipe">
          <Img src={cat.photos.about} w={900} art="dash" />
          <span className="b-about__badge">{cat.label}</span>
        </div>
        <div data-reveal style={d(1)}>
          <h2 className="ps__h2">{cat.aboutTitle}</h2>
          <p className="ps__lead">{cat.story}</p>
          <span className="ps__btn">{cat.cta} <Arrow /></span>
        </div>
      </section>

      <Team cat={cat} />

      <section className="b-cta" data-reveal>
        <h2>Ready when you are.</h2>
        <p>Call, WhatsApp or drop by {c.name}. {cat.hours}.</p>
        <span className="ps__btn">{cat.cta} <Arrow /></span>
      </section>
      <Footer {...c} />
    </>
  );
}

/* ---------- Clean: bright, floating photo collage, soft fades ---------- */

function Clean(c: Ctx) {
  const { cat, title, text } = c;
  const { ui } = useContext(Look);
  return (
    <>
      <Nav {...c} />
      <section className="c-hero">
        <div className="c-hero__text">
          <p className="c-pill rise"><i /> Open today · {cat.label}</p>
          <h1 className="ps__title rise" style={d(1)}><Title text={title} /></h1>
          <p className="ps__lead rise" style={d(2)}>{text}</p>
          <div className="ps__ctas rise" style={d(3)}>
            <span className="ps__btn">{cat.cta} <Arrow /></span>
            <span className="ps__btn ps__btn--ghost">{cat.nav[0]}</span>
          </div>
        </div>
        <div className="c-collage" aria-hidden="true">
          <div className="c-collage__a"><Img src={cat.photos.hero[0]} w={900} eager art="dash" /></div>
          <div className="c-collage__b"><Img src={cat.photos.items[0]} w={500} eager art="terminal" /></div>
          <div className="c-collage__c"><Img src={cat.photos.items[1]} w={500} eager art="graph" /></div>
          <span className="c-collage__chip">{cat.items[0].title} <Arrow /></span>
        </div>
      </section>

      <Platforms cat={cat} />
      <Stats cat={cat} className="c-stats" />

      <section className="ps__section">
        <Split text={cat.sectionTitle} className="ps__h2 c-center" />
        <div className="c-cards">
          {cat.items.map((it, i) => (
            <article className="c-card" key={it.title} data-reveal style={d(i)}>
              <div className="c-card__img"><Img src={cat.photos.items[i]} w={700} alt={it.title} art={ITEM_ART[i]} /></div>
              <h3>{it.title}</h3>
              <p>{it.text}</p>
              <span className="c-card__link">Learn more <Arrow /></span>
            </article>
          ))}
        </div>
      </section>

      <Steps cat={cat} />

      {ui && cat.cases ? <Cases cat={cat} /> : (
        <section className="ps__section c-gallery">
          {cat.photos.gallery.map((g, i) => (
            <div key={g} data-reveal="wipe" style={d(i % 3)}><Img src={g} w={600} /></div>
          ))}
        </section>
      )}

      <section className="c-about">
        <div className="c-about__img" data-reveal="wipe"><Img src={cat.photos.about} w={900} art="dash" /></div>
        <div data-reveal style={d(1)}>
          <h2 className="ps__h2">{cat.aboutTitle}</h2>
          <p className="ps__lead">{cat.story}</p>
          <ul className="c-ticks">{cat.features.slice(0, 3).map(([t]) => <li key={t}><Check />{t}</li>)}</ul>
        </div>
      </section>

      <Team cat={cat} />

      <section className="c-cta" data-reveal>
        <h2 className="ps__h2">Come see us at <Title text={`${c.name}.`} /></h2>
        <p>{cat.hours}</p>
        <span className="ps__btn">{cat.cta} <Arrow /></span>
      </section>
      <Footer {...c} />
    </>
  );
}

/* ---------- Luxe: cinematic photo, tracking-in type, gold lines that draw ---------- */

function Luxe(c: Ctx) {
  const { cat, title, text } = c;
  const { ui } = useContext(Look);
  const roman = ["I", "II", "III"];
  return (
    <>
      <section className="l-hero">
        <div className="l-hero__bg ps-parallax"><Img src={cat.photos.hero[0]} w={1600} eager art="mesh" /></div>
        <Nav {...c} className="ps__nav--over" />
        <div className="l-hero__text">
          <span className="l-line" />
          <p className="ps__eyebrow rise">{cat.id === "other" ? c.name : cat.label}</p>
          <h1 className="l-hero__title">{title}</h1>
          <p className="ps__lead rise" style={d(3)}>{text}</p>
          <div className="ps__ctas rise" style={d(4)}>
            <span className="ps__btn">{cat.cta}</span>
          </div>
        </div>
      </section>

      <section className="l-quote" data-reveal>
        <span className="l-ornament" aria-hidden="true">◆</span>
        <p>{cat.story}</p>
        <span className="l-sign">— {c.name}</span>
      </section>

      <section className="l-rows">
        {cat.items.map((it, i) => (
          <article className={`l-row ${i % 2 ? "l-row--flip" : ""}`} key={it.title}>
            <div className="l-row__img" data-reveal="wipe"><Img src={cat.photos.items[i]} w={900} alt={it.title} art={ITEM_ART[i]} /></div>
            <div className="l-row__text" data-reveal style={d(1)}>
              <span className="l-row__n">{roman[i]}</span>
              <h3>{it.title}</h3>
              <p>{it.text}</p>
              <ul>{it.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
              <span className="l-link">Discover <Arrow /></span>
            </div>
          </article>
        ))}
      </section>

      <Stats cat={cat} className="l-stats" />
      <Team cat={cat} title="The people behind it" />

      {ui && cat.cases ? <Cases cat={cat} /> : (
        <section className="l-gallery">
          {cat.photos.gallery.slice(0, 6).map((g, i) => (
            <div key={g} data-reveal style={d(i % 3)}><Img src={g} w={600} /></div>
          ))}
        </section>
      )}

      <section className="l-cta" data-reveal>
        <span className="l-line" />
        <h2>{cat.aboutTitle}</h2>
        <p>{cat.hours}</p>
        <span className="ps__btn">{cat.cta}</span>
      </section>
      <Footer {...c} />
    </>
  );
}

/* ---------- Complete: a full website — slideshow, about, services, team, process, gallery, booking, contact ---------- */

function Complete(c: Ctx) {
  const { cat, title, text, name } = c;
  const { ui } = useContext(Look);
  const [slide, setSlide] = useState(0);
  const [tab, setTab] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const [chat, setChat] = useState(false);
  const [book, setBook] = useState({ what: 0, day: 0, time: 1, done: false });
  const [sent, setSent] = useState(false);
  const days = ["Today", "Tomorrow", "This weekend"];
  const times = ["Morning", "Afternoon", "Evening"];
  const ticker = [`${cat.cta} online`, cat.hours, "Reply on WhatsApp in minutes", ...cat.items.map((i) => i.title)];
  const faqs = [
    { q: `How do I ${cat.cta.toLowerCase()}?`, a: `Use the form on this page or message us on WhatsApp. ${name} confirms within minutes.` },
    { q: "Where are you?", a: "Right in the heart of the city. Directions are one tap away on the map below." },
    { q: "When are you open?", a: `${cat.hours}. Call ahead on holidays.` },
    { q: "Can I pay online?", a: "Yes. UPI, cards and cash are all welcome." },
  ];
  const n = cat.photos.gallery.length;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % 3), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (zoom === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
      if (e.key === "ArrowRight") setZoom((z) => (z === null ? z : (z + 1) % n));
      if (e.key === "ArrowLeft") setZoom((z) => (z === null ? z : (z + n - 1) % n));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, n]);

  return (
    <>
      <div className="x-ticker" aria-hidden="true">
        <div className="x-ticker__track">{[...ticker, ...ticker].map((t, i) => <span key={i}>{t}</span>)}</div>
      </div>
      <Nav {...c} className="x-nav" links={["About", "Services", "Team", "Contact"]} />

      <section className="x-hero">
        {ui ? (
          <>
            <div className="x-hero__slide is-on"><Img src={cat.photos.hero[0]} w={1600} art="mesh" /></div>
            <div className="ps-hero-art" aria-hidden="true"><TechArt kind="dash" name={name} /></div>
          </>
        ) : cat.photos.hero.map((h, i) => (
          <div key={h} className={`x-hero__slide ${i === slide ? "is-on" : ""}`}><Img src={h} w={1600} eager={i === 0} /></div>
        ))}
        <div className="x-hero__text">
          <p className="ps__eyebrow rise">{cat.id === "other" ? name : cat.label}</p>
          <h1 className="ps__title rise" style={d(1)}><Title text={title} /></h1>
          <p className="ps__lead rise" style={d(2)}>{text}</p>
          <div className="ps__ctas rise" style={d(3)}>
            <button type="button" className="ps__btn" onClick={jump("x-book")}>{cat.cta} <Arrow /></button>
            <button type="button" className="ps__btn ps__btn--ghost" onClick={jump("x-gallery")}>{ui ? "See our work" : "See photos"}</button>
          </div>
        </div>
        <div className="x-open rise" style={d(4)}><i /> Open now<span>{cat.hours}</span></div>
        {!ui && <div className="x-hero__dots">
          {cat.photos.hero.map((h, i) => (
            <button key={h} type="button" aria-label={`Show photo ${i + 1}`} aria-pressed={i === slide} onClick={() => setSlide(i)}><i key={i === slide ? `on-${slide}` : "off"} /></button>
          ))}
        </div>}
      </section>

      <Stats cat={cat} className="x-stats" />
      <Platforms cat={cat} />

      <section className="ps__section x-about">
        <div className="x-about__pics">
          <div className="x-about__a" data-reveal="wipe"><Img src={cat.photos.about} w={800} art="dash" /></div>
          <div className="x-about__b" data-reveal="wipe" style={d(2)}><Img src={cat.photos.gallery[0]} w={500} art="terminal" /></div>
          <span className="x-about__badge" data-reveal style={d(3)}><strong>{fmt(cat.stats[0].n)}{cat.stats[0].suffix}</strong>{cat.stats[0].label}</span>
        </div>
        <div>
          <p className="ps__eyebrow" data-reveal>About {name}</p>
          <Split text={cat.aboutTitle} />
          <p className="ps__lead" data-reveal>{cat.story}</p>
          <ul className="c-ticks" data-reveal>{cat.features.slice(0, 3).map(([t]) => <li key={t}><Check />{t}</li>)}</ul>
          <p className="x-sign" data-reveal>— The {name} team</p>
        </div>
      </section>

      <section className="ps__section">
        <Split text={cat.sectionTitle} />
        <div className="x-tabs" role="tablist" aria-label={cat.sectionTitle} data-reveal>
          {cat.items.map((it, i) => (
            <button key={it.title} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)}>{it.title}</button>
          ))}
        </div>
        <div className="x-panel" role="tabpanel" key={tab}>
          <div className="x-panel__img"><Img src={cat.photos.items[tab]} w={900} alt={cat.items[tab].title} art={ITEM_ART[tab]} /></div>
          <div>
            <h3>{cat.items[tab].title}</h3>
            <p>{cat.items[tab].text}</p>
            <ul>{cat.items[tab].points.map((pt) => <li key={pt}><Check />{pt}</li>)}</ul>
            <button type="button" className="ps__btn" onClick={jump("x-book")}>{cat.cta} <Arrow /></button>
          </div>
        </div>
      </section>

      <Features cat={cat} />
      <Steps cat={cat} />
      <Team cat={cat} />

      {ui && cat.cases ? <Cases cat={cat} anchor="x-gallery" /> : <section className="ps__section" data-anchor="x-gallery">
        <Split text="Take a look inside" />
        <div className="x-gallery">
          {cat.photos.gallery.map((g, i) => (
            <button key={g} type="button" data-reveal style={d(i % 3)} onClick={() => setZoom(i)} aria-label={`Open photo ${i + 1}`}>
              <Img src={g} w={600} />
              <span aria-hidden="true">+</span>
            </button>
          ))}
        </div>
      </section>}

      <section className="ps__section x-book" data-anchor="x-book">
        <div className="x-book__card" data-reveal>
          {book.done ? (
            <div className="x-done">
              <span className="x-done__tick"><Check /></span>
              <h3>Request sent!</h3>
              <p>{cat.items[book.what].title} · {days[book.day]} · {times[book.time]}. {name} will confirm on WhatsApp.</p>
              <button type="button" className="ps__btn ps__btn--ghost" onClick={() => setBook((b) => ({ ...b, done: false }))}>Make another</button>
            </div>
          ) : (
            <>
              <h3>{cat.cta}</h3>
              <p className="x-book__sub">Takes 10 seconds. No sign-up.</p>
              <Choice label="What for?" options={cat.items.map((i) => i.title)} value={book.what} onChange={(what) => setBook((b) => ({ ...b, what }))} />
              <Choice label="When?" options={days} value={book.day} onChange={(day) => setBook((b) => ({ ...b, day }))} />
              <Choice label="Time" options={times} value={book.time} onChange={(time) => setBook((b) => ({ ...b, time }))} />
              <button type="button" className="ps__btn x-book__go" onClick={() => setBook((b) => ({ ...b, done: true }))}>{cat.cta} <Arrow /></button>
            </>
          )}
        </div>
        <div className="x-book__side">
          <Split text="Questions, answered" />
          <div className="x-faq" data-reveal>
            {faqs.map((f) => (
              <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>
        </div>
      </section>

      <section className="ps__section x-contact">
        <div data-reveal>
          <Split text={`Visit ${name}`} />
          <p className="ps__lead">{cat.hours}. Parking nearby.</p>
          <div className="x-map" aria-hidden="true"><i className="x-map__pin" /></div>
        </div>
        <form className="x-form" data-reveal style={d(1)} onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
          {sent ? (
            <div className="x-done">
              <span className="x-done__tick"><Check /></span>
              <h3>Thanks!</h3>
              <p>{name} will call you back shortly.</p>
            </div>
          ) : (
            <>
              <h3>Send us a message</h3>
              <label>Your name<input type="text" autoComplete="off" placeholder="Your name" /></label>
              <label>Phone<input type="tel" autoComplete="off" placeholder="Phone or WhatsApp" /></label>
              <label>Message<textarea rows={3} placeholder="How can we help?" /></label>
              <button type="submit" className="ps__btn x-book__go">Send message <Arrow /></button>
            </>
          )}
        </form>
      </section>
      <Footer {...c} />

      <div className="x-wa">
        {chat && (
          <div className="x-wa__chat">
            <strong>{name}</strong>
            <p>Hi! How can we help you today?</p>
            <span>Typically replies in minutes</span>
          </div>
        )}
        <button type="button" aria-label="Chat on WhatsApp" aria-expanded={chat} onClick={() => setChat((v) => !v)}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a12 12 0 0 1-5.7-4.6c-.4-.6-1-1.7-1-2.8 0-1.2.6-1.8.9-2.1.2-.2.5-.3.6-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z" /></svg>
        </button>
      </div>

      {zoom !== null && (
        <div className="x-lightbox" role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setZoom(null)}>
          <Img src={cat.photos.gallery[zoom]} w={1100} eager />
          <button type="button" className="x-lightbox__close" aria-label="Close" onClick={() => setZoom(null)}>×</button>
          <button type="button" className="x-lightbox__nav x-lightbox__nav--prev" aria-label="Previous photo"
            onClick={(e) => { e.stopPropagation(); setZoom((zoom + n - 1) % n); }}>‹</button>
          <button type="button" className="x-lightbox__nav x-lightbox__nav--next" aria-label="Next photo"
            onClick={(e) => { e.stopPropagation(); setZoom((zoom + 1) % n); }}>›</button>
        </div>
      )}
    </>
  );
}

function Choice({ label, options, value, onChange }: { label: string; options: string[]; value: number; onChange: (i: number) => void }) {
  return (
    <div className="x-choice" role="group" aria-label={label}>
      <span>{label}</span>
      <div>{options.map((o, i) => <button key={o} type="button" aria-pressed={value === i} onClick={() => onChange(i)}>{o}</button>)}</div>
    </div>
  );
}
