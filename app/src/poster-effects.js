// Image effects for the poster: the gradient-map colour grade applied to each photo panel, glow (bloom), light
// leaks, a vignette and film grain. All of them are plain Canvas 2D, and grain is seeded so a poster renders the
// same every time.
import { buildGradientMap, hexWithAlpha } from './color-grades.js';
import { createRandom } from './seeded-random.js';

const gradientMapCache = new Map();

/** A cached gradient map for a list of colour stops. */
function cachedGradientMap(stops) {
  const key = stops.join();
  if (!gradientMapCache.has(key)) gradientMapCache.set(key, buildGradientMap(stops));
  return gradientMapCache.get(key);
}

/**
 * Grades a canvas region in place: boosts contrast and saturation, then blends the gradient map of `stops` over
 * the photo by `strength` (0 = untouched photo, 1 = pure map). Keeps some of the original hue for skin and sky.
 */
export function applyColorGrade(ctx, width, height, stops, { strength, contrast, saturation, gamma = 1 }) {
  if (width < 1 || height < 1) return;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const lut = cachedGradientMap(stops);
  const keep = 1 - strength;
  // A tone curve (gamma above 1 darkens, for night grades), applied before everything else.
  const tone = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) tone[v] = 255 * Math.pow(v / 255, gamma);
  for (let i = 0; i < data.length; i += 4) {
    let r = tone[data[i]];
    let g = tone[data[i + 1]];
    let b = tone[data[i + 2]];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Saturation around the pixel's own luminance, then an S-ish contrast around mid grey.
    r = lum + (r - lum) * saturation;
    g = lum + (g - lum) * saturation;
    b = lum + (b - lum) * saturation;
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;
    let mapped = (lum - 128) * contrast + 128;
    mapped = mapped < 0 ? 0 : mapped > 255 ? 255 : mapped;
    const m = (mapped | 0) * 3;
    data[i] = r * keep + lut[m] * strength;
    data[i + 1] = g * keep + lut[m + 1] * strength;
    data[i + 2] = b * keep + lut[m + 2] * strength;
  }
  ctx.putImageData(image, 0, 0);
}

/** Bloom: a blurred copy of the canvas screened over itself, so highlights glow into their neighbours. */
export function addGlow(ctx, width, height, amount, tint) {
  if (amount <= 0) return;
  const scratch = scratchCanvas(Math.ceil(width / 4), Math.ceil(height / 4));
  const sctx = scratch.getContext('2d');
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  sctx.drawImage(ctx.canvas, 0, 0, scratch.width, scratch.height);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.min(1, amount * 0.9);
  ctx.filter = `blur(${Math.max(2, Math.min(width, height) * 0.012)}px)`;
  ctx.drawImage(scratch, 0, 0, width, height);
  ctx.filter = 'none';
  ctx.globalAlpha = amount * 0.35;
  ctx.fillStyle = tint;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Two soft coloured light leaks bleeding in from opposite corners. */
export function addLightLeaks(ctx, width, height, colors, amount, seed) {
  if (amount <= 0) return;
  const random = createRandom(seed ^ 0x51ed);
  const span = Math.max(width, height);
  const corners = random() < 0.5 ? [[0, 0], [width, height]] : [[width, 0], [0, height]];
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  corners.forEach(([x, y], i) => {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, span * (0.45 + random() * 0.2));
    glow.addColorStop(0, hexWithAlpha(colors[i], 0.75 * amount));
    glow.addColorStop(0.45, hexWithAlpha(colors[i], 0.25 * amount));
    glow.addColorStop(1, hexWithAlpha(colors[i], 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  });
  ctx.restore();
}

/** A soft dark vignette towards the corners. */
export function addVignette(ctx, width, height, amount, color = '#000000') {
  if (amount <= 0) return;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.hypot(cx, cy);
  const shade = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
  shade.addColorStop(0, hexWithAlpha(color, 0));
  shade.addColorStop(0.7, hexWithAlpha(color, 0.35 * amount));
  shade.addColorStop(1, hexWithAlpha(color, 0.85 * amount));
  ctx.save();
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

const grainTiles = new Map();

/** A seeded 256 x 256 tile of grey noise, made once per seed. */
function grainTile(seed) {
  if (grainTiles.has(seed)) return grainTiles.get(seed);
  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 256;
  const tctx = tile.getContext('2d');
  const image = tctx.createImageData(256, 256);
  const random = createRandom(seed);
  for (let i = 0; i < image.data.length; i += 4) {
    // Sum of two uniforms: a softer, film-like distribution than flat noise.
    const v = (random() + random()) * 127.5;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  tctx.putImageData(image, 0, 0);
  grainTiles.set(seed, tile);
  return tile;
}

/** Film grain over everything: seeded noise overlaid at `amount`, its grain sized to the poster. */
export function addFilmGrain(ctx, width, height, amount, seed) {
  if (amount <= 0) return;
  const tile = grainTile(seed % 64);
  const grainScale = Math.max(1, Math.min(width, height) / 900);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = Math.min(1, amount);
  ctx.imageSmoothingEnabled = grainScale > 1.2;
  const step = 256 * grainScale;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) ctx.drawImage(tile, x, y, step, step);
  }
  ctx.restore();
}

const scratchCanvases = new Map();

/** A reusable offscreen canvas of a given size. */
export function scratchCanvas(width, height, name = 'glow') {
  let canvas = scratchCanvases.get(name);
  if (!canvas) {
    canvas = document.createElement('canvas');
    scratchCanvases.set(name, canvas);
  }
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return canvas;
}
