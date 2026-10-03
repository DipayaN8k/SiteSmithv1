import type { Metadata } from "next";
import { FinalCta } from "@/components/Sections";
import { brand } from "@/lib/site";

export const metadata: Metadata = { title: `About — ${brand.name}` };

const team = [
  {
    initials: "DP", name: "Dipayan Paul", role: "Frontend engineering · Design · Data analytics", bg: "linear-gradient(135deg, #fa7e1e, #d62976)",
    bio: "The first person to see your site, and the fussiest. Dipayan turns what your business is about into pages that feel easy to use, from the first screen to the last button.",
    facts: ["Designs how your site looks, feels and reads", "Builds every page your customers tap and scroll", "Sweats the small things: spacing, speed, the tap on a button", "Checks it on a small phone before anyone else sees it"],
  },
  {
    initials: "AD", name: "Anoranya Dutta", role: "Backend engineering · Deployment · Creatives", bg: "linear-gradient(135deg, #d62976, #962fbf)",
    bio: "Keeps the engine running and the visuals sharp.",
    facts: ["Keeps your forms, data and enquiries safe", "Takes your site live on your own domain", "Makes the visuals that give it personality"],
  },
  {
    initials: "RD", name: "Rahul Das", role: "Marketing · Finance · Data & business analytics", bg: "linear-gradient(135deg, #962fbf, #4f5bd5)",
    bio: "Loves a good spreadsheet more than a good movie. Rahul digs into your market before we design anything, so your site speaks to the customers who are actually out there.",
    facts: ["Studies your market and finds the niche you can own", "Works out what your customers need before we build", "Reads the numbers after launch to see what is working", "Keeps pricing clear, with no surprise bills"],
  },
];

// A fourth founder who can't be named publicly. Shown on purpose, but quietly.
const quietFounder = {
  role: "Backend architecture · Databases · Automations · SmithBot",
  text: "Our fourth founder built the engine room: the backend, the database, the automations and the chatbot that answers you at midnight. They prefer to stay off the page. Their work is on every site we ship.",
};

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
          <div className="team team--3">
            {team.map((m) => (
              <article className="member" key={m.role}>
                <div className="member__art" style={{ background: m.bg }}>{m.initials}</div>
                <div className="member__body">
                  <h3>{m.name}</h3>
                  <p className="member__role">{m.role}</p>
                  <p className="member__bio">{m.bio}</p>
                  <ul>{m.facts.map((f) => <li key={f}>{f}</li>)}</ul>
                </div>
              </article>
            ))}
          </div>
          <aside className="member member--quiet" aria-label="Our fourth founder">
            <div className="member__ghost" aria-hidden="true" />
            <div>
              <p className="member__role">The fourth founder · {quietFounder.role}</p>
              <p>{quietFounder.text}</p>
            </div>
          </aside>
          <div className="values">
            {values.map((v) => <div key={v.t}><h3>{v.t}</h3><p>{v.b}</p></div>)}
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
