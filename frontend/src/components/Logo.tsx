import Link from "next/link";
import { brand } from "@/lib/site";

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label={`${brand.name} home`}>
      <span className="logo__mark">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill="#fff" /></svg>
      </span>
      {brand.name}
    </Link>
  );
}
