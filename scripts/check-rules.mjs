// Verifies API access rules against a running local backend: `npm run check:rules`.
// Run `npm run seed:dev` once first.
import PocketBase from 'pocketbase';
import { DEV_PB_URL, DEV_USERS } from './dev-users.mjs';

const [alice, bob] = await Promise.all(
  DEV_USERS.map(async (u) => {
    const pb = new PocketBase(DEV_PB_URL);
    pb.autoCancellation(false);
    await pb.collection('users').authWithPassword(u.email, u.password);
    return pb;
  }),
);
const guest = new PocketBase(DEV_PB_URL);
const aliceId = alice.authStore.record.id;
const bobId = bob.authStore.record.id;

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
async function mustFail(promise) {
  try {
    await promise;
  } catch {
    return;
  }
  throw new Error('request succeeded but should have been rejected');
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Alice's data
const project = await alice.collection('projects').create({ owner: aliceId, title: 'rules-check' });
const task = await alice.collection('tasks').create({ owner: aliceId, text: 't', category: 'projects', project: project.id });
const event = await alice.collection('events').create({ owner: aliceId, date: '2026-01-01', time: '', title: 'e' });

console.log('owner');
await check('owner sees own records', async () => {
  const list = await alice.collection('tasks').getFullList({ filter: `id = "${task.id}"` });
  assert(list.length === 1, 'task missing');
});
await check('owner can update', () => alice.collection('tasks').update(task.id, { done: true }));
await check('owner cannot hand record to someone else', () => mustFail(alice.collection('tasks').update(task.id, { owner: bobId })));
await check('invalid date rejected', () => mustFail(alice.collection('events').create({ owner: aliceId, date: '1405/07/05', title: 'x' })));

console.log('other user');
for (const col of ['projects', 'tasks', 'events']) {
  await check(`cannot list ${col}`, async () => {
    const list = await bob.collection(col).getFullList({ filter: `owner = "${aliceId}"` });
    assert(list.length === 0, `saw ${list.length} records`);
  });
}
await check('cannot view', () => mustFail(bob.collection('projects').getOne(project.id)));
await check('cannot update', () => mustFail(bob.collection('tasks').update(task.id, { text: 'hacked' })));
await check('cannot delete', () => mustFail(bob.collection('events').delete(event.id)));
await check('cannot create as someone else', () => mustFail(bob.collection('tasks').create({ owner: aliceId, text: 'x', category: 'actions' })));
await check("cannot attach task to another user's project", () =>
  mustFail(bob.collection('tasks').create({ owner: bobId, text: 'x', category: 'projects', project: project.id })),
);

console.log('guest');
await check('cannot list', async () => {
  const list = await guest.collection('tasks').getFullList();
  assert(list.length === 0, `saw ${list.length} records`);
});
await check('cannot create', () => mustFail(guest.collection('events').create({ owner: aliceId, date: '2026-01-01', title: 'x' })));

console.log('cascade');
await alice.collection('events').delete(event.id);
await alice.collection('projects').delete(project.id);
await check('deleting a project deletes its tasks', () => mustFail(alice.collection('tasks').getOne(task.id)));

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
