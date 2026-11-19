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
    caption: { title: 'Vice Beach', sub: 'one last summer', tag: 'Coming soon', position: 'auto', slab: true, scale: 1 },
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
    const useScene = !n || rng() < 0.18;
    const photoIndex = (i + rng.int(0, n - 1)) % Math.max(1, n);
    const source = useScene ? `scene:${rng.pick(SCENES).id}` : `photo:${photoIndex}`;
    const crop = shotCropFor(state.photos[photoIndex], rng.int(0, 7), rng() < 0.3);
    crop.fx += rng.range(-0.06, 0.06);
    crop.zoom *= rng.range(0.9, 1.15);
    state.panels[i] = { source, crop };
  }
  if (newCaption) {
    state.caption.title = rng.pick(SURPRISE_TITLES);
    state.caption.sub = rng.pick(SURPRISE_SUBS);
  }
}
