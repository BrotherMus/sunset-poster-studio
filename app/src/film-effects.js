// Whole-poster finishing passes, applied after the panels are drawn: a bloom glow on the highlights, a light leak
// in the grade's colour, a vignette, and film grain from a seeded noise tile (so a screenshot is the same each time).
import { mulberry32 } from './random.js';

/**
 * Bloom: only the highlights (a quarter-size copy keeping the pixels brighter than about 55%) blurred and screened
 * back over the poster, so skies and neon glow while the shadows stay deep. `amount` 0..1.
 */
export function applyBloomGlow(ctx, w, h, amount) {
  if (amount <= 0) return;
  const copy = makeCanvas(Math.ceil(ctx.canvas.width / 4), Math.ceil(ctx.canvas.height / 4));
  const c = copy.getContext('2d', { willReadFrequently: true });
  c.drawImage(ctx.canvas, 0, 0, copy.width, copy.height);
  const img = c.getImageData(0, 0, copy.width, copy.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) / 65280;
    const t = Math.min(1, Math.max(0, (l - 0.55) / 0.4));
    const k = t * t * (3 - 2 * t) * 1.3;
    d[i] *= k;
    d[i + 1] *= k;
    d[i + 2] *= k;
  }
  c.putImageData(img, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.min(1, amount) * 0.9;
  ctx.filter = `blur(${Math.max(2, Math.round(Math.min(ctx.canvas.width, ctx.canvas.height) * 0.012))}px)`;
  ctx.drawImage(copy, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/** A warm light leak: a big soft glow from the top corner, in the grade's colour, screened on. */
export function applyLightLeak(ctx, w, h, colour, amount, fromRight = true) {
  if (amount <= 0) return;
  const x = fromRight ? w * 0.92 : w * 0.08;
  const r = Math.hypot(w, h) * 0.55;
  const g = ctx.createRadialGradient(x, h * 0.04, 0, x, h * 0.04, r);
  g.addColorStop(0, withAlpha(colour, 0.75 * amount));
  g.addColorStop(0.35, withAlpha(colour, 0.25 * amount));
  g.addColorStop(1, withAlpha(colour, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Darkens the edges and corners. `amount` 0..1. */
export function applyVignette(ctx, w, h, amount) {
  if (amount <= 0) return;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) * 0.56);
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, `rgba(8, 0, 18, ${Math.min(1, amount) * 0.85})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

const grainTiles = new Map();

/** A 256 x 256 tile of grey noise, the same for the same seed. */
export function grainTile(seed) {
  if (grainTiles.has(seed)) return grainTiles.get(seed);
  const tile = makeCanvas(256, 256);
  const c = tile.getContext('2d');
  const img = c.createImageData(256, 256);
  const rand = mulberry32(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    // Two uniforms averaged: a softer, film-like bell instead of flat static.
    const v = ((rand() + rand()) / 2) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  grainTiles.set(seed, tile);
  return tile;
}

/** Film grain: the noise tile overlaid across the poster. `amount` 0..1; `pixel` is the grain size in canvas pixels. */
export function applyFilmGrain(ctx, w, h, amount, seed = 7, pixel = 1) {
  if (amount <= 0) return;
  const pattern = ctx.createPattern(grainTile(seed), 'repeat');
  if (pixel !== 1) pattern.setTransform(new DOMMatrix().scale(pixel));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = Math.min(1, amount) * 0.42;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A soft two-colour wash down a panel (warm sky at the top, the grade's second colour below), soft-light blended. */
export function applyPanelWash(ctx, bw, bh, colours, amount) {
  if (amount <= 0) return;
  const g = ctx.createLinearGradient(0, 0, bw * 0.3, bh);
  g.addColorStop(0, withAlpha(colours[0], amount));
  g.addColorStop(1, withAlpha(colours[1], amount * 0.8));
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, bw, bh);
  ctx.restore();
}

/** '#rrggbb' and an alpha to an rgba() string. */
export function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, alpha))})`;
}

/** A canvas that is not on the page. */
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}
