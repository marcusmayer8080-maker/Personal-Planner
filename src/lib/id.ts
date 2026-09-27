const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * PocketBase-compatible record id (15 chars, [a-z0-9]).
 * Generated on the client so optimistic records keep the same id after the server saves them.
 */
export function uid() {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
