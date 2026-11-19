// Renders a poster design onto a canvas at the canvas's own size: the layout's panels, each photo cropped and
// colour graded on its own (alternate panels can take the grade's second map), sunset tiles, a sunset wash, glow
// and light leaks, thick borders, a vignette, the caption and film grain. The same function draws the live
// preview (smaller, with the selected panel outlined) and the exported PNG (at the exact chosen size).
import { findGrade, hexWithAlpha } from './color-grades.js';
import { drawCaption } from './poster-caption.js';
import { addFilmGrain, addGlow, addLightLeaks, addVignette, applyColorGrade, scratchCanvas } from './poster-effects.js';
import { layoutPoster, tracePolygon } from './poster-layouts.js';
import { drawSunsetTile } from './sunset-tile.js';

const BORDER_COLORS = { ink: '#0b0610', cream: '#fff4e2', hot: null, grade: null };

/** The border colour a design asks for: the grade's own, ink, cream or the grade's hot slab colour. */
export function borderColorFor(design, grade) {
  if (design.look.borderColor === 'hot') return grade.slab;
  return BORDER_COLORS[design.look.borderColor] ?? grade.border;
}

/**
 * Draws `design` on `canvas`. `photosById` maps photo ids to library photos. With `editor` set, outlines the
 * panel `editor.selectedSlot` and numbers the photo panels. Returns the laid-out panels in canvas pixels.
 */
export function renderPoster(canvas, design, photosById, editor = null) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const short = Math.min(width, height);
  const grade = findGrade(design.gradeId);
  const look = design.look;
  const plan = layoutPoster(design.layoutId, width, height);
  const borderColor = borderColorFor(design, grade);
  const borderWidth = short * 0.016 * look.border;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.fillStyle = borderColor;
  ctx.fillRect(0, 0, width, height);

  plan.panels.forEach((panel, index) => {
    const slot = panel.kind === 'photo' ? design.slots[panel.slot] : null;
    const photo = slot && slot.photoId != null ? photosById.get(slot.photoId) : null;
    if (panel.card) drawCardShadow(ctx, panel, short, borderColor);
    if (photo) {
      const alternate = look.alternate && index % 2 === 1;
      drawPhotoPanel(ctx, panel, photo, slot, grade, alternate ? grade.altMap : grade.map, look);
    } else {
      drawSunsetTile(ctx, panel.polygon, panel.bounds, grade, design.seed + index * 101);
    }
    if (panel.card) strokePanel(ctx, panel.polygon, borderWidth * 1.6, look.borderColor === 'grade' ? '#fff4e2' : borderColor);
  });

  addSunsetWash(ctx, width, height, grade, look.wash);
  addGlow(ctx, width, height, look.glow, grade.glow);
  addLightLeaks(ctx, width, height, grade.leaks, look.leaks, design.seed);

  if (borderWidth > 0) {
    plan.panels.filter((panel) => !panel.card).forEach((panel) => strokePanel(ctx, panel.polygon, borderWidth, borderColor));
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth * 2;
    ctx.strokeRect(0, 0, width, height);
    if (look.keyline > 0) addKeylines(ctx, plan.panels, borderWidth, borderColor, grade, look.keyline);
  }
  addVignette(ctx, width, height, look.vignette, grade.outline);

  drawCaption(ctx, design.caption, captionAnchorFor(design, plan, width, height), grade, short);
  addFilmGrain(ctx, width, height, look.grain, design.seed);
  ctx.restore();

  if (editor) drawEditorOverlay(ctx, plan.panels, editor.selectedSlot, short);
  return plan.panels;
}

/** The caption anchor: the layout's own, or the top, middle or bottom band when the person picked one. */
function captionAnchorFor(design, plan, width, height) {
  const bands = { top: 0.18, middle: 0.5, bottom: 0.82 };
  const band = bands[design.caption.position];
  if (band == null) return plan.caption;
  return { x: width / 2, y: height * band, maxWidth: width * 0.88, maxHeight: height * 0.34, inTile: false };
}

/** Draws one photo into its panel: cropped on a scratch canvas the panel's size, graded there, then clipped in. */
function drawPhotoPanel(ctx, panel, photo, slot, grade, mapStops, look) {
  const bx = Math.floor(panel.bounds.x);
  const by = Math.floor(panel.bounds.y);
  const bw = Math.ceil(panel.bounds.x + panel.bounds.w) - bx;
  const bh = Math.ceil(panel.bounds.y + panel.bounds.h) - by;
  if (bw < 1 || bh < 1) return;
  const scratch = scratchCanvas(bw, bh, 'panel');
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, bw, bh);
  const placement = cropPlacement(photo, slot, bw, bh);
  sctx.save();
  if (slot.flip) {
    sctx.translate(bw, 0);
    sctx.scale(-1, 1);
  }
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(photo.canvas, placement.x, placement.y, placement.w, placement.h);
  sctx.restore();
  applyColorGrade(sctx, bw, bh, mapStops, {
    strength: Math.min(1, grade.strength * look.gradeAmount),
    contrast: 1 + (grade.contrast - 1) * look.gradeAmount,
    saturation: 1 + (grade.saturation - 1) * look.gradeAmount,
    gamma: 1 + ((grade.gamma ?? 1) - 1) * look.gradeAmount,
  });
  ctx.save();
  tracePolygon(ctx, panel.polygon);
  ctx.clip();
  ctx.drawImage(scratch, bx, by);
  ctx.restore();
}

/**
 * Where a photo lands in a bw x bh box for a slot's crop: scaled to cover the box times `zoom`, the photo point
 * (fx, fy) at the box centre, nudged so the photo always covers the box. Shared with the panel editor's dragging.
 */
export function cropPlacement(photo, slot, bw, bh) {
  const scale = Math.max(bw / photo.width, bh / photo.height) * Math.max(1, slot.zoom);
  const w = photo.width * scale;
  const h = photo.height * scale;
  const fx = slot.flip ? 1 - slot.fx : slot.fx;
  let x = bw / 2 - fx * w;
  let y = bh / 2 - slot.fy * h;
  x = Math.min(0, Math.max(bw - w, x));
  y = Math.min(0, Math.max(bh - h, y));
  return { x, y, w, h, scale };
}

/** A soft drop shadow under a postcard panel. */
function drawCardShadow(ctx, panel, short, color) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = short * 0.04;
  ctx.shadowOffsetX = short * 0.012;
  ctx.shadowOffsetY = short * 0.018;
  ctx.fillStyle = color;
  tracePolygon(ctx, panel.polygon);
  ctx.fill();
  ctx.restore();
}

/** A border along a panel's edges. */
function strokePanel(ctx, polygon, width, color) {
  ctx.save();
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  tracePolygon(ctx, polygon);
  ctx.stroke();
  ctx.restore();
}

/** A thin glowing neon line just inside each tile's border, in the grade's slab colour. */
function addKeylines(ctx, panels, borderWidth, borderColor, grade, amount) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, amount);
  ctx.shadowColor = grade.slab;
  ctx.shadowBlur = borderWidth * 0.8;
  for (const panel of panels) {
    if (panel.card) continue;
    ctx.save();
    tracePolygon(ctx, panel.polygon);
    ctx.clip();
    strokePanel(ctx, panel.polygon, borderWidth * 1.45, grade.slab);
    strokePanel(ctx, panel.polygon, borderWidth, borderColor);
    ctx.restore();
  }
  ctx.restore();
}

/** The grade's sky laid over the photos in soft light: warm tops, hot middles, the whole poster at one hour. */
function addSunsetWash(ctx, width, height, grade, amount) {
  if (amount <= 0) return;
  const wash = ctx.createLinearGradient(0, 0, width * 0.25, height);
  grade.sky.forEach((color, i) => wash.addColorStop(i / (grade.sky.length - 1), color));
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = Math.min(1, amount);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** The editor's marks over the preview: every photo panel numbered, the selected one outlined in neon. */
function drawEditorOverlay(ctx, panels, selectedSlot, short) {
  ctx.save();
  for (const panel of panels) {
    if (panel.kind !== 'photo') continue;
    const selected = panel.slot === selectedSlot;
    if (selected) {
      ctx.save();
      ctx.shadowColor = '#22e6ff';
      ctx.shadowBlur = short * 0.02;
      ctx.strokeStyle = '#22e6ff';
      ctx.lineWidth = Math.max(2, short * 0.006);
      ctx.setLineDash([short * 0.02, short * 0.012]);
      tracePolygon(ctx, panel.polygon);
      ctx.stroke();
      ctx.restore();
    }
    const cx = panel.bounds.x + panel.bounds.w / 2;
    const cy = panel.bounds.y + Math.min(panel.bounds.h * 0.15, short * 0.06);
    const r = Math.max(9, short * 0.022);
    ctx.fillStyle = selected ? '#22e6ff' : hexWithAlpha('#0b0610', 0.65);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = selected ? '#0b0610' : '#ffffff';
    ctx.font = `700 ${Math.round(r * 1.1)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '0px';
    ctx.fillText(String(panel.slot + 1), cx, cy + 1);
  }
  ctx.restore();
}
