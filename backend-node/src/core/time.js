/** UTC timestamp as stored in the database: "YYYY-MM-DD HH:MM:SS.mmm". Generated here, never by the DB. */
export function nowTs() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

/** Database timestamp (string or Date) -> ISO 8601 UTC string with a trailing Z. */
export function toIso(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return `${String(value).replace(' ', 'T')}Z`;
}
