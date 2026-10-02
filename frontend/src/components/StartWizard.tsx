"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BUSINESS_TYPES, submitContact, type BusinessType } from "@/lib/api";
import { CATEGORY_TO_BUSINESS, PREVIEW_CHOICE_KEY } from "@/lib/previews";

const projectTypes = [
  { v: "Business website", d: "Show who you are, get enquiries" },
  { v: "Online store", d: "Sell products online" },
  { v: "Landing page", d: "One page for a campaign or launch" },
  { v: "Redesign", d: "Your current site needs a glow-up" },
];
const budgets = ["Under ₹5k", "₹5k – ₹10k", "₹10k – ₹15k", "₹15k – ₹20k"];

const STEPS = ["project", "business", "scope", "contact"] as const;
const PHONE_RE = /^[0-9+\-() .]{5,30}$/; // same rule as the backend

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
      setForm((f) => (f.message ? f : { ...f, message: `Business name: ${c.name}. I liked the ${c.design} design for ${c.category} in the free preview.` }));
    } catch {}
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const advanceSoon = () => setTimeout(next, 220);

  const businessReady = business !== "" && (business !== "Other" || businessOther.trim() !== "");

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

            <label className="consent" data-invalid={!!errors.consent}>
              <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
              <span>
                I agree that this studio can store these details and contact me about my project, as described in
                the <Link href="/privacy" target="_blank">privacy policy</Link>.
              </span>
            </label>
            {errors.consent && <div className="field__err" style={{ marginTop: -8 }}>{errors.consent}</div>}
          </div>
          {formError && <p className="field__err" role="alert" style={{ marginTop: 16 }}>{formError}</p>}
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
