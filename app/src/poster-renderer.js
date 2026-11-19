// Draws a whole poster: the layout's panels over the ink background, each filled with its photo crop and graded
// with a gradient map, then bloom, light leak, vignette, the caption lettering and film grain. The live preview
// draws it scaled down; exportPosterPng draws it at the exact poster size and encodes a PNG.
import { buildLayout } from './layouts.js';
import { findGrade, applyGradientMap } from './grades.js';
import { drawPhotoCrop } from './photo-crop.js';
import { tracePolygon } from './geometry.js';
import { drawCaption } from './caption-lettering.js';
import {
  applyBloomGlow,
  applyFilmGrain,
  applyLightLeak,
  applyPanelWash,
  applyVignette,
  makeCanvas,
  withAlpha,
} from './film-effects.js';

export const DEFAULT_EFFECTS = { strength: 1, grain: 0.45, glow: 0.65, vignette: 0.6, leak: 0.4, border: 1, varyTint: true };

/** The crop a panel starts with when it has none yet: the hero wide, the tiles zoomed into different details. */
export const STARTER_CROPS = [
  { zoom: 1.05, fx: 0.5, fy: 0.42 },
  { zoom: 1.9, fx: 0.38, fy: 0.3 },
  { zoom: 2.2, fx: 0.66, fy: 0.62 },
  { zoom: 1.6, fx: 0.5, fy: 0.78 },
  { zoom: 2.6, fx: 0.3, fy: 0.55 },
  { zoom: 1.4, fx: 0.72, fy: 0.35 },
  { zoom: 2.0, fx: 0.55, fy: 0.5 },
  { zoom: 1.7, fx: 0.2, fy: 0.7 },
];

/** The crop and photo of panel i, filling in a starter crop (and a photo, in turn) where the poster has none. */
export function panelCrop(poster, i, photoIds, hero = false) {
  const own = poster.panels[i];
  const starter = hero ? STARTER_CROPS[0] : STARTER_CROPS[1 + (i % (STARTER_CROPS.length - 1))];
  const photoId = own?.photoId && photoIds.includes(own.photoId) ? own.photoId : photoIds[i % Math.max(1, photoIds.length)];
  return { ...starter, ...(own ?? {}), photoId };
}

const gradedCache = new Map();

/** A panel's photo, cropped and graded at the drawing scale, cached so dragging one panel redraws only that one. */
function gradedPanel(photo, photoId, bounds, crop, scale, map, mix, wash, washAmount) {
  const key = [photoId, bounds.w.toFixed(1), bounds.h.toFixed(1), crop.zoom, crop.fx, crop.fy, scale, mix, washAmount, JSON.stringify(map)].join('|');
  const hit = gradedCache.get(key);
  if (hit) return hit;
  const off = makeCanvas(bounds.w * scale, bounds.h * scale);
  const c = off.getContext('2d', { willReadFrequently: true });
  c.scale(off.width / bounds.w, off.height / bounds.h);
  drawPhotoCrop(c, photo, bounds.w, bounds.h, crop);
  if (mix > 0) {
    const data = c.getImageData(0, 0, off.width, off.height);
    applyGradientMap(data, map, mix);
    c.putImageData(data, 0, 0);
  }
  applyPanelWash(c, bounds.w, bounds.h, wash, washAmount);
  if (gradedCache.size > 48) gradedCache.delete(gradedCache.keys().next().value);
  gradedCache.set(key, off);
  return off;
}

/** An empty panel waiting for a photo: a sunset gradient with a faint sun. */
function drawEmptyPanel(ctx, b, grade, i) {
  const map = grade.maps[i % grade.maps.length];
  const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  [...map].reverse().forEach(([pos, colour], k, all) => g.addColorStop(k / (all.length - 1), colour));
  ctx.fillStyle = g;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  const sun = ctx.createRadialGradient(b.x + b.w / 2, b.y + b.h * 0.62, 0, b.x + b.w / 2, b.y + b.h * 0.62, Math.min(b.w, b.h) * 0.35);
  sun.addColorStop(0, withAlpha('#fff3c4', 0.9));
  sun.addColorStop(1, withAlpha('#ff8a3c', 0));
  ctx.fillStyle = sun;
  ctx.fillRect(b.x, b.y, b.w, b.h);
}

/**
 * Draws `poster` onto `canvas` at `scale` (canvas pixels per poster pixel) and returns the layout used, whose panel
 * polygons the editor hit-tests. `photos` maps photo ids to drawable images. `selected` outlines one panel (the
 * preview only; exports pass -1).
 */
export function renderPoster(canvas, poster, photos, { scale = 1, selected = -1 } = {}) {
  const { w, h } = poster;
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  const fx = { ...DEFAULT_EFFECTS, ...(poster.effects ?? {}) };
  const grade = findGrade(poster.gradeId);
  const layout = buildLayout(poster.layoutId, w, h, fx.border);
  const photoIds = [...photos.keys()];

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = grade.ink;
  ctx.fillRect(0, 0, w, h);

  // The hero takes the grade's signature map; the tiles take the maps in turn after it.
  let tileNumber = 0;
  layout.panels.forEach((panel, i) => {
    const b = panel.bounds;
    const mapIndex = !fx.varyTint || panel.hero ? 0 : (1 + tileNumber++) % grade.maps.length;
    const crop = panelCrop(poster, i, photoIds, panel.hero);
    const photo = photos.get(crop.photoId);
    ctx.save();
    if (panel.card) {
      // A turned card: a soft shadow, then a cream border around its photo.
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = panel.border * 2.5;
      ctx.shadowOffsetX = panel.border * 0.6;
      ctx.shadowOffsetY = panel.border;
      tracePolygon(ctx, panel.poly);
      ctx.lineJoin = 'miter';
      ctx.lineWidth = panel.border * 2;
      ctx.strokeStyle = '#fff4e6';
      ctx.stroke();
      ctx.shadowColor = 'transparent';
    }
    tracePolygon(ctx, panel.poly);
    ctx.clip();
    if (photo) {
      const map = grade.maps[mapIndex];
      const art = gradedPanel(photo, crop.photoId, b, crop, scale, map, grade.mix * fx.strength, grade.wash, 0.22 * fx.strength);
      ctx.drawImage(art, b.x, b.y, b.w, b.h);
    } else {
      drawEmptyPanel(ctx, b, grade, i);
    }
    ctx.restore();
  });

  applyBloomGlow(ctx, w, h, fx.glow);
  applyLightLeak(ctx, w, h, grade.leak, fx.leak, (poster.seed ?? 0) % 2 === 0);
  applyVignette(ctx, w, h, fx.vignette);
  drawCaption(ctx, w, h, layout.caption, poster, grade);
  applyFilmGrain(ctx, w, h, fx.grain, 7, Math.max(1, Math.min(w, h) / 900));

  if (selected >= 0 && layout.panels[selected]) {
    ctx.save();
    tracePolygon(ctx, layout.panels[selected].poly);
    ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.006);
    ctx.setLineDash([ctx.lineWidth * 3, ctx.lineWidth * 2]);
    ctx.strokeStyle = '#3ff6ff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return layout;
}

/** Draws the poster at its exact size (poster.w x poster.h) and encodes it as a PNG blob. */
export function exportPosterPng(poster, photos) {
  const canvas = makeCanvas(poster.w, poster.h);
  renderPoster(canvas, poster, photos, { scale: 1, selected: -1 });
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png'),
  );
}

/** The file name an export downloads as, e.g. sunset-poster-1920x1080.png. */
export function exportFileName(poster) {
  const slug = (poster.title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
  return `${slug || 'sunset-poster'}-${poster.w}x${poster.h}.png`;
}
