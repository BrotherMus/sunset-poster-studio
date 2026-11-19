// Takes the entry's screenshots (Node 22, standard library only): for each row of shots.json it opens
// http://localhost:8080/<query> in headless Chrome at the row's window size, saves a PNG, then has ffmpeg scale it to
// outW x outH and write screenshots/<name> as a JPEG under the scorer's 256 KiB cap (lowering quality until it fits).
// Run `node serve.ts` first, then `node capture-screenshots.ts [name-filter]`.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Shot = { name: string; query: string; w: number; h: number; outW: number; outH: number };

const here = fileURLToPath(new URL('.', import.meta.url));
const chrome = process.env.CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const shots: Shot[] = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const filter = process.argv[2];
const work = join(tmpdir(), 'sunset-poster-shots');
const maxBytes = 256 * 1024;
mkdirSync(work, { recursive: true });
mkdirSync(join(here, 'screenshots'), { recursive: true });

for (const shot of shots) {
  if (filter && !shot.name.includes(filter)) continue;
  const png = join(work, shot.name.replace(/\.jpg$/, '.png'));
  rmSync(png, { force: true });
  execFileSync(chrome, [
    '--headless=new',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${shot.w},${shot.h}`,
    '--virtual-time-budget=15000',
    `--screenshot=${png}`,
    `http://localhost:8080/${shot.query}`,
  ], { stdio: 'ignore' });
  const out = join(here, 'screenshots', shot.name);
  for (let q = 2; q <= 12; q++) {
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-i', png,
      '-vf', `scale=${shot.outW}:${shot.outH}:flags=lanczos`,
      '-q:v', String(q), out,
    ]);
    if (statSync(out).size <= maxBytes) break;
  }
  console.log(`${shot.name}: ${statSync(out).size} bytes`);
}
