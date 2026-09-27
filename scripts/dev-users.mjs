// Test accounts for the LOCAL dev backend only. Never use these on a real server.
export const DEV_USERS = [
  { email: 'alice@example.test', password: 'dev-password-alice', name: 'Alice' },
  { email: 'bob@example.test', password: 'dev-password-bob', name: 'Bob' },
];

export const DEV_PB_URL = process.env.PB_URL ?? 'http://127.0.0.1:8090';
