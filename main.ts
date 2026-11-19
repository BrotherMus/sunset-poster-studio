// Sunset Poster Studio, the gta6-cover-art-01 entry (Node 22, standard library only). The app is app/: static files
// a desktop browser opens offline (index.html, its ES modules under app/src/, two OFL fonts under app/fonts/ and two
// sample photos under app/samples/), turning a person's photos and a caption into multi-panel crime-epic poster art
// with sunset and neon colour grades, exported as a PNG at 1080 x 1080, 1080 x 1350 or 1920 x 1080.
//
// This program hands it in: it copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the kit's vendored make.fun library. Both runs of it write
// the same bytes: it only copies files and builds the dossier from them.
//
// Try the app with `node serve.ts` (http://localhost:8080). Outside the grader's container MAKEFUN_OUTPUT_DIR stands in
// for /output:   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');

// Refuse early, with a clear message, rather than hand in an entry the scorer would refuse.
if (!existsSync(join(appDir, 'index.html'))) throw new Error('app/index.html is missing');
const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((n) => !n.startsWith('.')) : [];
if (shots.length < 3 || shots.length > 4) throw new Error(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the dossier text; the others refuse what the
// scorer would refuse (more than 4 screenshots or one over 256 KiB, more than 993 app files, 48 MiB of app files or
// an app path over 1000 bytes).
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
