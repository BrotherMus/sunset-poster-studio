// The caption: a big condensed title (Anton, OFL) in capitals, broken over one or two lines and sized to fit, with
// a smaller brush-script sub-line (Pacifico, OFL) slanted across its lower corner. Four lettering styles share the
// layers: a coloured slab, a stepped 3D extrusion, a thick outline, a gradient or striped fill, and neon glow.
import { hexWithAlpha } from './color-grades.js';
import { scratchCanvas } from './poster-effects.js';

export const TITLE_FONT = 'Poster Display';
export const SCRIPT_FONT = 'Poster Script';

export const CAPTION_STYLES = [
  { id: 'slab', name: 'Slab' },
  { id: 'sunset-stripes', name: 'Sunset Stripes' },
  { id: 'neon', name: 'Neon' },
  { id: 'clean', name: 'Clean' },
];

/** Splits a title into two balanced lines at a space (one line when it is a single word or very short). */
export function breakTitleLines(text) {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.join(' ').length < 6) return [words.join(' ')];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const score = Math.abs(a.length - b.length);
    if (!best || score < best.score) best = { score, lines: [a, b] };
  }
  return best.lines;
}

/** Sets the title font on the context at `size` pixels. */
function setTitleFont(ctx, size) {
  ctx.font = `${size}px "${TITLE_FONT}", Impact, "Arial Narrow", sans-serif`;
  ctx.letterSpacing = `${(size * 0.02).toFixed(1)}px`;
}

/** Sets the script font on the context at `size` pixels. */
function setScriptFont(ctx, size) {
  ctx.font = `${size}px "${SCRIPT_FONT}", "Brush Script MT", cursive`;
  ctx.letterSpacing = '0px';
}

/**
 * Draws the caption centred on anchor {x, y, maxWidth, maxHeight}. `caption` is {title, sub, style, scale};
 * `grade` gives the colours; `posterShort` is the poster's short side, which sets the lettering's weight.
 */
export function drawCaption(ctx, caption, anchor, grade, posterShort) {
  const lines = breakTitleLines(caption.title ?? '');
  const sub = (caption.sub ?? '').trim();
  if (!lines[0] && !sub) return;
  const scale = caption.scale ?? 1;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Size the title: the larger of one line or two, each as big as the height and width budgets allow.
  const hasSub = sub.length > 0;
  const maxWidth = anchor.maxWidth * Math.min(1, scale);
  const fit = fitTitle(ctx, [lines, [lines.join(' ')]], maxWidth, anchor.maxHeight, Math.min(posterShort * 0.28 * scale, anchor.maxHeight), hasSub);
  lines.splice(0, lines.length, ...fit.lines);
  const size = fit.size;
  setTitleFont(ctx, size);
  const capHeight = size * fit.capRatio;
  const lineGap = capHeight * 0.16;
  const titleHeight = lines[0] ? lines.length * capHeight + (lines.length - 1) * lineGap : 0;
  const subSize = Math.max(posterShort * 0.03, Math.min(size * 0.5, posterShort * 0.11 * scale));
  const blockHeight = titleHeight + (hasSub ? subSize * 1.05 : 0);
  // Keep the whole block (with room for outlines and the extrusion) inside the poster.
  const margin = posterShort * 0.05;
  const posterHeight = ctx.canvas.height;
  const top = Math.max(margin, Math.min(posterHeight - margin - blockHeight, anchor.y - blockHeight / 2));
  const baselines = lines.map((_, i) => top + capHeight + i * (capHeight + lineGap));
  const widths = lines.map((line) => ctx.measureText(line).width);

  const look = { size, capHeight, grade, lines, baselines, widths, x: anchor.x, posterShort };
  if (lines[0]) {
    if (caption.style === 'slab') drawSlabTitle(ctx, look);
    else if (caption.style === 'neon') drawNeonTitle(ctx, look);
    else if (caption.style === 'clean') drawCleanTitle(ctx, look);
    else drawStripedTitle(ctx, look);
  }
  if (hasSub) {
    const blockWidth = lines[0] ? Math.max(...widths) : 0;
    const subY = lines[0] ? top + titleHeight + subSize * 0.55 : anchor.y + subSize * 0.3;
    drawSubLine(ctx, sub, anchor.x + blockWidth * 0.12, subY, subSize, grade, caption.style);
  }
  ctx.restore();
}

/**
 * Picks the line arrangement that lets the title be largest within maxWidth x maxHeight (leaving room for a
 * sub-line), never above `cap`. Returns {lines, size, capRatio}: capRatio is the font's capital height per pixel.
 */
function fitTitle(ctx, options, maxWidth, maxHeight, cap, hasSub) {
  setTitleFont(ctx, 100);
  const capRatio = (ctx.measureText('HMW').actualBoundingBoxAscent || 80) / 100;
  let best = null;
  for (const lines of options) {
    if (!lines[0]) return { lines, size: cap, capRatio };
    const n = lines.length;
    // Height of the block per pixel of font size: the capitals, the gaps, the sub-line and the outline's spill.
    const perPixel = capRatio * (1.16 * n - 0.16) + (hasSub ? 0.53 : 0) + 0.12;
    let size = Math.min(cap, maxHeight / perPixel);
    setTitleFont(ctx, size);
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width)) + size * 0.12;
    if (widest > maxWidth) size *= maxWidth / widest;
    // Stacked lines look more like a poster, so one line has to be clearly larger to win.
    if (!best || size > best.size * 1.25) best = { lines, size, capRatio };
  }
  return best;
}

/** The fill gradient running down one line of capitals. */
function titleGradient(ctx, colors, baseline, capHeight) {
  const fill = ctx.createLinearGradient(0, baseline - capHeight, 0, baseline);
  colors.forEach((color, i) => fill.addColorStop(i / (colors.length - 1), color));
  return fill;
}

/** Slab style: a leaning colour block behind each line, a hard offset shadow, a thick outline and a cream fill. */
function drawSlabTitle(ctx, { size, capHeight, grade, lines, baselines, widths, x }) {
  const pad = capHeight * 0.22;
  const lean = capHeight * 0.18;
  lines.forEach((line, i) => {
    const w = widths[i] + pad * 2.4;
    const top = baselines[i] - capHeight - pad * 0.75;
    const h = capHeight + pad * 1.5;
    const left = x - w / 2;
    const slab = [[left + lean, top], [left + w + lean, top], [left + w - lean, top + h], [left - lean, top + h]];
    ctx.save();
    ctx.translate(capHeight * 0.07, capHeight * 0.07);
    ctx.fillStyle = grade.outline;
    fillPoints(ctx, slab);
    ctx.restore();
    ctx.fillStyle = grade.slab;
    fillPoints(ctx, slab);
  });
  const offset = size * 0.045;
  outlineAndFill(ctx, { lines, baselines, x, size, outline: grade.outline, shadow: grade.shadow, offset, fill: (i) => titleGradient(ctx, grade.titleFill, baselines[i], capHeight) });
}

/** Sunset Stripes style: a stepped 3D extrusion, a thick outline, and a sun-gradient fill cut by dark stripes. */
function drawStripedTitle(ctx, { size, capHeight, grade, lines, baselines, x, posterShort }) {
  const steps = 10;
  const depth = size * 0.085;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  for (let s = steps; s >= 1; s--) {
    const d = (depth * s) / steps;
    ctx.fillStyle = s === steps ? grade.outline : grade.shadow;
    ctx.strokeStyle = s === steps ? grade.outline : grade.shadow;
    ctx.lineWidth = size * 0.1;
    lines.forEach((line, i) => {
      ctx.strokeText(line, x + d, baselines[i] + d);
      ctx.fillText(line, x + d, baselines[i] + d);
    });
  }
  ctx.strokeStyle = grade.outline;
  ctx.lineWidth = size * 0.1;
  ctx.fillStyle = grade.outline;
  lines.forEach((line, i) => {
    ctx.strokeText(line, x, baselines[i]);
    ctx.fillText(line, x, baselines[i]);
  });

  // The fill goes onto a scratch canvas first so the stripes can be cut out of it.
  const canvas = ctx.canvas;
  const scratch = scratchCanvas(canvas.width, canvas.height, 'caption');
  const sctx = scratch.getContext('2d');
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  sctx.setTransform(ctx.getTransform());
  sctx.textAlign = 'center';
  sctx.textBaseline = 'alphabetic';
  sctx.font = ctx.font;
  sctx.letterSpacing = ctx.letterSpacing;
  const sunColors = [grade.titleFill[0], grade.sun[0], grade.sun[1], grade.sun[2]];
  lines.forEach((line, i) => {
    sctx.fillStyle = titleGradient(sctx, sunColors, baselines[i], capHeight);
    sctx.fillText(line, x, baselines[i]);
    sctx.globalCompositeOperation = 'destination-out';
    let y = baselines[i] - capHeight * 0.42;
    for (let k = 0; k < 4; k++) {
      const thickness = Math.max(1, capHeight * (0.03 + k * 0.018));
      sctx.fillRect(x - posterShort * 2, y, posterShort * 4, thickness);
      y += thickness + capHeight * (0.1 - k * 0.012);
    }
    sctx.globalCompositeOperation = 'source-over';
  });
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(scratch, 0, 0);
  ctx.restore();
}

/** Neon style: a dark halo so it reads over any photo, dark letters, a glowing coloured tube and a white core. */
function drawNeonTitle(ctx, { size, grade, lines, baselines, x }) {
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.shadowColor = hexWithAlpha(grade.outline, 0.9);
  ctx.shadowBlur = size * 0.45;
  ctx.strokeStyle = hexWithAlpha(grade.outline, 0.75);
  ctx.lineWidth = size * 0.22;
  lines.forEach((line, i) => ctx.strokeText(line, x, baselines[i]));
  ctx.shadowBlur = 0;
  ctx.fillStyle = hexWithAlpha(grade.outline, 0.85);
  lines.forEach((line, i) => ctx.fillText(line, x, baselines[i]));
  ctx.restore();
  for (const [blur, width, color] of [[size * 0.5, size * 0.07, grade.slab], [size * 0.2, size * 0.055, grade.slab], [size * 0.05, size * 0.018, '#ffffff']]) {
    ctx.save();
    ctx.shadowColor = grade.slab;
    ctx.shadowBlur = blur;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    lines.forEach((line, i) => ctx.strokeText(line, x, baselines[i]));
    ctx.restore();
  }
}

/** Clean style: white capitals, a thick outline and a soft long drop shadow. */
function drawCleanTitle(ctx, { size, capHeight, grade, lines, baselines, x }) {
  ctx.save();
  ctx.shadowColor = hexWithAlpha(grade.outline, 0.85);
  ctx.shadowBlur = size * 0.25;
  ctx.shadowOffsetY = size * 0.06;
  ctx.fillStyle = grade.outline;
  lines.forEach((line, i) => ctx.fillText(line, x, baselines[i]));
  ctx.restore();
  outlineAndFill(ctx, { lines, baselines, x, size, outline: grade.outline, shadow: null, offset: 0, fill: (i) => titleGradient(ctx, ['#ffffff', '#ffffff', grade.titleFill[1]], baselines[i], capHeight) });
}

/** The shared outline-then-fill pass, with an optional hard offset shadow behind. */
function outlineAndFill(ctx, { lines, baselines, x, size, outline, shadow, offset, fill }) {
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.strokeStyle = shadow;
    ctx.lineWidth = size * 0.1;
    lines.forEach((line, i) => {
      ctx.strokeText(line, x + offset, baselines[i] + offset);
      ctx.fillText(line, x + offset, baselines[i] + offset);
    });
  }
  ctx.strokeStyle = outline;
  ctx.lineWidth = size * 0.1;
  lines.forEach((line, i) => ctx.strokeText(line, x, baselines[i]));
  lines.forEach((line, i) => {
    ctx.fillStyle = fill(i);
    ctx.fillText(line, x, baselines[i]);
  });
}

/** The script sub-line: tilted up a few degrees, outlined, glowing in the grade's sub-line colour. */
function drawSubLine(ctx, text, x, y, size, grade, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((-7 * Math.PI) / 180);
  setScriptFont(ctx, size);
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = grade.outline;
  ctx.lineWidth = size * 0.16;
  ctx.shadowColor = grade.outline;
  ctx.shadowOffsetX = size * 0.06;
  ctx.shadowOffsetY = size * 0.06;
  ctx.strokeText(text, 0, 0);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowColor = grade.subGlow;
  ctx.shadowBlur = size * (style === 'neon' ? 0.7 : 0.4);
  ctx.fillStyle = grade.sub;
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = size * 0.15;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Fills a list of points as one closed shape. */
function fillPoints(ctx, points) {
  ctx.beginPath();
  points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.closePath();
  ctx.fill();
}
