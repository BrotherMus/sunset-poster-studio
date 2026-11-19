// The poster design: everything the person chooses, as plain data. The size, layout and grade, one slot per photo
// panel (which photo, its zoom, focus point and mirror), the caption, the look sliders and a seed for the grain
// and drawn tiles. Also the helpers that fill panels from the library and the "Surprise me" shuffle.
import { COLOR_GRADES } from './color-grades.js';
import { CAPTION_STYLES } from './poster-caption.js';
import { POSTER_LAYOUTS, photoPanelCount } from './poster-layouts.js';
import { smartCrops } from './photo-library.js';
import { createRandom, pickRandom, randomBetween } from './seeded-random.js';

export const POSTER_SIZES = [
  { id: 'landscape', name: 'Landscape', width: 1920, height: 1080 },
  { id: 'portrait', name: 'Portrait', width: 1080, height: 1350 },
  { id: 'square', name: 'Square', width: 1080, height: 1080 },
];

export const MAX_SLOTS = 8;

/** A new design with the studio's defaults and empty panels. */
export function createDesign() {
  return {
    sizeId: 'landscape',
    layoutId: 'title-mosaic',
    gradeId: 'sunset-boulevard',
    slots: Array.from({ length: MAX_SLOTS }, () => emptySlot()),
    caption: { title: 'Sunset Heist', sub: 'one last summer', style: 'sunset-stripes', scale: 1, position: 'auto' },
    look: { gradeAmount: 1, alternate: true, wash: 0.45, glow: 0.35, leaks: 0.45, vignette: 0.55, grain: 0.22, border: 1, keyline: 0, borderColor: 'grade' },
    seed: 7,
  };
}

/** A panel slot with no photo. */
export function emptySlot() {
  return { photoId: null, zoom: 1, fx: 0.5, fy: 0.45, flip: false };
}

/** The {width, height} of the design's chosen post size. */
export function designSize(design) {
  return POSTER_SIZES.find((size) => size.id === design.sizeId) ?? POSTER_SIZES[0];
}

/** How many photo panels the design's layout shows at its size. */
export function activePanelCount(design) {
  const { width, height } = designSize(design);
  return photoPanelCount(design.layoutId, width, height);
}

/**
 * Fills every panel from the library: photos dealt out in turn, so one photo fills all panels and several share
 * them, each panel with its own smart crop so repeats of a photo show different parts of it.
 */
export function fillPanelsFromPhotos(design, photos, seed = 0) {
  if (!photos.length) return;
  const cropsByPhoto = new Map(photos.map((photo) => [photo.id, smartCrops(photo, MAX_SLOTS, seed)]));
  const uses = new Map();
  design.slots.forEach((slot, i) => {
    const photo = photos[i % photos.length];
    const use = uses.get(photo.id) ?? 0;
    uses.set(photo.id, use + 1);
    Object.assign(slot, { photoId: photo.id }, cropsByPhoto.get(photo.id)[use]);
  });
}

/** Puts one photo into one slot with that photo's wide crop. */
export function assignPhotoToSlot(design, slotIndex, photo) {
  const crop = smartCrops(photo, 1)[0];
  Object.assign(design.slots[slotIndex], { photoId: photo.id }, crop);
}

/** Clears every slot showing a photo that was removed from the library, refilling it from what is left. */
export function forgetPhoto(design, photoId, photos) {
  design.slots.forEach((slot, i) => {
    if (slot.photoId !== photoId) return;
    if (photos.length) {
      const photo = photos[i % photos.length];
      Object.assign(slot, { photoId: photo.id }, smartCrops(photo, MAX_SLOTS)[i]);
    } else {
      Object.assign(slot, emptySlot());
    }
  });
}

/** "Surprise me": a new layout, grade, caption style and look, and fresh crops, all from one seed. */
export function surpriseDesign(design, photos, seed) {
  const random = createRandom(seed);
  design.seed = seed % 100000;
  design.layoutId = pickRandom(random, POSTER_LAYOUTS.filter((layout) => layout.id !== design.layoutId)).id;
  design.gradeId = pickRandom(random, COLOR_GRADES.filter((grade) => grade.id !== design.gradeId)).id;
  design.caption.style = pickRandom(random, CAPTION_STYLES).id;
  design.caption.position = 'auto';
  Object.assign(design.look, {
    alternate: random() < 0.7,
    wash: randomBetween(random, 0.25, 0.6),
    glow: randomBetween(random, 0.2, 0.55),
    leaks: randomBetween(random, 0.2, 0.65),
    vignette: randomBetween(random, 0.35, 0.7),
    grain: randomBetween(random, 0.12, 0.32),
    border: randomBetween(random, 0.7, 1.4),
    keyline: random() < 0.4 ? randomBetween(random, 0.6, 1) : 0,
    borderColor: pickRandom(random, ['grade', 'grade', 'ink', 'cream', 'hot']),
  });
  if (photos.length) {
    const order = photos.slice().sort(() => random() - 0.5);
    fillPanelsFromPhotos(design, order, seed);
  }
}
