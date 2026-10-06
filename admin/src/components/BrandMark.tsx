// Same loop + spark mark as the public website (frontend/src/components/Logo.tsx).
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="brand__mark" width={size} height={Math.round(size * 26 / 32)} viewBox="0 0 32 26" aria-hidden="true">
      <path d="M3.0 15 a6.6 6.6 0 1 0 13.2 0 a6.6 6.6 0 1 0 -13.2 0 Z M6.199999999999999 15 a3.4 3.4 0 1 0 6.8 0 a3.4 3.4 0 1 0 -6.8 0 Z" fill="currentColor" fillRule="evenodd" />
      <path d="M15.799999999999999 15 a6.6 6.6 0 1 0 13.2 0 a6.6 6.6 0 1 0 -13.2 0 Z M19.0 15 a3.4 3.4 0 1 0 6.8 0 a3.4 3.4 0 1 0 -6.8 0 Z" fill="currentColor" fillRule="evenodd" />
      <path d="M26.6 0 L29.1 2.5 L26.6 5 L24.1 2.5 Z" fill="#fa7e1e" />
      <circle cx="21.4" cy="2.8" r="1.25" fill="#fa7e1e" />
    </svg>
  );
}
