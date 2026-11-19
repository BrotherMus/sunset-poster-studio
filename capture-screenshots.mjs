// Captures the entry's screenshots from the running app (`node serve.ts` first): for each scene in shots.json,
// headless Chrome opens the app's ?shot= scene in a window of the scene's size, and ffmpeg turns the PNG into a
// JPEG scaled to fit 1280 px on its long side, lowering quality until it is at most 256 KiB.
//   node capture-screenshots.mjs [--out screenshots] [--only name] [--shots shots.json] [--base http://localhost:8080/]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MAX_BYTES = 256 * 1024;
const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const outDir = resolve(option('--out', 'screenshots'));
const only = option('--only', null);
const base = option('--base', 'http://localhost:8080/');
const shotsFile = option('--shots', fileURLToPath(new URL('./shots.json', import.meta.url)));
const shots = JSON.parse(readFileSync(shotsFile, 'utf8'));

mkdirSync(outDir, { recursive: true });
for (const shot of shots) {
  if (only && !shot.name.startsWith(only)) continue;
  const png = join(tmpdir(), `poster-shot-${process.pid}.png`);
  // A fresh profile each time, so Chrome never serves the app's modules from an old cache.
  const profile = join(tmpdir(), `poster-shot-profile-${process.pid}`);
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--user-data-dir=${profile}`,
    `--window-size=${shot.w},${shot.h}`, '--virtual-time-budget=15000', `--screenshot=${png}`, base + shot.query,
  ], { stdio: 'ignore' });
  const scale = Math.min(1, 1280 / Math.max(shot.w, shot.h), shot.fit ? shot.fit / Math.max(shot.w, shot.h) : 1);
  const width = Math.round((shot.w * scale) / 2) * 2;
  const height = Math.round((shot.h * scale) / 2) * 2;
  const jpg = join(outDir, shot.name);
  for (let q = 2; q <= 20; q++) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', `scale=${width}:${height}:flags=lanczos`, '-q:v', String(q), jpg]);
    if (statSync(jpg).size <= MAX_BYTES) break;
  }
  rmSync(png, { force: true });
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  console.log(`${shot.name}: ${width}x${height}, ${Math.round(statSync(jpg).size / 1024)} KiB`);
}
