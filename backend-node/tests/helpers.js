import { loadConfig } from '../src/config.js';
import { setAuditSink } from '../src/core/logger.js';
import { createAccessToken } from '../src/core/security.js';
import { migrate, openDatabase } from '../src/db/index.js';
import { createApp } from '../src/http/app.js';
import { registerRoutes } from '../src/routes/index.js';
import { createUser } from '../src/services/users.js';

setAuditSink(() => {}); // keep test output quiet; tests that check audit lines install their own sink

export const PASSWORD = 'correct-horse-battery';

const TEST_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: 'sqlite::memory:',
  JWT_SECRET: 'test-secret-test-secret-test-secret-123456',
  RATE_LIMIT_ENABLED: 'false',
  EMAIL_CHECK_DELIVERABILITY: 'false', // tests must not hit DNS
  CORS_ORIGINS: 'http://landing.test,http://admin.test',
};

export function contactPayload(overrides = {}) {
  return {
    full_name: 'Asha Rao',
    email: 'asha@example.com',
    phone: '+91 98765 43210',
    business_type: 'Retail',
    consent: true,
    ...overrides,
  };
}

// Optional: run the suite on a REAL MySQL instead of SQLite (see `npm run test:mysql` in the README).
// Every test starts by dropping and recreating all tables, so the database name must contain "test".
const TABLES = ['requirements', 'activity_log', 'comments', 'lead_stages', 'leads', 'users', 'schema_migrations'];

/** A real server on a random port with a fresh database. Call `await app.close()` when done. */
export async function startApp(env = {}, deps = {}) {
  const config = loadConfig({
    ...TEST_ENV,
    ...(process.env.TEST_DATABASE_URL ? { DATABASE_URL: process.env.TEST_DATABASE_URL } : {}),
    ...env,
  });
  if (config.db.client === 'mysql' && !/test/i.test(config.db.database)) {
    throw new Error(`Refusing to run the tests on database "${config.db.database}": its name must contain "test", because every test drops all tables.`);
  }
  const db = await openDatabase(config.db);
  if (config.db.client === 'mysql') for (const table of TABLES) await db.run(`DROP TABLE IF EXISTS ${table}`);
  await migrate(db);
  const { server, router } = createApp({ config, db, registerRoutes, ...deps });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const app = {
    config, db, router, base,
    async api(method, path, { json, token, headers = {}, raw } = {}) {
      const res = await fetch(base + path, {
        method,
        headers: {
          ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: raw ?? (json !== undefined ? JSON.stringify(json) : undefined),
      });
      const text = await res.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      return { status: res.status, body, headers: res.headers };
    },
    get: (path, token) => app.api('GET', path, { token }),
    post: (path, json, token) => app.api('POST', path, { json, token }),
    patch: (path, json, token) => app.api('PATCH', path, { json, token }),
    del: (path, token) => app.api('DELETE', path, { token }),
    token: (user) => createAccessToken(user.id, config.jwtSecret, config.jwtExpireMinutes),
    async makeUser(name = 'Soumava', email = 'soumava@company.com', password = PASSWORD) {
      return createUser(db, { name, email, password });
    },
    /** Submit the public form and return the new lead's id. */
    async makeLead(overrides = {}) {
      const res = await app.api('POST', '/api/contact', { json: contactPayload(overrides) });
      if (res.status !== 201) throw new Error(`makeLead failed: ${res.status} ${JSON.stringify(res.body)}`);
      return (await db.query('SELECT id FROM leads ORDER BY id DESC LIMIT 1'))[0].id;
    },
    close: () =>
      new Promise((resolve) => {
        server.close(async () => {
          await db.close();
          resolve();
        });
        server.closeAllConnections?.();
      }),
  };
  return app;
}

/** Start an app plus one signed-in user, and register cleanup with the test context. */
export async function appWithUser(t, env = {}, deps = {}) {
  const app = await startApp(env, deps);
  t.after(() => app.close());
  const user = await app.makeUser();
  return { app, user, token: app.token(user) };
}
