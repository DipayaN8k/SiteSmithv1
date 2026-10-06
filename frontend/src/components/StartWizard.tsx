"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BUSINESS_TYPES, submitContact, type BusinessType } from "@/lib/api";
import { CATEGORY_TO_BUSINESS, PREVIEW_CHOICE_KEY } from "@/lib/previews";
import { legal } from "@/lib/legal";
import { brand } from "@/lib/site";

const projectTypes = [
  { v: "Business website", d: "Show who you are, get enquiries" },
  { v: "Online store", d: "Sell products online" },
  { v: "Landing page", d: "One page for a campaign or launch" },
  { v: "Redesign", d: "Your current site needs a glow-up" },
];
const budgets = ["Under ₹5k", "₹5k – ₹10k", "₹10k – ₹15k"];

const STEPS = ["project", "business", "scope", "contact"] as const;
const PHONE_RE = /^[0-9+\-() .]{5,30}$/; // same rule as the backend

const COMMON_DOMAINS = ["gmail.com", "yahoo.com", "yahoo.in", "outlook.com", "hotmail.com", "icloud.com", "rediffmail.com", "proton.me"];

function editDistance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** "me@gmial.com" -> "me@gmail.com"; null when the domain is fine or nothing is close. */
function suggestEmail(email: string) {
  const m = email.trim().match(/^(\S+)@(\S+\.\S+)$/);
  if (!m) return null;
  const domain = m[2].toLowerCase();
  if (COMMON_DOMAINS.includes(domain)) return null;
  const best = COMMON_DOMAINS.map((c) => [c, editDistance(domain, c)] as const).sort((x, y) => x[1] - y[1])[0];
  return best[1] <= 2 ? `${m[1]}@${best[0]}` : null;
}

export function StartWizard() {
  const [step, setStep] = useState(0);
  const [projectType, setProjectType] = useState("");
  const [business, setBusiness] = useState<BusinessType | "">("");
  const [businessOther, setBusinessOther] = useState("");
  const [budget, setBudget] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [formError, setFormError] = useState("");

  // Coming from the "See your website" preview: carry the business and chosen design over.
  useEffect(() => {
    try {
      const c = JSON.parse(sessionStorage.getItem(PREVIEW_CHOICE_KEY) ?? "null");
      if (!c?.name) return;
      setProjectType(c.catId === "fashion" ? "Online store" : "Business website");
      const b = CATEGORY_TO_BUSINESS[c.catId];
      if (b) setBusiness(b as BusinessType);
      setForm((f) => (f.message ? f : { ...f, message: `Business name: ${c.name}. I liked the ${c.design} design${c.style ? ` (${c.style})` : ""} for ${c.category} in the free preview.` }));
    } catch {}
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const advanceSoon = () => setTimeout(next, 220);

  const emailHint = suggestEmail(form.email);
  const businessReady =business !== "" && (business !== "Other" || businessOther.trim() !== "");

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Add your name so we know who to reply to.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter an email like you@business.com.";
    const phone = form.phone.trim();
    if (!phone) e.phone = "Add your phone or WhatsApp number so we can reach you.";
    else if (!PHONE_RE.test(phone) || phone.replace(/\D/g, "").length < 10) e.phone = "Enter a valid number, like +91 98765 43210.";
    if (!form.consent) e.consent = "Tick the box so we're allowed to contact you.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const send = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError("");
    if (!validate() || !business) return;
    setStatus("sending");
    const res = await submitContact(
      {
        full_name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        business_type: business,
        business_type_other: business === "Other" ? businessOther.trim() : null,
        consent: true,
        website: form.website,
      },
      { project_type: projectType, budget, message: form.message.trim() || null },
    );
    if (res.ok) { setStatus("sent"); window.scrollTo({ top: 0 }); return; }
    setStatus("idle");
    if (res.kind === "validation") setErrors(res.fields);
    setFormError(res.message);
  };

  if (status === "sent") {
    return (
      <div className="wizard done">
        <div className="done__icon"><svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <h2 className="display">Got it, {form.name.trim().split(" ")[0]}.</h2>
        <p className="lede">Your request is with our team. Someone will get back to you within 24 hours on the email or phone you gave us.</p>
        <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/work" className="btn btn--dark">See our work meanwhile</Link>
          <Link href="/" className="btn">Back to home</Link>
        </div>
      </div>
    );
  }

  const current = STEPS[step];

  return (
    <div className="wizard">
      <p className="kicker">{current === "contact" ? "Last step" : `Question ${step + 1} of 3`}</p>
      <div className="wizard__bar" aria-hidden="true"><span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>

      {current === "project" && (
        <>
          <h1 className="display wizard__q">What are we building?</h1>
          <div className="options">
            {projectTypes.map((o) => (
              <button key={o.v} className="option" aria-pressed={projectType === o.v} onClick={() => { setProjectType(o.v); advanceSoon(); }}>
                <strong>{o.v}</strong><span>{o.d}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {current === "business" && (
        <>
          <h1 className="display wizard__q">What kind of business is it?</h1>
          <div className="options options--3">
            {BUSINESS_TYPES.map((b) => (
              <button key={b} className="option option--compact" aria-pressed={business === b}
                onClick={() => { setBusiness(b); if (b !== "Other") advanceSoon(); }}>
                <strong>{b}</strong>
              </button>
            ))}
          </div>
          {business === "Other" && (
            <div className="field" style={{ marginTop: 18 }}>
              <label htmlFor="business-other">Tell us what you do</label>
              <input id="business-other" autoFocus maxLength={200} value={businessOther}
                placeholder="e.g. Bakery, Law firm, Travel agency"
                onChange={(e) => setBusinessOther(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && businessReady) next(); }} />
            </div>
          )}
        </>
      )}

      {current === "scope" && (
        <>
          <h1 className="display wizard__q">What&apos;s your budget?</h1>
          <p className="wizard__sub">Rough is fine. It helps us suggest the right scope.</p>
          <div className="chip-group" role="group" aria-label="Budget">
            <span className="chip-group__label">Budget</span>
            {budgets.map((b) => (
              <button key={b} className="option option--chip option--budget" aria-pressed={budget === b} onClick={() => setBudget(b)}>
                {b}<small>Free trial included</small>
              </button>
            ))}
          </div>
        </>
      )}

      {current === "contact" && (
        <form onSubmit={send} noValidate>
          <h1 className="display wizard__q">Where do we reach you?</h1>
          <div className="fields">
            {([
              ["name", "Your name", "text", "name", true],
              ["email", "Email", "email", "email", true],
              ["phone", "Phone / WhatsApp", "tel", "tel", true],
            ] as const).map(([k, label, type, ac, required]) => (
              <div className="field" key={k}>
                <label htmlFor={k}>{label}</label>
                <input id={k} type={type} autoComplete={ac} required={required} value={form[k]} aria-invalid={!!errors[k]}
                  aria-describedby={errors[k] ? `${k}-err` : undefined}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                {errors[k] && <div className="field__err" id={`${k}-err`}>{errors[k]}</div>}
                {k === "email" && emailHint && (
                  <div className="field__hint">
                    Did you mean{" "}
                    <button type="button" className="link" onClick={() => setForm({ ...form, email: emailHint })}>{emailHint}</button>?
                  </div>
                )}
              </div>
            ))}
            <div className="field">
              <label htmlFor="message">Anything else? (optional)</label>
              <textarea id="message" rows={3} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="What I'm looking for…" />
            </div>

            {/* Honeypot: hidden from people, filled in by bots. Off-screen rather than display:none. */}
            <div className="hp" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>

            {/* DPDP Act notice (s.5 / Rule 3): what we collect, why, and how to withdraw, complain or use your rights. */}
            <div className="form-notice" id="data-notice">
              <strong>How we use these details.</strong> We collect your name, email, phone number, business type, project
              type, budget and message, only to reply to this request, discuss your project and send you a quote (the
              message is optional; the rest we need to reply). We don&apos;t sell them or use them for ads. You can withdraw consent, ask to see, correct or delete your data,
              or raise a complaint (including with the Data Protection Board of India) any time by emailing{" "}
              <a href={`mailto:${legal.grievanceOfficer.email}`}>{legal.grievanceOfficer.email}</a>. Details in
              our <Link href="/privacy" target="_blank">Privacy Policy</Link>.
            </div>
            <label className="consent" data-invalid={!!errors.consent}>
              <input type="checkbox" checked={form.consent} aria-describedby="data-notice" onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
              <span>
                I consent to {brand.name} using these details as described above and in
                the <Link href="/privacy" target="_blank">Privacy Policy</Link>.
              </span>
            </label>
            {errors.consent && <div className="field__err" style={{ marginTop: -8 }}>{errors.consent}</div>}
          </div>
          {formError && <p className="field__err" role="alert" style={{ marginTop: 16 }}>{formError}</p>}
          <p className="wizard__legal">By sending this request you agree to our <Link href="/terms" target="_blank">Terms &amp; Conditions</Link>. Sending it doesn&apos;t commit you to anything.</p>
          <div className="wizard__nav">
            <button type="button" className="btn" onClick={back}>Back</button>
            <button type="submit" className="btn btn--grad" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send my request"}
            </button>
          </div>
        </form>
      )}

      {current !== "contact" && step > 0 && (
        <div className="wizard__nav">
          <button className="btn" onClick={back}>Back</button>
          {((current === "business" && businessReady) || (current === "scope" && budget)) && (
            <button className="btn btn--dark" onClick={next}>Next</button>
          )}
        </div>
      )}
    </div>
  );
}
