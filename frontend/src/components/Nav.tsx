"use client";

import Link from "next/link";
import { useState } from "react";
import { nav } from "@/lib/site";
import { Logo } from "./Logo";

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="nav">
      <div className="wrap nav__in">
        <Logo />
        <nav className="nav__links" aria-label="Main">
          {nav.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
        </nav>
        <button className="nav__burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            {open
              ? <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              : <path d="M3 6h14M3 14h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />}
          </svg>
        </button>
      </div>
      <div className="nav__sheet" data-open={open} onClick={() => setOpen(false)}>
        {nav.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
        <Link href="/start" className="btn btn--grad">Book a project</Link>
      </div>
    </header>
  );
}
