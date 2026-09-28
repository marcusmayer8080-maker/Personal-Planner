import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import type { User } from '../src/domain/types';
import { fakeVerify, hashPassword, newId, newToken, sha256, verifyPassword } from './crypto';
import { nowIso, type AppEnv } from './env';
import { isLimited, recordAttempt } from './rateLimit';

// __Host- prefix: the browser only accepts it with Secure, Path=/ and no Domain,
// so a subdomain can never set or overwrite the session cookie.
const COOKIE = '__Host-session';
const SESSION_DAYS = 30;
const MINUTE = 60 * 1000;

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8).max(128);
const signupBody = z.object({ name: z.string().trim().min(1).max(100), email, password });
const loginBody = z.object({ email, password: z.string().min(1).max(128) });

const clientIp = (c: Context) => c.req.header('cf-connecting-ip') ?? 'local';

async function startSession(c: Context<AppEnv>, userId: string) {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * MINUTE);
  await c.env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), userId, nowIso(), expires.toISOString())
    .run();
  setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', expires });
}

/** Rejects with 401 unless the request carries a valid session; sets `c.var.user`. */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, COOKIE);
  if (!token) return c.json({ error: 'unauthenticated' }, 401);
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
  )
    .bind(await sha256(token))
    .first<User & { expires_at: string }>();
  if (!row || row.expires_at < nowIso()) {
    deleteCookie(c, COOKIE, { path: '/', secure: true });
    return c.json({ error: 'unauthenticated' }, 401);
  }
  c.set('user', { id: row.id, email: row.email, name: row.name });
  await next();
};

export const auth = new Hono<AppEnv>()
  .post('/signup', async (c) => {
    const db = c.env.DB;
    const ipKey = `signup-ip:${clientIp(c)}`;
    if (await isLimited(db, ipKey, 10, 60 * MINUTE)) return c.json({ error: 'rate_limited' }, 429);
    await recordAttempt(db, ipKey);

    const parsed = signupBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      return c.json({ error: field === 'email' ? 'invalid_email' : field === 'password' ? 'weak_password' : 'invalid_input' }, 400);
    }
    const { name, email, password } = parsed.data;

    const user: User = { id: newId(), email, name };
    try {
      await db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(user.id, email, name, await hashPassword(password), nowIso())
        .run();
    } catch (err) {
      if (String(err).includes('UNIQUE')) return c.json({ error: 'email_taken' }, 409);
      throw err;
    }
    await startSession(c, user.id);
    return c.json(user, 201);
  })

  .post('/login', async (c) => {
    const db = c.env.DB;
    const parsed = loginBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'invalid_credentials' }, 400);
    const { email, password } = parsed.data;

    const ipKey = `login-ip:${clientIp(c)}`;
    const emailKey = `login-email:${email}`;
    if ((await isLimited(db, ipKey, 30, 15 * MINUTE)) || (await isLimited(db, emailKey, 10, 15 * MINUTE))) {
      return c.json({ error: 'rate_limited' }, 429);
    }

    const row = await db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?')
      .bind(email)
      .first<User & { password_hash: string }>();
    const ok = row ? await verifyPassword(password, row.password_hash) : (await fakeVerify(password), false);
    if (!row || !ok) {
      await recordAttempt(db, ipKey, emailKey);
      return c.json({ error: 'invalid_credentials' }, 400);
    }
    await startSession(c, row.id);
    return c.json({ id: row.id, email: row.email, name: row.name } satisfies User);
  })

  .post('/logout', async (c) => {
    const token = getCookie(c, COOKIE);
    if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
    deleteCookie(c, COOKIE, { path: '/', secure: true });
    return c.body(null, 204);
  })

  .get('/me', requireUser, (c) => c.json(c.var.user));
