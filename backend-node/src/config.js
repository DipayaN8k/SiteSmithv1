import fs from 'node:fs';
import path from 'node:path';

export const DEV_JWT_SECRET = 'dev-only-insecure-secret-do-not-use-in-prod';

/** Read KEY=VALUE lines from a .env file into process.env, without overriding variables already set. */
export function loadDotEnv(file = path.resolve(process.cwd(), '.env')) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

const bool = (v, fallback) => (v === undefined || v === '' ? fallback : /^(1|true|yes|on)$/i.test(v));
const int = (v, fallback) => (v === undefined || v === '' ? fallback : Number.parseInt(v, 10));

function dbFromEnv(env, isProd) {
  const url = env.DATABASE_URL;
  if (url && /^(mysql|mariadb):\/\//i.test(url)) {
    const u = new URL(url);
    return {
      client: 'mysql',
      host: u.hostname,
      port: int(u.port, 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: decodeURIComponent(u.pathname.replace(/^\//, '')),
    };
  }
  if (url && /^sqlite:/i.test(url)) {
    const file = url.replace(/^sqlite:(\/\/)?/i, '');
    return { client: 'sqlite', file: file === ':memory:' || file === '' ? ':memory:' : file };
  }
  if (env.DB_NAME) {
    return {
      client: 'mysql',
      host: env.DB_HOST || '127.0.0.1',
      port: int(env.DB_PORT, 3306),
      user: env.DB_USER || '',
      password: env.DB_PASSWORD || '',
      database: env.DB_NAME,
    };
  }
  if (isProd) {
    throw new Error('Database is not configured: set DB_HOST, DB_USER, DB_PASSWORD and DB_NAME (or DATABASE_URL).');
  }
  return { client: 'sqlite', file: './dev.db' };
}

export function loadConfig(env = process.env) {
  const isProd = (env.NODE_ENV || 'development') === 'production';
  const corsOrigins = (env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const config = {
    env: isProd ? 'production' : env.NODE_ENV || 'development',
    isProd,
    port: int(env.PORT, 8000), // local default matches what the website and dashboard expect
    db: dbFromEnv(env, isProd),
    jwtSecret: env.JWT_SECRET || DEV_JWT_SECRET,
    jwtExpireMinutes: int(env.JWT_EXPIRE_MINUTES, 60),
    corsOrigins,
    rateLimitEnabled: bool(env.RATE_LIMIT_ENABLED, true),
    contactRateLimit: env.CONTACT_RATE_LIMIT || '5/hour',
    loginRateLimit: env.LOGIN_RATE_LIMIT || '10/minute',
    emailCheckDeliverability: bool(env.EMAIL_CHECK_DELIVERABILITY, true),
    trustProxyHops: int(env.TRUST_PROXY_HOPS, 1),
    autoMigrate: bool(env.AUTO_MIGRATE, true),
  };
  if (isProd) {
    if (config.jwtSecret === DEV_JWT_SECRET || config.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be a random string of 32+ characters');
    }
    if (config.db.client === 'sqlite') throw new Error('SQLite is for local development only; use MySQL');
    if (config.corsOrigins.length === 0) throw new Error('CORS_ORIGINS must list the website and dashboard origins');
  }
  return config;
}
