// Same anvil + spark mark as the public website (frontend/src/components/Logo.tsx).
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="brand__mark" width={size} height={Math.round(size * 26 / 32)} viewBox="0 0 32 26" aria-hidden="true">
      <path d="M1 8.6 L9.5 6 H30 V13 H22.5 Q19.8 13 19.8 15.7 V18.5 H23 L26 25 H6 L9 18.5 H12.2 V15.7 Q12.2 13 9.5 13 Q4.2 12.7 1 8.6 Z" fill="currentColor" />
      <path d="M26.6 0 L29.1 2.5 L26.6 5 L24.1 2.5 Z" fill="#fa7e1e" />
      <circle cx="21.4" cy="2.8" r="1.25" fill="#fa7e1e" />
    </svg>
  );
}
