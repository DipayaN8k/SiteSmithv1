"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, DESIGNS, PREVIEW_CHOICE_KEY, PREVIEW_DRAFT_KEY, paletteFor, type DesignId } from "@/lib/previews";
import { PreviewSite } from "./PreviewSite";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 28) || "yourbusiness";

// "See your website": business name + type (+ what they do) -> three ready-made designs with their name on them.
export function PreviewStudio() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "loading" | "result">("form");
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [about, setAbout] = useState("");
  const [design, setDesign] = useState<DesignId>("bold");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [tone, setTone] = useState<"all" | "light" | "dark">("all");
  const [errors, setErrors] = useState<{ name?: string; cat?: string }>({});
  const resultRef = useRef<HTMLDivElement>(null);

  // Pick up a name typed into the home-page teaser, and start on mobile view on small screens.
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem(PREVIEW_DRAFT_KEY);
      if (draft) { setName(draft); sessionStorage.removeItem(PREVIEW_DRAFT_KEY); }
    } catch {}
    if (window.innerWidth < 700) setDevice("mobile");
  }, []);

  const cat = CATEGORIES.find((c) => c.id === catId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err: typeof errors = {};
    if (!name.trim()) err.name = "Add your business name to see it on the site.";
    if (!catId) err.cat = "Pick the closest type of business.";
    setErrors(err);
    if (Object.keys(err).length) return;
    setStep("loading");
    setTimeout(() => {
      setStep("result");
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }, 1300);
  };

  const book = () => {
    const d = DESIGNS.find((x) => x.id === design)!;
    try {
      sessionStorage.setItem(PREVIEW_CHOICE_KEY, JSON.stringify({ name: name.trim(), catId, category: cat?.label, design: d.name }));
    } catch {}
    router.push("/start");
  };

  if (step !== "result" || !cat) {
    return (
      <form className="studio-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="pv-name">Business name</label>
          <input id="pv-name" maxLength={40} autoComplete="organization" placeholder="e.g. Chai Point" value={name}
            aria-invalid={!!errors.name} onChange={(e) => setName(e.target.value)} />
          {errors.name && <div className="field__err">{errors.name}</div>}
        </div>

        <div className="field">
          <span className="field-label" id="pv-type">Type of business</span>
          <div className="studio-cats" role="group" aria-labelledby="pv-type">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.id} className="option option--chip" aria-pressed={catId === c.id} onClick={() => setCatId(c.id)}>{c.label}</button>
            ))}
          </div>
          {errors.cat && <div className="field__err">{errors.cat}</div>}
        </div>

        <div className="field">
          <label htmlFor="pv-about">What does your business do? <span className="muted">(optional)</span></label>
          <input id="pv-about" maxLength={110} placeholder="e.g. Fresh coffee and homemade cakes in Salt Lake" value={about} onChange={(e) => setAbout(e.target.value)} />
        </div>

        <button className="btn btn--grad" disabled={step === "loading"}>
          {step === "loading" ? `Picking ${DESIGNS.length} designs for ${cat?.label ?? "you"}…` : "Show my website"}
        </button>
        <p className="muted small">Free, instant, no sign-up. Nothing is saved until you book.</p>
      </form>
    );
  }

  return (
    <div className="studio" ref={resultRef}>
      <div className="studio__head">
        <div>
          <h2 className="display h2">Here&apos;s {name.trim()}, {DESIGNS.length} ways.</h2>
          <p className="lede">Pick the one that feels like you. These are starting points from our library. Your final site is designed and built around your business.</p>
        </div>
        <button className="btn btn--sm" onClick={() => setStep("form")}>Change details</button>
      </div>

      <div className="studio__bar">
        <div className="studio__tones" role="group" aria-label="Show designs">
          {(["all", "light", "dark"] as const).map((t) => (
            <button key={t} aria-pressed={tone === t} onClick={() => setTone(t)}>{t === "all" ? `All ${DESIGNS.length}` : t === "light" ? "Light" : "Dark"}</button>
          ))}
        </div>
        <div className="studio__device" role="group" aria-label="Screen size">
          <button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>Desktop</button>
          <button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>Mobile</button>
        </div>
      </div>

      <div className="studio__designs" role="group" aria-label="Design">
        {DESIGNS.filter((d) => tone === "all" || d.tone === tone).map((d) => {
          const p = paletteFor(cat, d.id);
          return (
            <button key={d.id} aria-pressed={design === d.id} onClick={() => setDesign(d.id)}>
              <span className="studio__swatch" aria-hidden="true" style={{ background: p.bg }}>
                <i style={{ background: p.accent }} /><i style={{ background: p.text }} />
              </span>
              <strong>{d.name}</strong><span>{d.desc}</span>
            </button>
          );
        })}
      </div>

      <div className={`frame frame--${device}`} role="img" aria-label={`${DESIGNS.find((d) => d.id === design)!.name} website design for ${name}, a ${cat.label} business`}>
        <div className="frame__bar"><i /><i /><i /><span>www.{slug(name)}.com</span></div>
        <div className="frame__viewport" aria-hidden="true">
          <PreviewSite key={design} cat={cat} design={design} name={name.trim()} about={about} />
        </div>
      </div>

      <div className="studio__cta">
        <button className="btn btn--grad" onClick={book}>I like this one — book it</button>
        <span className="studio__trial">Free trial included</span>
        <Link href="/work" className="studio__link">Or see sites we&apos;ve built</Link>
      </div>
    </div>
  );
}
