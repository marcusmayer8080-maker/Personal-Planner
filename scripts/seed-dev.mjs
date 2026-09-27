// Creates the dev test accounts on the local backend (idempotent): `npm run seed:dev`.
import PocketBase from 'pocketbase';
import { DEV_PB_URL, DEV_USERS } from './dev-users.mjs';

if (!/^http:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(DEV_PB_URL)) {
  console.error(`Refusing to seed a non-local backend: ${DEV_PB_URL}`);
  process.exit(1);
}

const pb = new PocketBase(DEV_PB_URL);

for (const u of DEV_USERS) {
  try {
    await pb.collection('users').create({ ...u, passwordConfirm: u.password });
    console.log(`created ${u.email}`);
  } catch (err) {
    if (err?.response?.data?.email?.code === 'validation_not_unique') console.log(`exists  ${u.email}`);
    else throw err;
  }
}
