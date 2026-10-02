"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { siteKinds } from "@/lib/site";
import { Spark } from "./Sparks";

// Hero centrepiece: an editor where code is typed by hand — human rhythm, the odd typo and
// backspace — while the website it describes assembles underneath, line by line.

type Part = "nav" | "headline" | "para" | "cta" | "tiles";
type Line = { text: string; reveals?: Part; typo?: { word: string; wrong: string } };
type Demo = { kindId: string; brand: string; para: string; lines: Line[] };

const demos: Demo[] = [
  {
    kindId: "cafe", brand: "Chai Point", para: "Fresh brews, open till 11.",
    lines: [
      { text: "// hand-written, not generated" },
      { text: "<Nav logo=\"Chai Point\" />", reveals: "nav" },
      { text: "<h1>Coffee worth the detour.</h1>", reveals: "headline", typo: { word: "worth", wrong: "wprth" } },
      { text: "<p>Fresh brews, open till 11.</p>", reveals: "para" },
      { text: "<Button>See the menu</Button>", reveals: "cta" },
      { text: "<Gallery photos={3} />", reveals: "tiles" },
    ],
  },
  {
    kindId: "boutique", brand: "Velvet Lane", para: "Small batches. Never restocked.",
    lines: [
      { text: "// designed for their customers" },
      { text: "<Nav logo=\"Velvet Lane\" />", reveals: "nav" },
      { text: "<h1>New drop. Limited pieces.</h1>", reveals: "headline", typo: { word: "Limited", wrong: "Limted" } },
      { text: "<p>Small batches. Never restocked.</p>", reveals: "para" },
      { text: "<Button>Shop the drop</Button>", reveals: "cta" },
      { text: "<Lookbook items={3} />", reveals: "tiles" },
    ],
  },
  {
    kindId: "clinic", brand: "CarePlus", para: "Book online. Seen on time.",
    lines: [
      { text: "// reviewed by a second engineer" },
      { text: "<Nav logo=\"CarePlus\" />", reveals: "nav" },
      { text: "<h1>Care that runs on time.</h1>", reveals: "headline", typo: { word: "runs", wrong: "rnus" } },
      { text: "<p>Book online. Seen on time.</p>", reveals: "para" },
      { text: "<Button>Book a visit</Button>", reveals: "cta" },
      { text: "<Doctors count={3} />", reveals: "tiles" },
    ],
  },
];

// Flatten a demo into keystrokes so a single counter drives the whole animation.
type Key = { line: number; ch?: string; back?: true; end?: true };
function keystrokes(d: Demo): Key[] {
  const keys: Key[] = [];
  d.lines.forEach((l, i) => {
    const typoAt = l.typo ? l.text.indexOf(l.typo.word) : -1;
    for (let c = 0; c < l.text.length; c++) {
      if (l.typo && c === typoAt) {
        for (const ch of l.typo.wrong) keys.push({ line: i, ch });
        for (let b = 0; b < l.typo.wrong.length; b++) keys.push({ line: i, back: true });
      }
      keys.push({ line: i, ch: l.text[c] });
    }
    keys.push({ line: i, end: true });
  });
  return keys;
}

function replay(keys: Key[], upto: number, lineCount: number) {
  const lines: string[] = Array(lineCount).fill("");
  const done = new Set<number>();
  let cursor = 0;
  for (let k = 0; k < upto; k++) {
    const key = keys[k];
    cursor = key.line;
    if (key.end) done.add(key.line);
    else if (key.back) lines[key.line] = lines[key.line].slice(0, -1);
    else lines[key.line] += key.ch;
  }
  return { lines, done, cursor };
}

// Tiny highlighter: comments, tags, attributes, strings, braces.
function highlight(src: string) {
  if (src.startsWith("//")) return <span className="tok-c">{src}</span>;
  const parts = src.split(/(<\/?[A-Za-z0-9]+|\/?>|[A-Za-z]+=|"[^"]*"?|\{[^}]*\}?)/g).filter(Boolean);
  return parts.map((p, i) => {
    const cls = p.startsWith("<") || p.endsWith(">") ? "tok-t" : p.endsWith("=") ? "tok-a" : p.startsWith("\"") ? "tok-s" : p.startsWith("{") ? "tok-b" : "";
    return <span key={i} className={cls}>{p}</span>;
  });
}

const delayFor = (k?: Key) => {
  if (!k) return 0;
  if (k.end) return 260 + Math.random() * 220; // thinking between lines
  if (k.back) return 70;
  if (k.ch === " ") return 60 + Math.random() * 60;
  return 32 + Math.random() * 55;
};

export function HandCoded() {
  const [demoIdx, setDemoIdx] = useState(0);
  const [k, setK] = useState(0);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [finishedOnce, setFinishedOnce] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(Date.now());

  const demo = demos[demoIdx];
  const kind = siteKinds.find((s) => s.id === demo.kindId) ?? siteKinds[0];
  const keys = useMemo(() => keystrokes(demo), [demo]);
  const total = keys.length;
  const atEnd = k >= total;

  useEffect(() => { setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) { setK(total); return; }
    if (!visible) return;
    if (atEnd) {
      setFinishedOnce(true);
      const t = setTimeout(() => go((demoIdx + 1) % demos.length), 2800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setK((n) => n + 1), delayFor(keys[k]));
    return () => clearTimeout(t);
  }, [k, visible, reduced, atEnd, keys, total, demoIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  function go(i: number) {
    setDemoIdx(i);
    setK(0);
    startedAt.current = Date.now();
  }

  const { lines, done, cursor } = replay(keys, k, demo.lines.length);
  const shown = (part: Part) => demo.lines.some((l, i) => l.reveals === part && done.has(i));
  const secs = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
  const { bg, text, accent, card } = kind.colors;

  return (
    <div className="coder" id="watch" ref={rootRef}>
      <div className="coder__head">
        <div className="coder__who">
          <span className="coder__avatar" aria-hidden="true">FE</span>
          <span>{atEnd ? <>Shipped. Typed by hand in {secs}s.</> : <>Frontend engineer is typing<span className="coder__dots" aria-hidden="true" /></>}</span>
        </div>
        <div className="coder__tabs" role="group" aria-label="Pick a business">
          {demos.map((d, i) => (
            <button key={d.brand} aria-pressed={i === demoIdx} onClick={() => go(i)}>
              {siteKinds.find((s) => s.id === d.kindId)?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="editor" aria-hidden="true">
        <div className="editor__bar"><i /><i /><i /><span>{demo.brand.toLowerCase().replace(/\s+/g, "-")}/page.tsx</span></div>
        <pre className="editor__code">
          {demo.lines.map((_, i) => (
            <div key={i} className="editor__line">
              <span className="editor__num">{i + 1}</span>
              <code>{highlight(lines[i])}{!atEnd && i === cursor && <span className="editor__caret" />}</code>
            </div>
          ))}
        </pre>
        {finishedOnce && <div className="editor__spark"><Spark id="hero" /></div>}
      </div>

      <div className="preview coder__preview" style={{ background: bg, color: text }}
        role="img" aria-label={`A ${kind.label.toLowerCase()} website for ${demo.brand}, being built line by line`}>
        <div className="preview__bar"><i /><i /><i /><span className="preview__url">www.{demo.brand.toLowerCase().replace(/\s+/g, "")}.com</span></div>
        <div className="preview__nav" data-on={shown("nav")}>
          <span className="preview__brand">{demo.brand}</span>
          <span className="preview__links">{kind.nav.map((n) => <span key={n}>{n}</span>)}</span>
        </div>
        <div className="preview__body">
          <div>
            <p className="preview__h" data-on={shown("headline")}>{kind.headline}</p>
            <p className="preview__p" data-on={shown("para")}>{demo.para}</p>
            <span className="preview__cta" data-on={shown("cta")} style={{ background: accent, color: bg }}>{kind.cta}</span>
          </div>
          <div className="preview__tiles" data-on={shown("tiles")}>
            <i style={{ background: `linear-gradient(135deg, ${accent}, ${card})` }} />
            <i style={{ background: card }} />
            <i style={{ background: accent, opacity: 0.6 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
