# Deploying the backend

The backend is a single PocketBase binary plus the migrations in `backend/pb_migrations/`.
It stores everything in one SQLite database under `pb_data/`. PocketBase also serves the
built frontend from `pb_public/`, so app and API share one origin (`VITE_PB_URL=/`).

## Current production server (Windows VPS, 185.110.191.60)

`npm run deploy` runs the tests, builds, and installs into `C:\planner-prod`:

```
C:\planner-prod\
  pocketbase.exe    server
  pb_migrations\    schema + settings (applied on server start)
  pb_public\        built frontend
  pb_data\          database + daily backups (created on first start; never touched by deploy)
```

Production command (PocketBase binds 80/443 and obtains the Let's Encrypt certificate itself):

```
C:\planner-prod\pocketbase.exe serve planner.maheri.space --dir C:\planner-prod\pb_data --publicDir C:\planner-prod\pb_public --migrationsDir C:\planner-prod\pb_migrations
```

Environment variable `PLANNER_APP_URL=https://planner.maheri.space` should be set for the
first start (used by the settings migration for the app URL in emails).

**Still to do (needs an administrator):** point the DNS A record of `planner.maheri.space`
at `185.110.191.60`, allow inbound TCP 80/443 for `pocketbase.exe`, run the command above
as a background service that starts on boot, and create the dashboard superuser.

After frontend-only changes, `npm run deploy` is enough — the running server serves the new
files immediately. After adding a migration, restart the server.

## Alternative: Linux VPS

## Where to host

Users are in Iran, so host on a VPS **inside Iran** (or as close as possible). That keeps the
app working during international-internet disruptions, and avoids foreign providers that
block Iranian users.

**Recommended:** let PocketBase serve the frontend too. It serves anything placed in
`pb_public/` from the same origin, so the whole app runs on one Iranian server and never
depends on GitHub Pages being reachable.

## First-time setup (Ubuntu/Debian VPS)

```bash
# 1. Binary (use the linux_amd64 build of the same version as backend/pocketbase.exe)
sudo mkdir -p /opt/planner && cd /opt/planner
wget https://github.com/pocketbase/pocketbase/releases/download/v0.40.4/pocketbase_0.40.4_linux_amd64.zip
unzip pocketbase_0.40.4_linux_amd64.zip && rm pocketbase_0.40.4_linux_amd64.zip

# 2. Schema — copy backend/pb_migrations/ from the repo to /opt/planner/pb_migrations/
#    (they run automatically on start)

# 3. Frontend (optional, recommended) — build locally with the right VITE_PB_URL and copy dist/:
#    npm run build  &&  scp -r dist/* server:/opt/planner/pb_public/

# 4. Admin (superuser) account for the dashboard — use a strong, unique password
./pocketbase superuser upsert you@example.com 'STRONG-PASSWORD'
```

`/etc/systemd/system/planner.service`:

```ini
[Unit]
Description=Planner (PocketBase)
After=network.target

[Service]
WorkingDirectory=/opt/planner
ExecStart=/opt/planner/pocketbase serve --http=127.0.0.1:8090
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo chown -R www-data /opt/planner
sudo systemctl enable --now planner
```

HTTPS with Caddy (`/etc/caddy/Caddyfile`), which fetches certificates automatically:

```
api.planner.maheri.space {
    reverse_proxy 127.0.0.1:8090
}
```

Set `VITE_PB_URL` in `.env.production` to that public URL. If PocketBase also serves the
frontend, point the main domain at the same Caddy block and use that URL instead.

## After first start — admin dashboard (`https://<domain>/_/`)

- **Settings → Application**: set the app URL.
- **Settings → Rate limits**: enable (protects sign-in from brute force).
- **Settings → Backups**: enable scheduled backups.
- **Settings → Mail**: configure SMTP before adding password reset / email verification.

## Updating

Copy new files from `backend/pb_migrations/` to the server and restart:
`sudo systemctl restart planner`. Migrations apply automatically on start.
