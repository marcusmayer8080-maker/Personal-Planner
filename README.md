# اقدامات مانده — My Planner

Persian (RTL, Jalaali calendar) multi-user planner PWA.
Frontend: React + TypeScript + Vite. Backend: [PocketBase](https://pocketbase.io) (auth, SQLite, realtime).

## Local development

One-time: download the PocketBase binary for your OS (version in `docs/deploy-backend.md`)
from the [official releases](https://github.com/pocketbase/pocketbase/releases) and unzip it into `backend/`.

```bash
npm install
npm run backend      # PocketBase on http://127.0.0.1:8090 (admin UI at /_/)
npm run seed:dev     # once: creates the local test accounts in scripts/dev-users.mjs
npm run dev          # frontend on http://localhost:5173
```

Checks:

```bash
npm test             # unit tests (vitest)
npm run check:rules  # verifies API access rules against the running local backend
npm run build        # typecheck + production build into dist/
```

## Structure

```
backend/pb_migrations/  database schema + access rules (committed; binary and data are not)
scripts/                dev backend runner, seed, access-rule checks
src/
  lib/          pure helpers — Jalaali dates, ids, PocketBase client
  domain/       types, categories, agenda (summary) logic
  data/         plannerApi — the only code that knows PocketBase record shapes
  store/        authStore · plannerStore (server data, optimistic + realtime) · uiStore
  components/   shared UI
  features/     auth screen + one folder per tab
```

**Security lives in the backend.** Every collection has API rules
(`backend/pb_migrations/`) so users can only touch their own records, whatever the client
sends. Any rule change must keep `npm run check:rules` passing.

## Deploy

- Backend: see [docs/deploy-backend.md](docs/deploy-backend.md).
- Frontend: `.github/workflows/deploy.yml` publishes `dist/` to GitHub Pages on push to
  `master` (repo Settings → Pages → Source must be **GitHub Actions**). Alternatively serve
  it from PocketBase on the same server (recommended for users in Iran; see the deploy doc).
