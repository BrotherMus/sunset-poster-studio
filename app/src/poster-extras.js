// Poster extras: the trimmings that make a cover read as a release poster. A slanted role tag in each panel's corner,
// location / time stamps on panels, a press strip along the top (five stars, a quote and its source, a VOL badge),
// a round seal with a jagged or scalloped edge, a tagline bar under the title, and a credits strip along the bottom
// with a billing block in condensed capitals and a barcode drawn in code. Every piece is switchable in the editor's
// "Poster extras" card and draws in the grade's palette.
import { mixHex, withAlpha } from './grades.js';
import { deviceScale, insetConvexPolygon, tracePolygon } from './geometry.js';
import { TITLE_FONT, captionCovers } from './lettering.js';
import { createRandom, seedFromText } from './random.js';

const DEG = Math.PI / 180;

/** A burst of light rays fanning out from behind the title across the panel area, in the glow colour, strongest near
 * the title and fading out toward the edges. `plan` is the caption's plan (its centre is the burst's centre). */
export function drawLightRays(ctx, state, plan, area, width, palette) {
  if (!state.extras?.rays || !plan) return;
  const amount = 0.35 + 0.45 * state.fx.glow;
  const reach = Math.hypot(width, area.bottom - area.top);
  const cx = plan.x;
  const cy = plan.y;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, area.top, width, area.bottom - area.top);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  const fade = ctx.createRadialGradient(cx, cy, plan.capH * 0.4, cx, cy, reach * 0.62);
  fade.addColorStop(0, withAlpha(palette.glow, 0.5 * amount));
  fade.addColorStop(0.35, withAlpha(palette.glow, 0.26 * amount));
  fade.addColorStop(1, withAlpha(palette.glow, 0));
  ctx.fillStyle = fade;
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a0 = plan.angle + (i / n) * Math.PI * 2;
    const a1 = a0 + (Math.PI / n) * (i % 3 === 0 ? 0.55 : 0.8);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * reach, cy + Math.sin(a0) * reach);
    ctx.lineTo(cx + Math.cos(a1) * reach, cy + Math.sin(a1) * reach);
    ctx.closePath();
    ctx.fill();
  }
  // A warm sun glow right behind the lettering.
  const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, plan.blockW * 0.6);
  sun.addColorStop(0, withAlpha(palette.sun[0], 0.35 * amount));
  sun.addColorStop(1, withAlpha(palette.sun[1], 0));
  ctx.fillStyle = sun;
  ctx.fillRect(0, area.top, width, area.bottom - area.top);
  ctx.restore();
}

/** Heights of the press strip along the top and the credits strip along the bottom (0 when switched off), which the
 * layouts keep free of panels. */
export function extrasInsets(state) {
  const unit = Math.min(state.size.w, state.size.h);
  const ex = state.extras;
  return { top: ex?.quote ? Math.round(unit * 0.068) : 0, bottom: ex?.credits ? Math.round(unit * 0.112) : 0 };
}

/** Text in Anton capitals at `size`, spaced by `spacing` ems. */
function setCaps(ctx, size, spacing = 0.1) {
  ctx.font = `${size}px "${TITLE_FONT}"`;
  ctx.letterSpacing = `${size * spacing}px`;
}

/** A five-pointed star centred on (x, y). */
function traceStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** The corner of a polygon furthest toward (dx, dy): (-1, -1) is its top left, (-1, 1) its bottom left. */
function cornerOf(poly, dx, dy) {
  let best = poly[0];
  for (const p of poly) if (p.x * dx + p.y * dy * 1.3 > best.x * dx + best.y * dy * 1.3) best = p;
  return best;
}

/** A slanted label: an ink parallelogram with a hot accent block and white spaced capitals, its top left at (0, 0). */
function drawRoleLabel(ctx, text, size, palette) {
  setCaps(ctx, size, 0.16);
  const tw = ctx.measureText(text).width;
  const h = size * 1.55;
  const accent = size * 0.42;
  const skew = h * 0.28;
  const w = tw + size * 0.9 + accent;
  const shape = (x0, y0) => {
    ctx.beginPath();
    ctx.moveTo(x0 + skew, y0);
    ctx.lineTo(x0 + w + skew, y0);
    ctx.lineTo(x0 + w, y0 + h);
    ctx.lineTo(x0, y0 + h);
    ctx.closePath();
  };
  shape(size * 0.12, size * 0.16);
  ctx.fillStyle = withAlpha('#000000', 0.55);
  ctx.fill();
  shape(0, 0);
  ctx.fillStyle = withAlpha(palette.ink, 0.92);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = palette.slab;
  ctx.fillRect(0, 0, accent + skew, h);
  ctx.fillStyle = palette.frame;
  ctx.fillRect(0, h - size * 0.12, w + skew, size * 0.12);
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, accent + skew * 0.55 + size * 0.42, h * 0.5 + size * 0.36);
  ctx.letterSpacing = '0px';
}

/** A location / time stamp: a glowing dot, the place in white and the time in the frame colour, on a dark fade. */
function drawStamp(ctx, text, size, palette) {
  const [place, ...rest] = text.split('·');
  const time = rest.join('·').trim();
  setCaps(ctx, size, 0.2);
  const pw = ctx.measureText(place.trim()).width;
  const gap = size * 0.8;
  const tw = time ? ctx.measureText(time).width : 0;
  const dot = size * 0.32;
  const w = dot * 2 + size * 0.6 + pw + (time ? gap + tw : 0) + size * 0.8;
  const h = size * 1.9;
  const bg = ctx.createLinearGradient(0, 0, w, 0);
  bg.addColorStop(0, withAlpha(palette.ink, 0.85));
  bg.addColorStop(0.8, withAlpha(palette.ink, 0.7));
  bg.addColorStop(1, withAlpha(palette.ink, 0));
  ctx.fillStyle = bg;
  ctx.fillRect(0, -h, w + size * 2, h);
  ctx.fillStyle = palette.frame;
  ctx.fillRect(0, -size * 0.1, w * 0.85, size * 0.1);
  const k = deviceScale(ctx);
  ctx.save();
  ctx.shadowColor = palette.neon;
  ctx.shadowBlur = size * 0.8 * k;
  ctx.fillStyle = palette.neon;
  ctx.beginPath();
  ctx.arc(size * 0.5 + dot, -h / 2, dot, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let x = size * 0.5 + dot * 2 + size * 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(place.trim(), x, -h / 2 + size * 0.06);
  if (time) {
    x += pw + gap;
    ctx.fillStyle = palette.frame;
    ctx.fillRect(x - gap / 2 - size * 0.06, -h / 2 - size * 0.06, size * 0.12, size * 0.12);
    ctx.fillText(time, x, -h / 2 + size * 0.06);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '0px';
}

/** The width and height of a role label for `text` at `size`. */
function roleLabelSize(ctx, text, size) {
  setCaps(ctx, size, 0.16);
  const w = ctx.measureText(text).width + size * 0.9 + size * 0.42 + size * 1.55 * 0.28;
  ctx.letterSpacing = '0px';
  return { w, h: size * 1.55 };
}

/** The width and height of a stamp for `text` at `size`. */
function stampSize(ctx, text, size) {
  setCaps(ctx, size, 0.2);
  const w = ctx.measureText(text.replace('·', '   ')).width + size * 2.4;
  ctx.letterSpacing = '0px';
  return { w, h: size * 1.9 };
}

const CORNERS = { tl: [-1, -1], tr: [1, -1], bl: [-1, 1], br: [1, 1] };

/**
 * Finds a corner of the panel where a w x h label fits clear of the caption: tries `order` in turn and returns the
 * label's top left and the corner's name, or null when the caption covers every one (the label is then left out
 * rather than peeking from behind the title).
 */
function placeLabel(inner, order, w, h, avoid, pad, taken) {
  for (const name of order) {
    const [dx, dy] = CORNERS[name];
    const c = cornerOf(inner, dx, dy);
    const x = dx < 0 ? c.x + pad : c.x - pad - w;
    const y = dy < 0 ? c.y + pad : c.y - pad - h;
    if (taken && x < taken.x + taken.w + pad && x + w + pad > taken.x && y < taken.y + taken.h + pad && y + h + pad > taken.y) continue;
    const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h], [x + w / 2, y + h / 2]];
    if (!pts.some(([px, py]) => avoid(px, py, pad))) return { x, y, w, h, name };
  }
  return null;
}

/** Role tags and location stamps on the panels, each clipped to its panel and kept clear of the caption box
 * `captionBox` (from planCaption) and the seal `seal` ({ x, y, r }, or null): a role tag prefers the top left corner,
 * a stamp the bottom left. */
export function drawPanelLabels(ctx, state, layout, palette, gutter, captionBox = null, seal = null) {
  const ex = state.extras;
  if (!ex?.roles && !ex?.stamps) return;
  const avoid = (px, py, pad) => (captionBox && captionCovers(captionBox, px, py, pad))
    || (seal && Math.hypot(px - seal.x, py - seal.y) < seal.r + pad);
  const unit = Math.min(state.size.w, state.size.h);
  const pad = unit * 0.006;
  for (const panel of layout.panels) {
    if (panel.poly.length < 3) continue;
    const inner = insetConvexPolygon(panel.poly, gutter * 0.5 + unit * 0.014);
    if (inner.length < 3) continue;
    const span = Math.min(panel.bounds.w, panel.bounds.h);
    const role = ex.roles ? (state.roles?.[panel.index] ?? '').trim().toUpperCase() : '';
    const stamp = ex.stamps ? (state.stamps?.[panel.index] ?? '').trim().toUpperCase() : '';
    if (!role && !stamp) continue;
    const tilt = panel.floating ? panel.frame.rot : 0;
    ctx.save();
    tracePolygon(ctx, panel.poly);
    ctx.clip();
    let taken = null;
    if (role) {
      const size = Math.min(unit * 0.026, span * 0.09);
      const box = roleLabelSize(ctx, role, size);
      const spot = placeLabel(inner, ['tl', 'bl', 'tr', 'br'], box.w, box.h, avoid, pad, null);
      if (spot) {
        taken = spot;
        ctx.save();
        ctx.translate(spot.x, spot.y);
        ctx.rotate((tilt || -3) * DEG);
        drawRoleLabel(ctx, role, size, palette);
        ctx.restore();
      }
    }
    if (stamp) {
      const size = Math.min(unit * 0.017, span * 0.06);
      const box = stampSize(ctx, stamp, size);
      const spot = placeLabel(inner, ['bl', 'br', 'tr', 'tl'], box.w, box.h, avoid, pad, taken);
      if (spot) {
        ctx.save();
        ctx.translate(spot.x, spot.y + box.h);
        if (tilt) ctx.rotate(tilt * DEG);
        drawStamp(ctx, stamp, size, palette);
        ctx.restore();
      }
    }
    ctx.restore();
  }
}

/** The press strip along the top: a VOL badge on the left, five stars, the quote and its source in the middle, and
 * fine rules out to the edges. */
export function drawPressStrip(ctx, state, width, palette, stripH) {
  const ex = state.extras;
  if (!ex?.quote || stripH <= 0) return;
  const bg = ctx.createLinearGradient(0, 0, 0, stripH);
  bg.addColorStop(0, palette.ink);
  bg.addColorStop(1, mixHex(palette.ink, palette.titleShadow, 0.6));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, stripH);
  ctx.fillStyle = palette.frame;
  ctx.fillRect(0, stripH - Math.max(1.5, stripH * 0.035), width, Math.max(1.5, stripH * 0.035));
  const mid = stripH * 0.5;
  const margin = stripH * 0.45;

  // VOL badge.
  let left = margin;
  const vol = ex.vol.trim().toUpperCase();
  if (vol) {
    const vs = stripH * 0.4;
    setCaps(ctx, vs, 0.12);
    const vw = ctx.measureText(vol).width + vs * 1.2;
    const vh = stripH * 0.62;
    const skew = vh * 0.3;
    ctx.beginPath();
    ctx.moveTo(left + skew, mid - vh / 2);
    ctx.lineTo(left + vw + skew, mid - vh / 2);
    ctx.lineTo(left + vw, mid + vh / 2);
    ctx.lineTo(left, mid + vh / 2);
    ctx.closePath();
    ctx.fillStyle = palette.slab;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, stripH * 0.04);
    ctx.strokeStyle = palette.frame;
    ctx.stroke();
    ctx.fillStyle = palette.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(vol, left + skew / 2 + vw / 2, mid + vs * 0.04);
    left += vw + skew + margin;
  }

  // Stars, quote and source, measured so the group fits between the badge and the right margin.
  const quote = ex.quoteText.trim().toUpperCase();
  const source = ex.quoteSource.trim().toUpperCase();
  let qs = stripH * 0.42;
  const measure = () => {
    setCaps(ctx, qs, 0.08);
    const qw = quote ? ctx.measureText(`"${quote}"`).width : 0;
    setCaps(ctx, qs * 0.68, 0.14);
    const sw = source ? ctx.measureText(`— ${source}`).width : 0;
    const starW = qs * 0.95 * 5;
    return { qw, sw, starW, total: starW + qs * 0.7 + qw + (source ? qs * 0.6 + sw : 0) };
  };
  let m = measure();
  const room = width - left - margin - (vol ? left - margin : 0);
  if (m.total > room) {
    qs *= room / m.total;
    m = measure();
  }
  let x = Math.max(left, width / 2 - m.total / 2);
  const k = deviceScale(ctx);
  // Rules out to the badge and the right edge.
  ctx.fillStyle = withAlpha(palette.frame, 0.6);
  const rule = Math.max(1, stripH * 0.025);
  if (x - left > stripH * 0.6) ctx.fillRect(left, mid - rule / 2, x - left - qs * 0.5, rule);
  const end = x + m.total;
  if (width - margin - end > stripH * 0.6) ctx.fillRect(end + qs * 0.5, mid - rule / 2, width - margin - end - qs * 0.5, rule);
  ctx.save();
  ctx.shadowColor = palette.frame;
  ctx.shadowBlur = qs * 0.5 * k;
  ctx.fillStyle = palette.frame;
  for (let i = 0; i < 5; i++) {
    traceStar(ctx, x + qs * 0.95 * (i + 0.5), mid, qs * 0.42);
    ctx.fill();
  }
  ctx.restore();
  x += m.starW + qs * 0.7;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (quote) {
    setCaps(ctx, qs, 0.08);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`"${quote}"`, x, mid + qs * 0.05);
    x += m.qw + qs * 0.6;
  }
  if (source) {
    setCaps(ctx, qs * 0.68, 0.14);
    ctx.fillStyle = mixHex(palette.frame, '#ffffff', 0.25);
    ctx.fillText(`— ${source}`, x, mid + qs * 0.05);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '0px';
}

/** Sizes the tagline bar for a title `blockW` wide: { w, h, ts, tw, parts }, or null when it is off or empty. */
export function measureTagline(ctx, state, blockW, unit) {
  const ex = state.extras;
  const text = ex?.tagline ? ex.taglineText.trim().toUpperCase() : '';
  if (!text) return null;
  const parts = text.split('·').map((s) => s.trim()).filter(Boolean);
  let ts = unit * 0.03;
  const widthOf = () => {
    setCaps(ctx, ts, 0.3);
    const w = parts.reduce((sum, p) => sum + ctx.measureText(p).width, 0) + ts * 1.6 * (parts.length - 1);
    ctx.letterSpacing = '0px';
    return w;
  };
  let tw = widthOf();
  const maxW = Math.max(blockW * 0.92, unit * 0.6);
  if (tw > maxW) {
    ts *= maxW / tw;
    tw = widthOf();
  }
  return { w: tw + ts * 3, h: ts * 1.9, ts, tw, parts };
}

/** The tagline bar under the title, drawn in the title's own turned coordinates with its top left at (x0, top): an
 * ink bar with a frame-coloured edge and the line in white spaced capitals, its separators as small diamonds. */
export function drawTaglineBar(ctx, bar, x0, top, palette) {
  const { ts, tw, parts } = bar;
  const gapW = () => ts * 1.6;
  const barW = bar.w;
  const barH = bar.h;
  const skew = barH * 0.3;
  ctx.beginPath();
  ctx.moveTo(x0 + skew, top);
  ctx.lineTo(x0 + barW + skew, top);
  ctx.lineTo(x0 + barW - skew, top + barH);
  ctx.lineTo(x0 - skew, top + barH);
  ctx.closePath();
  ctx.fillStyle = withAlpha(palette.ink, 0.92);
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, ts * 0.08);
  ctx.strokeStyle = palette.frame;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let x = x0 + (barW - tw) / 2;
  const y = top + barH / 2 + ts * 0.04;
  parts.forEach((part, i) => {
    setCaps(ctx, ts, 0.3);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(part, x, y);
    x += ctx.measureText(part).width;
    if (i < parts.length - 1) {
      const dx = x + gapW() / 2 - ts * 0.15;
      ctx.fillStyle = palette.slab;
      ctx.beginPath();
      ctx.moveTo(dx, y - ts * 0.28);
      ctx.lineTo(dx + ts * 0.22, y);
      ctx.lineTo(dx, y + ts * 0.28);
      ctx.lineTo(dx - ts * 0.22, y);
      ctx.closePath();
      ctx.fill();
      x += gapW();
    }
  });
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '0px';
}

/** The seal's edge: 30 sharp spikes (jagged) or 18 round bumps (scalloped). */
function traceSealEdge(ctx, r, edge) {
  ctx.beginPath();
  if (edge === 'scalloped') {
    const n = 18;
    for (let i = 0; i <= n * 8; i++) {
      const a = (i / (n * 8)) * Math.PI * 2;
      const rr = r * (0.9 + 0.1 * Math.abs(Math.sin((a * n) / 2)));
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  } else {
    const n = 30;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const rr = i % 2 ? r * 0.86 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  }
  ctx.closePath();
}

/** Where the seal sits: on the title's upper right shoulder, or in the panel area's top right corner. */
export function sealPlacement(state, g, area) {
  const { w, h } = state.size;
  const unit = Math.min(w, h);
  const r = unit * (w > h ? 0.1 : 0.11);
  const margin = unit * 0.025;
  let x;
  let y;
  if (state.extras.sealSpot === 'corner' || !g) {
    x = w - margin - r;
    y = area.top + margin + r;
  } else {
    const lx = g.blockW / 2 - r * 0.15;
    const ly = -g.blockH / 2 - r * 0.62;
    x = g.x + lx * Math.cos(g.angle) - ly * Math.sin(g.angle);
    y = g.y + lx * Math.sin(g.angle) + ly * Math.cos(g.angle);
  }
  x = Math.min(w - margin - r, Math.max(margin + r, x));
  y = Math.min(area.bottom - margin - r, Math.max(area.top + margin + r, y));
  return { x, y, r };
}

/** The round seal ("HOT SUMMER '27"): a jagged or scalloped disc in the slab colour with a hard shadow, an ink edge,
 * inner rings and its words stacked, the middle one biggest. */
export function drawSeal(ctx, state, palette, spot) {
  const ex = state.extras;
  const words = ex?.seal ? ex.sealText.trim().toUpperCase().split(/\s+/).filter(Boolean) : [];
  if (!words.length) return;
  const { x, y, r } = spot;
  const k = deviceScale(ctx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-12 * DEG);
  ctx.save();
  ctx.translate(r * 0.06, r * 0.09);
  traceSealEdge(ctx, r, ex.sealEdge);
  ctx.fillStyle = palette.ink;
  ctx.fill();
  ctx.restore();
  traceSealEdge(ctx, r, ex.sealEdge);
  const fill = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  fill.addColorStop(0, mixHex(palette.slab, '#ffffff', 0.35));
  fill.addColorStop(0.6, palette.slab);
  fill.addColorStop(1, palette.slabShade);
  ctx.save();
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = r * 0.35 * k;
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
  ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.045;
  ctx.strokeStyle = palette.ink;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.03;
  ctx.strokeStyle = withAlpha('#ffffff', 0.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.67, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.012;
  ctx.stroke();
  for (const side of [-1, 1]) {
    traceStar(ctx, side * r * 0.5, -r * 0.42, r * 0.06);
    ctx.fillStyle = palette.frame;
    ctx.fill();
  }
  // Words: up to three rows; with three, the first is a small kicker and the others big.
  const rows = words.length <= 3 ? words : [words.slice(0, -2).join(' '), words.at(-2), words.at(-1)];
  const heights = rows.length === 1 ? [0.5] : rows.length === 2 ? [0.36, 0.36] : [0.2, 0.3, 0.3];
  const total = heights.reduce((a, b) => a + b, 0) * r + (rows.length - 1) * r * 0.05;
  let ty = -total / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  rows.forEach((row, i) => {
    const capH = heights[i] * r;
    let size = capH / 0.74;
    setCaps(ctx, size, 0.04);
    const maxW = r * (rows.length === 3 && i === 0 ? 0.9 : 1.2);
    const tw = ctx.measureText(row).width;
    if (tw > maxW) {
      size *= maxW / tw;
      setCaps(ctx, size, 0.04);
    }
    const base = ty + capH;
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = palette.ink;
    ctx.strokeText(row, size * 0.03, base + size * 0.05);
    ctx.strokeText(row, 0, base);
    ctx.fillStyle = i === rows.length - 1 && rows.length > 1 ? palette.stripes[1] : '#ffffff';
    ctx.fillText(row, 0, base);
    ty = base + r * 0.05;
  });
  ctx.letterSpacing = '0px';
  ctx.restore();
}

/** Breaks the billing text into at most `maxLines` lines no wider than `maxW` at the current font. */
function wrapLines(ctx, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** A barcode from the credits text: seeded bar widths in a white box, its digits beneath. */
function drawBarcode(ctx, x, y, w, h, seedText, palette) {
  const rng = createRandom(seedFromText(seedText || 'sunset'));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  const pad = w * 0.07;
  const barsH = h * 0.66;
  const modules = [];
  let total = 0;
  while (total < 95) {
    const m = 1 + Math.floor(rng() * 3);
    modules.push(m);
    total += m;
  }
  const unitW = (w - pad * 2) / total;
  let bx = x + pad;
  ctx.fillStyle = palette.ink;
  modules.forEach((m, i) => {
    const guard = i < 3 || i > modules.length - 4 || Math.abs(i - modules.length / 2) < 1.5;
    if (i % 2 === 0) ctx.fillRect(bx, y + h * 0.08, m * unitW, barsH + (guard ? h * 0.08 : 0));
    bx += m * unitW;
  });
  const digits = Array.from({ length: 12 }, () => Math.floor(rng() * 10)).join('');
  const ds = h * 0.17;
  setCaps(ctx, ds, 0.35);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${digits.slice(0, 1)} ${digits.slice(1, 6)} ${digits.slice(6, 11)} ${digits.slice(11)}`, x + w / 2, y + h * 0.97);
  ctx.letterSpacing = '0px';
}

/** A small studio mark for the credits strip: a striped sun disc beside two stacked words. */
function drawStudioMark(ctx, x, cy, h, palette) {
  const r = h * 0.42;
  const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  sun.addColorStop(0, palette.stripes[1]);
  sun.addColorStop(0.55, palette.stripes[2]);
  sun.addColorStop(1, palette.stripes[3]);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + r, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sun;
  ctx.fillRect(x, cy - r, r * 2, r * 2);
  ctx.fillStyle = palette.ink;
  for (let i = 0; i < 4; i++) ctx.fillRect(x, cy + r * (0.1 + i * 0.22), r * 2, r * (0.05 + i * 0.03));
  ctx.restore();
  const s = h * 0.36;
  setCaps(ctx, s, 0.12);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SUNSET', x + r * 2 + h * 0.18, cy - h * 0.02);
  setCaps(ctx, s * 0.62, 0.32);
  ctx.fillStyle = palette.frame;
  ctx.fillText('PICTURES', x + r * 2 + h * 0.18, cy + s * 0.75);
  ctx.letterSpacing = '0px';
  setCaps(ctx, s, 0.12);
  const w1 = ctx.measureText('SUNSET').width;
  setCaps(ctx, s * 0.62, 0.32);
  const w2 = ctx.measureText('PICTURES').width;
  ctx.letterSpacing = '0px';
  return r * 2 + h * 0.18 + Math.max(w1, w2);
}

/** The credits strip along the bottom: the studio mark, the billing block in tall condensed capitals and a barcode. */
export function drawCreditsStrip(ctx, state, width, height, palette, stripH) {
  const ex = state.extras;
  if (!ex?.credits || stripH <= 0) return;
  const y0 = height - stripH;
  const bg = ctx.createLinearGradient(0, y0, 0, height);
  bg.addColorStop(0, mixHex(palette.ink, palette.titleShadow, 0.5));
  bg.addColorStop(1, palette.ink);
  ctx.fillStyle = bg;
  ctx.fillRect(0, y0, width, stripH);
  ctx.fillStyle = palette.frame;
  ctx.fillRect(0, y0, width, Math.max(1.5, stripH * 0.022));
  const margin = stripH * 0.3;
  const markW = drawStudioMark(ctx, margin, y0 + stripH * 0.5, stripH * 0.5, palette);
  const codeW = stripH * 1.25;
  const codeH = stripH * 0.62;
  drawBarcode(ctx, width - margin - codeW, y0 + (stripH - codeH) / 2 + stripH * 0.02, codeW, codeH, ex.creditsText, palette);

  // Billing block: condensed by squeezing the capitals sideways, up to three centred lines.
  const text = ex.creditsText.trim().toUpperCase();
  if (!text) return;
  const squeeze = 0.62;
  const left = margin + markW + margin * 1.4;
  const right = width - margin - codeW - margin * 1.4;
  const room = (right - left) / squeeze;
  let fs = stripH * 0.2;
  let lines;
  for (;;) {
    setCaps(ctx, fs, 0.06);
    lines = wrapLines(ctx, text, room);
    if (lines.length <= 3 || fs < stripH * 0.1) break;
    fs *= 0.92;
  }
  const lh = fs * 1.08;
  const top = y0 + stripH / 2 - (lh * lines.length) / 2;
  ctx.save();
  ctx.translate((left + right) / 2, 0);
  ctx.scale(squeeze, 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = withAlpha('#ffffff', 0.86);
  lines.forEach((line, i) => ctx.fillText(line, 0, top + i * lh + fs * 0.05));
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '0px';
}
