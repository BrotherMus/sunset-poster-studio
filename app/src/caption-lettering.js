// The caption: a big condensed title (Anton, SIL OFL) in capitals with a 3D extruded shadow, a thick ink outline and
// a gradient fill, laid over a tilted coloured slab; and a script sub-line (Mr Dafoe, SIL OFL) in neon with a glow,
// slung across the title's lower corner. Both fonts are files under app/fonts/.

export const TITLE_FONT = '"Poster Anton", Impact, "Arial Narrow", sans-serif';
export const SCRIPT_FONT = '"Poster Script", "Brush Script MT", cursive';

/** Where the caption goes when the person picks a spot instead of the layout's own. */
const CAPTION_SPOTS = {
  top: { x: 0.5, y: 0.17, maxW: 0.86 },
  middle: { x: 0.5, y: 0.5, maxW: 0.86 },
  bottom: { x: 0.5, y: 0.8, maxW: 0.86 },
};

/** Splits words into one or two lines, whichever keeps the widest line narrowest. */
export function balanceTitleLines(ctx, words) {
  if (words.length < 2) return [words.join(' ')];
  let best = [words.join(' ')];
  let bestWidth = ctx.measureText(best[0]).width;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const width = Math.max(...lines.map((l) => ctx.measureText(l).width));
    // Two lines must earn their place: only when one line would be much wider.
    if (width < bestWidth * 0.8) {
      best = lines;
      bestWidth = width;
    }
  }
  return best;
}

/** Fits the title into lines and a font size no wider than maxWidth. */
export function fitTitle(ctx, text, startSize, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  let size = startSize;
  ctx.font = `${size}px ${TITLE_FONT}`;
  const lines = balanceTitleLines(ctx, words);
  let widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  if (widest > maxWidth) {
    size = Math.max(12, Math.floor((size * maxWidth) / widest));
    ctx.font = `${size}px ${TITLE_FONT}`;
    widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  }
  return { lines, size, widest };
}

/**
 * Draws the caption for one poster. `spot` is the layout's caption spot; poster.captionPos ('auto', 'top',
 * 'middle', 'bottom') can move it and poster.titleScale (about 0.6..1.4) sizes it.
 */
export function drawCaption(ctx, w, h, spot, poster, grade) {
  const title = (poster.title ?? '').trim().toUpperCase();
  const sub = (poster.subline ?? '').trim();
  if (!title && !sub) return;
  const place = { ...spot, ...(CAPTION_SPOTS[poster.captionPos] ?? {}) };
  const short = Math.min(w, h);
  // Layout spots give a base size; posters want the title loud, so it starts 30% above that and shrinks to fit.
  const startSize = (spot.size ?? 0.15) * 1.3 * short * (poster.titleScale ?? 1);
  const maxWidth = place.maxW * w;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';

  const margin = short * 0.045;
  const fit = title ? fitTitle(ctx, title, startSize, maxWidth) : { lines: [], size: startSize, widest: 0 };
  // The outline, extrusion and slab reach about 0.42 em past the letters on each side: shrink until that fits too.
  const overall = fit.widest + fit.size * 0.84;
  if (fit.widest && overall > w - 2 * margin) {
    const k = (w - 2 * margin) / overall;
    fit.size *= k;
    fit.widest *= k;
  }
  const size = fit.size;
  const lineGap = size * 0.98;
  const capHeight = size * 0.86;
  const blockH = fit.lines.length ? capHeight + lineGap * (fit.lines.length - 1) : 0;

  // The sub-line's size and width, so the whole caption (title and sub-line) can be kept on the poster.
  let subSize = 0, subW = 0;
  if (sub) {
    subSize = size * (fit.lines.length ? 0.6 : 1);
    ctx.font = `${subSize}px ${SCRIPT_FONT}`;
    subW = ctx.measureText(sub).width;
    const room = w - 2 * margin;
    if (subW > room) {
      subSize *= room / subW;
      subW = room;
    }
  }
  const subDrop = sub ? subSize * 0.42 : 0;
  const below = sub ? subDrop + subSize * 0.38 + subW * 0.05 : size * 0.12;
  const halfW = fit.widest / 2 + size * 0.42;
  const cx = Math.min(w - halfW - margin, Math.max(halfW + margin, place.x * w));
  const cy = Math.min(h - blockH / 2 - below - margin, Math.max(blockH / 2 + margin + size * 0.05, place.y * h));

  ctx.translate(cx, cy);
  ctx.rotate(-0.045);

  if (fit.lines.length) {
    if (poster.slab !== false) drawTitleSlab(ctx, fit.widest, blockH, size, grade, w - 2 * margin);
    const top = -blockH / 2 + capHeight;
    fit.lines.forEach((line, i) => drawTitleLine(ctx, line, 0, top + i * lineGap, size, grade));
  }
  if (sub) {
    // Slung toward the title's lower right, but never past the poster's edges.
    const want = fit.widest ? fit.widest * 0.22 : 0;
    const sx = Math.min(w - margin - subW / 2 - cx, Math.max(margin + subW / 2 - cx, want));
    drawScriptSubline(ctx, sub, sx, blockH / 2 + subDrop, subSize, grade);
  }
  ctx.restore();
}

/** The tilted coloured slab behind the title: a parallelogram with a hard offset shadow, narrower than the letters. */
function drawTitleSlab(ctx, textWidth, blockH, size, grade, maxWidth) {
  const slabH = blockH * 0.62 + size * 0.1;
  const lean = slabH * 0.32;
  const slabW = Math.min(textWidth + size * 0.7, maxWidth - 2 * lean);
  const y = -slabH / 2 + size * 0.04;
  const path = (ox, oy) => {
    ctx.beginPath();
    ctx.moveTo(-slabW / 2 + lean + ox, y + oy);
    ctx.lineTo(slabW / 2 + lean + ox, y + oy);
    ctx.lineTo(slabW / 2 - lean + ox, y + slabH + oy);
    ctx.lineTo(-slabW / 2 - lean + ox, y + slabH + oy);
    ctx.closePath();
  };
  const off = size * 0.07;
  path(off, off);
  ctx.fillStyle = grade.slabShadow;
  ctx.fill();
  path(0, 0);
  const g = ctx.createLinearGradient(-slabW / 2, 0, slabW / 2, 0);
  g.addColorStop(0, grade.slab);
  g.addColorStop(1, shade(grade.slab, -0.18));
  ctx.fillStyle = g;
  ctx.fill();
}

/** One line of the title: extruded shadow, thick outline, then the gradient face. */
function drawTitleLine(ctx, text, x, y, size, grade) {
  ctx.font = `${size}px ${TITLE_FONT}`;
  const depth = size * 0.075;
  const steps = Math.max(4, Math.round(depth / Math.max(1, size / 90)));
  const outline = size * 0.1;

  // The extrusion: copies stepping down-right, the deepest first, edged in the outline colour.
  ctx.lineWidth = outline;
  ctx.strokeStyle = grade.titleOutline;
  ctx.strokeText(text, x + depth, y + depth);
  ctx.fillStyle = grade.titleShadow;
  for (let i = steps; i >= 1; i--) {
    const d = (depth * i) / steps;
    ctx.fillText(text, x + d, y + d);
  }

  // The outline around the face, with a soft drop shadow to lift it off the photo.
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.25;
  ctx.lineWidth = outline;
  ctx.strokeStyle = grade.titleOutline;
  ctx.strokeText(text, x, y);
  ctx.restore();

  const face = ctx.createLinearGradient(0, y - size * 0.86, 0, y);
  face.addColorStop(0, grade.titleFill[0]);
  face.addColorStop(0.55, grade.titleFill[0]);
  face.addColorStop(1, grade.titleFill[1]);
  ctx.fillStyle = face;
  ctx.fillText(text, x, y);

  // A thin bright rim inside the outline.
  ctx.lineWidth = Math.max(1, size * 0.012);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.strokeText(text, x, y);
}

/** The script sub-line in neon: a glow pass, a dark edge for legibility, then the bright stroke. */
function drawScriptSubline(ctx, text, x, y, size, grade) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.08);
  const s = size;
  ctx.font = `${s}px ${SCRIPT_FONT}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = s * 0.09;
  ctx.strokeStyle = 'rgba(10, 2, 20, 0.9)';
  ctx.strokeText(text, 0, 0);
  ctx.shadowColor = grade.subGlow;
  ctx.shadowBlur = s * 0.4;
  ctx.fillStyle = grade.sub;
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = s * 0.12;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Lightens (amount > 0) or darkens (amount < 0) a '#rrggbb' colour. */
export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount),
  );
  return `rgb(${ch[0]}, ${ch[1]}, ${ch[2]})`;
}
