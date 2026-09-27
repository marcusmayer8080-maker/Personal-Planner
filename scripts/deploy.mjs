// Builds the app and installs it into the production folder on this machine:
//   npm run deploy                 -> C:\planner-prod (or $PLANNER_PROD_DIR)
//   npm run deploy -- <targetDir>
//
// Layout of the target folder:
//   pocketbase(.exe)   server binary (copied from backend/ when missing or changed)
//   pb_migrations/     schema — applied automatically when the server starts
//   pb_public/         built frontend, served by PocketBase
//   pb_data/           database + backups — never touched by this script
//
// The running server picks up new frontend files immediately; restart it to apply new migrations.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(process.argv[2] ?? process.env.PLANNER_PROD_DIR ?? 'C:\\planner-prod');
const binName = process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase';

console.log('> tests');
execSync('npm test', { cwd: root, stdio: 'inherit' });
console.log('> build');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

mkdirSync(target, { recursive: true });

const srcBin = path.join(root, 'backend', binName);
const dstBin = path.join(target, binName);
const sameBin = existsSync(dstBin) && statSync(dstBin).size === statSync(srcBin).size && readFileSync(dstBin).equals(readFileSync(srcBin));
if (!sameBin) {
  try {
    cpSync(srcBin, dstBin);
    console.log(`> copied ${binName}`);
  } catch (err) {
    if (err.code !== 'EBUSY') throw err;
    console.warn(`! ${binName} is running and differs — stop the server and deploy again to update it.`);
  }
}

// Migrations are append-only, so copying over is enough (never delete applied ones).
cpSync(path.join(root, 'backend', 'pb_migrations'), path.join(target, 'pb_migrations'), { recursive: true });
console.log('> copied pb_migrations');

const pub = path.join(target, 'pb_public');
rmSync(pub, { recursive: true, force: true });
cpSync(path.join(root, 'dist'), pub, { recursive: true });
console.log('> installed frontend into pb_public');

console.log(`\nDeployed to ${target}`);
