import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { brand } from "@/lib/site";
import { legal, processors } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Privacy Policy — ${brand.name}`,
  description: `How ${brand.name} collects, uses and protects your personal data, under India's Digital Personal Data Protection Act, 2023.`,
};

const g = legal.grievanceOfficer;
const mail = <a href={`mailto:${g.email}`}>{g.email}</a>;

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          {legal.businessName} is a website design and development studio based in {legal.address}, run by its
          co-founders.
          {legal.businessStatus && ` ${legal.businessStatus}`} We design and build business websites, online stores,
          landing pages, and website chatbots and automation for businesses.
        </p>
        <p>
          For the personal data described in this policy, we are the <strong>Data Fiduciary</strong> under the Digital
          Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;): we decide why and how that data is used.
        </p>
      </>
    ),
  },
  {
    id: "scope",
    title: "What this policy covers",
    body: (
      <>
        <p>This policy covers personal data we handle when you:</p>
        <ul>
          <li>visit this website, including the free website preview and the SmithBot chat;</li>
          <li>send us a project request through the booking form;</li>
          <li>contact us by email, WhatsApp, phone or Instagram; and</li>
          <li>work with us as a client.</li>
        </ul>
        <p>
          When we build a website for a client, the personal data of <em>that client&apos;s</em> customers (for example
          people who fill in a form on the client&apos;s website) belongs to the client. The client is the Data Fiduciary
          for it, and we handle it only on their instructions, as their Data Processor. Their own privacy policy applies
          to it, not this one.
        </p>
      </>
    ),
  },
  {
    id: "data-we-collect",
    title: "Personal data we collect, and why",
    body: (
      <>
        <p>We collect only what we need. Each item below is listed with the reason we collect it.</p>
        <div className="legal__table" role="region" aria-label="Personal data we collect" tabIndex={0}>
          <table>
            <thead><tr><th>When</th><th>What we collect</th><th>Why we use it</th></tr></thead>
            <tbody>
              <tr>
                <td data-label="When">You send the booking form</td>
                <td data-label="What we collect">Full name; email address; phone or WhatsApp number; type of business; type of project; budget range; anything you write in the message box (this can include your business name and the design you liked in the free preview); and a record that you gave consent.</td>
                <td data-label="Why we use it">To reply to your request, understand your project, call or message you about it, and prepare a quote.</td>
              </tr>
              <tr>
                <td data-label="When">You contact us directly</td>
                <td data-label="What we collect">Your name, contact details and whatever you choose to send us by email, WhatsApp, phone or Instagram.</td>
                <td data-label="Why we use it">To answer your message.</td>
              </tr>
              <tr>
                <td data-label="When">You become a client</td>
                <td data-label="What we collect">Contact and billing details (and GST number, if you have one); the content, images and brand files you send for your website; and account access you share with us (for example domain or hosting logins).</td>
                <td data-label="Why we use it">To deliver the project, invoice you, keep tax and accounting records, and support your website.</td>
              </tr>
              <tr>
                <td data-label="When">Your browser loads this website</td>
                <td data-label="What we collect">Technical data your browser sends with every request: IP address, browser and device type, the page requested, and the date and time.</td>
                <td data-label="Why we use it">To deliver the website, keep it secure and block spam. Our booking system uses your IP address only briefly, in memory, to limit repeated submissions; it does not store it with your enquiry.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p><strong>Kept only on your own device, never sent to us:</strong></p>
        <ul>
          <li>Your colour theme choice, and the business name and design you pick in the free preview (see our <Link href="/cookies">Cookie Policy</Link>).</li>
          <li>The SmithBot chat. SmithBot runs inside your browser using pre-written answers. What you type into it is not sent to us or stored by us, and it disappears when you close the page.</li>
        </ul>
        <p>
          <strong>Which details are required:</strong> on the booking form, your name, email, phone number and type of
          business are required, because we cannot reply to you without them. The message box is optional. You are never
          required by law to give us your details; if you choose not to, we simply cannot respond to your request.
        </p>
        <p><strong>What we do not collect:</strong> we do not use analytics, advertising or tracking tools on this website, we do not take payments on this website, and we do not ask for sensitive data such as health, financial account or government ID details. Please do not send us such details.</p>
      </>
    ),
  },
  {
    id: "legal-basis",
    title: "Our legal basis",
    body: (
      <>
        <ul>
          <li><strong>Your consent</strong> (section 6, DPDP Act): when you tick the consent box and send the booking form.</li>
          <li><strong>Data you choose to give us for a specific purpose</strong> (section 7(a)): for example when you message us on WhatsApp, we use your details to reply.</li>
          <li><strong>Legal obligations</strong> (section 7): for example keeping invoices and tax records, or responding to a lawful request from a government authority or court.</li>
          <li><strong>Keeping the website secure:</strong> the short technical logs described above are used only to deliver the website, prevent spam and abuse, and investigate security incidents.</li>
        </ul>
        <p>We do not sell your personal data, use it for advertising, build profiles about you, or make automated decisions about you.</p>
      </>
    ),
  },
  {
    id: "withdraw-consent",
    title: "Withdrawing your consent",
    body: (
      <>
        <p>
          You can withdraw your consent at any time, as easily as you gave it: email {mail} or message us on WhatsApp at{" "}
          {brand.whatsapp}, saying you want your enquiry withdrawn. We will then stop using your data and delete it within
          a reasonable time, unless a law requires us to keep part of it (see &ldquo;How long we keep data&rdquo;).
        </p>
        <p>Withdrawing consent does not affect anything we lawfully did before you withdrew it. If you withdraw while a project is running, we may not be able to continue the project.</p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share data with",
    body: (
      <>
        <p>Your data is seen only by our team members who need it to handle your request or project. We also use these kinds of service providers (Data Processors), each bound to use the data only to provide their service to us:</p>
        <ul>
          {processors.map((p) => <li key={p.what}><strong>{p.what}:</strong> {p.why}</li>)}
        </ul>
        <p>We may also share data:</p>
        <ul>
          <li>when the law requires it, for example with a court, regulator or police authority acting under a valid legal order;</li>
          <li>to protect our rights, our clients or the public against fraud or a security threat; and</li>
          <li>with a buyer or successor if our business is merged, sold or restructured, who must protect it under this policy.</li>
        </ul>
        <p>We never sell or rent your personal data.</p>
      </>
    ),
  },
  {
    id: "outside-india",
    title: "Data stored outside India",
    body: (
      <p>
        Some of our service providers store or process data on servers outside India. Section 16 of the DPDP Act allows
        this, except to countries the Government of India restricts by notification. We do not transfer personal data to
        any restricted country. We choose providers that protect data with security measures at least as strong as those
        described here, and that commit by contract (their data processing terms, including standard contractual clauses
        where the law calls for them) to use it only to provide their service to us.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    body: (
      <ul>
        <li><strong>Enquiries that do not become projects:</strong> up to 12 months after our last conversation, then deleted.</li>
        <li><strong>Client records:</strong> for the length of the project and any support period, and after that for as long as tax and accounting laws require us to keep invoices and records (generally up to 8 years).</li>
        <li><strong>Technical logs:</strong> at least one year, as the DPDP Rules, 2025 require, and then deleted.</li>
        <li><strong>If you withdraw consent or ask us to delete your data:</strong> deleted within a reasonable time, except anything a law requires us to keep.</li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "How we protect your data",
    body: (
      <>
        <p>We use reasonable security safeguards, in line with the DPDP Rules, 2025, including:</p>
        <ul>
          <li>encryption in transit (HTTPS) for every page and form on this website;</li>
          <li>hosting with providers that encrypt stored data and keep backups;</li>
          <li>access limited to team members who need it, with individual logins and passwords stored only in hashed form; and</li>
          <li>logs to detect, investigate and fix any unauthorised access.</li>
        </ul>
        <p>No website or system can be made completely secure, but we work to keep the risk as low as reasonably possible.</p>
      </>
    ),
  },
  {
    id: "breach",
    title: "If a data breach happens",
    body: (
      <p>
        If a personal data breach affects you, we will tell you without delay, in plain language: what happened, what it
        could mean for you, what we are doing about it, and what you can do to protect yourself. We will also report it to
        the Data Protection Board of India within the time the DPDP Rules, 2025 require (currently 72 hours), and report it
        to CERT-In, India&apos;s national cyber security agency, within the time its directions require (currently 6 hours)
        where they apply.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>Under the DPDP Act you have the right to:</p>
        <ul>
          <li><strong>Get information</strong> about the personal data we hold about you, how we use it, and who we have shared it with (section 11);</li>
          <li><strong>Correct, complete, update or erase</strong> your personal data (section 12);</li>
          <li><strong>Get a copy</strong> of the personal data you gave us, in a common format such as a PDF or spreadsheet (we offer this to everyone, wherever you live);</li>
          <li><strong>Withdraw consent</strong> at any time (section 6);</li>
          <li><strong>Have your complaints resolved</strong> by us (section 13); and</li>
          <li><strong>Nominate another person</strong> to use these rights for you if you die or become unable to (section 14).</li>
        </ul>
        <p>
          To use any of these rights, email {mail} or use the button below. We may ask you to confirm your identity so we
          never give your data to someone else. We acknowledge every request within 48 hours and complete it within 30
          days. That is faster than the 90 days the DPDP Rules, 2025 allow.
        </p>
        <p>
          <a className="btn btn--sm" href={`mailto:${g.email}?subject=${encodeURIComponent("Personal data request")}&body=${encodeURIComponent("Hello,\n\nI would like to (choose one): see my data / get a copy of my data / correct my data / delete my data / withdraw my consent / nominate someone.\n\nName:\nEmail or phone I used:\nDetails:\n")}`}>
            Make a data request
          </a>
        </p>
        <p>
          You do not need an account with us to use these rights: we do not create user accounts on this website, so a
          request by email or WhatsApp is all it takes. Using your rights is free.
        </p>
      </>
    ),
  },
  {
    id: "your-duties",
    title: "Your duties",
    body: (
      <p>
        Section 15 of the DPDP Act also gives you duties: do not pretend to be someone else, do not hide important
        information when giving us your data, give true information when asking for a correction, and do not file false or
        frivolous complaints. Breaking these duties can lead to a penalty of up to ₹10,000 under the DPDP Act.
      </p>
    ),
  },
  {
    id: "grievance",
    title: "Grievance Officer and complaints",
    body: (
      <>
        <p>If you have a question or complaint about your personal data, contact our Grievance Officer:</p>
        <div className="legal__card">
          <strong>{g.name}</strong>, {g.role}<br />
          {legal.businessName}, {legal.address}<br />
          Email: {mail}<br />
          Phone / WhatsApp: {g.phone}
        </div>
        <p>
          We acknowledge complaints within 48 hours and resolve them within 30 days of receiving them (the DPDP Rules, 2025
          allow up to 90 days). If you are not satisfied with our response, or we do not respond in time, you can complain to
          the <strong>Data Protection Board of India</strong>. Under section 13 of the DPDP Act, you need to contact us first
          before going to the Board.
        </p>
        <p>
          We are not required to appoint a Data Protection Officer, because we are not a &ldquo;Significant Data
          Fiduciary&rdquo; under the DPDP Act. Our Grievance Officer handles all privacy questions.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        Our website and services are meant for adults (18 years or older) and for businesses. We do not knowingly collect
        personal data from anyone under 18. If you believe a child has sent us their details, email {mail} and we will
        delete them.
      </p>
    ),
  },
  {
    id: "international",
    title: "Visitors and clients outside India",
    body: (
      <>
        <p>
          We are based in India and this policy follows Indian law. If you are in another country, these points also
          apply:
        </p>
        <ul>
          <li>
            <strong>European Union, UK and similar laws (such as the GDPR):</strong> we use your data on the basis of your
            consent, to take steps you ask for before a contract and to perform our contract with you, to meet legal
            obligations, and for our legitimate interest in keeping the website secure. You can also ask us to restrict or
            object to processing, or to give you a copy of your data in a portable format. You may complain to the data
            protection authority in your country.
          </li>
          <li><strong>United States (such as California):</strong> we do not sell or &ldquo;share&rdquo; personal information for advertising, and we do not use it for targeted advertising.</li>
          <li><strong>Other countries</strong> (for example Canada, Australia, Singapore, the UAE or Brazil): you can use any
            privacy right your local law gives you by emailing us, and we will honour it.</li>
          <li><strong>Do Not Track and Global Privacy Control:</strong> we do not track visitors across websites, so these
            browser signals change nothing here: we do not collect that kind of data whether or not they are on.</li>
          <li>Your data may be processed in India and in the countries where our service providers operate.</li>
          <li>We have not appointed a representative in the EU or UK, because we deal with people there only occasionally.
            If that changes, we will appoint one and name them here.</li>
        </ul>
        <p>Email {mail} to use any of these rights.</p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        This website does not use advertising, analytics or tracking cookies. It only stores a few small settings in your
        browser to make the site work, such as your colour theme. Details are in our <Link href="/cookies">Cookie Policy</Link>.
      </p>
    ),
  },
  {
    id: "other-websites",
    title: "Links to other websites",
    body: (
      <p>
        Our website links to other services and websites, such as WhatsApp, Instagram and websites we have built for
        clients. When you open them, their own privacy policies apply, and we are not responsible for how they handle your
        data.
      </p>
    ),
  },
  {
    id: "language",
    title: "This policy in your language",
    body: (
      <p>
        You can ask for this policy in English or in any language listed in the Eighth Schedule to the Constitution of
        India (for example Bengali or Hindi). Email {mail} and tell us which language you prefer.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy when our services or the law change. The &ldquo;Last updated&rdquo; date at the top
        shows the latest version. If a change affects how we use data you have already given us, we will tell you and, where
        the law requires, ask for your consent again.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p>
        {legal.businessName}, {legal.address}<br />
        Email: {mail} · WhatsApp: {brand.whatsapp} / {brand.whatsapp2}
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Privacy Policy"
      current="/privacy"
      sections={sections}
      intro={
        <p>
          This policy explains, in plain language, what personal data {brand.name} collects, why, how we protect it, and
          the rights you have. It follows India&apos;s <strong>Digital Personal Data Protection Act, 2023</strong> and the{" "}
          <strong>Digital Personal Data Protection Rules, 2025</strong>, and the Information Technology Act, 2000 where it
          applies.
        </p>
      }
    />
  );
}
