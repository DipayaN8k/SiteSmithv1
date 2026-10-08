// Parity test: send the same requests to the old Python backend and the new Node backend, and compare
// every answer (status, body, key headers). If they agree, the website and dashboard cannot tell them apart.
//
//   PARITY_EMAIL=parity@example.test PARITY_PASSWORD=... node scripts/parity.mjs <python-url> <node-url>
//
// Both backends must be FRESH (empty database), started with the rate limits and the DNS check off, and each
// must already contain these two accounts (same password for the first):
//   PARITY_EMAIL  (id 1)   and   priya@example.test (id 2)
// The run creates, changes and deletes leads, and changes the first account's password. Use throwaway databases.
//
// Differences that are expected and harmless are listed in KNOWN below; everything else is a failure.
const [pyUrl, nodeUrl] = process.argv.slice(2);
const email = process.env.PARITY_EMAIL;
const password = process.env.PARITY_PASSWORD;
if (!pyUrl || !nodeUrl || !email || !password) {
  console.error('Usage: PARITY_EMAIL=... PARITY_PASSWORD=... node scripts/parity.mjs <python-url> <node-url>');
  process.exit(2);
}
const newPassword = `${password}-changed`;
const backends = [
  { name: 'python', base: pyUrl.replace(/\/$/, ''), token: null },
  { name: 'node', base: nodeUrl.replace(/\/$/, ''), token: null },
];

const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)?$/;
const HEADERS = ['www-authenticate', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'cache-control',
  'strict-transport-security', 'access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'vary'];

/** Make two answers comparable: timestamps and tokens vary, Python adds extra detail fields. */
function normalise(value, path = '') {
  if (Array.isArray(value)) return value.map((v) => normalise(v, path));
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (key === 'access_token') out[key] = '<token>';
      else if (path.endsWith('detail[]') && ['input', 'ctx', 'url'].includes(key)) continue;
      else out[key] = normalise(value[key], key === 'detail' && Array.isArray(value[key]) ? 'detail[]' : key);
    }
    return out;
  }
  if (typeof value === 'string' && ISO.test(value)) return '<timestamp>';
  return value;
}

async function call(b, req, wantHeaders) {
  const headers = { ...(req.headers ?? {}) };
  if (req.json !== undefined) headers['Content-Type'] = 'application/json';
  if (req.auth && b.token) headers.Authorization = `Bearer ${b.token}`;
  if (req.badToken) headers.Authorization = 'Bearer not-a-token';
  const res = await fetch(b.base + req.path, {
    method: req.method ?? 'GET',
    headers,
    body: req.raw ?? (req.json !== undefined ? JSON.stringify(req.json) : undefined),
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  const picked = {};
  if (wantHeaders) for (const h of HEADERS) if (res.headers.get(h) !== null) picked[h] = res.headers.get(h);
  return { status: res.status, body, headers: picked };
}

// Known, accepted differences: [step title regexp, short explanation]. Anything else must match exactly.
const KNOWN = [];

const results = [];
async function step(title, req, { headers = false, onResponse } = {}) {
  const answers = [];
  for (const b of backends) {
    const r = typeof req === 'function' ? req(b) : req;
    const res = await call(b, r, headers);
    if (onResponse) onResponse(b, res);
    answers.push(normalise({ status: res.status, body: res.body, headers: res.headers }));
  }
  const [py, nd] = answers.map((a) => JSON.stringify(a));
  const same = py === nd;
  const known = !same && KNOWN.find(([re]) => re.test(title));
  results.push({ title, same, known: known ? known[1] : null, py: answers[0], nd: answers[1] });
  console.log(`${same ? 'OK   ' : known ? 'KNOWN' : 'DIFF '} ${title}`);
  if (!same) {
    console.log(`       python: ${py.slice(0, 600)}`);
    console.log(`       node:   ${nd.slice(0, 600)}`);
  }
}

const contact = (over = {}) => ({
  method: 'POST', path: '/api/contact',
  json: { full_name: 'Asha Rao', email: 'asha@example.com', phone: '+91 98765 43210', business_type: 'Retail', consent: true, ...over },
});
const get = (path, auth = true) => ({ path, auth });
const send = (method, path, json) => ({ method, path, json, auth: true });

// ---------- basics ----------
await step('GET /health', get('/health', false), { headers: true });
await step('unknown path is 404', get('/nothing/here', false));
await step('wrong method is 405', { method: 'PUT', path: '/health' });
await step('protected route without a token is 401', get('/auth/me', false), { headers: true });
await step('protected route with a bad token is 401', { path: '/api/leads', badToken: true });

// ---------- login ----------
await step('login: wrong password', { method: 'POST', path: '/auth/login', json: { email, password: 'wrong-password-123' } });
await step('login: unknown email', { method: 'POST', path: '/auth/login', json: { email: 'nobody@example.test', password: 'whatever-12345' } });
await step('login: missing password', { method: 'POST', path: '/auth/login', json: { email } });
await step('login: empty body', { method: 'POST', path: '/auth/login', raw: '' });
await step('login: email is case-insensitive', { method: 'POST', path: '/auth/login', json: { email: email.toUpperCase(), password } });
await step('login: ok', { method: 'POST', path: '/auth/login', json: { email, password } }, { onResponse: (b, r) => { b.token = r.body?.access_token ?? null; } });
await step('GET /auth/me', get('/auth/me'));
await step('GET /api/users', get('/api/users'));

// ---------- contact form ----------
await step('contact: valid', contact());
await step('contact: "Other" with detail + project details', contact({ email: 'priya.sen@example.com', business_type: 'Other', business_type_other: 'Pet grooming', project_type: 'Online store', budget: '₹5k – ₹10k', message: 'Need a catalogue\n\n  by Diwali  ' }));
await step('contact: same email again (repeat contact)', contact({ full_name: 'Asha Again' }));
await step('contact: HTML in the name and message', contact({ email: 'html@example.com', full_name: '<script>alert(1)</script>Vik <b>Singh</b>', message: 'a &lt;i&gt;b&lt;/i&gt;' }));
await step('contact: blank optional fields', contact({ email: 'blank@example.com', phone: '  ', project_type: '', budget: '', message: '   ' }));
await step('contact: honeypot filled', contact({ email: 'bot@example.com', website: 'http://spam.example' }));
await step('contact: invalid email', contact({ email: 'nope' }));
await step('contact: email without a dot in the domain', contact({ email: 'a@b' }));
await step('contact: typo domain', contact({ email: 'me@gamil.com' }));
await step('contact: missing required fields', { method: 'POST', path: '/api/contact', json: { business_type: 'Retail', consent: true } });
await step('contact: bad business type', contact({ business_type: 'Mining' }));
await step('contact: "Other" without detail', contact({ business_type: 'Other' }));
await step('contact: bad phone', contact({ phone: 'call me' }));
await step('contact: short phone', contact({ phone: '123' }));
await step('contact: consent false', contact({ consent: false }));
await step('contact: consent missing', { method: 'POST', path: '/api/contact', json: { full_name: 'A', email: 'a@example.com', business_type: 'Retail' } });
await step('contact: blank name', contact({ full_name: '   ' }));
await step('contact: name too long', contact({ full_name: 'x'.repeat(201) }));
await step('contact: message too long', contact({ message: 'x'.repeat(2001) }));
await step('contact: wrong type for a field', contact({ full_name: 5 }));
await step('contact: not JSON', { method: 'POST', path: '/api/contact', raw: '{nope', headers: { 'Content-Type': 'application/json' } });
await step('contact: JSON array instead of object', { method: 'POST', path: '/api/contact', raw: '[]', headers: { 'Content-Type': 'application/json' } });

// ---------- lead list and detail ----------
await step('leads: list', get('/api/leads'));
await step('leads: page_size 2 page 2', get('/api/leads?page_size=2&page=2'));
await step('leads: search by name', get('/api/leads?q=asha'));
await step('leads: search "%" is literal', get('/api/leads?q=%25'));
await step('leads: filter pending', get('/api/leads?status=pending'));
await step('leads: bad status', get('/api/leads?status=bogus'));
await step('leads: page 0', get('/api/leads?page=0'));
await step('leads: page_size 101', get('/api/leads?page_size=101'));
await step('leads: page=abc', get('/api/leads?page=abc'));
await step('lead 1 detail', get('/api/leads/1'));
await step('lead 999 is 404', get('/api/leads/999'));
await step('lead id "abc" is 422', get('/api/leads/abc'));

// ---------- stages ----------
await step('stage: backend in progress', send('PATCH', '/api/leads/1/stages/backend', { status: 'in_progress' }));
await step('stage: same value again (no-op)', send('PATCH', '/api/leads/1/stages/backend', { status: 'in_progress' }));
await step('stage: deployment completed out of order', send('PATCH', '/api/leads/1/stages/deployment', { status: 'completed' }));
await step('stage: invalid status', send('PATCH', '/api/leads/1/stages/backend', { status: 'done' }));
await step('stage: empty body', send('PATCH', '/api/leads/1/stages/backend', {}));
await step('stage: status null', send('PATCH', '/api/leads/1/stages/backend', { status: null }));
await step('stage: unknown stage', send('PATCH', '/api/leads/1/stages/qa', { status: 'pending' }));
await step('stage: unknown lead', send('PATCH', '/api/leads/999/stages/backend', { status: 'pending' }));
await step('stage: assign frontend to user 2', send('PATCH', '/api/leads/1/stages/frontend', { assigned_to: 2 }));
await step('stage: unassign frontend', send('PATCH', '/api/leads/1/stages/frontend', { assigned_to: null }));
await step('stage: assign to a missing user', send('PATCH', '/api/leads/1/stages/frontend', { assigned_to: 9999 }));
await step('stage: status filter now in_progress', get('/api/leads?status=in_progress'));

// ---------- assignment ----------
await step('lead: assign to user 2', send('PATCH', '/api/leads/2', { assigned_to: 2 }));
await step('lead: assign again (no-op)', send('PATCH', '/api/leads/2', { assigned_to: 2 }));
await step('lead: unassign', send('PATCH', '/api/leads/2', { assigned_to: null }));
await step('lead: assign to a missing user', send('PATCH', '/api/leads/2', { assigned_to: 9999 }));
await step('lead: assign without the key', send('PATCH', '/api/leads/2', {}));

// ---------- comments ----------
await step('comment: general (HTML stripped)', send('POST', '/api/leads/1/comments', { body: '<i>Called them</i>' }));
await step('comment: on a stage', send('POST', '/api/leads/1/comments', { body: 'API done', stage: 'backend' }));
await step('comment: bad stage', send('POST', '/api/leads/1/comments', { body: 'x', stage: 'qa' }));
await step('comment: blank body', send('POST', '/api/leads/1/comments', { body: '   ' }));
await step('comment: body too long', send('POST', '/api/leads/1/comments', { body: 'x'.repeat(2001) }));
await step('comment: unknown lead', send('POST', '/api/leads/999/comments', { body: 'x' }));

// ---------- requirements ----------
await step('requirement: add', send('POST', '/api/leads/1/requirements', { stage: 'backend', text: 'Login with Google' }));
await step('requirement: add (frontend)', send('POST', '/api/leads/1/requirements', { stage: 'frontend', text: 'Dark mode\nand more' }));
await step('requirement: bad stage', send('POST', '/api/leads/1/requirements', { stage: 'design', text: 'x' }));
await step('requirement: blank text', send('POST', '/api/leads/1/requirements', { stage: 'backend', text: '  ' }));
await step('requirement: tick', send('PATCH', '/api/leads/1/requirements/1', { done: true }));
await step('requirement: tick again (no-op)', send('PATCH', '/api/leads/1/requirements/1', { done: true }));
await step('requirement: edit text', send('PATCH', '/api/leads/1/requirements/1', { text: 'Login with Google or email' }));
await step('requirement: reopen', send('PATCH', '/api/leads/1/requirements/1', { done: false }));
await step('requirement: empty update', send('PATCH', '/api/leads/1/requirements/1', {}));
await step('requirement: belongs to another lead', send('PATCH', '/api/leads/2/requirements/1', { done: true }));
await step('requirement: unknown id', send('PATCH', '/api/leads/1/requirements/99', { done: true }));
await step('requirement: delete', send('DELETE', '/api/leads/1/requirements/2'));
await step('requirement: delete again', send('DELETE', '/api/leads/1/requirements/2'));
await step('lead 1 detail after all changes', get('/api/leads/1'));

// ---------- activity ----------
await step('activity: default', get('/api/activity'));
await step('activity: limit 3', get('/api/activity?limit=3'));
await step('activity: before 5 limit 2', get('/api/activity?before=5&limit=2'));
await step('activity: by lead', get('/api/activity?lead_id=1'));
await step('activity: by user', get('/api/activity?user_id=1'));
await step('activity: limit 0', get('/api/activity?limit=0'));
await step('activity: limit 101', get('/api/activity?limit=101'));
await step('activity: before 0', get('/api/activity?before=0'));
await step('activity: lead_id=x', get('/api/activity?lead_id=x'));

// ---------- password change ----------
await step('change password: wrong current', send('POST', '/auth/change-password', { current_password: 'nope-nope-nope-1', new_password: 'a-brand-new-password' }));
await step('change password: too short', send('POST', '/auth/change-password', { current_password: password, new_password: 'short' }));
await step('change password: same as current', send('POST', '/auth/change-password', { current_password: password, new_password: password }));
await step('change password: ok', send('POST', '/auth/change-password', { current_password: password, new_password: newPassword }));
await step('login with the old password fails', { method: 'POST', path: '/auth/login', json: { email, password } });
await step('login with the new password works', { method: 'POST', path: '/auth/login', json: { email, password: newPassword } });

// ---------- delete ----------
await step('delete lead 2', { method: 'DELETE', path: '/api/leads/2', auth: true });
await step('lead 2 is gone', get('/api/leads/2'));
await step('delete lead 2 again', { method: 'DELETE', path: '/api/leads/2', auth: true });
await step('leads: list after delete', get('/api/leads'));

// ---------- browser (CORS) ----------
const origin = process.env.PARITY_ORIGIN || 'http://localhost:3000';
await step('CORS: simple request from the website origin', { path: '/health', headers: { Origin: origin } }, { headers: true });
await step('CORS: preflight for DELETE', { method: 'OPTIONS', path: '/api/leads/1', headers: { Origin: origin, 'Access-Control-Request-Method': 'DELETE', 'Access-Control-Request-Headers': 'authorization' } }, { headers: true });

const diffs = results.filter((r) => !r.same && !r.known);
const known = results.filter((r) => !r.same && r.known);
console.log(`\n${results.length} checks: ${results.filter((r) => r.same).length} identical, ${known.length} known differences, ${diffs.length} unexplained differences`);
process.exit(diffs.length ? 1 : 0);
