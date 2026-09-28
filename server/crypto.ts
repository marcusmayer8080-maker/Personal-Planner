// Password hashing (PBKDF2-SHA256 via WebCrypto) and session tokens.
// 100k iterations is the maximum Cloudflare Workers allows for PBKDF2.

const ITERATIONS = 100_000;
const encoder = new TextEncoder();

function toB64url(bytes: Uint8Array) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** Returns `pbkdf2-sha256$<iterations>$<salt>$<hash>`. */
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2-sha256$${ITERATIONS}$${toB64url(salt)}$${toB64url(hash)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iter, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2-sha256' || !iter || !salt || !hash) return false;
  const actual = await pbkdf2(password, fromB64url(salt), Number(iter));
  return constantTimeEqual(actual, fromB64url(hash));
}

let dummyHash: Promise<string> | null = null;
/** Burns the same time as a real check, so unknown emails can't be detected by timing. */
export async function fakeVerify(password: string) {
  dummyHash ??= hashPassword('not-a-real-password');
  await verifyPassword(password, await dummyHash);
}

/** Random session token for the cookie. */
export const newToken = () => toB64url(crypto.getRandomValues(new Uint8Array(32)));

export async function sha256(value: string) {
  return toB64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
/** Same 15-char [a-z0-9] format the client uses for record ids. */
export function newId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(15)), (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
}
