"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PREVIEW_DRAFT_KEY } from "@/lib/previews";

// Home-page hook: type a business name, jump to /preview with it filled in.
export function PreviewTeaser() {
  const router = useRouter();
  const [name, setName] = useState("");
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    try { if (name.trim()) sessionStorage.setItem(PREVIEW_DRAFT_KEY, name.trim()); } catch {}
    router.push("/preview");
  };
  const shown = name.trim() || "your business";
  return (
    <section className="section teaser-section" aria-labelledby="teaser-title">
      <div className="wrap">
        <form className="teaser" onSubmit={go}>
          <div className="teaser__copy">
            <p className="kicker">Free preview</p>
            <h2 id="teaser-title" className="display h2">Curious how <span className="grad-text teaser__name">{shown}</span> would look online?</h2>
            <p className="teaser__text">Type your business name. We&apos;ll show you four designs made for your kind of business, in seconds.</p>
          </div>
          <div className="teaser__row">
            <label htmlFor="teaser-name" className="sr-only">Business name</label>
            <input id="teaser-name" maxLength={40} placeholder="Your business name" autoComplete="organization" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn btn--grad">See my website</button>
          </div>
        </form>
      </div>
    </section>
  );
}
