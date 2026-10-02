import type { Metadata } from "next";
import { brand } from "@/lib/site";

export const metadata: Metadata = { title: `Privacy policy — ${brand.name}` };

export default function PrivacyPage() {
  return (
    <section className="page-head">
      <div className="wrap prose">
        <p className="kicker">Privacy</p>
        <h1 className="display page-head__title" style={{ fontSize: "var(--step-3)" }}>Privacy policy</h1>
        <p className="draft-note">Draft for design review — needs legal review before launch.</p>

        <h2>What we collect</h2>
        <p>When you send a project request we collect your name, email, phone number (if you give it), your type of business, and what you tell us about your project.</p>

        <h2>Why we collect it</h2>
        <p>Only to reply to your request and discuss your project. We don&apos;t sell your details or use them for advertising.</p>

        <h2>Who sees it</h2>
        <p>Only the {brand.name} team members working on your request.</p>

        <h2>How long we keep it</h2>
        <p>Until your enquiry is closed, or for as long as we work together. You can ask us to delete it at any time.</p>

        <h2>Your rights</h2>
        <ul>
          <li>Ask what details we hold about you</li>
          <li>Ask us to correct or delete them</li>
          <li>Withdraw your consent</li>
        </ul>
        <p>Email <a href={`mailto:${brand.email}`}>{brand.email}</a> for any of these. We reply within 7 days.</p>
      </div>
    </section>
  );
}
