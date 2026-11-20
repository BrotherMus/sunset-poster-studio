// Caption lettering: a huge condensed title filled with horizontal sunset stripes and a white shine across its upper
// third, with a thick ink outline, an extruded hard shadow and a glow; a neon script sub-line slashed across its
// lower corner; a small spaced-out tag above it; and, as an option, a skewed coloured slab behind it.
import { mixHex, withAlpha } from './grades.js';
import { deviceScale } from './geometry.js';

export const TITLE_FONT = 'Anton';
export const SCRIPT_FONT = 'Mr Dafoe';

const CAPTION_SPOTS = { top: 0.22, center: 0.5, bottom: 0.78 };
const TITLE_TILT = (-2.5 * Math.PI) / 180;
const SUB_TILT = (-6 * Math.PI) / 180;
/** Baseline to baseline, in cap heights, when the title takes two lines. */
const LINE_STEP = 1.16;

/**
 * How big the title letters, per poster shape: the cap height of a one-line title and of a two-line block, as shares
 * of the poster height, and the widest a line may run, as a share of its width. A one-line wide title is about 30% of
 * the poster's height when its width allows.
 */
const TITLE_BUDGET = {
  wide: { single: 0.3, block: 0.42, width: 0.93 },
  square: { single: 0.22, block: 0.38, width: 0.9 },
  tall: { single: 0.17, block: 0.33, width: 0.9 },
};

/** Waits for the two lettering fonts (declared in style.css from app/fonts/) so the canvas never draws a fallback. */
export async function loadLetteringFonts() {
  await Promise.all([document.fonts.load(`80px "${TITLE_FONT}"`), document.fonts.load(`80px "${SCRIPT_FONT}"`)]);
}

/** The ways a title can be set: on one line, and (when it has a space) split into two balanced lines. */
export function titleLineOptions(title) {
  const text = title.trim().toUpperCase() || ' ';
  const options = [[text]];
  let best = null;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== ' ') continue;
    const score = Math.abs(i - text.length / 2);
    if (!best || score < best.score) best = { i, score };
  }
  if (best) options.push([text.slice(0, best.i), text.slice(best.i + 1)]);
  return options;
}

function shapeOf(width, height) {
  const aspect = width / height;
  return aspect > 1.2 ? 'wide' : aspect < 0.9 ? 'tall' : 'square';
}

function setTitleFont(ctx, size) {
  ctx.font = `${size}px "${TITLE_FONT}"`;
  ctx.letterSpacing = `${size * 0.012}px`;
}

/** Picks the title's lines and font size so it letters as big as the shape's budget allows (two lines only when
 * that is clearly bigger), times the person's lettering-size setting. */
export function fitTitle(ctx, title, width, height, scale = 1) {
  const budget = TITLE_BUDGET[shapeOf(width, height)];
  setTitleFont(ctx, 100);
  const capRatio = ctx.measureText('H').actualBoundingBoxAscent / 100 || 0.74;
  let best = null;
  for (const lines of titleLineOptions(title)) {
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width)) / 100;
    const byWidth = (budget.width * width) / Math.max(widest, 0.01);
    const caps = lines.length === 1 ? budget.single : budget.block;
    const byHeight = (caps * height) / (capRatio * (1 + (lines.length - 1) * LINE_STEP));
    const size = Math.min(byWidth, byHeight);
    if (!best || size > best.size * 1.15) best = { lines, size };
  }
  return { lines: best.lines, size: best.size * scale, capRatio };
}

/** Where the caption block is centred: the layout's own spot, or a fixed top / centre / bottom band of the panel
 * area. */
export function captionPlacement(position, layoutCaption, width, height, area = { top: 0, bottom: height }) {
  const spot = { ...layoutCaption };
  if (position in CAPTION_SPOTS) {
    spot.x = 0.5;
    spot.y = (area.top + CAPTION_SPOTS[position] * (area.bottom - area.top)) / height;
  }
  return { cx: spot.x * width, cy: spot.y * height };
}

/** The title's fill: horizontal sunset bands (light top, hot pink, orange, deep) split by thin dark seams. */
function stripeGradient(ctx, top, base, palette) {
  const [s0, s1, s2, s3, s4] = palette.stripes;
  const seam = palette.titleShadow;
  const g = ctx.createLinearGradient(0, top, 0, base);
  const bands = [
    [0, 0.4, s0, s1],
    [0.4, 0.62, s2, mixHex(s2, s3, 0.35)],
    [0.62, 0.82, s3, mixHex(s3, s4, 0.3)],
    [0.82, 1, mixHex(s4, s3, 0.25), s4],
  ];
  const gap = 0.026;
  bands.forEach(([from, to, a, b], i) => {
    const start = i ? from + gap : from;
    if (i) {
      g.addColorStop(from, seam);
      g.addColorStop(start, seam);
    }
    g.addColorStop(start, a);
    g.addColorStop(to, b);
  });
  return g;
}

let fillLayer = null;

/** Fills the title lines with the stripes and lays the shine over the letters' upper third. The letters are drawn
 * on a layer of their own first, so the shine only lands on them. */
function fillTitleLines(ctx, lines, baselines, capH, size, palette) {
  const { width, height } = ctx.canvas;
  if (!fillLayer) fillLayer = document.createElement('canvas');
  if (fillLayer.width !== width || fillLayer.height !== height) {
    fillLayer.width = width;
    fillLayer.height = height;
  }
  const f = fillLayer.getContext('2d');
  f.setTransform(1, 0, 0, 1, 0, 0);
  f.clearRect(0, 0, width, height);
  f.setTransform(ctx.getTransform());
  f.font = ctx.font;
  f.letterSpacing = ctx.letterSpacing;
  f.textAlign = 'center';
  f.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    f.fillStyle = stripeGradient(f, baselines[i] - capH, baselines[i], palette);
    f.fillText(line, 0, baselines[i]);
  });
  f.globalCompositeOperation = 'source-atop';
  lines.forEach((line, i) => {
    const top = baselines[i] - capH;
    const shine = f.createLinearGradient(0, top - size * 0.04, 0, top + capH * 0.36);
    shine.addColorStop(0, 'rgba(255,255,255,0.95)');
    shine.addColorStop(0.9, 'rgba(255,255,255,0.32)');
    shine.addColorStop(0.9, 'rgba(255,255,255,0)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    f.fillStyle = shine;
    f.fillRect(-width * 4, top - size * 0.1, width * 8, capH * 0.36 + size * 0.1);
    // A glint line just under the shine's edge.
    f.fillStyle = 'rgba(255,255,255,0.35)';
    f.fillRect(-width * 4, top + capH * 0.39, width * 8, Math.max(1, capH * 0.012));
  });
  f.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(fillLayer, 0, 0);
  ctx.restore();
}

/** Draws the title lines: glow, extruded hard shadow, thick ink outline, a bright rim, then the striped fill. */
function drawTitleLines(ctx, lines, baselines, capH, size, palette, fx) {
  const k = deviceScale(ctx);
  const outline = size * 0.1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  if (fx.glow > 0) {
    ctx.save();
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = size * 0.45 * fx.glow * k;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = outline;
    lines.forEach((line, i) => ctx.strokeText(line, 0, baselines[i]));
    ctx.restore();
  }
  // Extrusion: the letters stepped down and to the right into a solid block, its far edge in ink.
  const depth = size * 0.075;
  const steps = Math.max(2, Math.min(36, Math.ceil((depth * k) / 1.4)));
  const dir = { x: 0.5, y: 1 };
  lines.forEach((line, i) => {
    ctx.strokeStyle = palette.ink;
    ctx.fillStyle = palette.ink;
    ctx.lineWidth = outline * 1.1;
    ctx.strokeText(line, dir.x * depth, baselines[i] + dir.y * depth);
    ctx.strokeStyle = palette.titleShadow;
    ctx.fillStyle = palette.titleShadow;
    ctx.lineWidth = outline * 0.8;
    for (let s = steps - 1; s >= 1; s--) {
      const d = (depth * s) / steps;
      ctx.strokeText(line, dir.x * d, baselines[i] + dir.y * d);
    }
  });
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = outline;
  lines.forEach((line, i) => ctx.strokeText(line, 0, baselines[i]));
  ctx.strokeStyle = palette.rim ?? palette.frame ?? palette.sub;
  ctx.lineWidth = size * 0.034;
  lines.forEach((line, i) => ctx.strokeText(line, 0, baselines[i]));
  fillTitleLines(ctx, lines, baselines, capH, size, palette);
  if (fx.glow > 0) drawTitleFlare(ctx, lines, baselines, capH, palette, fx.glow);
}

/** A four-point chrome glint: two thin crossed spikes and a soft halo, added as light. */
function drawGlint(ctx, x, y, r, color) {
  const k = deviceScale(ctx);
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 0.55);
  halo.addColorStop(0, 'rgba(255,255,255,0.95)');
  halo.addColorStop(0.25, withAlpha(color, 0.6));
  halo.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 0.25 * k;
  ctx.fillStyle = '#ffffff';
  for (const [w, h] of [[r, r * 0.05], [r * 0.05, r * 0.7]]) {
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Light catching the chrome: an anamorphic flare streaking along the shine's edge of the first line, and glints on
 * the title's top corners. */
function drawTitleFlare(ctx, lines, baselines, capH, palette, glow) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const widths = lines.map((l) => ctx.measureText(l).width);
  const y = baselines[0] - capH * 0.64;
  const half = widths[0] * 0.75;
  const streak = ctx.createLinearGradient(-half, 0, half, 0);
  streak.addColorStop(0, withAlpha(palette.glow, 0));
  streak.addColorStop(0.5, `rgba(255,255,255,${0.75 * glow})`);
  streak.addColorStop(1, withAlpha(palette.glow, 0));
  ctx.fillStyle = streak;
  ctx.fillRect(-half, y - capH * 0.008, half * 2, capH * 0.016);
  const bloomStreak = ctx.createLinearGradient(-half, 0, half, 0);
  bloomStreak.addColorStop(0, withAlpha(palette.glow, 0));
  bloomStreak.addColorStop(0.5, withAlpha(palette.glow, 0.3 * glow));
  bloomStreak.addColorStop(1, withAlpha(palette.glow, 0));
  ctx.fillStyle = bloomStreak;
  ctx.fillRect(-half, y - capH * 0.05, half * 2, capH * 0.1);
  const top = baselines[0] - capH;
  drawGlint(ctx, -widths[0] / 2 + capH * 0.12, top + capH * 0.06, capH * 0.42 * glow, palette.glow);
  const last = lines.length - 1;
  drawGlint(ctx, widths[last] / 2 - capH * 0.18, baselines[last] - capH * 0.9, capH * 0.32 * glow, palette.frame ?? palette.glow);
  drawGlint(ctx, widths[0] * 0.08, y, capH * 0.26 * glow, '#ffffff');
  ctx.restore();
}

/** Darkens the art right behind the caption with a soft ink pool, so the lettering stands off the busy panels. */
export function drawCaptionShade(ctx, plan, palette, amount = 0.6) {
  if (amount <= 0) return;
  ctx.save();
  ctx.translate(plan.x, plan.y + plan.capH * 0.1);
  ctx.rotate(plan.angle);
  ctx.scale(1, (plan.blockH * 0.78) / (plan.blockW * 0.6));
  const r = plan.blockW * 0.6;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, withAlpha(palette.ink, amount));
  g.addColorStop(0.55, withAlpha(palette.ink, amount * 0.6));
  g.addColorStop(1, withAlpha(palette.ink, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

/** The optional slab: a skewed parallelogram in the slab colour with a hard ink shadow, speed stripes and an ink
 * outline, behind the title. */
function drawSlab(ctx, slabW, slabH, size, palette) {
  const skew = slabH * 0.2;
  const slab = () => {
    ctx.beginPath();
    ctx.moveTo(-slabW / 2 + skew, -slabH / 2);
    ctx.lineTo(slabW / 2 + skew, -slabH / 2);
    ctx.lineTo(slabW / 2 - skew, slabH / 2);
    ctx.lineTo(-slabW / 2 - skew, slabH / 2);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(size * 0.07, size * 0.08);
  slab();
  ctx.fillStyle = palette.ink;
  ctx.fill();
  ctx.restore();
  slab();
  const sg = ctx.createLinearGradient(0, -slabH / 2, 0, slabH / 2);
  sg.addColorStop(0, palette.slab);
  sg.addColorStop(1, palette.slabShade);
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = withAlpha('#ffffff', 0.12);
  const band = slabH * 0.06;
  for (let i = 0; i < 4; i++) ctx.fillRect(-slabW / 2 - skew, slabH / 2 - band * (1.2 + i * 1.6), slabW + skew * 2, band * 0.5);
  ctx.restore();
  slab();
  ctx.lineWidth = size * 0.05;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = palette.ink;
  ctx.stroke();
}

/** The tag: small spaced capitals in an ink box above the title's left edge. */
function drawTag(ctx, text, x, bottom, tagSize, palette) {
  ctx.font = `${tagSize}px "${TITLE_FONT}"`;
  ctx.letterSpacing = `${tagSize * 0.28}px`;
  const tw = ctx.measureText(text).width;
  const boxH = tagSize * 1.5;
  const by = bottom - boxH;
  ctx.fillStyle = palette.ink;
  ctx.fillRect(x, by, tw + tagSize * 0.9, boxH);
  ctx.fillStyle = palette.slab;
  ctx.fillRect(x, by + boxH - tagSize * 0.16, tw + tagSize * 0.9, tagSize * 0.16);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x + tagSize * 0.45, by + tagSize * 1.15);
  ctx.letterSpacing = '0px';
}

/** The sub-line: a script slashed up across the title's lower right corner from (x, y), lit like a neon tube. */
function drawSubLine(ctx, text, x, y, subSize, palette, fx) {
  const k = deviceScale(ctx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(SUB_TILT);
  ctx.font = `${subSize}px "${SCRIPT_FONT}"`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = subSize * 0.13;
  ctx.strokeText(text, subSize * 0.04, subSize * 0.07);
  ctx.lineWidth = subSize * 0.09;
  ctx.strokeText(text, 0, 0);
  const glow = Math.max(0.35, fx.glow);
  ctx.save();
  ctx.shadowColor = palette.sub;
  ctx.shadowBlur = subSize * 0.55 * glow * k;
  ctx.fillStyle = palette.sub;
  ctx.fillText(text, 0, 0);
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = subSize * 0.22 * glow * k;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  const core = ctx.createLinearGradient(0, -subSize * 0.5, 0, subSize * 0.1);
  core.addColorStop(0, mixHex(palette.sub, '#ffffff', 0.7));
  core.addColorStop(1, palette.sub);
  ctx.fillStyle = core;
  ctx.fillText(text, 0, 0);
  ctx.strokeStyle = withAlpha('#ffffff', 0.75);
  ctx.lineWidth = Math.max(1, subSize * 0.012);
  ctx.strokeText(text, 0, 0);
  ctx.restore();
}

/**
 * Measures and places the whole caption on a poster of width x height without drawing it, so other parts of the
 * poster can keep clear of it. `opts.area` is the panel area (the caption stays inside it). `opts.under` is a bar to
 * set under the title (the tagline): its `measure(blockW, unit)` gives { w, h } or null, and its `draw(bar, x, top)`
 * draws it in the title's own turned coordinates. The plan's `box` is the caption's turned bounding box.
 */
export function planCaption(ctx, caption, layoutCaption, width, height, opts = {}) {
  const area = opts.area ?? { top: 0, bottom: height };
  const unit = Math.min(width, height);
  const { lines, size, capRatio } = fitTitle(ctx, caption.title, width, height, caption.scale ?? 1);
  const capH = size * capRatio;
  const lineStep = capH * LINE_STEP;
  const blockH = capH + lineStep * (lines.length - 1);
  setTitleFont(ctx, size);
  const blockW = Math.max(...lines.map((l) => ctx.measureText(l).width));

  const tag = caption.tag?.trim().toUpperCase() ?? '';
  const tagSize = Math.max(12, Math.min(size * 0.13, unit * 0.036));
  const sub = caption.sub?.trim() ?? '';
  let subSize = Math.min(capH * (lines.length > 1 ? 0.55 : 0.68), unit * 0.22);
  let subW = 0;
  if (sub) {
    ctx.font = `${subSize}px "${SCRIPT_FONT}"`;
    subW = ctx.measureText(sub).width;
    const subMax = Math.max(blockW * 0.58, unit * 0.45);
    if (subW > subMax) {
      subSize *= subMax / subW;
      subW = subMax;
    }
  }

  // Under the title: the bar from `opts.under` (the tagline) on the left with the script sub-line rising from the
  // right into the title's lower corner; when both do not fit side by side, the sub-line first and the bar below it.
  const under = blockH / 2 + size * 0.1;
  const gap = unit * 0.012;
  const bar = opts.under?.measure(blockW, unit) ?? null;
  // Side by side when the sub-line fits beside the bar at no less than 75% of its size.
  const besideRoom = blockW + size * 0.06 - (bar ? bar.w + bar.h * 0.3 : 0) - unit * 0.03;
  if (sub && bar && subW > besideRoom && subW * 0.75 <= besideRoom) {
    const k = besideRoom / subW;
    subSize *= k;
    subW *= k;
  }
  const sideBySide = !sub || !bar || subW <= besideRoom + 0.5;
  const subBase = under + subSize * (sideBySide ? 0.3 : 0.46);
  const subX = Math.max(-blockW / 2, blockW / 2 - subW + size * 0.08);
  const barTop = sideBySide || !sub ? under + gap : subBase + subSize * 0.3 + gap;
  const barX = sideBySide ? -blockW / 2 + size * 0.02 : -bar.w / 2;
  const bottom = Math.max(under, sub ? subBase + subSize * 0.3 : 0, bar ? barTop + bar.h : 0);

  // Keep the whole block (tag above; sub-line and the bar below) inside the panel area with a margin.
  const margin = unit * 0.03;
  const halfW = Math.max(blockW / 2, subX + subW) + size * 0.1;
  const above = blockH / 2 + size * 0.06 + (tag ? tagSize * 1.9 : 0);
  const below = bottom;
  const { cx, cy } = captionPlacement(caption.position, layoutCaption, width, height, area);
  const x = Math.min(width - margin - halfW, Math.max(margin + halfW, cx));
  const minY = area.top + margin + above;
  const maxY = area.bottom - margin - below;
  const y = minY <= maxY ? Math.min(maxY, Math.max(minY, cy)) : (minY + maxY) / 2;
  // The parts the caption covers, as rectangles [left, top, right, bottom] in its own turned coordinates.
  const rects = [[-blockW / 2 - size * 0.06, -blockH / 2 - size * 0.06, blockW / 2 + size * 0.12, under]];
  if (tag) rects.push([-blockW / 2, -above, -blockW / 2 + tagSize * (tag.length * 0.75 + 2), -blockH / 2]);
  if (bar) rects.push([barX - bar.h * 0.3, barTop, barX + bar.w + bar.h * 0.3, barTop + bar.h]);
  if (sub) rects.push([subX, subBase - subSize * 0.7 - subW * Math.sin(-SUB_TILT), subX + subW, subBase + subSize * 0.3]);
  return {
    caption, opts, unit, lines, size, capH, lineStep, blockW, blockH, tag, tagSize, sub, subSize, subX, subBase, bar, barX, barTop,
    x, y, angle: TITLE_TILT,
    box: { x, y, angle: TITLE_TILT, rects },
  };
}

/** True when poster point (px, py) falls inside any part of a planned caption's box, grown by `pad`. */
export function captionCovers(box, px, py, pad = 0) {
  const dx = px - box.x;
  const dy = py - box.y;
  const c = Math.cos(-box.angle);
  const s = Math.sin(-box.angle);
  const lx = dx * c - dy * s;
  const ly = dx * s + dy * c;
  return box.rects.some(([l, t, r, b]) => lx > l - pad && lx < r + pad && ly > t - pad && ly < b + pad);
}

/** Draws a planned caption: the optional slab, the title, the tag, the bar under it and the neon sub-line. Returns
 * where the title went. */
export function drawCaption(ctx, plan, palette, fx) {
  const { caption, lines, size, capH, lineStep, blockW, blockH, tag, tagSize, sub, subSize, subX, subBase, bar } = plan;
  ctx.save();
  ctx.translate(plan.x, plan.y);
  ctx.rotate(plan.angle);
  if (caption.slab) drawSlab(ctx, blockW + size * 0.6, blockH + capH * 0.4, size, palette);
  setTitleFont(ctx, size);
  const baselines = lines.map((_, i) => -blockH / 2 + capH + i * lineStep);
  drawTitleLines(ctx, lines, baselines, capH, size, palette, fx);
  ctx.letterSpacing = '0px';
  if (tag) drawTag(ctx, tag, -blockW / 2 + size * 0.04, -blockH / 2 - size * 0.06 - tagSize * 0.3, tagSize, palette);
  if (bar) plan.opts.under.draw(bar, plan.barX, plan.barTop);
  if (sub) drawSubLine(ctx, sub, subX, subBase, subSize, palette, fx);
  ctx.restore();
  return { x: plan.x, y: plan.y, angle: plan.angle, blockW, blockH, size, capH, unit: plan.unit };
}
