import type { Category, DesignId } from "@/lib/previews";

// One ready-made website design, filled in with the visitor's business name.
// The layout reacts to the preview frame's width (CSS container queries), so the
// desktop/mobile toggle shows a real responsive layout.
export function PreviewSite({ cat, design, name, about }: { cat: Category; design: DesignId; name: string; about?: string }) {
  const p = cat.palettes[design];
  const vars = {
    "--ps-bg": p.bg, "--ps-surface": p.surface, "--ps-text": p.text,
    "--ps-muted": p.muted, "--ps-accent": p.accent, "--ps-accent-text": p.accentText,
  } as React.CSSProperties;
  const title = cat.heroTitle.replace("{name}", name);
  const text = about?.trim() || cat.heroText;
  const initial = name.trim().charAt(0).toUpperCase() || "Y";

  return (
    <div className={`ps ps--${design}`} style={vars}>
      <header className="ps__nav">
        <span className="ps__logo"><b>{initial}</b>{name}</span>
        <span className="ps__links">{cat.nav.map((n) => <span key={n}>{n}</span>)}</span>
        <span className="ps__btn ps__btn--sm">{cat.cta}</span>
      </header>

      <section className="ps__hero">
        <div className="ps__hero-text">
          <p className="ps__eyebrow">{cat.id === "other" ? name : cat.label}</p>
          <h1 className="ps__title">{title}</h1>
          <p className="ps__lead">{text}</p>
          <div className="ps__ctas">
            <span className="ps__btn">{cat.cta}</span>
            <span className="ps__btn ps__btn--ghost">Contact us</span>
          </div>
        </div>
        <div className="ps__visual" aria-hidden="true"><i /><i /><i /></div>
      </section>

      <section className="ps__section">
        <h2 className="ps__h2">{cat.sectionTitle}</h2>
        <div className="ps__cards">
          {cat.items.map((it, i) => (
            <div className="ps__card" key={it.title}>
              <div className={`ps__tile ps__tile--${i}`} aria-hidden="true" />
              <h3>{it.title}</h3>
              <p>{it.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ps__about">
        <div>
          <h2 className="ps__h2">{cat.aboutTitle}</h2>
          <p>{cat.aboutText}</p>
        </div>
        <div className="ps__contact">
          <strong>Ready when you are</strong>
          <span>Call, WhatsApp or drop by.</span>
          <span className="ps__btn">{cat.cta}</span>
        </div>
      </section>

      <footer className="ps__footer">
        <span className="ps__logo"><b>{initial}</b>{name}</span>
        <span>© {new Date().getFullYear()} {name}</span>
      </footer>
    </div>
  );
}
