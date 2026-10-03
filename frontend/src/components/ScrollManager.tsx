"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// A refresh should always land at the top of the page.
// 1. Turn off the browser's scroll restoration (Safari restores aggressively).
// 2. Every page change starts at the top, instantly (no slide up from below).
// 3. After a "#section" link has scrolled into place, drop the hash from the URL,
//    so refreshing doesn't jump back to that section.
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

    // Same-page "#section" clicks: let the browser scroll, then clean the URL.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href*='#']");
      if (a) setTimeout(clearHash, 600);
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
