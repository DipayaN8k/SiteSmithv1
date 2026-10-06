import Link from "next/link";
import { brand } from "@/lib/site";

// Loopgen mark: one continuous loop (we keep improving what we build) with a spark (the "gen").
// The loop uses currentColor (follows the theme); the spark is always ember orange.
// Drawn as two filled rings (not a stroked outline) so every browser, including Safari, renders it the same.
export const LOOP_PATHS = [
  "M3.0 15 a6.6 6.6 0 1 0 13.2 0 a6.6 6.6 0 1 0 -13.2 0 Z M6.199999999999999 15 a3.4 3.4 0 1 0 6.8 0 a3.4 3.4 0 1 0 -6.8 0 Z",
  "M15.799999999999999 15 a6.6 6.6 0 1 0 13.2 0 a6.6 6.6 0 1 0 -13.2 0 Z M19.0 15 a3.4 3.4 0 1 0 6.8 0 a3.4 3.4 0 1 0 -6.8 0 Z",
];

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg className="logo__mark" width={size} height={Math.round(size * 26 / 32)} viewBox="0 0 32 26" aria-hidden="true">
      {LOOP_PATHS.map((d) => <path key={d} d={d} fill="currentColor" fillRule="evenodd" />)}
      <path d="M26.6 0 L29.1 2.5 L26.6 5 L24.1 2.5 Z" fill="#fa7e1e" />
      <circle cx="21.4" cy="2.8" r="1.25" fill="#fa7e1e" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label={`${brand.name} home`}>
      <LogoMark />
      {brand.name}
    </Link>
  );
}
