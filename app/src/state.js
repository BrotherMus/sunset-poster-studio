// The editor's state and the actions on it: which photo or painted scene fills each panel, each panel's crop, the
// caption, the layout, grade and effects, and "Surprise me".
import { LAYOUTS, MAX_PANELS, countLayoutPanels, findLayout } from './layouts.js';
import { GRADES } from './grades.js';
import { SCENES } from './scenes.js';
import { createRandom } from './random.js';

export const POSTER_SIZES = [
  { id: 'square', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 × 1080', w: 1920, h: 1080 },
];

export const DEFAULT_FX = { strength: 0.85, grain: 0.5, vignette: 0.55, glow: 0.7, border: 16 };

/** The role tag each panel starts with, in panel order. */
export const DEFAULT_ROLES = ['THE BOSS', 'THE DRIVER', 'THE RIVAL', 'THE GETAWAY', 'THE CREW', 'THE DROP', 'THE HIDEOUT', 'THE FIXER'];

/** The location / time stamps panels start with ('' shows none). */
export const DEFAULT_STAMPS = ['CORAL CAUSEWAY · 7:15 PM', '', '', 'PELICAN PIER · 11:40 PM', '', '', '', ''];

/** The poster extras drawn by poster-extras.js, each switchable, with their editable text. */
export function defaultExtras() {
  return {
    frames: true,
    rays: false,
    roles: true,
    stamps: true,
    quote: true,
    quoteText: 'PURE SUNSET MAYHEM',
    quoteSource: 'THE PALM GAZETTE',
    vol: 'VOL. 1',
    seal: true,
    sealText: "HOT SUMMER '27",
    sealEdge: 'jagged',
    sealSpot: 'title',
    tagline: true,
    taglineText: 'ONE COAST · TWO STORIES · NO WAY BACK',
    credits: true,
    creditsText: 'SUNSET PICTURES PRESENTS A PALM COAST PRODUCTION · THE BOSS · THE DRIVER · THE RIVAL · MUSIC BY NEON TIDE · '
      + 'COSTUMES BY GOLDEN HOUR · EDITED BY SLOW FADE · PHOTOGRAPHY BY LAST LIGHT · PRODUCED BY HIGH TIDE FILMS · WRITTEN AND DIRECTED BY THE NIGHT SHIFT',
  };
}

/** A centred, unzoomed crop; `fy` sits a little high because faces usually do. */
export function defaultCrop() {
  return { fx: 0.5, fy: 0.42, zoom: 1, flip: false };
}

export function createPosterState() {
  return {
    size: { ...POSTER_SIZES[2] },
    layoutId: 'hero-stack',
    gradeId: 'sunset-strip',
    photos: [],
    panels: Array.from({ length: MAX_PANELS }, (_, i) => ({ source: `scene:${SCENES[i % SCENES.length].id}`, crop: defaultCrop() })),
    caption: { title: 'Vice Beach', sub: 'one last summer', tag: 'Coming soon', position: 'auto', lines: 'auto', slab: false, scale: 1 },
    roles: [...DEFAULT_ROLES],
    stamps: [...DEFAULT_STAMPS],
    extras: defaultExtras(),
    fx: { ...DEFAULT_FX },
    selected: 0,
  };
}

/** How many panels the current layout shows. */
export function visiblePanelCount(state) {
  return countLayoutPanels(findLayout(state.layoutId));
}

/** Puts photo `photoIndex` in panel `panelIndex` with a fresh crop. */
export function assignPhotoToPanel(state, panelIndex, photoIndex) {
  state.panels[panelIndex] = { source: `photo:${photoIndex}`, crop: shotCropFor(state.photos[photoIndex], 0) };
}

/**
 * Shots that make one photo read as several: offsets from the photo's estimated face (photos.js) with a zoom, so the
 * same picture gives a wide shot, a close-up, and off-centre details.
 */
const SHOT_CROPS = [
  { dx: 0, dy: 0.12, zoom: 1 },
  { dx: 0, dy: 0, zoom: 2.3 },
  { dx: -0.1, dy: 0.3, zoom: 1.6 },
  { dx: 0.08, dy: 0.05, zoom: 1.5 },
  { dx: 0.02, dy: 0.02, zoom: 3.2 },
  { dx: -0.05, dy: 0.18, zoom: 1.25 },
  { dx: 0.12, dy: 0.4, zoom: 2 },
  { dx: 0, dy: 0.08, zoom: 1.15 },
];

/** The n-th shot crop of a photo, aimed at its face. */
export function shotCropFor(photo, n, flip = false) {
  const focus = photo?.focus ?? { x: 0.5, y: 0.4 };
  const s = SHOT_CROPS[n % SHOT_CROPS.length];
  return { fx: focus.x + s.dx, fy: focus.y + s.dy, zoom: s.zoom, flip };
}

/** Fills every panel from one photo, each with a different crop, alternating mirrored copies. */
export function fillPanelsFromPhoto(state, photoIndex) {
  for (let i = 0; i < MAX_PANELS; i++) {
    state.panels[i] = { source: `photo:${photoIndex}`, crop: shotCropFor(state.photos[photoIndex], i, i % 3 === 2) };
  }
}

/**
 * Spreads all loaded photos across the panels in turn, varying the crop when a photo comes round again; with
 * `withScenes`, every third panel past the photos shows a painted scene so a poster made of few photos breathes.
 */
export function spreadPhotosAcrossPanels(state, withScenes = false) {
  const n = state.photos.length;
  if (!n) return;
  let p = 0;
  for (let i = 0; i < MAX_PANELS; i++) {
    if (withScenes && i >= n && i % 3 === 2) {
      state.panels[i] = { source: `scene:${SCENES[i % SCENES.length].id}`, crop: defaultCrop() };
      continue;
    }
    const round = Math.floor(p / n);
    state.panels[i] = { source: `photo:${p % n}`, crop: shotCropFor(state.photos[p % n], round, round % 2 === 1) };
    p++;
  }
}

/** Adds photos and puts them in the panels that still show scenes (or spreads them all if none do). */
export function addPhotos(state, photos) {
  const first = state.photos.length;
  state.photos.push(...photos);
  if (first === 0) {
    spreadPhotosAcrossPanels(state);
    return;
  }
  let next = first;
  for (let i = 0; i < visiblePanelCount(state) && next < state.photos.length; i++) {
    if (state.panels[i].source.startsWith('scene:')) assignPhotoToPanel(state, i, next++);
  }
}

/** Removes a photo; panels that showed it go back to a painted scene, and later photo indexes shift down. */
export function removePhoto(state, photoIndex) {
  state.photos.splice(photoIndex, 1);
  state.panels.forEach((panel, i) => {
    const [kind, value] = panel.source.split(':');
    if (kind !== 'photo') return;
    const k = Number(value);
    if (k === photoIndex) state.panels[i] = { source: `scene:${SCENES[i % SCENES.length].id}`, crop: defaultCrop() };
    else if (k > photoIndex) panel.source = `photo:${k - 1}`;
  });
}

const SURPRISE_TITLES = ['Vice Beach', 'Neon Coast', 'Last Heist', 'Palm Nights', 'Ocean Drive', 'Sunset Kings', 'High Tide', 'Gulf Nights', 'Golden Run', 'Coastline'];
const SURPRISE_SUBS = ['one last summer', 'no way back', 'ride or die', 'the long weekend', 'big money', 'after dark', 'just us two', 'stay golden'];

/** Randomises layout, grade, effects, panel sources and crops; keeps the person's caption unless `newCaption`. */
export function surprisePoster(state, seed = Date.now(), newCaption = false) {
  const rng = createRandom(seed);
  state.layoutId = rng.pick(LAYOUTS.filter((l) => l.id !== state.layoutId)).id;
  state.gradeId = rng.pick(GRADES.filter((g) => g.id !== state.gradeId)).id;
  state.fx = {
    strength: rng.range(0.7, 1),
    grain: rng.range(0.3, 0.7),
    vignette: rng.range(0.35, 0.75),
    glow: rng.range(0.45, 0.95),
    border: rng.pick([12, 16, 20, 26]),
  };
  state.caption.position = rng.pick(['auto', 'auto', 'center', 'bottom']);
  const n = state.photos.length;
  for (let i = 0; i < MAX_PANELS; i++) {
    const useScene = !n || rng() < 0.25;
    const photoIndex = (i + rng.int(0, n - 1)) % Math.max(1, n);
    const source = useScene ? `scene:${rng.pick(SCENES).id}` : `photo:${photoIndex}`;
    const crop = shotCropFor(state.photos[photoIndex], rng.int(0, 7), rng() < 0.3);
    crop.fx += rng.range(-0.06, 0.06);
    crop.zoom *= rng.range(0.9, 1.15);
    state.panels[i] = { source, crop };
  }
  surpriseExtras(state, rng);
  if (newCaption) {
    state.caption.title = rng.pick(SURPRISE_TITLES);
    state.caption.sub = rng.pick(SURPRISE_SUBS);
  }
}

const ROLE_POOL = ['THE BOSS', 'THE DRIVER', 'THE RIVAL', 'THE GETAWAY', 'THE CREW', 'THE INFORMANT', 'THE HUSTLER', 'THE LOOKOUT',
  'THE DEAL', 'THE HIDEOUT', 'THE DROP', 'THE PARTNER', 'THE FIXER', 'THE SCORE', 'THE WHEELMAN', 'THE COAST'];
const STAMP_POOL = ['CORAL CAUSEWAY · 7:15 PM', 'PELICAN PIER · 11:40 PM', 'OCEAN BLVD · 2:03 AM', 'KEY HARBOR · 6:48 AM',
  'NEON MILE · 12:00 AM', 'PALM COURT MOTEL · 3:30 AM', 'SUNSET STRIP · 8:22 PM', 'MARINA 9 · 1:15 AM'];
const QUOTE_POOL = [['PURE SUNSET MAYHEM', 'THE PALM GAZETTE'], ['A NEON-SOAKED THRILL RIDE', 'COASTLINE WEEKLY'],
  ['HOTTER THAN THE GULF IN AUGUST', 'THE KEYS COURIER'], ["THE SUMMER'S BIGGEST SCORE", 'BAYSIDE DAILY'],
  ['STYLISH, LOUD AND LETHAL', 'NIGHT SHIFT RADIO']];
const SEAL_POOL = ["HOT SUMMER '27", 'ONLY IN THEATERS', 'WORLD PREMIERE', 'NOW SHOWING', "DIRECTOR'S CUT", 'LIMITED EDITION'];
const TAGLINE_POOL = ['ONE COAST · TWO STORIES · NO WAY BACK', 'EVERY SUNSET HAS A PRICE', 'TWO PARTNERS · ONE LAST SCORE',
  'THE COAST NEVER SLEEPS', 'BIG MONEY · BAD IDEAS · GREAT TAN'];
const VOL_POOL = ['VOL. 1', 'VOL. 2', 'PART I', 'EPISODE 1'];

/** Surprise me for the poster extras: fresh role tags (no two panels alike), one or two stamps, a press quote, a
 * seal, a tagline and a badge, with each extra mostly on. */
export function surpriseExtras(state, rng) {
  const roles = [...ROLE_POOL];
  for (let i = 0; i < MAX_PANELS; i++) state.roles[i] = roles.splice(rng.int(0, roles.length - 1), 1)[0];
  const stamps = [...STAMP_POOL];
  state.stamps = state.stamps.map(() => '');
  for (let k = rng.int(1, 2); k > 0; k--) state.stamps[rng.int(0, MAX_PANELS - 1)] = stamps.splice(rng.int(0, stamps.length - 1), 1)[0];
  const ex = state.extras;
  [ex.quoteText, ex.quoteSource] = rng.pick(QUOTE_POOL);
  ex.sealText = rng.pick(SEAL_POOL);
  ex.sealEdge = rng.pick(['jagged', 'scalloped']);
  ex.sealSpot = rng.pick(['title', 'title', 'corner']);
  ex.taglineText = rng.pick(TAGLINE_POOL);
  ex.vol = rng.pick(VOL_POOL);
  for (const key of ['roles', 'stamps', 'quote', 'seal', 'tagline', 'credits']) ex[key] = rng() < 0.85;
  ex.frames = rng() < 0.9;
  ex.rays = rng() < 0.75;
}
