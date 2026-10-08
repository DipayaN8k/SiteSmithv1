// In-memory fixed-window rate limiter. The app must run as ONE process (Hostinger runs one instance
// per Node.js web app), because the counters live in memory.
const UNITS = { second: 1000, minute: 60_000, hour: 3_600_000, day: 86_400_000 };

/** "5/hour" -> { max: 5, windowMs: 3600000, label: "5 per 1 hour" } (the wording slowapi used). */
export function parseLimit(spec) {
  const m = /^\s*(\d+)\s*\/\s*(second|minute|hour|day)s?\s*$/i.exec(spec);
  if (!m) throw new Error(`Bad rate limit "${spec}". Use e.g. 5/hour or 10/minute.`);
  const unit = m[2].toLowerCase();
  return { max: Number(m[1]), windowMs: UNITS[unit], label: `${m[1]} per 1 ${unit}` };
}

export function createLimiter({ enabled, now = () => Date.now() }) {
  const buckets = new Map();
  let lastSweep = now();

  return {
    /** Count one hit. Returns { limited: false } or { limited: true, label, retryAfter (seconds) }. */
    hit(name, key, limit) {
      if (!enabled) return { limited: false };
      const t = now();
      if (t - lastSweep > 60_000) {
        for (const [k, b] of buckets) if (b.resetAt <= t) buckets.delete(k);
        lastSweep = t;
      }
      const id = `${name}|${key}`;
      let bucket = buckets.get(id);
      if (!bucket || bucket.resetAt <= t) {
        bucket = { count: 0, resetAt: t + limit.windowMs };
        buckets.set(id, bucket);
      }
      bucket.count += 1;
      if (bucket.count > limit.max) {
        return { limited: true, label: limit.label, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - t) / 1000)) };
      }
      return { limited: false };
    },
  };
}

/**
 * The visitor's IP. With `hops` reverse proxies in front of the app, each proxy appends the address it
 * saw to X-Forwarded-For, so the real client is `hops` entries from the right. With no header (local
 * development, or no proxy) the socket address is used.
 */
export function clientIp(req, hops) {
  const socketIp = req.socket.remoteAddress || 'unknown';
  const header = req.headers['x-forwarded-for'];
  if (!hops || !header) return socketIp;
  const chain = String(header).split(',').map((s) => s.trim()).filter(Boolean);
  chain.push(socketIp);
  return chain[Math.max(0, chain.length - 1 - hops)];
}
