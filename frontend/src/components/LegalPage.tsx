import Link from "next/link";
import type { ReactNode } from "react";
import { legal } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: ReactNode };

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/cookies", label: "Cookie Policy" },
];

// Shared layout for the Privacy Policy, Terms and Cookie Policy: title, dates, contents, numbered sections.
export function LegalPage({ kicker, title, intro, sections, current }: {
  kicker: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  current: string;
}) {
  const toc = (
    <ol>
      {sections.map((s, i) => <li key={s.id}><a href={`#${s.id}`}><span>{String(i + 1).padStart(2, "0")}</span>{s.title}</a></li>)}
    </ol>
  );

  return (
    <section className="page-head legal">
      <div className="wrap">
        <p className="kicker">{kicker}</p>
        <h1 className="display legal__title">{title}</h1>
        <p className="legal__dates">Effective {legal.effectiveDate} · Last updated {legal.lastUpdated}</p>
        <nav className="legal__tabs" aria-label="Legal pages">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={l.href === current ? "page" : undefined}>{l.label}</Link>
          ))}
        </nav>

        <div className="legal__grid">
          <nav className="legal__toc" aria-label="On this page">
            <p>On this page</p>
            {toc}
          </nav>
          {/* Phones: the same list, collapsed so it doesn't push the policy far down. */}
          <details className="legal__toc-mobile">
            <summary>On this page ({sections.length} sections)</summary>
            {toc}
          </details>

          <div className="legal__body prose">
            <div className="legal__intro">{intro}</div>
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="legal__sec">
                <h2><span>{String(i + 1).padStart(2, "0")}.</span> {s.title}</h2>
                {s.body}
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
