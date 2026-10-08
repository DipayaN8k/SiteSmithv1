import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appWithUser, contactPayload, startApp } from './helpers.js';

const PUBLIC = new Set(['POST /api/contact', 'GET /health', 'POST /auth/login']);
const fill = (pattern) => pattern.replace(/:[a-z_]+/g, '1');

test('every endpoint except the public three requires a valid token', async (t) => {
  const app = await startApp();
  t.after(() => app.close());
  const protectedRoutes = app.router.routes.filter((r) => !PUBLIC.has(`${r.method} ${r.pattern}`));
  assert.ok(protectedRoutes.length === 13, `only ${protectedRoutes.length} protected routes found`);
  for (const route of protectedRoutes) {
    const path = fill(route.pattern);
    const body = route.method === 'GET' ? {} : { json: {} }; // fetch cannot send a body with GET
    const none = await app.api(route.method, path, body);
    assert.equal(none.status, 401, `${route.method} ${route.pattern} without a token`);
    const bad = await app.api(route.method, path, { ...body, headers: { Authorization: 'Bearer nope' } });
    assert.equal(bad.status, 401, `${route.method} ${route.pattern} with a bad token`);
  }
});

test('the public endpoints need no token and the public list cannot silently go stale', async (t) => {
  const app = await startApp();
  t.after(() => app.close());
  assert.deepEqual((await app.get('/health')).body, { status: 'ok' });
  assert.equal((await app.post('/api/contact', contactPayload())).status, 201);
  const declared = new Set(app.router.routes.map((r) => `${r.method} ${r.pattern}`));
  for (const route of PUBLIC) assert.ok(declared.has(route), route);
});

test('there is no sign-up or registration route', async (t) => {
  const app = await startApp();
  t.after(() => app.close());
  assert.ok(!app.router.routes.some((r) => /signup|register/i.test(r.pattern)));
});

test('security headers are set on every response', async (t) => {
  const app = await startApp();
  t.after(() => app.close());
  for (const res of [await app.get('/health'), await app.get('/nope'), await app.get('/auth/me')]) {
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('vary'), 'Origin');
    assert.match(res.headers.get('strict-transport-security'), /max-age=31536000/);
  }
});

test('CORS: listed origins are allowed, others get no header', async (t) => {
  const app = await startApp();
  t.after(() => app.close());
  const ok = await app.api('GET', '/health', { headers: { Origin: 'http://admin.test' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://admin.test');
  assert.equal(ok.headers.get('vary'), 'Origin');
  const other = await app.api('GET', '/health', { headers: { Origin: 'http://evil.test' } });
  assert.equal(other.headers.get('access-control-allow-origin'), null);
  const none = await app.get('/health');
  assert.equal(none.headers.get('access-control-allow-origin'), null);
});

test('CORS preflight answers for listed origins only, and allows DELETE', async (t) => {
  const app = await startApp();
  t.after(() => app.close());
  const preflight = (origin) =>
    app.api('OPTIONS', '/api/leads/1', {
      headers: { Origin: origin, 'Access-Control-Request-Method': 'DELETE', 'Access-Control-Request-Headers': 'authorization' },
    });
  const ok = await preflight('http://admin.test');
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://admin.test');
  assert.match(ok.headers.get('access-control-allow-methods'), /DELETE/);
  assert.match(ok.headers.get('access-control-allow-headers'), /Authorization/);
  assert.equal((await preflight('http://evil.test')).status, 400);
});

test('unknown paths are 404, wrong methods are 405', async (t) => {
  const app = await startApp();
  t.after(() => app.close());
  const missing = await app.get('/nothing/here');
  assert.deepEqual([missing.status, missing.body], [404, { detail: 'Not Found' }]);
  const wrong = await app.api('PUT', '/health');
  assert.deepEqual([wrong.status, wrong.body], [405, { detail: 'Method Not Allowed' }]);
});

test('request body problems are 422 in the FastAPI shape', async (t) => {
  const app = await startApp();
  t.after(() => app.close());
  const badJson = await app.api('POST', '/api/contact', { raw: '{not json', headers: { 'Content-Type': 'application/json' } });
  assert.equal(badJson.status, 422);
  assert.equal(badJson.body.detail[0].type, 'json_invalid');
  const empty = await app.api('POST', '/api/contact', { raw: '' });
  assert.deepEqual(empty.body.detail, [{ type: 'missing', loc: ['body'], msg: 'Field required' }]);
  const array = await app.api('POST', '/api/contact', { raw: '[]' });
  assert.equal(array.body.detail[0].type, 'model_attributes_type');
  const wrongType = await app.post('/api/contact', contactPayload({ full_name: 5 }));
  assert.equal(wrongType.body.detail[0].msg, 'Input should be a valid string');
});

test('a body over the size limit is rejected', async (t) => {
  const app = await startApp();
  t.after(() => app.close());
  const res = await app.api('POST', '/api/contact', { raw: JSON.stringify({ message: 'x'.repeat(1_100_000) }) }).catch((e) => ({ status: 'closed', e }));
  assert.ok(res.status === 413 || res.status === 'closed');
});

test('auth is checked before the body, so unauthenticated junk is 401, not 422', async (t) => {
  const app = await startApp();
  t.after(() => app.close());
  assert.equal((await app.api('PATCH', '/api/leads/1', { raw: 'garbage' })).status, 401);
});

test('contact rate limit: counts valid submissions per visitor, 429 body matches the old wording', async (t) => {
  const app = await startApp({ RATE_LIMIT_ENABLED: 'true', CONTACT_RATE_LIMIT: '2/hour' });
  t.after(() => app.close());
  const from = (ip, extra = {}) => app.api('POST', '/api/contact', { json: contactPayload(extra), headers: { 'X-Forwarded-For': ip } });

  assert.equal((await from('203.0.113.1')).status, 201);
  assert.equal((await from('203.0.113.1', { email: 'b@example.com' })).status, 201);
  // an invalid submission is not counted, a valid one is over the limit
  assert.equal((await from('203.0.113.1', { email: 'nope' })).status, 422);
  const limited = await from('203.0.113.1', { email: 'c@example.com' });
  assert.equal(limited.status, 429);
  assert.deepEqual(limited.body, { error: 'Rate limit exceeded: 2 per 1 hour' });
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  // someone else on a different address is unaffected
  assert.equal((await from('203.0.113.2', { email: 'd@example.com' })).status, 201);
});

test('login rate limit', async (t) => {
  const app = await startApp({ RATE_LIMIT_ENABLED: 'true', LOGIN_RATE_LIMIT: '3/minute' });
  t.after(() => app.close());
  const attempt = () => app.post('/auth/login', { email: 'x@example.com', password: 'whatever-password' });
  for (let i = 0; i < 3; i += 1) assert.equal((await attempt()).status, 401);
  const limited = await attempt();
  assert.equal(limited.status, 429);
  assert.match(limited.body.error, /3 per 1 minute/);
});

test('an unexpected error is a 500 without leaking details', async (t) => {
  const app = await startApp();
  t.after(() => app.close());
  const user = await app.makeUser();
  await app.db.run('DROP TABLE requirements');
  const original = console.error;
  console.error = () => {};
  try {
    const res = await app.get(`/api/leads/${await app.makeLead()}`, app.token(user));
    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { detail: 'Internal Server Error' });
  } finally {
    console.error = original;
  }
});

test('everything is wired for a signed-in dashboard session', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  assert.equal((await app.get('/auth/me', token)).status, 200);
  assert.equal((await app.get('/api/users', token)).status, 200);
  assert.equal((await app.get('/api/leads', token)).status, 200);
  assert.equal((await app.get(`/api/leads/${id}`, token)).status, 200);
  assert.equal((await app.get('/api/activity', token)).status, 200);
});
