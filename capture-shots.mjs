// Re-takes screenshots/ from shots.json: headless Chrome draws each ?shot= scene at its exact size (a cover at the
// poster's own pixel size, so the capture is the exported art), then ffmpeg scales it to the listed output size as a
// JPEG under the scorer's 256 KiB cap. Run `node serve.ts` first, then `node capture-shots.mjs`.
// Needs Chrome (CHROME env or the default Windows path) and ffmpeg on PATH; writes temporary PNGs to the OS temp dir.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chrome = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = process.env.APP_URL ?? 'http://localhost:8080/';
const maxBytes = 250 * 1024;
const work = mkdtempSync(join(tmpdir(), 'poster-shots-'));

for (const shot of JSON.parse(readFileSync('shots.json', 'utf8'))) {
  const png = join(work, shot.name.replace(/\.jpg$/, '.png'));
  execFileSync(chrome, ['--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${shot.w},${shot.h}`, '--virtual-time-budget=8000', `--screenshot=${png}`, base + shot.query], { stdio: 'ignore' });
  const out = join('screenshots', shot.name);
  for (let quality = 3; ; quality++) {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png, '-vf', `scale=${shot.out}:flags=lanczos`, '-q:v', String(quality), out]);
    const size = statSync(out).size;
    if (size <= maxBytes || quality >= 14) {
      console.log(`${shot.name}  ${shot.out.replace(':', 'x')}  q${quality}  ${(size / 1024).toFixed(0)} KiB`);
      break;
    }
  }
}
