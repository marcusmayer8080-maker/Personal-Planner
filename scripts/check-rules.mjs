// Verifies the API's access rules against a running server:
//   npm run build && npm run dev:api     (in one terminal)
//   npm run check:rules                  (in another)
// Uses throwaway accounts with random emails, so it's safe to run repeatedly.
// Refuses to run against anything but a local server.

const BASE = process.env.API_URL ?? 'http://127.0.0.1:8788';
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(BASE)) {
  console.error(`Refusing to run against a non-local server: ${BASE}`);
  process.exit(1);
}

const rnd = () => Math.random().toString(36).slice(2, 10);
const newId = () => Array.from({ length: 15 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');

/** Minimal client that keeps its own session cookie. */
function client() {
  let cookie = '';
  return async (method, path, body, { origin = BASE } = {}) => {
    const res = await fetch(BASE + '/api' + path, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(cookie && { Cookie: cookie }),
        ...(origin && { Origin: origin }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    return { status: res.status, data };
  };
}

let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`  ok    ${name}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL  ${name}\n        ${err.message}`);
  }
}
function expectStatus(res, ...allowed) {
  if (!allowed.includes(res.status)) throw new Error(`status ${res.status} ${JSON.stringify(res.data)}, expected ${allowed.join('/')}`);
}

const alice = client();
const bob = client();
const guest = client();
const pw = `pw-${rnd()}-${rnd()}`;

console.log('auth');
await check('sign up', async () => expectStatus(await alice('POST', '/auth/signup', { name: 'Alice', email: `alice-${rnd()}@example.test`, password: pw }), 201));
await check('sign up second user', async () => expectStatus(await bob('POST', '/auth/signup', { name: 'Bob', email: `bob-${rnd()}@example.test`, password: pw }), 201));
await check('short password rejected', async () => {
  const r = await guest('POST', '/auth/signup', { name: 'x', email: `x-${rnd()}@example.test`, password: 'short' });
  expectStatus(r, 400);
  if (r.data?.error !== 'weak_password') throw new Error(r.data?.error);
});
await check('wrong password rejected', async () => {
  const me = (await alice('GET', '/auth/me')).data;
  expectStatus(await guest('POST', '/auth/login', { email: me.email, password: 'wrong-password' }), 400);
});
await check('guest has no session', async () => expectStatus(await guest('GET', '/auth/me'), 401));

// Alice's data
const project = { id: newId(), title: 'rules-check' };
const task = { id: newId(), text: 't', category: 'projects', projectId: project.id };
const event = { id: newId(), date: '2026-01-01', time: '', title: 'e' };
expectStatus(await alice('POST', '/projects', project), 201);
expectStatus(await alice('POST', '/tasks', task), 201);
expectStatus(await alice('POST', '/events', event), 201);

console.log('owner');
await check('sees own records', async () => {
  const d = (await alice('GET', '/data')).data;
  if (d.tasks.length !== 1 || d.projects.length !== 1 || d.events.length !== 1) throw new Error(JSON.stringify(d));
});
await check('can update', async () => expectStatus(await alice('PATCH', `/tasks/${task.id}`, { done: true }), 204));
await check('invalid date rejected', async () => expectStatus(await alice('POST', '/events', { id: newId(), date: '1405/07/05', title: 'x' }), 400));
await check('unknown fields cannot change ownership', async () => {
  await alice('PATCH', `/tasks/${task.id}`, { owner: 'someone', owner_id: 'someone', text: 't2' });
  const d = (await alice('GET', '/data')).data;
  if (d.tasks[0].text !== 't2') throw new Error('task no longer visible to its owner');
});

console.log('other user');
await check('sees none of it', async () => {
  const d = (await bob('GET', '/data')).data;
  if (d.tasks.length + d.projects.length + d.events.length !== 0) throw new Error(JSON.stringify(d));
});
await check('cannot update', async () => expectStatus(await bob('PATCH', `/tasks/${task.id}`, { text: 'hacked' }), 404));
await check('cannot rename project', async () => expectStatus(await bob('PATCH', `/projects/${project.id}`, { title: 'hacked' }), 404));
await check('cannot delete', async () => expectStatus(await bob('DELETE', `/events/${event.id}`), 404));
await check('cannot overwrite by reusing an id', async () => expectStatus(await bob('POST', '/tasks', { ...task, category: 'actions', projectId: null, text: 'mine' }), 409));
await check("cannot attach task to another user's project", async () =>
  expectStatus(await bob('POST', '/tasks', { id: newId(), text: 'x', category: 'projects', projectId: project.id }), 400),
);
await check('data untouched after attempts', async () => {
  const d = (await alice('GET', '/data')).data;
  if (d.tasks[0].text !== 't2' || d.projects[0].title !== 'rules-check' || d.events.length !== 1) throw new Error(JSON.stringify(d));
});

console.log('guest');
await check('cannot read', async () => expectStatus(await guest('GET', '/data'), 401));
await check('cannot write', async () => expectStatus(await guest('POST', '/events', { id: newId(), date: '2026-01-01', title: 'x' }), 401));

console.log('csrf');
await check('cross-site request rejected', async () =>
  expectStatus(await alice('POST', '/events', { id: newId(), date: '2026-01-01', title: 'x' }, { origin: 'https://evil.example' }), 403),
);

await check('non-JSON body rejected', async () => {
  const res = await fetch(BASE + '/api/events', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: BASE }, body: '{}' });
  expectStatus({ status: res.status, data: null }, 415);
});

console.log('cascade & logout');
await check('deleting a project deletes its tasks', async () => {
  expectStatus(await alice('DELETE', `/projects/${project.id}`), 204);
  const d = (await alice('GET', '/data')).data;
  if (d.tasks.length !== 0) throw new Error(`${d.tasks.length} task(s) left`);
});
await check('logout ends the session', async () => {
  expectStatus(await alice('POST', '/auth/logout'), 204);
  expectStatus(await alice('GET', '/data'), 401);
});

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
