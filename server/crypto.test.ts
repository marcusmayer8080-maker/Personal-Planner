import { describe, expect, it } from 'vitest';
import { hashPassword, newId, newToken, sha256, verifyPassword } from './crypto';

describe('password hashing', () => {
  it('verifies the right password and rejects others', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(stored).toMatch(/^pbkdf2-sha256\$100000\$[\w-]+\$[\w-]+$/);
    expect(await verifyPassword('correct horse battery', stored)).toBe(true);
    expect(await verifyPassword('correct horse batterx', stored)).toBe(false);
    expect(await verifyPassword('', stored)).toBe(false);
  });

  it('salts every hash differently', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('x', 'plaintext')).toBe(false);
  });
});

describe('tokens and ids', () => {
  it('makes unguessable session tokens and stable digests', async () => {
    expect(newToken()).toMatch(/^[\w-]{43}$/);
    expect(newToken()).not.toBe(newToken());
    expect(await sha256('a')).toBe(await sha256('a'));
  });

  it('makes ids in the shared format', () => {
    expect(newId()).toMatch(/^[a-z0-9]{15}$/);
  });
});
