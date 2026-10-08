import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deriveStatus, stageWarnings } from '../src/services/leads.js';
import { deactivateUser } from '../src/services/users.js';
import { appWithUser } from './helpers.js';

const setStage = (app, token, leadId, stage, status) => app.patch(`/api/leads/${leadId}/stages/${stage}`, { status }, token);
const lastActivity = async (app) => (await app.db.query('SELECT * FROM activity_log ORDER BY id DESC'))[0];

test('derived status and ordering warnings are pure functions', () => {
  assert.equal(deriveStatus([]), 'pending');
  assert.equal(deriveStatus(['pending', 'pending']), 'pending');
  assert.equal(deriveStatus(['completed', 'completed']), 'completed');
  assert.equal(deriveStatus(['completed', 'pending']), 'in_progress');
  assert.deepEqual(stageWarnings({ backend: 'pending', frontend: 'pending', deployment: 'completed' }), [
    'deployment completed before backend', 'deployment completed before frontend',
  ]);
  assert.deepEqual(stageWarnings({ backend: 'pending', frontend: 'in_progress', deployment: 'pending' }), [
    'frontend in progress before backend completed',
  ]);
  assert.deepEqual(stageWarnings({ backend: 'completed', frontend: 'completed', deployment: 'in_progress' }), []);
});

test('the list includes stages and a derived status', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  const item = (await app.get('/api/leads', token)).body.items[0];
  assert.equal(item.id, id);
  assert.equal(item.status, 'pending');
  assert.deepEqual(item.stages.map((s) => [s.stage, s.status]), [['backend', 'pending'], ['frontend', 'pending'], ['deployment', 'pending']]);
  assert.equal(item.consent, true);
  assert.equal(item.duplicate_email, false);
  assert.match(item.created_at, /^\d{4}-\d\d-\d\dT[\d:.]+Z$/);
});

test('overall status is derived from the stages', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  const status = async () => (await app.get(`/api/leads/${id}`, token)).body.status;
  await setStage(app, token, id, 'backend', 'in_progress');
  assert.equal(await status(), 'in_progress');
  for (const stage of ['backend', 'frontend', 'deployment']) await setStage(app, token, id, stage, 'completed');
  assert.equal(await status(), 'completed');
  await setStage(app, token, id, 'deployment', 'pending');
  assert.equal(await status(), 'in_progress');
});

test('filter by status', async (t) => {
  const { app, token } = await appWithUser(t);
  const a = await app.makeLead({ email: 'a@example.com' });
  const b = await app.makeLead({ email: 'b@example.com' });
  const c = await app.makeLead({ email: 'c@example.com' });
  await setStage(app, token, b, 'backend', 'in_progress');
  for (const stage of ['backend', 'frontend', 'deployment']) await setStage(app, token, c, stage, 'completed');
  const ids = async (status) => (await app.get(`/api/leads?status=${status}`, token)).body.items.map((i) => i.id);
  assert.deepEqual(await ids('pending'), [a]);
  assert.deepEqual(await ids('in_progress'), [b]);
  assert.deepEqual(await ids('completed'), [c]);
  const bogus = await app.get('/api/leads?status=bogus', token);
  assert.equal(bogus.status, 422);
  assert.deepEqual(bogus.body.detail[0].loc, ['query', 'status']);
});

test('search by name and email; wildcard characters are not interpreted', async (t) => {
  const { app, token } = await appWithUser(t);
  await app.makeLead({ full_name: 'Asha Rao', email: 'asha@example.com' });
  await app.makeLead({ full_name: 'Vikram Singh', email: 'vik@acme.io' });
  await app.makeLead({ full_name: '100% Real_Name', email: 'pct@example.com' });
  const names = async (q) => (await app.get(`/api/leads?q=${encodeURIComponent(q)}`, token)).body.items.map((i) => i.full_name);
  assert.deepEqual(await names('asha'), ['Asha Rao']);
  assert.deepEqual(await names('ACME'), ['Vikram Singh']);
  assert.deepEqual(await names('%'), ['100% Real_Name']);
  assert.deepEqual(await names('_'), ['100% Real_Name']);
  assert.deepEqual(await names('nomatch'), []);
});

test('newest first, with pagination', async (t) => {
  const { app, token } = await appWithUser(t);
  const ids = [];
  for (let i = 0; i < 5; i += 1) ids.push(await app.makeLead({ email: `u${i}@example.com` }));
  const page1 = (await app.get('/api/leads?page_size=2', token)).body;
  const page3 = (await app.get('/api/leads?page_size=2&page=3', token)).body;
  assert.equal(page1.total, 5);
  assert.deepEqual([page1.page, page1.page_size], [1, 2]);
  assert.deepEqual(page1.items.map((i) => i.id), [ids[4], ids[3]]);
  assert.deepEqual(page3.items.map((i) => i.id), [ids[0]]);
  for (const bad of ['page=0', 'page_size=0', 'page_size=101', 'page=abc']) {
    assert.equal((await app.get(`/api/leads?${bad}`, token)).status, 422, bad);
  }
});

test('pagination also works together with a status filter', async (t) => {
  const { app, token } = await appWithUser(t);
  for (let i = 0; i < 3; i += 1) await app.makeLead({ email: `p${i}@example.com` });
  const res = (await app.get('/api/leads?status=pending&page_size=2&page=2', token)).body;
  assert.equal(res.total, 3);
  assert.equal(res.items.length, 1);
});

test('detail has stages, comments and activity in the documented order', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  await app.post(`/api/leads/${id}/comments`, { body: 'hello' }, token);
  const detail = (await app.get(`/api/leads/${id}`, token)).body;
  assert.equal(detail.stages.length, 3);
  assert.deepEqual(detail.comments.map((c) => c.body), ['hello']);
  assert.deepEqual(detail.activity.map((a) => a.action), ['comment_added', 'lead_created']);
  assert.deepEqual(detail.requirements, []);
});

test('an unknown lead is 404, a bad id is 422', async (t) => {
  const { app, token } = await appWithUser(t);
  assert.equal((await app.get('/api/leads/999', token)).status, 404);
  const bad = await app.get('/api/leads/abc', token);
  assert.equal(bad.status, 422);
  assert.deepEqual(bad.body.detail[0].loc, ['path', 'lead_id']);
});

// ---------- stages ----------

test('a stage change logs a readable message', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  const res = await setStage(app, token, id, 'backend', 'in_progress');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.warnings, []);
  assert.equal(res.body.lead.status, 'in_progress');
  const log = await lastActivity(app);
  assert.equal(log.action, 'stage_status_changed');
  assert.equal(log.message, 'Soumava moved Backend: pending → in progress');
  assert.deepEqual([log.stage, log.old_value, log.new_value], ['backend', 'pending', 'in_progress']);
});

test('setting the value it already has changes and logs nothing', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  await setStage(app, token, id, 'backend', 'pending');
  assert.equal((await app.db.query('SELECT COUNT(*) AS n FROM activity_log'))[0].n, 1); // only lead_created
});

test('out-of-order completion warns but is allowed', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  const res = await setStage(app, token, id, 'deployment', 'completed');
  assert.equal(res.status, 200);
  assert.ok(res.body.warnings.includes('deployment completed before backend'));
  assert.ok(res.body.warnings.includes('deployment completed before frontend'));
});

test('invalid stage status, empty body and unknown stage', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  const url = `/api/leads/${id}/stages/backend`;
  assert.equal((await app.patch(url, { status: 'done' }, token)).status, 422);
  assert.equal((await app.patch(url, {}, token)).status, 422);
  assert.equal((await app.patch(url, { status: null }, token)).status, 422);
  assert.equal((await setStage(app, token, id, 'qa', 'pending')).status, 404);
  assert.equal((await app.patch('/api/leads/999/stages/backend', { status: 'pending' }, token)).status, 404);
});

test('assign a stage, then unassign it', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  const priya = await app.makeUser('Priya', 'priya@company.com');
  const url = `/api/leads/${id}/stages/frontend`;
  let res = await app.patch(url, { assigned_to: priya.id }, token);
  assert.equal(res.body.lead.stages.find((s) => s.stage === 'frontend').assigned_to_name, 'Priya');
  const log = await lastActivity(app);
  assert.deepEqual([log.action, log.message], ['stage_assigned', 'Soumava assigned Frontend to Priya']);

  res = await app.patch(url, { assigned_to: null }, token);
  assert.equal(res.body.lead.stages.find((s) => s.stage === 'frontend').assigned_to, null);
  assert.equal((await lastActivity(app)).message, 'Soumava unassigned Frontend (was Priya)');

  // leaving the key out leaves the assignee alone
  await app.patch(url, { assigned_to: priya.id }, token);
  res = await app.patch(url, { status: 'in_progress' }, token);
  assert.equal(res.body.lead.stages.find((s) => s.stage === 'frontend').assigned_to_name, 'Priya');
});

test('assigning a lead checks the assignee', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  assert.equal((await app.patch(`/api/leads/${id}`, { assigned_to: 9999 }, token)).status, 422);

  const priya = await app.makeUser('Priya', 'priya@company.com');
  const ok = await app.patch(`/api/leads/${id}`, { assigned_to: priya.id }, token);
  assert.equal(ok.body.lead.assigned_to_name, 'Priya');
  const log = await lastActivity(app);
  assert.deepEqual([log.action, log.message], ['lead_assigned', 'Soumava assigned the request to Priya']);

  await deactivateUser(app.db, priya.email);
  assert.equal((await app.patch(`/api/leads/${id}`, { assigned_to: priya.id }, token)).status, 422);
  assert.equal((await app.patch(`/api/leads/${id}`, {}, token)).status, 422); // the key is required

  const unassign = await app.patch(`/api/leads/${id}`, { assigned_to: null }, token);
  assert.equal(unassign.body.lead.assigned_to, null);
  assert.equal((await lastActivity(app)).message, 'Soumava unassigned the request (was Priya)');
});

// ---------- comments ----------

test('comments: general and per stage, with tags stripped', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  const url = `/api/leads/${id}/comments`;
  const general = await app.post(url, { body: '<i>Called them</i>' }, token);
  assert.equal(general.status, 201);
  assert.equal(general.body.body, 'Called them');
  assert.equal(general.body.stage, null);
  assert.equal(general.body.user_name, 'Soumava');

  const staged = await app.post(url, { body: 'API done', stage: 'backend' }, token);
  assert.equal(staged.body.stage, 'backend');

  assert.equal((await app.post(url, { body: 'x', stage: 'qa' }, token)).status, 422);
  assert.equal((await app.post(url, { body: '   ' }, token)).status, 422);
  assert.equal((await app.post(url, { body: 'x'.repeat(2001) }, token)).status, 422);
  assert.equal((await app.post('/api/leads/999/comments', { body: 'x' }, token)).status, 404);
});

test('comment activity messages', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  await app.post(`/api/leads/${id}/comments`, { body: 'a' }, token);
  await app.post(`/api/leads/${id}/comments`, { body: 'b', stage: 'backend' }, token);
  const feed = (await app.get(`/api/activity?lead_id=${id}`, token)).body.items;
  assert.deepEqual(feed.slice(0, 2).map((i) => i.message), ['Soumava commented on Backend', 'Soumava commented']);
});

// ---------- activity feed ----------

test('the feed is newest first with cursor pagination', async (t) => {
  const { app, token } = await appWithUser(t);
  for (let i = 0; i < 5; i += 1) await app.makeLead({ email: `u${i}@example.com` });
  const first = (await app.get('/api/activity?limit=2', token)).body;
  assert.equal(first.items.length, 2);
  assert.equal(first.next_before, first.items[1].id);
  const second = (await app.get(`/api/activity?limit=2&before=${first.next_before}`, token)).body;
  assert.ok(Math.max(...second.items.map((i) => i.id)) < Math.min(...first.items.map((i) => i.id)));
  const last = (await app.get(`/api/activity?limit=2&before=${second.next_before}`, token)).body;
  assert.equal(last.items.length, 1);
  assert.equal(last.next_before, null);
  for (const bad of ['limit=0', 'limit=101', 'before=0', 'lead_id=x']) {
    assert.equal((await app.get(`/api/activity?${bad}`, token)).status, 422, bad);
  }
});

test('the feed filters by lead and by user', async (t) => {
  const { app, token, user } = await appWithUser(t);
  const a = await app.makeLead({ email: 'a@example.com' });
  await app.makeLead({ email: 'b@example.com' });
  await app.patch(`/api/leads/${a}/stages/backend`, { status: 'in_progress' }, token);
  const byLead = (await app.get(`/api/activity?lead_id=${a}`, token)).body.items;
  assert.deepEqual(new Set(byLead.map((i) => i.lead_id)), new Set([a]));
  const byUser = (await app.get(`/api/activity?user_id=${user.id}`, token)).body.items;
  assert.deepEqual(byUser.map((i) => i.action), ['stage_status_changed']);
  assert.equal(byUser[0].user_name, 'Soumava');
});

test('system actions have no user', async (t) => {
  const { app, token } = await appWithUser(t);
  await app.makeLead();
  const item = (await app.get('/api/activity', token)).body.items[0];
  assert.equal(item.action, 'lead_created');
  assert.deepEqual([item.user_id, item.user_name], [null, null]);
});

test('activity is written in the same transaction as the change it describes', async (t) => {
  const { app, token } = await appWithUser(t);
  const id = await app.makeLead();
  const before = (await app.db.query('SELECT COUNT(*) AS n FROM activity_log'))[0].n;
  await assert.rejects(
    app.db.transaction(async (tx) => {
      const { logActivity } = await import('../src/services/activity.js');
      await logActivity(tx, id, null, 'lead_created', { message: 'x' });
      throw new Error('boom');
    }),
    /boom/,
  );
  assert.equal((await app.db.query('SELECT COUNT(*) AS n FROM activity_log'))[0].n, before);
  const { logActivity } = await import('../src/services/activity.js');
  await assert.rejects(app.db.transaction((tx) => logActivity(tx, id, null, 'made_up', { message: 'x' })), /Unknown activity action/);
});
