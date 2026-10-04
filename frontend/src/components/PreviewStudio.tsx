"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, DEFAULT_FONT, resolveCategory, DESIGNS, FONTS, PREVIEW_CHOICE_KEY, PREVIEW_DRAFT_KEY, THEMES, paletteFor, type DesignId, type FontId } from "@/lib/previews";
import { elegant, statement } from "@/lib/previewFonts";
import { PreviewSite } from "./PreviewSite";
import { SAME_PAGE_EVENT } from "./ScrollManager";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 28) || "yourbusiness";

// "See your website": business name + type (+ what they do) -> four ready-made designs with their name on them
// (see DESIGNS in lib/previews), with real photos and motion. Visitors can also try colour themes and heading fonts.
export function PreviewStudio() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "loading" | "result">("form");
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [about, setAbout] = useState("");
  const [design, setDesign] = useState<DesignId>("bold");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [theme, setTheme] = useState("original");
  const [font, setFont] = useState<FontId | null>(null); // null = the design's own font
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

  // "See your website first" clicked again while here: back to the form to try another business.
  useEffect(() => {
    const reset = () => { setStep("form"); setErrors({}); };
    window.addEventListener(SAME_PAGE_EVENT, reset);
    return () => window.removeEventListener(SAME_PAGE_EVENT, reset);
  }, []);

  const cat = resolveCategory(catId);

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
      const style = [theme !== "original" && `${THEMES.find((t) => t.id === theme)?.name} colours`, font && `${FONTS.find((f) => f.id === font)?.name} font`].filter(Boolean).join(", ");
      sessionStorage.setItem(PREVIEW_CHOICE_KEY, JSON.stringify({ name: name.trim(), catId, category: cat?.label, design: d.name, style }));
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
    <div className={`studio ${elegant.variable} ${statement.variable}`} ref={resultRef}>
      <div className="studio__head">
        <div>
          <h2 className="display h2">Here&apos;s {name.trim()}, {DESIGNS.length} ways.</h2>
          <p className="lede">Pick the one that feels like you.</p>
        </div>
        <button className="btn btn--sm" onClick={() => setStep("form")}>Change details</button>
      </div>

      <div className="studio__note" role="note">
        <p>
          <span className="studio__note-tag">Read first</span>
          <strong>This is just a preview.</strong> Your real site is designed from scratch around {name.trim()} and hand-coded by our engineers, so it will look and work far better.
        </p>
        <div className="studio__meters">
          <span>This preview<i aria-hidden="true"><b style={{ width: "30%" }} /></i></span>
          <span className="studio__meters-final">Your website<i aria-hidden="true"><b style={{ width: "100%" }} /></i></span>
        </div>
      </div>

      <div className="studio__bar">
        <p className="studio__hint">Scroll and tap inside the preview. It works like the real thing.</p>
        <div className="studio__device" role="group" aria-label="Screen size">
          <button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>Desktop</button>
          <button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>Mobile</button>
        </div>
      </div>

      <div className="studio__designs" role="group" aria-label="Design">
        {DESIGNS.map((d) => {
          const p = paletteFor(cat, d.id, theme);
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

      <div className="studio__style">
        <div className="studio__themes" role="group" aria-label="Colours">
          <span>Colours</span>
          {THEMES.map((t) => {
            const p = paletteFor(cat, design, t.id);
            return (
              <button key={t.id} aria-pressed={theme === t.id} onClick={() => setTheme(t.id)} title={t.name}>
                <i style={{ background: `linear-gradient(135deg, ${p.bg} 50%, ${p.accent} 50%)` }} aria-hidden="true" />{t.name}
              </button>
            );
          })}
        </div>
        <div className="studio__fonts" role="group" aria-label="Heading font">
          <span>Font</span>
          {FONTS.map((f) => (
            <button key={f.id} data-font={f.id} aria-pressed={(font ?? DEFAULT_FONT[design]) === f.id} onClick={() => setFont(f.id)}>{f.name}</button>
          ))}
        </div>
      </div>

      <section className={`frame frame--${device}`} aria-label={`${DESIGNS.find((d) => d.id === design)!.name} website design for ${name}, a ${cat.label} business`}>
        <div className="frame__bar" aria-hidden="true"><i /><i /><i /><span>www.{slug(name)}.com</span><b className="frame__tag">Preview</b></div>
        <div className="frame__viewport">
          <PreviewSite key={`${design}-${cat.id}`} cat={cat} design={design} name={name.trim()} about={about} theme={theme} font={font ?? undefined} />
        </div>
      </section>

      <div className="studio__cta">
        <button className="btn btn--grad" onClick={book}>I like this one — book it</button>
        <span className="studio__trial">Free trial included</span>
        <p className="studio__fine">This preview is only a starting point. We customise every page to your needs.</p>
        <Link href="/work" className="studio__link">Or see sites we&apos;ve built</Link>
      </div>
    </div>
  );
}
