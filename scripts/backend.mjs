// Runs the local PocketBase dev server: `npm run backend [-- extra args]`.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../backend');
const bin = path.join(dir, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');

if (!existsSync(bin)) {
  console.error(`PocketBase binary not found at ${bin}\nDownload it from https://github.com/pocketbase/pocketbase/releases and unzip into backend/.`);
  process.exit(1);
}

const args = process.argv.slice(2);
const child = spawn(bin, args.length ? args : ['serve', '--http=127.0.0.1:8090'], {
  cwd: dir,
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 0));
