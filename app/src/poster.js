// Renders a whole poster from the editor state: ink backdrop, graded photo panels cut by the layout, floating cards,
// bloom, caption lettering, vignette and film grain. The same function draws the live preview (at a reduced pixel
// scale) and the exported PNG (at scale 1, the exact poster size).
import { buildLayout } from './layouts.js';
import { applyGradeToPixels, findGrade, withAlpha } from './grades.js';
import { drawScene } from './scenes.js';
import { drawCaption } from './lettering.js';
import { tracePolygon } from './geometry.js';
import { createRandom } from './random.js';

const panelCache = new Map();

/** Border thickness in poster pixels for the chosen border setting (given per 1080 px). */
export function gutterFor(state) {
  return (state.fx.border * Math.min(state.size.w, state.size.h)) / 1080;
}

/** The current layout laid out on the poster, panels and caption spot included. */
export function layoutForState(state) {
  return buildLayout(state.layoutId, state.size.w, state.size.h, gutterFor(state));
}

/** Where the photo sits in a panel's frame: its scale and top-left corner, with the focus point clamped so the photo
 * always covers the frame. */
export function placePhotoInFrame(img, frame, crop) {
  const iw = img.width;
  const ih = img.height;
  const s = Math.max(frame.w / iw, frame.h / ih) * Math.max(1, crop.zoom);
  const halfW = frame.w / (2 * s) / iw;
  const halfH = frame.h / (2 * s) / ih;
  const fx = Math.min(1 - halfW, Math.max(halfW, crop.fx));
  const fy = Math.min(1 - halfH, Math.max(halfH, crop.fy));
  return { scale: s, x: frame.w / 2 - fx * iw * s, y: frame.h / 2 - fy * ih * s, w: iw * s, h: ih * s, fx, fy };
}

/** Resolves a panel's source string ('photo:2' or 'scene:neon-skyline') against the loaded photos. */
export function resolvePanelSource(state, index) {
  const panel = state.panels[index];
  const [kind, value] = (panel?.source ?? '').split(':');
  if (kind === 'photo' && state.photos[Number(value)]) return { kind: 'photo', photo: state.photos[Number(value)], key: `p${state.photos[Number(value)].id}` };
  const scenes = ['sunset-beach', 'palm-highway', 'neon-skyline'];
  const scene = kind === 'scene' ? value : scenes[index % scenes.length];
  return { kind: 'scene', scene, key: `s${scene}` };
}

/** Draws and grades one panel's content into its own canvas, at device pixels, cached between redraws. */
function renderPanelContent(state, panel, grade, pixelScale) {
  const src = resolvePanelSource(state, panel.index);
  const crop = state.panels[panel.index]?.crop ?? { fx: 0.5, fy: 0.5, zoom: 1, flip: false };
  const pw = Math.max(1, Math.round(panel.frame.w * pixelScale));
  const ph = Math.max(1, Math.round(panel.frame.h * pixelScale));
  const alt = panel.index % 2 === 1;
  const key = [src.key, crop.fx.toFixed(4), crop.fy.toFixed(4), crop.zoom.toFixed(3), crop.flip, pw, ph, grade.id, state.fx.strength, alt, state.size.w, state.size.h].join('|');
  if (panelCache.has(key)) return panelCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = pw;
  canvas.height = ph;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.scale(pw / panel.frame.w, ph / panel.frame.h);
  if (src.kind === 'photo') {
    const place = placePhotoInFrame(src.photo.image, panel.frame, crop);
    if (crop.flip) {
      ctx.translate(panel.frame.w, 0);
      ctx.scale(-1, 1);
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src.photo.image, place.x, place.y, place.w, place.h);
    const pixels = ctx.getImageData(0, 0, pw, ph);
    applyGradeToPixels(pixels, grade, state.fx.strength, alt);
    ctx.putImageData(pixels, 0, 0);
  } else {
    drawScene(ctx, src.scene, panel.frame.w, panel.frame.h, grade.palette, 11 + panel.index * 7);
  }
  if (panelCache.size > 48) panelCache.delete(panelCache.keys().next().value);
  panelCache.set(key, canvas);
  return canvas;
}

/**
 * Light on each panel: a multiplied sky wash from the top and an ink burn at the bottom (so pale skies and highlights
 * take the grade's colour), a sunset light leak from one corner, and a soft inner shadow along its edges.
 */
function drawPanelLight(ctx, panel, palette, glow, gutter, strength) {
  const b = panel.bounds;
  const wash = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  wash.addColorStop(0, withAlpha(panel.index % 2 ? palette.sky[1] : palette.sky[2], 0.55 * strength));
  wash.addColorStop(0.5, withAlpha(palette.sky[3], 0.12 * strength));
  wash.addColorStop(1, withAlpha(palette.sky[0], 0.6 * strength));
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = wash;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  const leak = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  const fromTop = panel.index % 2 === 0;
  leak.addColorStop(fromTop ? 0 : 1, withAlpha(palette.glow, 0.15 * glow));
  leak.addColorStop(0.55, withAlpha(palette.glow, 0));
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = leak;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = withAlpha(palette.ink, 0.85);
  ctx.shadowBlur = gutter * 2.2 + 8;
  ctx.lineWidth = gutter * 2 + 10;
  ctx.strokeStyle = palette.ink;
  tracePolygon(ctx, panel.poly);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/** Draws one panel into the poster: content clipped to its polygon, then its light, then card borders if floating. */
function drawPanel(ctx, state, panel, grade, pixelScale, gutter) {
  if (panel.poly.length < 3) return;
  const palette = grade.palette;
  if (panel.floating) {
    ctx.save();
    ctx.shadowColor = withAlpha('#000000', 0.6);
    ctx.shadowBlur = gutter * 3;
    ctx.shadowOffsetX = gutter * 0.6;
    ctx.shadowOffsetY = gutter * 0.9;
    tracePolygon(ctx, panel.poly);
    ctx.fillStyle = palette.ink;
    ctx.fill();
    ctx.restore();
  }
  const content = renderPanelContent(state, panel, grade, pixelScale);
  ctx.save();
  tracePolygon(ctx, panel.poly);
  ctx.clip();
  ctx.save();
  ctx.translate(panel.frame.cx, panel.frame.cy);
  ctx.rotate((panel.frame.rot * Math.PI) / 180);
  ctx.drawImage(content, -panel.frame.w / 2, -panel.frame.h / 2, panel.frame.w, panel.frame.h);
  ctx.restore();
  drawPanelLight(ctx, panel, palette, state.fx.glow, gutter, resolvePanelSource(state, panel.index).kind === 'photo' ? state.fx.strength : 0.25);
  ctx.restore();
  if (panel.floating) {
    ctx.save();
    tracePolygon(ctx, panel.poly);
    ctx.lineJoin = 'miter';
    ctx.lineWidth = gutter * 1.3;
    ctx.strokeStyle = palette.ink;
    ctx.stroke();
    ctx.lineWidth = Math.max(2, gutter * 0.28);
    ctx.strokeStyle = palette.slab;
    ctx.stroke();
    ctx.restore();
  }
}

/** A soft bloom: the poster's highlights blurred small, tinted with the grade's glow colour and screened back, so
 * bright areas glow in colour instead of washing out to white. */
function drawBloom(ctx, canvas, amount, palette) {
  if (amount <= 0 || !canvas.width || !canvas.height) return;
  const small = document.createElement('canvas');
  small.width = Math.max(1, Math.round(canvas.width / 4));
  small.height = Math.max(1, Math.round(canvas.height / 4));
  const s = small.getContext('2d');
  // Contrast first so only the highlights survive to glow; the shadows stay deep.
  s.filter = `brightness(0.5) contrast(4) saturate(1.5) blur(${Math.max(2, small.width / 80)}px)`;
  s.drawImage(canvas, 0, 0, small.width, small.height);
  s.filter = 'none';
  s.globalCompositeOperation = 'multiply';
  s.fillStyle = palette.glow;
  s.fillRect(0, 0, small.width, small.height);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.16 * amount;
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawVignette(ctx, width, height, palette, amount) {
  if (amount <= 0) return;
  const g = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.hypot(width, height) * 0.6);
  g.addColorStop(0, withAlpha(palette.ink, 0));
  g.addColorStop(1, withAlpha(palette.ink, 0.85 * amount));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

let grainTile = null;

/** Film grain: a fixed tile of seeded noise overlaid across the poster in device pixels. */
function drawGrain(ctx, canvas, amount) {
  if (amount <= 0) return;
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = grainTile.height = 256;
    const g = grainTile.getContext('2d');
    const img = g.createImageData(256, 256);
    const rng = createRandom(1979);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (rng() + rng() + rng() - 1.5) * 120;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.45 * amount;
  ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

/**
 * Draws the poster described by `state` onto `canvas`, whose pixel size is the poster size times `pixelScale`.
 * `highlight` outlines one panel (the editor's selection); exports pass -1.
 */
export function renderPoster(canvas, state, { pixelScale = 1, highlight = -1 } = {}) {
  const { w: width, h: height } = state.size;
  canvas.width = Math.round(width * pixelScale);
  canvas.height = Math.round(height * pixelScale);
  const ctx = canvas.getContext('2d');
  const grade = findGrade(state.gradeId);
  const palette = grade.palette;
  const gutter = gutterFor(state);
  const layout = layoutForState(state);

  ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  const back = ctx.createLinearGradient(0, 0, width, height);
  back.addColorStop(0, palette.ink);
  back.addColorStop(1, palette.titleShadow);
  ctx.fillStyle = back;
  ctx.fillRect(0, 0, width, height);

  for (const panel of layout.panels) drawPanel(ctx, state, panel, grade, pixelScale, gutter);
  drawBloom(ctx, canvas, state.fx.glow, palette);
  drawVignette(ctx, width, height, palette, state.fx.vignette);
  drawCaption(ctx, state.caption, layout.caption, width, height, palette, state.fx);
  drawGrain(ctx, canvas, state.fx.grain);

  const selected = layout.panels[highlight];
  if (selected && selected.poly.length > 2) {
    ctx.save();
    tracePolygon(ctx, selected.poly);
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = Math.max(3, 3 / pixelScale);
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  }
  return layout;
}
