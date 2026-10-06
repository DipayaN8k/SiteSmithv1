import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { brand } from "@/lib/site";
import { legal } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Terms & Conditions — ${brand.name}`,
  description: `The terms for using the ${brand.name} website and working with us on a website project.`,
};

const mail = <a href={`mailto:${legal.grievanceOfficer.email}`}>{legal.grievanceOfficer.email}</a>;

const sections: LegalSection[] = [
  {
    id: "about",
    title: "About these Terms",
    body: (
      <>
        <p>
          These Terms &amp; Conditions (&ldquo;Terms&rdquo;) are an agreement between you and {legal.businessName}{" "}
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), a website design and development studio based in{" "}
          {legal.address}, run by its co-founders. They apply when you use this website and when you work with us.
        </p>
        <p>
          Each project is also covered by a written proposal or quote that we send you (the &ldquo;Proposal&rdquo;). If the
          Proposal and these Terms say different things, the Proposal wins for that project. By using this website or
          accepting a Proposal, you agree to these Terms. If you do not agree, please do not use the website.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Who can use our services",
    body: (
      <p>
        You must be at least 18 years old and able to enter into a binding contract under Indian law. If you act for a
        business, you confirm you are authorised to bind that business to these Terms.
      </p>
    ),
  },
  {
    id: "website-information",
    title: "Information on this website is general, not an offer",
    body: (
      <>
        <p>Everything on this website, including service descriptions, price ranges, timelines, examples, FAQs and the results shown for past projects, is general information to help you decide whether to contact us. In particular:</p>
        <ul>
          <li><strong>Prices</strong> are typical ranges, not quotes. Your price depends on your project and is fixed only in your Proposal.</li>
          <li><strong>Timelines</strong> (such as &ldquo;live in a week&rdquo; or &ldquo;2 days&rdquo;) are typical estimates. They start after you approve the design and we receive the content and payment we need, and they depend on how quickly you give feedback.</li>
          <li><strong>Response times</strong> (such as &ldquo;we call you within a day&rdquo;) are what we aim for, not a guarantee.</li>
          <li><strong>Projects marked &ldquo;Concept&rdquo;</strong> are sample websites we designed and built ourselves to show our work. They are not client projects, and the businesses shown in them are fictional or used only as examples.</li>
          <li><strong>Past client project results</strong>, once shown, describe what happened for those clients. They are not a promise of the same result for you.</li>
        </ul>
        <p>Nothing on this website is an offer that you can accept to form a contract. A contract is formed only when you accept a Proposal from us.</p>
      </>
    ),
  },
  {
    id: "written-commitments",
    title: "Only written commitments are binding",
    body: (
      <>
        <p>
          What we commit to is what is written in your Proposal and these Terms, plus any change we confirm to you in
          writing (by email or a WhatsApp message from our official number).
        </p>
        <p>
          Statements made anywhere else, including on calls or in meetings, in social media posts or ads, by SmithBot, in
          the free website preview, or in general chats, do not add to or change your Proposal or these Terms unless we
          confirm them in writing. If something matters to you, ask us to put it in the Proposal.
        </p>
      </>
    ),
  },
  {
    id: "smithbot",
    title: "SmithBot (the chat assistant)",
    body: (
      <p>
        SmithBot is an automated assistant that gives pre-written answers to common questions. It is not a person and it
        can be wrong or out of date. Its answers are general information only: they are not quotes, promises or advice, and
        they do not bind us. For anything specific to your project, contact our team.
      </p>
    ),
  },
  {
    id: "free-preview",
    title: "The free website preview",
    body: (
      <>
        <p>The &ldquo;See your website first&rdquo; tool shows sample designs with the business name you type in. Please note:</p>
        <ul>
          <li>The previews are automatically generated examples, built from ready-made designs, sample text and licensed stock photos (from Unsplash). They are not your final website and are not a deliverable.</li>
          <li>Your real website is designed for your business and may look and work differently.</li>
          <li>We do not check whether the name you type is a registered trademark or belongs to someone else.</li>
          <li>You may not copy, download or reuse the preview designs, text or photos for any other purpose.</li>
        </ul>
      </>
    ),
  },
  {
    id: "free-trial",
    title: "Free trial",
    body: (
      <p>
        Where we offer a free trial, it means we show you a first design or concept for your website before you pay
        anything, so you can decide whether to go ahead. The exact scope is set out in your Proposal or confirmed in writing.
        If you decide not to go ahead, you owe us nothing. A free trial does not include building the full website, handing
        over designs or code, domain names, hosting or any third-party costs, and the trial designs remain ours unless you
        go ahead with the project and pay for it.
      </p>
    ),
  },
  {
    id: "projects",
    title: "Enquiries, Proposals and starting a project",
    body: (
      <>
        <p>
          Sending the booking form or messaging us does not create a contract. We may accept or decline any project. When
          we agree to work together, we send you a Proposal setting out the scope, deliverables, price, payment schedule,
          timeline and number of revision rounds.
        </p>
        <p>The project starts once you accept the Proposal and we receive any advance payment it requires.</p>
      </>
    ),
  },
  {
    id: "fees",
    title: "Fees, taxes and payment",
    body: (
      <ul>
        <li>Fees, the payment schedule and any advance are as set out in your Proposal. Prices are in Indian Rupees unless the Proposal says otherwise.</li>
        <li>Your Proposal shows the price, any taxes such as GST, and any third-party costs separately, so you see the full amount before you agree. Taxes are added only where they apply.</li>
        <li>Invoices are due by the date shown on them. If a payment is late, we may pause work until it is paid, and the timeline moves accordingly.</li>
        <li>Third-party costs, such as domain names, hosting, paid plugins or themes, stock content, WhatsApp or other messaging fees and payment-gateway charges, are not included unless your Proposal says so. You pay them directly or we pass them on at cost.</li>
      </ul>
    ),
  },
  {
    id: "refunds",
    title: "Cancellations and refunds",
    body: (
      <>
        <p>Refunds and cancellations follow your Proposal. Where the Proposal does not cover them:</p>
        <ul>
          <li>you can cancel a project at any time by telling us in writing;</li>
          <li>you pay for the work done up to the date of cancellation, and any advance covers that work first;</li>
          <li>if we have not started any work, we refund your advance in full; and</li>
          <li>if we cancel a project for reasons that are not your fault, we refund any amount you paid for work we have not done.</li>
        </ul>
        <p>Approved refunds are paid to the original payment method within 15 working days.</p>
      </>
    ),
  },
  {
    id: "timelines-approvals",
    title: "Timelines, feedback and revisions",
    body: (
      <ul>
        <li>We share designs and work for your review at the stages in your Proposal. Each stage includes the number of revision rounds stated there.</li>
        <li>Once you approve a design or stage, further changes to it, or new features not in the Proposal, are a change request. We will tell you the extra cost and time before doing them.</li>
        <li>If you do not reply to a review request within 14 days, we may pause the project. If it stays paused for more than 60 days, we may treat it as cancelled under the cancellation section above.</li>
        <li>We are not responsible for delays caused by late content, feedback, payments or access from your side.</li>
      </ul>
    ),
  },
  {
    id: "your-responsibilities",
    title: "Your responsibilities",
    body: (
      <ul>
        <li>Give us accurate information, and the content, access and feedback we need, on time.</li>
        <li>Only send us text, images, logos, videos and other materials you own or have permission to use. You are responsible for any claim that they infringe someone else&apos;s rights.</li>
        <li>Make sure your business, products and website content follow the laws and licences that apply to you (for example advertising, consumer protection, food safety or medical rules).</li>
        <li>Keep any passwords and accounts we create for you safe once they are handed over.</li>
      </ul>
    ),
  },
  {
    id: "client-data",
    title: "Your website's legal pages and your customers' data",
    body: (
      <p>
        You are responsible for your own website&apos;s legal pages and for the personal data your customers submit
        through it. You are the Data Fiduciary for that data under the DPDP Act, and when we handle it for you we act as your
        Data Processor, only on your instructions. We can add standard privacy and terms pages to your site, but you should
        have them checked by your own legal adviser.
      </p>
    ),
  },
  {
    id: "third-party",
    title: "Domains, hosting and other third-party services",
    body: (
      <>
        <p>
          Wherever possible, we register domains and set up hosting and other accounts in your name. Renewing them is your
          responsibility unless your Proposal includes a maintenance plan that covers it.
        </p>
        <p>
          Your website may depend on services run by other companies, such as hosting providers, domain registrars, Google,
          Meta (WhatsApp and Instagram) and payment gateways. We are not responsible for their outages, price changes,
          policy changes or decisions (for example an account suspension), but we will help where we reasonably can.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Who owns what",
    body: (
      <ul>
        <li><strong>This website:</strong> its design, text, code, graphics, preview tool and logos belong to us or our licensors. You may not copy, reproduce or reuse them without our written permission.</li>
        <li><strong>Your website:</strong> once you have paid all fees for the project in full, you own the final custom designs, the text we write for you and the code written specifically for your website.</li>
        <li><strong>Tools and third-party parts:</strong> open-source software, fonts, stock photos, plugins and our own reusable tools and components stay owned by their owners. You receive the right to use them on your website, under their licences.</li>
        <li><strong>Until full payment:</strong> all rights in the work stay with us. We may withhold files and access, or take the work offline, until outstanding fees are paid.</li>
        <li><strong>Your materials:</strong> you keep ownership of everything you send us, and you allow us to use it only to do your project.</li>
        <li><strong>Our portfolio:</strong> we may show the finished website, your business name and logo in our portfolio and on social media. Tell us in writing if you do not want this, and we will not.</li>
      </ul>
    ),
  },
  {
    id: "confidentiality",
    title: "Confidentiality",
    body: (
      <p>
        We both keep the other&apos;s non-public business information confidential and use it only for the project, unless
        the information is already public, or the law or a court requires it to be disclosed.
      </p>
    ),
  },
  {
    id: "support",
    title: "Support after launch",
    body: (
      <p>
        Any free support period after launch, and any paid maintenance, are as set out in your Proposal. Support does not
        cover problems caused by changes made by you or others, or by third-party services, or new features. Those are
        quoted separately.
      </p>
    ),
  },
  {
    id: "no-guarantee",
    title: "No guarantee of business results",
    body: (
      <p>
        We build websites with professional skill and care. However, results such as search rankings, website traffic,
        enquiries, orders or sales depend on many things outside our control, including your business, your market, and
        search engine and platform algorithms. We do not guarantee any particular result.
      </p>
    ),
  },
  {
    id: "use-of-website",
    title: "Acceptable use of this website",
    body: (
      <>
        <p>When using this website you must not:</p>
        <ul>
          <li>break any law, or use the website for fraud, spam or to harm anyone;</li>
          <li>submit false information or someone else&apos;s details without their permission;</li>
          <li>try to gain unauthorised access to the website, its systems or data, or disrupt it;</li>
          <li>introduce viruses or harmful code, or use bots to scrape or overload the website; or</li>
          <li>copy or reuse the website&apos;s content or designs for your own business.</li>
        </ul>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "Website disclaimer",
    body: (
      <p>
        We work to keep this website accurate and available, but it is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo;. We do not promise that it will always be available, error-free or completely up to date.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <ul>
          <li>We are not liable for indirect or consequential losses, such as loss of profit, revenue, business, goodwill or data.</li>
          <li>Our total liability for any claim relating to a project is limited to the fees you paid us for that project.</li>
          <li>For use of this website alone, without a paid project, our total liability is limited to ₹1,000.</li>
        </ul>
        <p>Nothing in these Terms limits liability that cannot be limited under Indian law, such as liability for fraud.</p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <p>
        You agree to compensate us for losses, damages and reasonable legal costs arising from a claim by someone else
        caused by materials you gave us, your breach of these Terms, or your misuse of this website.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <p>
        We may restrict access to this website if you misuse it. Either of us may end a project if the other seriously
        breaks these Terms or the Proposal and does not fix it within 15 days of being told in writing. When a project ends,
        you pay for work done up to that date, and the sections on ownership, confidentiality, liability, indemnity and
        governing law continue to apply.
      </p>
    ),
  },
  {
    id: "force-majeure",
    title: "Events outside our control",
    body: (
      <p>
        Neither of us is responsible for delays or failures caused by events outside reasonable control, such as natural
        disasters, epidemics, government action, war, strikes, power or internet failures, or outages of third-party
        services. Timelines move by the length of the delay.
      </p>
    ),
  },
  {
    id: "electronic",
    title: "Communication and electronic records",
    body: (
      <p>
        You agree that we can communicate with you, send Proposals and invoices, and agree changes by email or WhatsApp.
        Agreements made electronically are valid under the Information Technology Act, 2000.
      </p>
    ),
  },
  {
    id: "complaints",
    title: "Complaints",
    body: (
      <>
        <p>If you are unhappy with our website or our service, contact our Grievance Officer:</p>
        <div className="legal__card">
          <strong>{legal.grievanceOfficer.name}</strong>, {legal.grievanceOfficer.role}<br />
          {legal.businessName}, {legal.address}<br />
          Email: {mail} · Phone / WhatsApp: {legal.grievanceOfficer.phone}
        </div>
        <p>
          We acknowledge every complaint within 48 hours and resolve it within one month of receiving it. If you are a
          consumer in India and are not satisfied, you can also contact the National Consumer Helpline (1915 or
          consumerhelpline.gov.in) or approach the Consumer Commission under the Consumer Protection Act, 2019. Privacy
          complaints are handled as described in our <Link href="/privacy#grievance">Privacy Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Governing law and disputes",
    body: (
      <p>
        These Terms and every project with us are governed by the laws of India. If a dispute arises, we will first try to
        settle it through good-faith discussion for 30 days. If it is not settled, the courts at {legal.courtsCity} have
        exclusive jurisdiction. This does not take away any right you have as a consumer to approach a Consumer
        Commission, or any protection the law of your country gives you that cannot be excluded by contract.
      </p>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <ul>
        <li>If any part of these Terms is found invalid, the rest stays in force.</li>
        <li>If we do not enforce a right straight away, we have not given it up.</li>
        <li>You may not transfer your rights under these Terms without our written consent.</li>
        <li>These Terms, your Proposal and our <Link href="/privacy">Privacy Policy</Link> together are the whole agreement between us about the project.</li>
      </ul>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <p>
        We may update these Terms from time to time. The &ldquo;Last updated&rdquo; date at the top shows the latest
        version. Changes apply to website use from that date. For a project already agreed, the Terms in force when you
        accepted the Proposal apply, unless we both agree otherwise in writing.
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

export default function TermsPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Terms & Conditions"
      current="/terms"
      sections={sections}
      intro={
        <p>
          Please read these Terms before using this website or starting a project with {brand.name}. They are written in
          plain language so it is clear what we promise, what we do not, and what we both agree to.
        </p>
      }
    />
  );
}
