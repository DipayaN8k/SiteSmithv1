import type { Metadata } from "next";
import { brand } from "@/lib/site";
import { FinalCta, ProjectGrid } from "@/components/Sections";

export const metadata: Metadata = { title: `Work — ${brand.name}` };

export default function WorkPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="kicker">Our work</p>
          <h1 className="display page-head__title">Websites that<span className="grad-text">bring in customers.</span></h1>
          <p className="lede">A look at what we&apos;ve built, and what changed for each business after launch.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap"><ProjectGrid /></div>
      </section>
      <FinalCta />
    </>
  );
}
