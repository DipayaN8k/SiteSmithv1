import type { Metadata } from "next";
import { FinalCta } from "@/components/Sections";
import { brand } from "@/lib/site";

export const metadata: Metadata = { title: `About — ${brand.name}` };

const team = [
  {
    initials: "DP", name: "Dipayan Paul", degree: "B.Tech, Computer Science (CSE)", role: "Frontend engineering · Design · Data analytics", bg: "linear-gradient(135deg, #fa7e1e, #d62976)",
    bio: "Designs what your customers see, guided by real data.",
    facts: ["Web design", "Data insights", "Front-end build"],
    points: ["Makes your site easy to use", "Uses data to see what customers want"],
  },
  {
    initials: "AD", name: "Anoranya Dutta", degree: "B.Tech, Electronics & Communication (ECE)", role: "Backend engineering · Deployment · Creatives", bg: "linear-gradient(135deg, #d62976, #962fbf)",
    bio: "A full-stack engineer with an artist's eye.",
    facts: ["Secure backend", "Launch & hosting", "Brand visuals"],
    points: ["Keeps your site fast and secure", "Designs visuals that match your brand"],
  },
  {
    initials: "RD", name: "Rahul Das", degree: "B.Com, Marketing", role: "Marketing · Finance · Data & business analytics", bg: "linear-gradient(135deg, #962fbf, #4f5bd5)",
    bio: "Finds your niche before we design a thing.",
    facts: ["Market research", "Growth plans", "Clear pricing"],
    points: ["Finds who your customers really are", "Plans how they will find you online"],
  },
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
          <h1 className="display page-head__title page-head__title--about">Real engineers.<span className="grad-text">Serious websites.</span></h1>
          <p className="lede" style={{ maxWidth: "52ch" }}>
            {brand.name} is a web studio of hands-on designers and engineers. We design and build websites, online stores and landing pages for
            businesses that want their site to bring in customers, not just sit there looking nice.
          </p>
          <div className="chips">
            <span className="chip">Working with clients everywhere</span>
          </div>
        </div>
      </section>
      <section className="section about-team">
        <div className="wrap">
          <p className="kicker">The team</p>
          <h2 className="display h2">The people behind the pixels.</h2>
          <div className="team team--3">
            {team.map((m) => (
              <article className="member" key={m.role}>
                <div className="member__art" style={{ background: m.bg }}>{m.initials}</div>
                <div className="member__body">
                  <h3>{m.name}</h3>
                  <p className="member__degree">{m.degree}</p>
                  <p className="member__role">{m.role}</p>
                  <p className="member__bio">{m.bio}</p>
                  <ul className="member__points">{m.points.map((p) => <li key={p}>{p}</li>)}</ul>
                  <ul className="member__tags">{m.facts.map((f) => <li key={f}>{f}</li>)}</ul>
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
