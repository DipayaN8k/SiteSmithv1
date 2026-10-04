"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// A refresh should always land at the top of the page.
// 1. Turn off the browser's scroll restoration (Safari restores aggressively).
// 2. Every page change starts at the top, instantly (no slide up from below).
// 3. After a "#section" link has scrolled into place, drop the hash from the URL,
//    so refreshing doesn't jump back to that section.
// 4. Clicking a link to the page you are already on (menu, footer) takes you back to its top
//    and tells the page to reset, e.g. /preview goes back to its form for a new business.
// Fired when a link to the current page is clicked. Pages with their own steps (like /preview) listen for it.
export const SAME_PAGE_EVENT = "site:same-page";

export function ScrollManager() {
  const pathname = usePathname();

  // New page: jump to the top. Runs after Next.js's own scroll, which can land
  // part-way down the page, and uses "instant" to skip the smooth-scroll animation.
  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    const clearHash = () => {
      if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
    };

    if (location.hash) {
      // Arrived via a link like /#contact from another page: honour it once, then clean the URL.
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
      setTimeout(clearHash, 50);
    } else {
      window.scrollTo(0, 0);
    }

    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href]");
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank") return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      // Same-page "#section" clicks: let the browser scroll, then clean the URL.
      if (url.hash) { setTimeout(clearHash, 600); return; }
      if (url.pathname === location.pathname) {
        window.scrollTo({ top: 0, left: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        window.dispatchEvent(new Event(SAME_PAGE_EVENT));
      }
    };
    const onHash = () => setTimeout(clearHash, 600);
    window.addEventListener("hashchange", onHash);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}
