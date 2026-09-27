import { describe, expect, it } from 'vitest';
import { uid } from './id';

describe('uid', () => {
  it('matches the PocketBase id format', () => {
    for (let i = 0; i < 200; i++) expect(uid()).toMatch(/^[a-z0-9]{15}$/);
  });
});
