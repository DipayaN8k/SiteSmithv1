import Link from "next/link";
import { brand, nav, navMore } from "@/lib/site";
import { Logo } from "./Logo";

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
            </nav>
          </div>
          <div className="footer__contact">
            <a href={`mailto:${brand.email}`}>{brand.email}</a>
            <span className="footer__wa">
              WhatsApp{" "}
              {[brand.whatsapp, brand.whatsapp2].map((n, i) => (
                <span key={n}>
                  {i > 0 && " / "}
                  <a href={`https://wa.me/${n.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{n}</a>
                </span>
              ))}
            </span>
            <span>Instagram {brand.instagram}</span>
            <span>{brand.city}</span>
          </div>
        </div>
        <div className="footer__bottom">
          <nav className="footer__legal" aria-label="Legal">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms &amp; Conditions</Link>
            <Link href="/cookies">Cookie Policy</Link>
          </nav>
          <span>© {new Date().getFullYear()} {brand.name}</span>
        </div>
      </div>
    </footer>
  );
}
