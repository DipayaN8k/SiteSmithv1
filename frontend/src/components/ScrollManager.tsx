"use client";

import { useEffect } from "react";

// A refresh should always land at the top of the page.
// 1. Turn off the browser's scroll restoration (Safari restores aggressively).
// 2. After a "#section" link has scrolled into place, drop the hash from the URL,
//    so refreshing doesn't jump back to that section.
export function ScrollManager() {
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
