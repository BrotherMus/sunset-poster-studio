// Sunset Poster Studio's hand-in for make.fun's gta6-cover-art-01 bounty (Node 22, standard library only).
//
// The app is app/: plain static files a desktop browser loads offline (app/index.html, its ES modules under
// app/src/, two OFL fonts with their licenses under app/fonts/, and two free sample photos under app/samples/).
// It turns the person's own photos and a caption into multi-panel sunset / neon poster art and exports a PNG at
// 1920 x 1080, 1080 x 1350 or 1080 x 1080. Photos are read on the person's machine and never uploaded.
//
// This program copies app/ and screenshots/ (3 or 4 JPEGs, the first by name the cover) to /output and writes
// /output/dossier.json, the summary the judge reads, with the kit's vendored make.fun library, unchanged.
// It reads nothing but those two folders, so two runs write the same bytes.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const screenshotsDir = join(here, 'screenshots');

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(screenshotsDir)) {
  // Only the screenshot images themselves: no hidden files or notes ride along.
  for (const name of readdirSync(screenshotsDir)) {
    if (/^[A-Za-z0-9][A-Za-z0-9._-]*\.(jpe?g|png)$/i.test(name)) cpSync(join(screenshotsDir, name), join(out, 'screenshots', name));
  }
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
