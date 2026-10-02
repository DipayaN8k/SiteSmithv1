import Link from "next/link";
import { brand, compare, faqs, projects, steps, type Project } from "@/lib/site";

// Illustrated browser mock — stand-in until real project screenshots are added.
export function SiteMock({ p }: { p: Project }) {
  const [dark, light, accent] = p.palette;
  return (
    <div className="mock" style={{ background: dark, color: light }}>
      <div className="mock__bar"><i /><i /><i /></div>
      <div className="mock__nav"><span>{p.name.toUpperCase()}</span><span><span>Shop</span><span>About</span><span>Contact</span></span></div>
      <div className="mock__hero">
        <p className="mock__h">{p.headline}</p>
        <span className="mock__btn" style={{ background: accent, color: dark }}>Explore</span>
      </div>
      <div className="mock__shape" style={{ background: accent, opacity: 0.9 }} />
      <div className="mock__shape2" style={{ background: light, opacity: 0.85 }} />
    </div>
  );
}

export function WorkCard({ p }: { p: Project }) {
  return (
    <Link href="/work" className="card-work">
      <SiteMock p={p} />
      <div className="card-work__foot">
        <div>
          <div className="card-work__name">{p.name}</div>
          <div className="card-work__meta">{p.kind}</div>
        </div>
        <span className="card-work__result">{p.result}</span>
      </div>
    </Link>
  );
}

// The projects plus a closing "your business could be next" banner. Used on the home page and /work.
export function ProjectGrid() {
  return (
    <div className="work-grid">
      {projects.map((p) => <WorkCard key={p.slug} p={p} />)}
      <div className="next-card">
        <div>
          <p className="next-card__title display">Your business could be next.</p>
          <p className="next-card__text">Tell us what you sell and who you sell to. We&apos;ll come back with a plan and a first look.</p>
        </div>
        <Link href="/start" className="btn btn--grad">Get your website</Link>
      </div>
    </div>
  );
}

export function Work() {
  return (
    <section id="work" className="section" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <p className="kicker">Recent work</p>
        <h2 className="display h2">Sites people<br />stop scrolling for.</h2>
        <ProjectGrid />
      </div>
    </section>
  );
}

const Cross = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
);
const Tick = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

// Generated-vs-engineered comparison. Lives on the /why-us page.
export function Compare() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="compare" style={{ marginTop: 0 }}>
          <div className="compare__col compare__col--them">
            <h3 className="compare__label">A generated site</h3>
            <ul>{compare.them.map((t) => <li key={t}><Cross />{t}</li>)}</ul>
          </div>
          <div className="compare__col compare__col--us">
            <h3 className="compare__label">A site from {brand.name}</h3>
            <ul>{compare.us.map((t) => <li key={t}><Tick />{t}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Process() {
  return (
    <section id="process" className="section night">
      <div className="wrap">
        <p className="kicker">How it works</p>
        <h2 className="display h2">From DM to live site</h2>
        <ol className="steps">
          {steps.map((s) => (
            <li className="step" key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section className="section">
      <div className="wrap faq">
        <div>
          <p className="kicker">Questions</p>
          <h2 className="display h2">Asked before<br />you asked.</h2>
          <p className="lede">Something else on your mind? Message us on WhatsApp — a real person replies.</p>
        </div>
        <div className="faq__list">
          {faqs.map((f) => (
            <details key={f.q}>
              <summary>{f.q}<span className="plus" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </span></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  const wa = `https://wa.me/${brand.whatsapp.replace(/\D/g, "")}`;
  return (
    <section id="contact" className="section final">
      <div className="wrap">
        <h2 className="display final__title">Ready when you are.<span className="grad-text">Slide into our DMs.</span></h2>
        <p>Tell us about your business. We&apos;ll come back with a plan, a timeline and a first look.</p>
        <div className="final__ctas">
          <Link href="/start" className="btn btn--grad">Book a project</Link>
          <a href={wa} className="btn btn--ghost-light" target="_blank" rel="noopener noreferrer">WhatsApp us</a>
        </div>
      </div>
    </section>
  );
}
