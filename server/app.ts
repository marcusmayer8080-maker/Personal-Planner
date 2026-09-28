import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { auth } from './auth';
import type { AppEnv } from './env';
import { planner } from './planner';

export const app = new Hono<AppEnv>().basePath('/api');

app.use(secureHeaders());

// CSRF: every state-changing request must come from this site and carry JSON.
// (hono/csrf only inspects form content types; we parse any body as JSON, so check all.)
// The session cookie is also SameSite=Lax.
app.use(async (c, next) => {
  if (c.req.method === 'GET' || c.req.method === 'HEAD') return next();
  const origin = c.req.header('origin');
  if (origin && origin !== new URL(c.req.url).origin) return c.json({ error: 'forbidden' }, 403);
  const type = c.req.header('content-type') ?? '';
  if (c.req.header('content-length') !== '0' && c.req.raw.body && !type.startsWith('application/json')) {
    return c.json({ error: 'unsupported_media_type' }, 415);
  }
  return next();
});
app.use(async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
});

app.route('/auth', auth);
app.route('/', planner);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal' }, 500);
});
