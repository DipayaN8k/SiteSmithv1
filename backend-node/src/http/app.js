import http from 'node:http';
import { ServiceError } from '../core/errors.js';
import { decodeAccessToken } from '../core/security.js';
import { getById, isActive } from '../services/users.js';
import { createLimiter, clientIp, parseLimit } from './ratelimit.js';

const MAX_BODY_BYTES = 1_000_000;
const ALLOWED_METHODS = 'GET, POST, PATCH, DELETE';
// The browser-safe request headers plus the two this API needs.
const ALLOWED_HEADERS = 'Accept, Accept-Language, Authorization, Content-Language, Content-Type';
const PREFLIGHT_VARY = 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Access-Control-Request-Private-Network';

/** Tiny router: patterns like /api/leads/:lead_id/stages/:stage. */
export function createRouter() {
  const routes = [];
  return {
    routes,
    add(method, pattern, spec) {
      routes.push({ method, pattern, segments: pattern.split('/').filter(Boolean), ...spec });
    },
    match(method, pathname) {
      const parts = pathname.split('/').filter(Boolean);
      let pathMatched = false;
      for (const route of routes) {
        if (route.segments.length !== parts.length) continue;
        const params = {};
        const ok = route.segments.every((seg, i) => {
          if (seg.startsWith(':')) {
            try {
              params[seg.slice(1)] = decodeURIComponent(parts[i]);
            } catch {
              params[seg.slice(1)] = parts[i]; // malformed %-escape: keep the raw text, validation will reject it
            }
            return true;
          }
          return seg === parts[i];
        });
        if (!ok) continue;
        pathMatched = true;
        if (route.method === method) return { route, params };
      }
      return { route: null, pathMatched };
    },
  };
}

function send(res, status, body) {
  if (status === 204 || body === undefined) {
    res.writeHead(status);
    res.end();
    return;
  }
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new ServiceError(413, 'Request Entity Too Large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Build the HTTP server. `registerRoutes(router, ctxDeps)` adds the endpoints (see routes/index.js).
 * deps: { config, db, resolver? (DNS resolver, tests inject a fake), now? }
 */
export function createApp({ config, db, registerRoutes, resolver, now }) {
  const router = createRouter();
  const limiter = createLimiter({ enabled: config.rateLimitEnabled, now });
  const limits = { contact: parseLimit(config.contactRateLimit), login: parseLimit(config.loginRateLimit) };
  registerRoutes(router, { config, db, resolver });

  async function authenticate(req) {
    const header = req.headers.authorization || '';
    const m = /^bearer\s+(.+)$/i.exec(header);
    const userId = m ? decodeAccessToken(m[1].trim(), config.jwtSecret) : null;
    const user = userId === null ? null : await getById(db, userId);
    return user && isActive(user) ? user : null;
  }

  function plainText(res, status, text, extra = {}) {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(text), ...extra });
    res.end(text);
  }

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const origin = req.headers.origin;
    const allowedOrigin = Boolean(origin) && config.corsOrigins.includes(origin);

    // Browser preflight: answered first, before anything else, exactly as the old CORS layer did.
    if (req.method === 'OPTIONS' && req.headers['access-control-request-method']) {
      if (!allowedOrigin) return plainText(res, 400, 'Disallowed CORS origin');
      return plainText(res, 200, 'OK', {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': ALLOWED_METHODS,
        'Access-Control-Allow-Headers': ALLOWED_HEADERS,
        'Access-Control-Max-Age': '600',
        Vary: PREFLIGHT_VARY,
      });
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Origin'); // answers can differ by Origin, so caches must key on it
    if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', origin);

    const { route, params, pathMatched } = router.match(req.method, url.pathname);
    if (!route) {
      if (pathMatched) {
        res.setHeader('Allow', ALLOWED_METHODS);
        return send(res, 405, { detail: 'Method Not Allowed' });
      }
      return send(res, 404, { detail: 'Not Found' });
    }

    // 1. authentication (before anything else, like a FastAPI dependency)
    let user = null;
    if (route.auth) {
      user = await authenticate(req);
      if (!user) {
        res.setHeader('WWW-Authenticate', 'Bearer');
        return send(res, 401, { detail: 'Not authenticated' });
      }
    }

    // 2. validation: path, query, body (collected together into one 422)
    const errors = [];
    const ctx = { req, res, db, config, user, resolver, url, ip: clientIp(req, config.trustProxyHops), params: {}, query: {}, body: undefined };
    if (route.params) ctx.params = route.params(params, errors);
    if (route.query) {
      const raw = Object.fromEntries(url.searchParams);
      ctx.query = route.query(raw, errors);
    }
    if (route.body) {
      const text = await readBody(req);
      let json;
      let jsonError = null;
      if (text.trim() !== '') {
        try {
          json = JSON.parse(text);
        } catch (e) {
          const at = /position (\d+)/.exec(e.message); // where the JSON went wrong, like FastAPI reports
          jsonError = { type: 'json_invalid', loc: ['body', at ? Number(at[1]) : 0], msg: 'JSON decode error' };
        }
      }
      if (jsonError) errors.push(jsonError);
      else {
        const parsed = await route.body(json, ctx);
        errors.push(...parsed.errors);
        ctx.body = parsed.value;
      }
    } else {
      req.resume();
    }
    if (errors.length) return send(res, 422, { detail: errors });

    // 3. rate limit (counted only for valid requests, as before)
    if (route.limit) {
      const verdict = limiter.hit(route.limit, ctx.ip, limits[route.limit]);
      if (verdict.limited) {
        res.setHeader('Retry-After', String(verdict.retryAfter));
        return send(res, 429, { error: `Rate limit exceeded: ${verdict.label}` });
      }
    }

    const result = await route.handler(ctx);
    return send(res, result.status ?? 200, result.json);
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      if (res.headersSent) return res.destroy();
      if (e instanceof ServiceError) return send(res, e.status, { detail: e.detail });
      console.error(`${new Date().toISOString()} ERROR ${req.method} ${req.url}`, e);
      return send(res, 500, { detail: 'Internal Server Error' });
    });
  });
  return { server, router };
}
