// The photo library: reads the person's photos on their own machine (file picker, drag and drop, or the bundled
// samples), never uploading them. Each photo is decoded once, scaled down to a working size, given a thumbnail,
// and given a guessed focus point (where skin tones gather, weighted to the upper frame) for the smart crops.
import { createRandom, randomBetween } from './seeded-random.js';

const WORKING_LONG_SIDE = 2400;
let nextPhotoId = 1;

/** Reads an image File into a library photo. Rejects when the browser cannot decode it. */
export async function loadPhotoFile(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  return photoFromSource(bitmap, bitmap.width, bitmap.height, file.name.replace(/\.[^.]+$/, ''));
}

/** Loads a photo from a URL inside the app (the bundled samples). */
export function loadPhotoUrl(url, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(photoFromSource(img, img.naturalWidth, img.naturalHeight, name));
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

/** Builds a library photo: a working-size canvas, a thumbnail data URI and a focus point. */
function photoFromSource(source, width, height, name) {
  const scale = Math.min(1, WORKING_LONG_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (typeof source.close === 'function') source.close();
  return {
    id: nextPhotoId++,
    name,
    canvas,
    width: canvas.width,
    height: canvas.height,
    thumb: makeThumbnail(canvas),
    focus: findFocusPoint(canvas),
  };
}

/** A small square JPEG data URI of the photo's centre, for the library strip. */
function makeThumbnail(canvas) {
  const size = 120;
  const thumb = document.createElement('canvas');
  thumb.width = size;
  thumb.height = size;
  const side = Math.min(canvas.width, canvas.height);
  thumb.getContext('2d').drawImage(canvas, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side, 0, 0, size, size);
  return thumb.toDataURL('image/jpeg', 0.8);
}

/**
 * Guesses where a face is: on a small copy, the topmost run of rows holding a patch of skin tones (heads are
 * usually above arms and hands), and the centre of the skin in the band below it. Returns {x, y} as fractions of
 * the photo, or the upper middle when it finds no skin.
 */
export function findFocusPoint(canvas) {
  const w = 96;
  const h = Math.max(1, Math.round((96 * canvas.height) / canvas.width));
  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const sctx = small.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(canvas, 0, 0, w, h);
  const { data } = sctx.getImageData(0, 0, w, h);
  const skin = new Uint8Array(w * h);
  const rowCounts = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (isSkinTone(data[i], data[i + 1], data[i + 2])) {
        skin[y * w + x] = 1;
        rowCounts[y]++;
      }
    }
  }
  const minRun = Math.max(3, Math.round(w * 0.04));
  const top = rowCounts.findIndex((count, y) => y > h * 0.02 && count >= minRun && (rowCounts[y + 1] ?? 0) >= minRun && (rowCounts[y + 2] ?? 0) >= minRun);
  if (top < 0) return { x: 0.5, y: 0.33 };
  const band = Math.max(3, Math.round(Math.min(h, w) * 0.16));
  let total = 0;
  let sx = 0;
  let sy = 0;
  for (let y = top; y < Math.min(h, top + band); y++) {
    for (let x = 0; x < w; x++) {
      if (!skin[y * w + x]) continue;
      total++;
      sx += x;
      sy += y;
    }
  }
  return { x: sx / total / w, y: sy / total / h };
}

/** A broad skin-tone test in YCbCr, across light and dark skin. */
function isSkinTone(r, g, b) {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb > 77 && cb < 127 && cr > 136 && cr < 173 && r > 60;
}

/**
 * Crops for `count` panels showing the same photo, so one photo fills a whole poster with variety: a wide shot,
 * a close-up on the focus point, and medium and detail crops around it. Each crop is {zoom, fx, fy, flip}:
 * fx, fy is the photo point (fractions) put at the panel's centre. `seed` varies them for "Surprise me".
 */
export function smartCrops(photo, count, seed = 0) {
  const random = createRandom(seed + photo.id * 7919);
  const f = photo.focus;
  // Every crop keeps the face in frame except the scene crop, which looks away from the subject at the setting.
  const away = f.x > 0.5 ? 0.15 : 0.85;
  const recipes = [
    { zoom: 1, fx: f.x, fy: f.y + 0.16 },
    { zoom: 1.9, fx: f.x, fy: f.y + 0.03 },
    { zoom: 1.4, fx: f.x, fy: f.y + 0.12, flip: true },
    { zoom: 1.25, fx: away, fy: 0.3 },
    { zoom: 1.6, fx: f.x, fy: f.y + 0.07 },
    { zoom: 1.15, fx: f.x, fy: f.y + 0.24, flip: true },
    { zoom: 2.4, fx: f.x, fy: f.y + 0.01 },
    { zoom: 1.1, fx: f.x, fy: f.y + 0.1 },
  ];
  const crops = [];
  for (let i = 0; i < count; i++) {
    const recipe = recipes[i % recipes.length];
    const jitter = seed ? 1 : 0;
    crops.push({
      zoom: recipe.zoom * (1 + jitter * randomBetween(random, -0.15, 0.2)),
      fx: clamp01(recipe.fx + jitter * randomBetween(random, -0.06, 0.06)),
      fy: clamp01(recipe.fy + jitter * randomBetween(random, -0.06, 0.06)),
      flip: jitter ? random() < 0.3 : Boolean(recipe.flip),
    });
  }
  return crops;
}

/** Clamps to [0, 1]. */
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
