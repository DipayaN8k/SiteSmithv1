import type { Metadata } from "next";
import { FinalCta } from "@/components/Sections";
import { brand } from "@/lib/site";

export const metadata: Metadata = { title: `About — ${brand.name}` };

const team = [
  { initials: "AB", name: "Founder name", role: "Design & strategy", bg: "linear-gradient(135deg, #fa7e1e, #d62976)", facts: ["Has opinions about every font", "Sketches on napkins, ships in Figma", "Answers WhatsApp faster than email"] },
  { initials: "CD", name: "Founder name", role: "Engineering & launch", bg: "linear-gradient(135deg, #962fbf, #4f5bd5)", facts: ["Makes sites load in under a second", "Reads server logs for fun", "Never ships on a Friday (mostly)"] },
];

const values = [
  { t: "You talk to makers", b: "No account managers in between. The people on the call are the people building your site." },
  { t: "Fixed price, fixed date", b: "You know the cost and the launch day before we start. No hourly meters running." },
  { t: "Built to be found", b: "We add SEO, speed and analytics step by step as your site grows, so it keeps getting easier to find." },
];

export default function AboutPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="kicker">About us</p>
          <h1 className="display page-head__title">Real engineers.<span className="grad-text">Serious websites.</span></h1>
          <p className="lede" style={{ maxWidth: "52ch" }}>
            {brand.name} is a web studio of hands-on designers and engineers. We design and build websites, online stores and landing pages for
            businesses that want their site to bring in customers, not just sit there looking nice.
          </p>
          <div className="chips">
            <span className="chip">Working with clients everywhere</span>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <p className="kicker">The team</p>
          <h2 className="display h2">The people<br />behind the pixels.</h2>
          <div className="team">
            {team.map((m) => (
              <article className="member" key={m.role}>
                <div className="member__art" style={{ background: m.bg }}>{m.initials}</div>
                <div className="member__body">
                  <h3>{m.name}</h3>
                  <p className="member__role">{m.role}</p>
                  <ul>{m.facts.map((f) => <li key={f}>{f}</li>)}</ul>
                </div>
              </article>
            ))}
          </div>
          <div className="values">
            {values.map((v) => <div key={v.t}><h3>{v.t}</h3><p>{v.b}</p></div>)}
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
