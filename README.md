# ط§ظ‚ط¯ط§ظ…ط§طھ ظ…ط§ظ†ط¯ظ‡ â€” My Planner

Persian (RTL, Jalaali calendar) multi-user planner PWA, hosted on Cloudflare.

- **Frontend:** React + TypeScript + Vite, served by Cloudflare Pages.
- **API:** Hono on Cloudflare Pages Functions (`functions/` â†’ `server/`), same origin at `/api`.
- **Database:** Cloudflare D1 (SQLite), schema in `migrations/`.
- **Auth:** email + password (PBKDF2), session in an HttpOnly `__Host-` cookie.

## Local development

```bash
npm install
npm run db:migrate:local   # once, and after adding a migration
npm run build              # dev:api serves functions next to dist/
npm run dev:api            # API + local D1 on http://127.0.0.1:8788
npm run dev                # frontend on http://localhost:5173 (proxies /api to 8788)
```

Checks:

```bash
npm test             # unit tests (vitest)
npm run check:rules  # access-rule checks against the running local API
npm run typecheck
```

## Structure

```text
migrations/     D1 schema (append-only; `wrangler d1 migrations`)
functions/      Pages Functions entry â€” routes /api/* to server/app.ts
server/         API: auth.ts (sign-up/in, sessions, rate limits), planner.ts (data), crypto.ts
scripts/        check-rules.mjs
src/
  lib/          pure helpers â€” Jalaali dates, ids, fetch client
  domain/       types, categories, agenda logic (shared with server)
  data/         plannerApi â€” client for the /api endpoints
  store/        authStore آ· plannerStore (optimistic, periodic refresh) آ· uiStore
  components/   shared UI
  features/     auth screen + one folder per tab
```

**Security lives in the API.** Every query is scoped to the signed-in user
(`owner_id = ?`), foreign records behave as missing (404), state-changing requests must be
same-origin JSON, and sign-in/sign-up are rate-limited. Any change must keep
`npm run check:rules` passing.

## Deploy

```bash
npm run db:migrate:remote   # only when migrations/ changed
npm run deploy              # test + build + wrangler pages deploy
```

Cloudflare Pages project `planner`, D1 database `planner` (id in `wrangler.toml`),
custom domain `planner.maheri.space` (CNAME to the project's `pages.dev` host).
