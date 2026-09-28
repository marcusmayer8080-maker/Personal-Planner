// Cloudflare Pages Function: every /api/* request goes to the Hono app.
import { handle } from 'hono/cloudflare-pages';
import { app } from '../../server/app';

export const onRequest = handle(app);
