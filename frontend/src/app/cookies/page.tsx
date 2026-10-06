import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { brand } from "@/lib/site";
import { legal, storageItems } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Cookie Policy — ${brand.name}`,
  description: `What ${brand.name} stores in your browser, and why there are no tracking cookies on this website.`,
};

const mail = <a href={`mailto:${legal.grievanceOfficer.email}`}>{legal.grievanceOfficer.email}</a>;

const sections: LegalSection[] = [
  {
    id: "short-version",
    title: "The short version",
    body: (
      <ul>
        <li>This website does <strong>not</strong> use analytics, advertising or tracking cookies.</li>
        <li>It stores only three small settings in your browser so the website works properly. None of them identifies you or is sent to us.</li>
        <li>That is why we do not show a cookie banner: there is nothing to accept or reject.</li>
      </ul>
    ),
  },
  {
    id: "what-are-cookies",
    title: "What cookies and browser storage are",
    body: (
      <p>
        Cookies are small text files a website saves in your browser. &ldquo;Local storage&rdquo; and &ldquo;session
        storage&rdquo; do a similar job: they let a website remember something on your own device. Session storage is
        cleared when you close the tab, and local storage stays until you clear it.
      </p>
    ),
  },
  {
    id: "what-we-store",
    title: "What this website stores",
    body: (
      <div className="legal__table" role="region" aria-label="What this website stores" tabIndex={0}>
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>What it does</th><th>How long it lasts</th></tr></thead>
          <tbody>
            {storageItems.map((s) => (
              <tr key={s.name}><td data-label="Name"><code>{s.name}</code></td><td data-label="Type">{s.where}</td><td data-label="What it does">{s.purpose}</td><td data-label="How long it lasts">{s.lasts}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "not-used",
    title: "What we do not use",
    body: (
      <ul>
        <li>No analytics tools (such as Google Analytics).</li>
        <li>No advertising or remarketing pixels (such as the Meta Pixel).</li>
        <li>No cross-site tracking, fingerprinting or selling of browsing data.</li>
        <li>{brand.botName}, the chat assistant, does not save your chat. It is gone when you close the page.</li>
      </ul>
    ),
  },
  {
    id: "third-parties",
    title: "Other companies' services",
    body: (
      <>
        <p>
          The free website preview shows stock photos that your browser loads directly from <strong>Unsplash</strong>. As
          with any image on the internet, Unsplash receives technical details such as your IP address and browser type when
          those photos load, under its own privacy policy.
        </p>
        <p>
          If you click through to WhatsApp, Instagram or a website we built for a client, that service may use its own
          cookies under its own policy. Our hosting provider may use strictly necessary technical measures to keep the
          website secure.
        </p>
      </>
    ),
  },
  {
    id: "control",
    title: "How to control or delete them",
    body: (
      <p>
        You can delete everything this website stores at any time from your browser&apos;s settings (look for
        &ldquo;Clear browsing data&rdquo; or &ldquo;Website data&rdquo;). Blocking browser storage will not stop the
        website working; it will just forget your theme and preview choices.
      </p>
    ),
  },
  {
    id: "future",
    title: "If this ever changes",
    body: (
      <p>
        If we ever add analytics or advertising cookies, we will update this policy first, and we will ask for your
        consent with a clear &ldquo;Accept&rdquo; and &ldquo;Reject&rdquo; choice before setting any of them.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Questions",
    body: <p>Email {mail}. You can read how we handle personal data in our <Link href="/privacy">Privacy Policy</Link>.</p>,
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Cookie Policy"
      current="/cookies"
      sections={sections}
      intro={<p>This page explains exactly what {brand.name}&apos;s website stores in your browser, and why.</p>}
    />
  );
}
