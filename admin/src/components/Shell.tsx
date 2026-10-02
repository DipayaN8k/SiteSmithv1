"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";

const links = [
  { href: "/", label: "Leads" },
  { href: "/activity", label: "Activity" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => { if (ready && !user) router.replace("/login"); }, [ready, user, router]);

  if (!ready || !user) return <div className="splash">Loading…</div>;

  return (
    <div className="shell">
      <header className="top">
        <div className="wrap top__in">
          <Link href="/" className="brand"><span className="brand__mark" aria-hidden="true" />Sitesmith <small>Admin</small></Link>
          <nav className="top__nav" aria-label="Main">
            {links.map((l) => {
              const active = l.href === "/" ? path === "/" || path.startsWith("/leads") : path.startsWith(l.href);
              return <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>{l.label}</Link>;
            })}
          </nav>
          <div className="top__who">
            <Link href="/account" className="top__name" aria-current={path.startsWith("/account") ? "page" : undefined}>{user.name}</Link>
            <button className="btn btn--sm" onClick={() => { logout(); router.replace("/login"); }}>Log out</button>
          </div>
        </div>
      </header>
      <main className="wrap page">{children}</main>
    </div>
  );
}
