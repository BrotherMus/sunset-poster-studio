// The sunset tile: an original drawn panel that layouts use as the caption's home. A banded sky, a big striped
// sun sinking into the sea, glittering reflections and two palm silhouettes, all coloured by the current grade.
import { hexWithAlpha } from './color-grades.js';
import { createRandom, randomBetween } from './seeded-random.js';
import { tracePolygon } from './poster-layouts.js';

/** Paints the sunset scene inside `polygon` (bounds {x, y, w, h}) with the grade's palette. */
export function drawSunsetTile(ctx, polygon, bounds, grade, seed) {
  const random = createRandom(seed ^ 0x5a17);
  const { x, y, w, h } = bounds;
  const horizon = y + h * 0.66;
  ctx.save();
  tracePolygon(ctx, polygon);
  ctx.clip();

  const sky = ctx.createLinearGradient(0, y, 0, horizon);
  grade.sky.forEach((color, i) => sky.addColorStop(i / (grade.sky.length - 1), color));
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, horizon - y + 1);

  const sunX = x + w * randomBetween(random, 0.42, 0.58);
  const sunR = Math.min(w * 0.3, h * 0.42);
  const sunY = horizon - sunR * 0.28;
  drawStripedSun(ctx, sunX, sunY, sunR, grade, sky, horizon);

  drawSea(ctx, x, horizon, w, y + h - horizon, sunX, sunR, grade, random);
  const palm = Math.min(h * 0.74, w * 0.5);
  drawPalm(ctx, x + w * randomBetween(random, 0.05, 0.12), y + h * 1.02, palm, -0.2, grade.palm, random);
  drawPalm(ctx, x + w * randomBetween(random, 0.88, 0.95), y + h * 1.02, palm * 0.82, 0.24, grade.palm, random);
  ctx.restore();
}

/** A sun with a hot gradient and horizontal gaps that widen towards the horizon, cut with the sky's own gradient. */
function drawStripedSun(ctx, cx, cy, r, grade, sky, horizon) {
  ctx.save();
  ctx.shadowColor = hexWithAlpha(grade.sun[1], 0.9);
  ctx.shadowBlur = r * 0.5;
  const fill = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grade.sun.forEach((color, i) => fill.addColorStop(i / (grade.sun.length - 1), color));
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = sky;
  let bandY = cy - r * 0.05;
  for (let i = 0; i < 7 && bandY < horizon; i++) {
    const thickness = r * (0.035 + i * 0.022);
    ctx.fillRect(cx - r - 2, bandY, r * 2 + 4, thickness);
    bandY += thickness + r * (0.15 - i * 0.012);
  }
}

/** The sea under the horizon, with the sun's glittering reflection in short horizontal strokes. */
function drawSea(ctx, x, top, w, h, sunX, sunR, grade, random) {
  const sea = ctx.createLinearGradient(0, top, 0, top + h);
  sea.addColorStop(0, grade.sea[0]);
  sea.addColorStop(1, grade.sea[1]);
  ctx.fillStyle = sea;
  ctx.fillRect(x, top, w, h + 1);

  ctx.fillStyle = hexWithAlpha(grade.sun[0], 0.95);
  ctx.fillRect(x, top - 1, w, Math.max(1, h * 0.012));
  const rows = 14;
  for (let i = 0; i < rows; i++) {
    const t = i / rows;
    const rowY = top + h * (0.04 + t * 0.9);
    const spread = sunR * (1.05 - t * 0.55);
    const count = 2 + Math.floor(random() * 3);
    for (let k = 0; k < count; k++) {
      const len = spread * randomBetween(random, 0.25, 0.8);
      const offset = randomBetween(random, -spread, spread - len);
      ctx.fillStyle = hexWithAlpha(grade.sun[k % 2 === 0 ? 1 : 0], 0.8 - t * 0.55);
      ctx.fillRect(sunX + offset, rowY, len, Math.max(1, h * (0.03 - t * 0.018)));
    }
  }
}

/** A palm silhouette: a tapering curved trunk and a crown of drooping fronds. `lean` bends it left (-) or right (+). */
export function drawPalm(ctx, baseX, baseY, height, lean, color, random) {
  const topX = baseX + height * lean;
  const topY = baseY - height;
  const bendX = baseX + height * lean * 0.15;
  const bendY = baseY - height * 0.55;
  const base = height * 0.035;
  const steps = 24;
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = (1 - t) * (1 - t) * baseX + 2 * (1 - t) * t * bendX + t * t * topX;
    const py = (1 - t) * (1 - t) * baseY + 2 * (1 - t) * t * bendY + t * t * topY;
    const half = base * (1 - t * 0.55);
    left.push([px - half, py]);
    right.push([px + half, py]);
  }
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  left.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  right.reverse().forEach(([px, py]) => ctx.lineTo(px, py));
  ctx.closePath();
  ctx.fill();

  const fronds = 8;
  for (let i = 0; i < fronds; i++) {
    const angle = -Math.PI / 2 + ((i - (fronds - 1) / 2) / fronds) * Math.PI * 1.9 + randomBetween(random, -0.12, 0.12);
    const length = height * randomBetween(random, 0.32, 0.44);
    drawFrond(ctx, topX, topY, angle, length);
  }
  ctx.beginPath();
  ctx.arc(topX, topY, base * 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** One drooping palm frond from (x, y) towards `angle`: a curved leaf, thick in the middle and pointed at the tip. */
function drawFrond(ctx, x, y, angle, length) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const tipX = x + dx * length;
  const tipY = y + dy * length * 0.6 + length * 0.45;
  const midX = x + dx * length * 0.55;
  const midY = y + dy * length * 0.55 - length * 0.12;
  const nx = -dy;
  const ny = dx;
  const width = length * 0.11;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(midX + nx * width, midY + ny * width, tipX, tipY);
  ctx.quadraticCurveTo(midX - nx * width * 0.4, midY - ny * width * 0.4 + width * 0.6, x, y);
  ctx.fill();
}
