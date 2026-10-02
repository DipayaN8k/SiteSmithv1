import Link from "next/link";
import { brand, nav, navMore } from "@/lib/site";
import { Logo } from "./Logo";
import { Spark } from "./Sparks";

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top">
          <div>
            <Logo />
            <nav className="footer__links" aria-label="Footer">
              {[...nav, ...navMore].map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
              <Link href="/start">Book a project</Link>
              <Link href="/privacy">Privacy</Link>
            </nav>
          </div>
          <div className="footer__contact">
            <a href={`mailto:${brand.email}`}>{brand.email}</a>
            <span>WhatsApp {brand.whatsapp}</span>
            <span>Instagram {brand.instagram}</span>
            <span>{brand.city}</span>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} {brand.name}. Welcome to the website AI couldn&apos;t build.</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            Still looking for sparks? <Spark id="footer" />
          </span>
        </div>
      </div>
    </footer>
  );
}
