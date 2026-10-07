// Same sparrow mark as the public website (frontend/src/components/Logo.tsx).
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="brand__mark" width={size} height={Math.round(size * 26 / 32)} viewBox="0 0 32 26" aria-hidden="true">
      <defs>
        <linearGradient id="sg-wing-admin" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#fa7e1e" />
          <stop offset="1" stopColor="#d62976" />
        </linearGradient>
      </defs>
      <path d="M27 6 C25 3.6 21 3.6 19 6 C17 8.4 15 11 11 13 L3 14 L6.5 16 L2.5 19.5 L11.5 17.6 C17 17.4 22 15 24.6 11.4 C26 9.6 27.2 8 27 6 Z M23.6 6.6 m-0.95 0 a0.95 0.95 0 1 0 1.9 0 a0.95 0.95 0 1 0 -1.9 0 Z" fill="currentColor" fillRule="evenodd" />
      <path d="M19.2 9.4 C15.6 4.6 10.6 1.3 5 0.9 C8.6 4.2 10.6 8.6 12.2 12.8 Z" fill="url(#sg-wing-admin)" />
      <path d="M26.8 5.2 L30.4 6 L27.2 7.8 Z" fill="#fa7e1e" />
      <path d="M28.6 0.6 L30.6 2.6 L28.6 4.6 L26.6 2.6 Z" fill="#fa7e1e" />
    </svg>
  );
}
