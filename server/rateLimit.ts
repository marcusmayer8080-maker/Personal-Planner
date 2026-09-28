// Sliding-window limiter backed by D1, for the auth endpoints only.

export async function isLimited(db: D1Database, key: string, limit: number, windowMs: number) {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM auth_attempts WHERE key = ? AND at > ?')
    .bind(key, Date.now() - windowMs)
    .first<{ n: number }>();
  return (row?.n ?? 0) >= limit;
}

export async function recordAttempt(db: D1Database, ...keys: string[]) {
  const now = Date.now();
  await db.batch([
    ...keys.map((k) => db.prepare('INSERT INTO auth_attempts (key, at) VALUES (?, ?)').bind(k, now)),
    // Keep the table small: nothing older than a day matters.
    db.prepare('DELETE FROM auth_attempts WHERE at < ?').bind(now - 24 * 60 * 60 * 1000),
  ]);
}
