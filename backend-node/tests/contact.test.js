import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appWithUser, contactPayload, startApp } from './helpers.js';

const count = async (db, table, where = '', params = []) =>
  Number((await db.query(`SELECT COUNT(*) AS n FROM ${table} ${where}`, params))[0].n);

test('creates a lead, three pending stages and a lead_created activity', async (t) => {
  const { app } = await appWithUser(t);
  const res = await app.post('/api/contact', contactPayload());
  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { message: 'Thanks, your request has been received. Our team will get back to you.' });

  const lead = (await app.db.query('SELECT * FROM leads'))[0];
  assert.equal(lead.email, 'asha@example.com');
  assert.equal(Number(lead.consent), 1);
  const stages = await app.db.query('SELECT stage, status FROM lead_stages ORDER BY id');
  assert.deepEqual(stages, [
    { stage: 'backend', status: 'pending' },
    { stage: 'frontend', status: 'pending' },
    { stage: 'deployment', status: 'pending' },
  ]);
  const log = (await app.db.query('SELECT * FROM activity_log'))[0];
  assert.equal(log.action, 'lead_created');
  assert.equal(log.user_id, null);
  assert.equal(log.lead_id, lead.id);
  assert.match(log.message, /Asha Rao/);
});

test('"Other" needs a detail; the detail is stored and ignored for other types', async (t) => {
  const { app } = await appWithUser(t);
  assert.equal((await app.post('/api/contact', contactPayload({ business_type: 'Other' }))).status, 422);
  assert.equal((await app.post('/api/contact', contactPayload({ business_type: 'Other', business_type_other: 'x'.repeat(201) }))).status, 422);
  await app.post('/api/contact', contactPayload({ business_type: 'Other', business_type_other: 'Pet grooming' }));
  await app.post('/api/contact', contactPayload({ email: 'b@example.com', business_type_other: 'ignored' }));
  const [other, retail] = await app.db.query('SELECT * FROM leads ORDER BY id');
  assert.equal(other.business_type_other, 'Pet grooming');
  assert.equal(retail.business_type_other, null);
});

test('422 bodies have the shape the frontend reads', async (t) => {
  const { app } = await appWithUser(t);
  const res = await app.post('/api/contact', contactPayload({ email: 'nope', business_type: 'Other' }));
  assert.equal(res.status, 422);
  const byField = Object.fromEntries(res.body.detail.map((e) => [e.loc.join('.'), e]));
  assert.match(byField['body.email'].msg, /^value is not a valid email address/);
  // a missing required field
  const missing = await app.post('/api/contact', { business_type: 'Retail', consent: true });
  const fields = missing.body.detail.map((e) => e.loc[1]).sort();
  assert.deepEqual(fields, ['email', 'full_name']);
  assert.equal(missing.body.detail[0].msg, 'Field required');
  // a business rule on the whole body has loc ["body"]
  const rule = await app.post('/api/contact', contactPayload({ business_type: 'Other' }));
  assert.deepEqual(rule.body.detail, [{
    type: 'value_error', loc: ['body'], msg: 'Value error, business_type_other is required when business_type is Other',
  }]);
});

test('rejects unknown business type, bad email, no consent, bad phone, blank name', async (t) => {
  const { app } = await appWithUser(t);
  for (const bad of [
    { business_type: 'Mining' }, { email: 'nope' }, { email: 'a@b' }, { email: 'a..b@example.com' }, { consent: false },
    { consent: 'yes' }, { phone: 'call me' }, { phone: '123' }, { full_name: '   ' }, { full_name: 'x'.repeat(201) },
    { message: 'x'.repeat(2001) }, { budget: 'x'.repeat(101) },
  ]) {
    assert.equal((await app.post('/api/contact', contactPayload(bad))).status, 422, JSON.stringify(bad));
  }
  assert.equal(await count(app.db, 'leads'), 0);
});

test('blank optional fields are stored as null', async (t) => {
  const { app } = await appWithUser(t);
  await app.post('/api/contact', contactPayload({ phone: '  ', project_type: '', budget: '', message: '   ' }));
  const lead = (await app.db.query('SELECT * FROM leads'))[0];
  assert.deepEqual([lead.phone, lead.project_type, lead.budget, lead.message], [null, null, null, null]);
});

test('budget, project type and message are stored and returned', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead({ project_type: 'Online store', budget: '₹5k – ₹10k', message: '<b>Need</b> a catalogue' });
  const lead = (await app.db.query('SELECT * FROM leads WHERE id = ?', [id]))[0];
  assert.deepEqual([lead.project_type, lead.budget, lead.message], ['Online store', '₹5k – ₹10k', 'Need a catalogue']);
  const detail = await app.get(`/api/leads/${id}`, token);
  assert.equal(detail.body.budget, '₹5k – ₹10k');
  assert.equal(detail.body.project_type, 'Online store');
});

test('the optional project details may be missing', async (t) => {
  const { app } = await appWithUser(t);
  const lead = (await app.db.query('SELECT * FROM leads WHERE id = ?', [await app.makeLead()]))[0];
  assert.deepEqual([lead.budget, lead.project_type, lead.message], [null, null, null]);
});

test('HTML is stripped from text fields', async (t) => {
  const { app } = await appWithUser(t);
  await app.post('/api/contact', contactPayload({ full_name: '<script>alert(1)</script>Asha <b>Rao</b>', message: 'a &lt;i&gt;b&lt;/i&gt;\n\n  line two  ' }));
  const lead = (await app.db.query('SELECT * FROM leads'))[0];
  assert.equal(lead.full_name, 'alert(1)Asha Rao');
  assert.equal(lead.message, 'a b\n\nline two');
});

test('the honeypot fakes success and stores nothing', async (t) => {
  const { app } = await appWithUser(t);
  const res = await app.post('/api/contact', contactPayload({ website: 'http://spam.example' }));
  assert.equal(res.status, 201);
  assert.equal(await count(app.db, 'leads'), 0);
  assert.equal(await count(app.db, 'activity_log'), 0);
});

test('a repeated email is flagged, not blocked', async (t) => {
  const { app, token } = await appWithUser(t);
  assert.equal((await app.post('/api/contact', contactPayload())).status, 201);
  assert.equal((await app.post('/api/contact', contactPayload({ email: 'ASHA@Example.com' }))).status, 201);
  const items = (await app.get('/api/leads', token)).body.items;
  assert.equal(items.length, 2);
  assert.ok(items.every((i) => i.duplicate_email));
  const note = (await app.db.query('SELECT message FROM activity_log ORDER BY id DESC'))[0].message;
  assert.match(note, /this email has submitted before/);
});

test('known typo domains are rejected with a suggestion', async (t) => {
  const { app } = await appWithUser(t);
  const res = await app.post('/api/contact', contactPayload({ email: 'me@Gamil.com' }));
  assert.equal(res.status, 422);
  assert.match(JSON.stringify(res.body), /gmail\.com/);
  assert.equal((await app.post('/api/contact', contactPayload({ email: 'me@gmail.com' }))).status, 201);
});

const fakeDns = (behaviour) => ({
  resolveMx: async (d) => behaviour.mx(d),
  resolve4: async (d) => (behaviour.a ? behaviour.a(d) : []),
  resolve6: async () => [],
});
const nx = () => Object.assign(new Error('queryMx ENOTFOUND'), { code: 'ENOTFOUND' });

test('a domain that does not exist is rejected when the DNS check is on', async (t) => {
  const { app } = await appWithUser(t, { EMAIL_CHECK_DELIVERABILITY: 'true' }, { resolver: fakeDns({ mx: async () => { throw nx(); }, a: async () => { throw nx(); } }) });
  const res = await app.post('/api/contact', contactPayload({ email: 'me@gmial.xyz' }));
  assert.equal(res.status, 422);
  assert.match(res.body.detail[0].msg, /can't receive mail/);
});

test('MX records, or an A record fallback, are accepted', async (t) => {
  const mx = await appWithUser(t, { EMAIL_CHECK_DELIVERABILITY: 'true' }, { resolver: fakeDns({ mx: async () => [{ exchange: 'mail.example.com', priority: 10 }] }) });
  assert.equal((await mx.app.post('/api/contact', contactPayload())).status, 201);
  const a = await appWithUser(t, { EMAIL_CHECK_DELIVERABILITY: 'true' }, { resolver: fakeDns({ mx: async () => { throw nx(); }, a: async () => ['203.0.113.7'] }) });
  assert.equal((await a.app.post('/api/contact', contactPayload())).status, 201);
});

test('a null MX (domain says it takes no mail) is rejected', async (t) => {
  const { app } = await appWithUser(t, { EMAIL_CHECK_DELIVERABILITY: 'true' }, { resolver: fakeDns({ mx: async () => [{ exchange: '', priority: 0 }] }) });
  assert.equal((await app.post('/api/contact', contactPayload())).status, 422);
});

test('a DNS outage never blocks a real lead', async (t) => {
  const down = () => { throw Object.assign(new Error('timeout'), { code: 'ETIMEOUT' }); };
  const { app } = await appWithUser(t, { EMAIL_CHECK_DELIVERABILITY: 'true' }, { resolver: fakeDns({ mx: async () => down(), a: async () => down() }) });
  assert.equal((await app.post('/api/contact', contactPayload())).status, 201);
});

test('the DNS check is skipped when switched off', async (t) => {
  let calls = 0;
  const { app } = await appWithUser(t, {}, { resolver: fakeDns({ mx: async () => { calls += 1; throw nx(); } }) });
  assert.equal((await app.post('/api/contact', contactPayload())).status, 201);
  assert.equal(calls, 0);
});

test('deleting a lead removes everything and leaves other leads alone', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  const other = await app.makeLead({ email: 'other@example.com' });
  await app.post(`/api/leads/${id}/comments`, { body: 'not a fit' }, token);
  await app.post(`/api/leads/${id}/requirements`, { stage: 'backend', text: 'API' }, token);

  assert.equal((await app.del(`/api/leads/${id}`, token)).status, 204);
  assert.equal((await app.get(`/api/leads/${id}`, token)).status, 404);
  for (const table of ['lead_stages', 'comments', 'requirements', 'activity_log']) {
    assert.equal(await count(app.db, table, 'WHERE lead_id = ?', [id]), 0, table);
  }
  assert.equal((await app.get(`/api/leads/${other}`, token)).status, 200);
  assert.equal((await app.del(`/api/leads/${id}`, token)).status, 404);
});

test('requirements: add, tick, reopen, remove', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  const base = `/api/leads/${id}/requirements`;

  const bad = await app.post(base, { stage: 'design', text: 'x' }, token);
  assert.equal(bad.status, 422);
  assert.equal(bad.body.detail[0].loc.join('.'), 'body.stage');
  assert.equal((await app.post(base, { stage: 'backend', text: 'x' })).status, 401);

  const made = await app.post(base, { stage: 'backend', text: 'Login with Google' }, token);
  assert.equal(made.status, 201);
  assert.deepEqual([made.body.stage, made.body.done, made.body.done_by_name, made.body.created_by_name], ['backend', false, null, 'Soumava']);

  const done = (await app.patch(`${base}/${made.body.id}`, { done: true }, token)).body;
  assert.equal(done.done, true);
  assert.equal(done.done_by_name, 'Soumava');
  assert.ok(done.done_at);

  const detail = (await app.get(`/api/leads/${id}`, token)).body;
  assert.deepEqual(detail.requirements.map((r) => r.text), ['Login with Google']);
  const messages = detail.activity.map((a) => a.message).join(' | ');
  assert.match(messages, /added a Backend requirement/);
  assert.match(messages, /marked a requirement as met on Backend/);

  const reopened = (await app.patch(`${base}/${made.body.id}`, { done: false }, token)).body;
  assert.deepEqual([reopened.done, reopened.done_by_name, reopened.done_at], [false, null, null]);

  assert.equal((await app.patch(`${base}/${made.body.id}`, {}, token)).status, 422);
  assert.equal((await app.del(`${base}/${made.body.id}`, token)).status, 204);
  assert.equal((await app.del(`${base}/${made.body.id}`, token)).status, 404);
});

test('a requirement must belong to the lead in the URL', async (t) => {
  const { app, token } = await appWithUser(t);
  const a = await app.makeLead();
  const b = await app.makeLead({ email: 'b@example.com' });
  const req = (await app.post(`/api/leads/${a}/requirements`, { stage: 'frontend', text: 'Dark mode' }, token)).body;
  assert.equal((await app.patch(`/api/leads/${b}/requirements/${req.id}`, { done: true }, token)).status, 404);
});

test('contact submissions from a browser origin work (CORS)', async (t) => {
  const app = await startApp();
  t.after(() => app.close());
  const res = await app.api('POST', '/api/contact', { json: contactPayload(), headers: { Origin: 'http://landing.test' } });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://landing.test');
});
