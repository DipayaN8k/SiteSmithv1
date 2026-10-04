import type { Metadata } from "next";
import { PreviewStudio } from "@/components/PreviewStudio";
import { CATEGORIES, photo } from "@/lib/previews";
import { brand } from "@/lib/site";

export const metadata: Metadata = {
  title: `See your website — ${brand.name}`,
  description: "Type your business name and see four website designs made for your kind of business. Free and instant.",
};

const byId = (id: string) => CATEGORIES.find((c) => c.id === id)!;

// Three sample previews fanned out in the hero: what the visitor is about to get.
const FAN = [
  { cat: byId("cafe"), name: "Brew Lab", title: "Slow coffee, good company." },
  { cat: byId("salon"), name: "Glow Studio", title: "Walk in. Glow out." },
  { cat: byId("realestate"), name: "Urban Nest", title: "Find the place you'll call home." },
];

const PILLS = [
  { t: "100% free", c: "#fa7e1e" },
  { t: "Ready in 10 seconds", c: "#d62976" },
  { t: "4 designs", c: "#962fbf" },
  { t: "No sign-up", c: "#4f5bd5" },
];

export default function PreviewPage() {
  const strip = CATEGORIES.filter((c) => c.id !== "other");
  return (
    <>
      <section className="page-head pv-head">
        <div className="pv-aurora" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="wrap pv-head__in">
          <div>
            <p className="kicker">Free website preview</p>
            <h1 className="display page-head__title">See your website<span className="grad-text">before we build it.</span></h1>
            <p className="lede">Tell us your business name and what you do. We&apos;ll show you four designs made for businesses like yours, with your name on them.</p>
            <ul className="pv-pills">
              {PILLS.map((p) => <li key={p.t} style={{ "--c": p.c } as React.CSSProperties}><i aria-hidden="true" />{p.t}</li>)}
            </ul>
          </div>
          <div className="pv-fan" aria-hidden="true">
            {FAN.map((f, i) => (
              <div className="pv-card" key={f.name} style={{ "--i": i, "--a": f.cat.palettes.bold.accent } as React.CSSProperties}>
                <div className="pv-card__bar"><i /><i /><i /><span>www.{f.name.toLowerCase().replace(/\s+/g, "")}.com</span></div>
                <div className="pv-card__body">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo(f.cat.photos.hero[0], 640)} alt="" loading="eager" />
                  <div className="pv-card__text"><b>{f.name}</b><strong>{f.title}</strong><em>{f.cat.cta}</em></div>
                </div>
              </div>
            ))}
            <span className="pv-sticker">Your name here ✨</span>
          </div>
        </div>
      </section>

      <section className="section pv-studio" style={{ paddingTop: 0 }}>
        <div className="wrap"><PreviewStudio /></div>
      </section>

      <section className="pv-showcase" aria-label="Business types we design for">
        <div className="wrap">
          <p className="kicker">Made for every kind of business</p>
          <h2 className="display h2">Restaurants to real estate, <span className="grad-text">we&apos;ve got a look for you.</span></h2>
        </div>
        {[0, 1].map((row) => (
          <div className={`pv-strip ${row ? "pv-strip--rev" : ""}`} key={row} aria-hidden="true">
            <div className="pv-strip__track">
              {[...strip, ...strip].map((c, i) => (
                <figure key={`${c.id}-${i}`} style={{ "--a": c.palettes.bold.accent } as React.CSSProperties}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo(row ? c.photos.gallery[1] : c.photos.hero[0], 480)} alt="" loading="lazy" />
                  <figcaption>{c.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
