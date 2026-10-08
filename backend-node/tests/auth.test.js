import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { createAccessToken } from '../src/core/security.js';
import { deactivateUser } from '../src/services/users.js';
import { PASSWORD, appWithUser } from './helpers.js';

const login = (app, email = 'soumava@company.com', password = PASSWORD) =>
  app.post('/auth/login', { email, password });

test('login and /auth/me', async (t) => {
  const { app } = await appWithUser(t);
  const res = await login(app);
  assert.equal(res.status, 200);
  assert.equal(res.body.token_type, 'bearer');
  const me = await app.get('/auth/me', res.body.access_token);
  assert.equal(me.status, 200);
  assert.equal(me.body.email, 'soumava@company.com');
  assert.deepEqual(Object.keys(me.body).sort(), ['created_at', 'email', 'id', 'name']);
  assert.match(me.body.created_at, /Z$/);
});

test('login email is case-insensitive', async (t) => {
  const { app } = await appWithUser(t);
  assert.equal((await login(app, 'SOUMAVA@Company.com')).status, 200);
});

test('wrong password and unknown email get the same 401', async (t) => {
  const { app } = await appWithUser(t);
  const wrong = await login(app, 'soumava@company.com', 'wrong-password-123');
  const unknown = await login(app, 'nobody@company.com');
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.body, unknown.body);
  assert.deepEqual(wrong.body, { detail: 'Invalid email or password' });
});

test('a deactivated user cannot log in and the old token stops working', async (t) => {
  const { app, user, token } = await appWithUser(t);
  assert.equal((await app.get('/auth/me', token)).status, 200);
  await deactivateUser(app.db, user.email);
  assert.equal((await login(app)).status, 401);
  assert.equal((await app.get('/auth/me', token)).status, 401);
});

test('expired, forged, unsigned and garbage tokens are rejected', async (t) => {
  const { app, user } = await appWithUser(t);
  const secret = app.config.jwtSecret;
  const expired = createAccessToken(user.id, secret, 60, Date.now() - 2 * 3_600_000);
  const forged = createAccessToken(user.id, 'some-other-secret-some-other-secret-12', 60);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: String(user.id), exp: 9999999999 })}.`;
  const wrongAlg = `${b64({ alg: 'HS512', typ: 'JWT' })}.${b64({ sub: String(user.id), exp: 9999999999 })}.${crypto.createHmac('sha512', secret).update('x').digest('base64url')}`;
  const noSub = (() => {
    const h = b64({ alg: 'HS256', typ: 'JWT' });
    const p = b64({ exp: 9999999999 });
    return `${h}.${p}.${crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url')}`;
  })();
  for (const bad of [expired, forged, unsigned, wrongAlg, noSub, 'garbage', '']) {
    assert.equal((await app.get('/auth/me', bad)).status, 401, bad.slice(0, 20));
  }
});

test('a missing token is 401 with a WWW-Authenticate header', async (t) => {
  const { app } = await appWithUser(t);
  const res = await app.get('/auth/me');
  assert.equal(res.status, 401);
  assert.deepEqual(res.body, { detail: 'Not authenticated' });
  assert.equal(res.headers.get('www-authenticate'), 'Bearer');
});

test('change password', async (t) => {
  const { app, token } = await appWithUser(t);
  const next = 'a-brand-new-password';
  const res = await app.post('/auth/change-password', { current_password: PASSWORD, new_password: next }, token);
  assert.equal(res.status, 204);
  assert.equal(res.body, null);
  assert.equal((await login(app, 'soumava@company.com', PASSWORD)).status, 401);
  assert.equal((await login(app, 'soumava@company.com', next)).status, 200);
});

test('change password validations', async (t) => {
  const { app, token } = await appWithUser(t);
  const wrong = await app.post('/auth/change-password', { current_password: 'nope-nope-nope-1', new_password: 'a-brand-new-password' }, token);
  assert.equal(wrong.status, 400);
  assert.deepEqual(wrong.body, { detail: 'Current password is incorrect' });
  const short = await app.post('/auth/change-password', { current_password: PASSWORD, new_password: 'short' }, token);
  assert.equal(short.status, 422);
  assert.match(short.body.detail, /at least 12/);
  const same = await app.post('/auth/change-password', { current_password: PASSWORD, new_password: PASSWORD }, token);
  assert.equal(same.status, 422);
  assert.match(same.body.detail, /must differ/);
});

test('team member list shows only active names', async (t) => {
  const { app } = await appWithUser(t);
  await app.makeUser('Priya', 'priya@company.com');
  const gone = await app.makeUser('Gone', 'gone@company.com');
  await deactivateUser(app.db, gone.email);
  const token = app.token(await app.makeUser('Third', 'third@company.com'));
  const res = await app.get('/api/users', token);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((u) => u.name).sort(), ['Priya', 'Soumava', 'Third']);
  assert.ok(res.body.every((u) => Object.keys(u).sort().join() === 'id,name'));
});
