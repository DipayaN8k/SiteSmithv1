// The backend sends UTC. Local SQLite omits the "Z", so add it before parsing.
const parseUtc = (s: string) => new Date(/Z$|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z");

export const formatDate = (s: string) =>
  parseUtc(s).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function timeAgo(s: string): string {
  const sec = Math.round((Date.now() - parseUtc(s).getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)} d ago`;
  return parseUtc(s).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export const businessLabel = (l: { business_type: string; business_type_other: string | null }) =>
  l.business_type === "Other" && l.business_type_other ? l.business_type_other : l.business_type;
