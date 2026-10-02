import type { Metadata } from "next";
import { brand } from "@/lib/site";
import { Suspense } from "react";
import { StartWizard } from "@/components/StartWizard";

export const metadata: Metadata = { title: `Book a project — ${brand.name}` };

export default function StartPage() {
  return (
    <section className="section">
      <div className="wrap">
        <Suspense><StartWizard /></Suspense>
      </div>
    </section>
  );
}
