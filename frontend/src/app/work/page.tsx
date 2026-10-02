import type { Metadata } from "next";
import { brand } from "@/lib/site";
import { WorkGrid } from "@/components/WorkGrid";
import { FinalCta } from "@/components/Sections";

export const metadata: Metadata = { title: `Work — ${brand.name}` };

export default function WorkPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="kicker">Our work</p>
          <h1 className="display page-head__title">Sites that<span className="grad-text">earn their keep.</span></h1>
          <p className="lede">Every project below had one job: bring in more customers. Here&apos;s how each one did.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap"><WorkGrid /></div>
      </section>
      <FinalCta />
    </>
  );
}
