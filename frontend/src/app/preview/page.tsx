import type { Metadata } from "next";
import { PreviewStudio } from "@/components/PreviewStudio";
import { brand } from "@/lib/site";

export const metadata: Metadata = {
  title: `See your website — ${brand.name}`,
  description: "Type your business name and see four website designs made for your kind of business. Free and instant.",
};

export default function PreviewPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="kicker">Free website preview</p>
          <h1 className="display page-head__title">See your website<span className="grad-text">before we build it.</span></h1>
          <p className="lede">Tell us your business name and what you do. We&apos;ll show you four designs made for businesses like yours, with your name on them.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap"><PreviewStudio /></div>
      </section>
    </>
  );
}
