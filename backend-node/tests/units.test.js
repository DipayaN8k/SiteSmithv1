import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DEV_JWT_SECRET, loadConfig } from '../src/config.js';
import { parseEmail } from '../src/core/email.js';
import { setAuditSink } from '../src/core/logger.js';
import { stripHtml } from '../src/core/sanitize.js';
import { createAccessToken, decodeAccessToken, hashPassword, verifyPassword } from '../src/core/security.js';
import { migrate, openDatabase } from '../src/db/index.js';
import { migrations } from '../src/db/migrations.js';
import { clientIp, createLimiter, parseLimit } from '../src/http/ratelimit.js';
import * as users from '../src/services/users.js';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const memoryDb = async () => openDatabase({ client: 'sqlite', file: ':memory:' });

// ---------- text cleaning ----------

test('stripHtml removes tags, entities-as-tags and control characters', () => {
  assert.equal(stripHtml('<script>alert(1)</script>Asha <b>Rao</b>'), 'alert(1)Asha Rao');
  assert.equal(stripHtml('a &lt;i&gt;b&lt;/i&gt; c'), 'a b c');
  assert.equal(stripHtml('&amp;lt;b&amp;gt; stays text'), '&lt;b&gt; stays text');
  assert.equal(stripHtml('x\u0000y\u0007z'), 'xyz');
  assert.equal(stripHtml('  many   spaces\tand\nlines '), 'many spaces and lines');
  assert.equal(stripHtml('Tom &amp; Jerry &#33; &#x41;'), 'Tom & Jerry ! A');
  assert.equal(stripHtml('  a  \n\n  b \r\n c  ', { multiline: true }), 'a\n\nb\nc');
});

// ---------- passwords and tokens ----------

test('passwords: hashed with a random salt, verified, wrong ones and junk hashes rejected', async () => {
  const a = await hashPassword('correct-horse-battery');
  const b = await hashPassword('correct-horse-battery');
  assert.notEqual(a, b);
  assert.match(a, /^scrypt\$32768\$8\$1\$/);
  assert.equal(await verifyPassword('correct-horse-battery', a), true);
  assert.equal(await verifyPassword('wrong-horse-battery', a), false);
  for (const junk of ['', 'plain', 'scrypt$1$2', 'scrypt$x$y$z$a$b', null, undefined]) {
    assert.equal(await verifyPassword('x', junk), false);
  }
});

test('tokens carry the user id and expire', () => {
  const secret = 'a-secret-that-is-long-enough-for-tests-12345';
  const now = 1_800_000_000_000;
  const token = createAccessToken(42, secret, 60, now);
  assert.equal(decodeAccessToken(token, secret, now + 59 * 60_000), 42);
  assert.equal(decodeAccessToken(token, secret, now + 61 * 60_000), null);
  assert.equal(decodeAccessToken(token, 'another-secret-another-secret-123456', now), null);
  assert.equal(decodeAccessToken(`${token}x`, secret, now), null);
  assert.deepEqual(JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()), { sub: '42', iat: now / 1000, exp: now / 1000 + 3600 });
});

// ---------- email ----------

test('email syntax', () => {
  for (const good of ['a@example.com', 'First.Last+tag@Sub.Example.CO.IN', "o'neil@example.org", 'x@xn--bcher-kva.example']) {
    assert.equal(parseEmail(good).ok, true, good);
  }
  assert.equal(parseEmail('Name@EXAMPLE.com').email, 'Name@example.com');
  assert.equal(parseEmail('user@bücher.example').email, 'user@xn--bcher-kva.example');
  for (const bad of ['', 'nope', '@example.com', 'a@', 'a@b', 'a b@example.com', 'a..b@example.com', '.a@example.com',
    'a.@example.com', 'a@mail.test', 'a@x.local', 'a@foo.localhost', 'a@x.invalid', 'a@host.onion', 'a@x.arpa', 'a@-example.com', 'a@example..com', 'a@example.123', `${'x'.repeat(65)}@example.com`, `a@${'x'.repeat(250)}.com`]) {
    assert.equal(parseEmail(bad).ok, false, bad);
  }
});

// ---------- configuration ----------

test('production refuses weak or missing settings', () => {
  const good = {
    NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40), CORS_ORIGINS: 'https://example.com/',
    DB_HOST: '127.0.0.1', DB_USER: 'u', DB_PASSWORD: 'p', DB_NAME: 'n',
  };
  const config = loadConfig(good);
  assert.deepEqual(config.corsOrigins, ['https://example.com']); // trailing slash removed
  assert.deepEqual(config.db, { client: 'mysql', host: '127.0.0.1', port: 3306, user: 'u', password: 'p', database: 'n' });
  assert.throws(() => loadConfig({ ...good, JWT_SECRET: '' }), /JWT_SECRET/);
  assert.throws(() => loadConfig({ ...good, JWT_SECRET: 'short' }), /JWT_SECRET/);
  assert.throws(() => loadConfig({ ...good, JWT_SECRET: DEV_JWT_SECRET }), /JWT_SECRET/);
  assert.throws(() => loadConfig({ ...good, CORS_ORIGINS: '' }), /CORS_ORIGINS/);
  assert.throws(() => loadConfig({ ...good, DB_NAME: '' }), /Database is not configured/);
  assert.throws(() => loadConfig({ ...good, DB_NAME: '', DATABASE_URL: 'sqlite:./x.db' }), /SQLite/);
});

test('database settings come from DB_* values or a DATABASE_URL', () => {
  const url = loadConfig({ DATABASE_URL: 'mysql://user%40x:p%40ss@db.example.com:3307/shop' }).db;
  assert.deepEqual(url, { client: 'mysql', host: 'db.example.com', port: 3307, user: 'user@x', password: 'p@ss', database: 'shop' });
  assert.deepEqual(loadConfig({ DATABASE_URL: 'sqlite::memory:' }).db, { client: 'sqlite', file: ':memory:' });
  assert.deepEqual(loadConfig({}).db, { client: 'sqlite', file: './dev.db' });
  const defaults = loadConfig({});
  assert.deepEqual([defaults.port, defaults.jwtExpireMinutes, defaults.contactRateLimit, defaults.loginRateLimit, defaults.trustProxyHops, defaults.autoMigrate],
    [8000, 60, '5/hour', '10/minute', 1, true]);
});

// ---------- rate limiting helpers ----------

test('rate limit specs and the visitor address', () => {
  assert.deepEqual(parseLimit('5/hour'), { max: 5, windowMs: 3_600_000, label: '5 per 1 hour' });
  assert.deepEqual(parseLimit('10/minute'), { max: 10, windowMs: 60_000, label: '10 per 1 minute' });
  assert.throws(() => parseLimit('lots'), /Bad rate limit/);

  let now = 0;
  const limiter = createLimiter({ enabled: true, now: () => now });
  const limit = parseLimit('2/minute');
  assert.equal(limiter.hit('x', 'a', limit).limited, false);
  assert.equal(limiter.hit('x', 'a', limit).limited, false);
  assert.equal(limiter.hit('x', 'a', limit).limited, true);
  assert.equal(limiter.hit('x', 'b', limit).limited, false);
  now = 61_000; // a new window
  assert.equal(limiter.hit('x', 'a', limit).limited, false);
  assert.equal(createLimiter({ enabled: false }).hit('x', 'a', limit).limited, false);

  const req = (header, socket = '10.0.0.1') => ({ headers: header ? { 'x-forwarded-for': header } : {}, socket: { remoteAddress: socket } });
  assert.equal(clientIp(req('203.0.113.5'), 1), '203.0.113.5');
  assert.equal(clientIp(req('198.51.100.9, 203.0.113.5'), 1), '203.0.113.5'); // a spoofed left entry is ignored
  assert.equal(clientIp(req('198.51.100.9, 203.0.113.5'), 2), '198.51.100.9');
  assert.equal(clientIp(req(null), 1), '10.0.0.1');
  assert.equal(clientIp(req('203.0.113.5'), 0), '10.0.0.1');
});

// ---------- database and migrations ----------

test('migrations create the schema, record themselves, and are safe to run again', async () => {
  const db = await memoryDb();
  const first = await migrate(db);
  assert.deepEqual(first, migrations.map((m) => m.name));
  assert.deepEqual(await migrate(db), []);
  const tables = (await db.query("SELECT name FROM sqlite_master WHERE type = 'table'")).map((r) => r.name);
  for (const table of ['users', 'leads', 'lead_stages', 'comments', 'activity_log', 'requirements', 'schema_migrations']) {
    assert.ok(tables.includes(table), table);
  }
  const indexes = (await db.query("SELECT name FROM sqlite_master WHERE type = 'index'")).map((r) => r.name);
  for (const index of ['ix_leads_email', 'ix_leads_created_at', 'ix_activity_log_lead_id', 'ix_activity_log_created_at', 'ix_requirements_lead_id']) {
    assert.ok(indexes.includes(index), index);
  }
  const cols = (await db.query('PRAGMA table_info(leads)')).map((c) => c.name);
  for (const col of ['project_type', 'budget', 'message']) assert.ok(cols.includes(col), col);
  await db.close();
});

test('the MySQL schema is generated from the same migration', () => {
  const sql = migrations[0].statements('mysql').join('\n');
  assert.match(sql, /AUTO_INCREMENT PRIMARY KEY/);
  assert.match(sql, /DATETIME\(3\)/);
  assert.match(sql, /ENGINE=InnoDB DEFAULT CHARSET=utf8mb4/);
  assert.doesNotMatch(sql, /AUTOINCREMENT|INTEGER PRIMARY KEY/);
  assert.equal(migrations[0].statements('mysql').filter((s) => s.startsWith('CREATE TABLE')).length, 6);
});

test('foreign keys are enforced and transactions roll back', async () => {
  const db = await memoryDb();
  await migrate(db);
  await assert.rejects(db.run("INSERT INTO lead_stages (lead_id, stage, status, updated_at) VALUES (999, 'backend', 'pending', 'x')"));
  await assert.rejects(db.transaction(async (tx) => {
    await tx.run("INSERT INTO users (name, email, password_hash, created_at) VALUES ('a', 'a@b.co', 'h', 'x')");
    throw new Error('boom');
  }), /boom/);
  assert.equal((await db.query('SELECT COUNT(*) AS n FROM users'))[0].n, 0);
  await db.close();
});

// ---------- user accounts ----------

test('user rules: normalised email, hashed password, no duplicates, strong password', async () => {
  const db = await memoryDb();
  await migrate(db);
  const user = await users.createUser(db, { name: 'Priya', email: ' Priya@Company.COM ', password: 'twelve-chars-ok' });
  assert.equal(user.email, 'priya@company.com');
  assert.notEqual(user.password_hash, 'twelve-chars-ok');
  assert.equal(await verifyPassword('twelve-chars-ok', user.password_hash), true);
  await assert.rejects(users.createUser(db, { name: 'P', email: 'p@company.com', password: 'short' }), { status: 422 });
  await assert.rejects(users.createUser(db, { name: 'P2', email: 'PRIYA@company.com', password: 'twelve-chars-ok' }), { status: 409 });
  await assert.rejects(users.createUser(db, { name: '<b></b>', email: 'p@company.com', password: 'twelve-chars-ok' }), { status: 422 });
  await assert.rejects(users.createUser(db, { name: 'P', email: 'not-an-email', password: 'twelve-chars-ok' }), { status: 422 });
  await db.close();
});

test('resetting and deactivating never delete, and activating restores', async () => {
  const db = await memoryDb();
  await migrate(db);
  await users.createUser(db, { name: 'P', email: 'p@company.com', password: 'twelve-chars-ok' });
  const reset = await users.resetPassword(db, 'p@company.com', 'another-long-password');
  assert.equal(await verifyPassword('another-long-password', reset.password_hash), true);
  const off = await users.deactivateUser(db, 'p@company.com');
  assert.equal(users.isActive(off), false);
  assert.deepEqual((await users.listUsers(db)).map((u) => u.email), ['p@company.com']);
  assert.equal(users.isActive(await users.setActive(db, 'p@company.com', true)), true);
  await assert.rejects(users.deactivateUser(db, 'ghost@company.com'), { status: 404 });
  await db.close();
});

test('audit lines are logged without passwords', async () => {
  const lines = [];
  setAuditSink((l) => lines.push(l));
  const db = await memoryDb();
  await migrate(db);
  await users.createUser(db, { name: 'P', email: 'p@company.com', password: 'twelve-chars-ok' });
  await users.resetPassword(db, 'p@company.com', 'another-long-password');
  await users.deactivateUser(db, 'p@company.com');
  setAuditSink(() => {});
  const text = lines.join('\n');
  assert.match(text, /user_created/);
  assert.match(text, /password_reset/);
  assert.match(text, /user_deactivated/);
  assert.ok(!text.includes('twelve-chars-ok') && !text.includes('another-long-password'));
  await db.close();
});

// ---------- the account script ----------

const script = (args, { input, env = {} } = {}) =>
  spawnSync(process.execPath, ['--no-warnings', 'scripts/manage-users.js', ...args], {
    cwd: backendDir, input, encoding: 'utf8', env: { ...process.env, ...env },
  });

test('manage-users --print-sql needs no database and prints SQL a working login can come from', async () => {
  const out = script(['create', '--name', "O'Neil <b>Priya</b>", '--email', 'Priya@Company.com', '--password-stdin', '--print-sql'], { input: 'twelve-chars-ok\n' });
  assert.equal(out.status, 0, out.stderr);
  const insert = out.stdout.split('\n').find((l) => l.startsWith('INSERT INTO users'));
  assert.ok(insert, out.stdout);
  assert.match(insert, /'O''Neil Priya'/);
  assert.match(insert, /'priya@company\.com'/);
  const hash = /'(scrypt\$[^']+)'/.exec(insert)[1];
  assert.equal(await verifyPassword('twelve-chars-ok', hash), true);
  assert.ok(!out.stdout.includes('twelve-chars-ok'));

  // run that exact SQL against a database and log in with it
  const db = await memoryDb();
  await migrate(db);
  await db.run(insert.replace(/\\\\/g, '\\').replace(/;$/, ''));
  assert.equal((await users.getByEmail(db, 'priya@company.com')).name, "O'Neil Priya");
  await db.close();

  const reset = script(['reset-password', '--email', 'a@b.co', '--password-stdin', '--print-sql'], { input: 'another-long-password\n' });
  assert.match(reset.stdout, /^UPDATE users SET password_hash = 'scrypt\$.*' WHERE email = 'a@b\.co';$/m);
  assert.match(script(['deactivate', '--email', "x'y@b.co", '--print-sql']).stdout, /SET is_active = 0 WHERE email = 'x''y@b\.co';/);
  assert.match(script(['activate', '--email', 'a@b.co', '--print-sql']).stdout, /SET is_active = 1/);
});

test('manage-users --print-sql rejects weak input', () => {
  const weak = script(['create', '--name', 'P', '--email', 'p@company.com', '--password-stdin', '--print-sql'], { input: 'short\n' });
  assert.notEqual(weak.status, 0);
  assert.match(weak.stderr, /at least 12/);
  assert.notEqual(script(['create', '--email', 'p@company.com', '--password-stdin', '--print-sql'], { input: 'twelve-chars-ok\n' }).status, 0);
});

test('manage-users creates, lists, resets and deactivates against a database file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sparrowgen-users-'));
  const env = { DATABASE_URL: `sqlite:${path.join(dir, 'users.db').replace(/\\/g, '/')}`, NODE_ENV: 'development' };
  try {
    const created = script(['create', '--name', 'Priya', '--email', 'priya@company.com', '--password-stdin'], { input: 'twelve-chars-ok\n', env });
    assert.equal(created.status, 0, created.stderr);
    assert.match(created.stdout, /Created priya@company\.com \(id 1\)/);

    const dup = script(['create', '--name', 'Again', '--email', 'PRIYA@company.com', '--password-stdin'], { input: 'twelve-chars-ok\n', env });
    assert.equal(dup.status, 1);
    assert.match(dup.stderr, /already exists/);

    assert.match(script(['list'], { env }).stdout, /1\tpriya@company\.com\tPriya\tactive/);
    assert.match(script(['reset-password', '--email', 'priya@company.com', '--password-stdin'], { input: 'another-long-password\n', env }).stdout, /Password reset/);
    assert.match(script(['deactivate', '--email', 'priya@company.com'], { env }).stdout, /Deactivated/);
    assert.match(script(['list'], { env }).stdout, /inactive/);
    assert.match(script(['activate', '--email', 'priya@company.com'], { env }).stdout, /Activated/);
    assert.equal(script(['frobnicate'], { env }).status, 1);
    assert.match(script(['help']).stdout, /Usage:/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('npm run migrate prepares an empty database', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sparrowgen-migrate-'));
  const env = { DATABASE_URL: `sqlite:${path.join(dir, 'm.db').replace(/\\/g, '/')}` };
  try {
    const first = execFileSync(process.execPath, ['--no-warnings', 'scripts/migrate.js'], { cwd: backendDir, encoding: 'utf8', env: { ...process.env, ...env } });
    assert.match(first, /applied migration 0001_initial/);
    const second = execFileSync(process.execPath, ['--no-warnings', 'scripts/migrate.js'], { cwd: backendDir, encoding: 'utf8', env: { ...process.env, ...env } });
    assert.match(second, /already up to date/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('manage-users ignores the invisible byte-order mark Windows PowerShell adds to piped text', async () => {
  const bom = '﻿';
  const out = script(['create', '--name', 'Priya', '--email', 'priya@company.com', '--password-stdin', '--print-sql'], { input: `${bom}twelve-chars-ok\r\n` });
  assert.equal(out.status, 0, out.stderr);
  const hash = /'(scrypt\$[^']+)'/.exec(out.stdout)[1];
  assert.equal(await verifyPassword('twelve-chars-ok', hash), true);
  assert.equal(await verifyPassword(`${bom}twelve-chars-ok`, hash), false);
});

test('npm run schema prints SQL that builds exactly the schema the API would create', async () => {
  const sqlite = execFileSync(process.execPath, ['--no-warnings', 'scripts/print-schema.js', '--sqlite'], { cwd: backendDir, encoding: 'utf8' });
  const db = await memoryDb();
  for (const statement of sqlite.split(/;\s*\n/).map((s) => s.replace(/^(--.*\n)+/gm, '').trim()).filter(Boolean)) await db.run(statement);
  // the migrations are recorded as applied, so the API finds nothing left to do
  assert.deepEqual(await migrate(db), []);
  const printed = (await db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")).map((r) => r.name);
  const created = await memoryDb();
  await migrate(created);
  const viaApi = (await created.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")).map((r) => r.name);
  assert.deepEqual(printed, viaApi);
  await db.close();
  await created.close();

  const mysql = execFileSync(process.execPath, ['--no-warnings', 'scripts/print-schema.js'], { cwd: backendDir, encoding: 'utf8' });
  assert.equal((mysql.match(/CREATE TABLE/g) ?? []).length, 7); // six tables plus schema_migrations
  assert.match(mysql, /AUTO_INCREMENT PRIMARY KEY/);
  assert.match(mysql, /INSERT INTO schema_migrations \(name, applied_at\) VALUES \('0001_initial', UTC_TIMESTAMP\(3\)\)/);
});
