"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SPARK_IDS, perk, type SparkId } from "@/lib/site";

const KEY = "sparks-found-v1";
const TIME_KEY = "sparks-time-v1"; // { start, end } in ms, for the "beat my time" dare

const formatTime = (ms: number) => {
  const sec = Math.max(1, Math.round(ms / 1000));
  return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;
};

type Ctx = { found: SparkId[]; find: (id: SparkId) => void; complete: boolean; openPerk: () => void };
const SparkCtx = createContext<Ctx | null>(null);

export const useSparks = () => {
  const ctx = useContext(SparkCtx);
  if (!ctx) throw new Error("useSparks must be used inside <SparkProvider>");
  return ctx;
};

export function SparkIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill="currentColor" />
    </svg>
  );
}

export function SparkProvider({ children }: { children: React.ReactNode }) {
  const [found, setFound] = useState<SparkId[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [showPerk, setShowPerk] = useState(false);
  const [took, setTook] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(saved)) setFound(saved.filter((s) => SPARK_IDS.includes(s)));
      const t = JSON.parse(localStorage.getItem(TIME_KEY) ?? "{}");
      if (t.start && t.end) setTook(formatTime(t.end - t.start));
    } catch {}
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const find = useCallback((id: SparkId) => {
    setFound((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      const left = SPARK_IDS.length - next.length;
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        const t = JSON.parse(localStorage.getItem(TIME_KEY) ?? "{}");
        if (!t.start) t.start = Date.now();
        if (left === 0) { t.end = Date.now(); setTook(formatTime(t.end - t.start)); }
        localStorage.setItem(TIME_KEY, JSON.stringify(t));
      } catch {}
      if (left === 0) setTimeout(() => setShowPerk(true), 500);
      else setToast(next.length === 1 ? `You found a spark. ${left} more are hidden on this site.` : `Spark found — ${left} to go.`);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!showPerk) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowPerk(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPerk]);

  const complete = found.length === SPARK_IDS.length;

  return (
    <SparkCtx.Provider value={{ found, find, complete, openPerk: () => setShowPerk(true) }}>
      {children}

      {toast && <div className="toast" role="status">{toast}</div>}

      {showPerk && (
        <div className="modal-bg" onClick={() => setShowPerk(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="perk-title" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" aria-label="Close" autoFocus onClick={() => setShowPerk(false)}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
            </button>
            <div className="modal__icon"><SparkIcon size={30} /></div>
            <h3 id="perk-title" className="display">{perk.title}</h3>
            <p>{took && <><span className="modal__time">All 5 in {took}.</span> </>}{perk.body}</p>
            <div className="code">{perk.code}</div>
            <div className="modal__ctas">
              <Link className="btn btn--grad" href={`/start?perk=${perk.code}`} onClick={() => setShowPerk(false)}>Claim with a project</Link>
              <button className="btn" onClick={() => {
                const text = `I found all 5 hidden sparks on ${location.origin}${took ? ` in ${took}` : ""}. Beat that.`;
                if (navigator.share) navigator.share({ text, url: location.origin }).catch(() => {});
                else navigator.clipboard?.writeText(text).then(() => setToast("Link copied — send it to a friend."));
              }}>Dare a friend to beat it</button>
            </div>
          </div>
        </div>
      )}
    </SparkCtx.Provider>
  );
}

// A hidden collectible. Drop one anywhere with <Spark id="..." />.
export function Spark({ id, style }: { id: SparkId; style?: React.CSSProperties }) {
  const { found, find } = useSparks();
  const isFound = found.includes(id);
  const [popping, setPopping] = useState(false);
  if (isFound && !popping) return null;
  return (
    <button
      className="spark-btn"
      style={style}
      data-found={popping}
      aria-label="Hidden spark — click to collect"
      onClick={() => { setPopping(true); find(id); setTimeout(() => setPopping(false), 520); }}
    >
      <SparkIcon />
    </button>
  );
}
