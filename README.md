# اقدامات مانده — My Planner

Persian (RTL, Jalaali calendar) planner PWA. React + TypeScript + Vite.

## Commands

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (vitest)
npm run build      # typecheck + production build into dist/
```

## Structure

```
src/
  lib/          pure helpers — Jalaali conversion, date formatting, ids
  domain/       types, categories, agenda (summary) logic
  store/        plannerStore (data + mutations, persisted) · uiStore (view state)
  components/   shared UI — InlineText, DueControl, AddPopover, TopBar
  features/     one folder per tab — summary, categories, calendar
```

All data changes go through actions in `store/plannerStore.ts`. When the backend
arrives, those actions become API calls and the components stay as they are.

## Deploy

`.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on every
push to `master`. In the repo settings, **Pages → Source** must be set to **GitHub Actions**.
