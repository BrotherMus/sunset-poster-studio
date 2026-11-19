// Caption lettering: a big condensed title on a skewed coloured slab, with a thick outline, a hard drop shadow and a
// neon glow, a script sub-line slashed across its corner, and a small spaced-out tag above it.
import { withAlpha } from './grades.js';

export const TITLE_FONT = 'Anton';
export const SCRIPT_FONT = 'Mr Dafoe';

const CAPTION_SPOTS = { top: 0.18, center: 0.5, bottom: 0.82 };

/** Waits for the two lettering fonts (declared in style.css from app/fonts/) so the canvas never draws a fallback. */
export async function loadLetteringFonts() {
  await Promise.all([document.fonts.load(`80px "${TITLE_FONT}"`), document.fonts.load(`80px "${SCRIPT_FONT}"`)]);
}

/** Splits a title into one or two balanced lines. */
export function splitTitleLines(title) {
  const text = title.trim().toUpperCase() || ' ';
  if (text.length <= 11 || !text.includes(' ')) return [text];
  let best = null;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== ' ') continue;
    const score = Math.abs(i - text.length / 2);
    if (!best || score < best.score) best = { i, score };
  }
  return [text.slice(0, best.i), text.slice(best.i + 1)];
}

/** Where the caption block sits: the layout's own spot, or a fixed top / centre / bottom band. */
export function captionPlacement(position, layoutCaption, width, height) {
  const spot = { ...layoutCaption };
  if (position in CAPTION_SPOTS) {
    spot.x = 0.5;
    spot.y = CAPTION_SPOTS[position];
    spot.w = Math.max(spot.w, width > height ? 0.56 : 0.84);
  }
  return { cx: spot.x * width, cy: spot.y * height, maxWidth: spot.w * width };
}

/** Draws the whole caption (slab, title, sub-line, tag) onto a poster of width x height. */
export function drawCaption(ctx, caption, layoutCaption, width, height, palette, fx) {
  const lines = splitTitleLines(caption.title);
  const unit = Math.min(width, height);
  const { cx, cy, maxWidth } = captionPlacement(caption.position, layoutCaption, width, height);

  // Size the title so its widest line fits the spot, capped by a height budget.
  let size = unit * (lines.length > 1 ? 0.17 : 0.215) * (caption.scale ?? 1);
  ctx.font = `${size}px "${TITLE_FONT}"`;
  ctx.letterSpacing = `${size * 0.01}px`;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  if (widest > maxWidth * 0.86) size *= (maxWidth * 0.86) / widest;
  ctx.font = `${size}px "${TITLE_FONT}"`;
  ctx.letterSpacing = `${size * 0.01}px`;
  const lineWidths = lines.map((l) => ctx.measureText(l).width);
  const lineHeight = size * 1.02;
  const blockW = Math.max(...lineWidths);
  const blockH = lineHeight * lines.length;

  // Keep the whole block (tag above, script sub-line hanging below) inside the poster with a margin.
  const margin = unit * 0.045;
  const halfW = (blockW + size * 0.68) / 2 + size * 0.12;
  const above = blockH / 2 + size * 0.16 + (caption.tag?.trim() ? size * 0.28 : 0);
  const below = blockH / 2 + size * 0.16 + (caption.sub?.trim() ? size * 0.5 : 0);
  const x = Math.min(width - margin - halfW, Math.max(margin + halfW, cx));
  const y = Math.min(height - margin - below, Math.max(margin + above, cy));

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((-3 * Math.PI) / 180);

  // The slab: a skewed parallelogram with a hard ink shadow and a thick outline.
  const padX = size * 0.34;
  const padY = size * 0.16;
  const slabW = blockW + padX * 2;
  const slabH = blockH + padY * 2;
  const skew = slabH * 0.2;
  const slab = () => {
    ctx.beginPath();
    ctx.moveTo(-slabW / 2 + skew, -slabH / 2);
    ctx.lineTo(slabW / 2 + skew, -slabH / 2);
    ctx.lineTo(slabW / 2 - skew, slabH / 2);
    ctx.lineTo(-slabW / 2 - skew, slabH / 2);
    ctx.closePath();
  };
  if (caption.slab !== false) {
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
    // Speed stripes across the slab.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = withAlpha('#ffffff', 0.12);
    for (let i = 0; i < 4; i++) ctx.fillRect(-slabW / 2 - skew, slabH / 2 - padY * (0.5 + i * 0.55), slabW + skew * 2, padY * 0.18);
    ctx.restore();
    slab();
    ctx.lineWidth = size * 0.05;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = palette.ink;
    ctx.stroke();
  }

  // Title lines: hard shadow, glow, outline, gradient fill.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const firstBaseline = -blockH / 2 + size * 0.93;
  lines.forEach((line, i) => {
    const y = firstBaseline + i * lineHeight;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = palette.titleShadow;
    ctx.fillStyle = palette.titleShadow;
    ctx.lineWidth = size * 0.11;
    ctx.strokeText(line, size * 0.06, y + size * 0.07);
    ctx.fillText(line, size * 0.06, y + size * 0.07);
    ctx.save();
    if (fx.glow > 0) {
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = size * 0.35 * fx.glow;
    }
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = size * 0.1;
    ctx.strokeText(line, 0, y);
    ctx.restore();
    // A coloured rim between the ink outline and the fill makes the letters pop off the slab.
    ctx.strokeStyle = palette.sub;
    ctx.lineWidth = size * 0.035;
    ctx.strokeText(line, 0, y);
    const tg = ctx.createLinearGradient(0, y - size * 0.8, 0, y);
    tg.addColorStop(0, palette.title[0]);
    tg.addColorStop(1, palette.title[1]);
    ctx.fillStyle = tg;
    ctx.fillText(line, 0, y);
  });
  ctx.letterSpacing = '0px';

  // The tag: small spaced capitals in an ink box above the slab's left edge.
  if (caption.tag?.trim()) {
    const tagSize = Math.max(12, size * 0.16);
    ctx.font = `${tagSize}px "${TITLE_FONT}"`;
    ctx.letterSpacing = `${tagSize * 0.28}px`;
    const text = caption.tag.trim().toUpperCase();
    const tw = ctx.measureText(text).width;
    const bx = -slabW / 2 + skew + size * 0.1;
    const by = -slabH / 2 - tagSize * 1.25;
    ctx.fillStyle = palette.ink;
    ctx.fillRect(bx, by, tw + tagSize * 0.9, tagSize * 1.45);
    ctx.fillStyle = palette.slab;
    ctx.fillRect(bx, by + tagSize * 1.45 - tagSize * 0.14, tw + tagSize * 0.9, tagSize * 0.14);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(text, bx + tagSize * 0.45, by + tagSize * 1.12);
    ctx.letterSpacing = '0px';
  }

  // The sub-line: a script slash across the slab's lower right corner, glowing.
  if (caption.sub?.trim()) {
    let subSize = size * 0.62;
    ctx.font = `${subSize}px "${SCRIPT_FONT}"`;
    const text = caption.sub.trim();
    const sw = ctx.measureText(text).width;
    const subMax = Math.max(slabW * 0.95, maxWidth * 0.7);
    if (sw > subMax) {
      subSize *= subMax / sw;
      ctx.font = `${subSize}px "${SCRIPT_FONT}"`;
    }
    ctx.save();
    ctx.translate(slabW * 0.16, slabH / 2 + subSize * 0.12);
    ctx.rotate((-7 * Math.PI) / 180);
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = subSize * 0.13;
    ctx.strokeText(text, subSize * 0.04, subSize * 0.06);
    ctx.save();
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = subSize * 0.5 * Math.max(0.3, fx.glow);
    ctx.fillStyle = palette.sub;
    ctx.fillText(text, 0, 0);
    ctx.restore();
    ctx.fillStyle = palette.sub;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
