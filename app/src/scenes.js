// Painted scenes a panel can show instead of a photo: a striped sunset over the sea, a neon skyline and a palm-lined
// highway, all drawn with the grade's palette so they sit in the same colour world as the graded photos.
import { createRandom } from './random.js';
import { withAlpha } from './grades.js';

export const SCENES = [
  { id: 'sunset-beach', name: 'Sunset beach' },
  { id: 'neon-skyline', name: 'Neon skyline' },
  { id: 'palm-highway', name: 'Palm highway' },
];

/** Paints scene `id` filling a w x h context (origin at its top left). */
export function drawScene(ctx, id, w, h, palette, seed = 7) {
  const rng = createRandom(seed);
  if (id === 'neon-skyline') drawNeonSkyline(ctx, w, h, palette, rng);
  else if (id === 'palm-highway') drawPalmHighway(ctx, w, h, palette, rng);
  else drawSunsetBeach(ctx, w, h, palette, rng);
}

function fillSky(ctx, w, horizon, palette) {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, palette.sky[0]);
  g.addColorStop(0.5, palette.sky[1]);
  g.addColorStop(0.82, palette.sky[2]);
  g.addColorStop(1, palette.sky[3]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizon + 1);
}

/** A retro sun: a vertical gradient disc with horizontal bands cut out of its lower half, and a soft halo. */
function drawStripedSun(ctx, cx, cy, r, palette) {
  const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.6);
  halo.addColorStop(0, withAlpha(palette.sun[0], 0.55));
  halo.addColorStop(1, withAlpha(palette.sun[1], 0));
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
  const disc = document.createElement('canvas');
  disc.width = Math.ceil(r * 2);
  disc.height = Math.ceil(r * 2);
  const d = disc.getContext('2d');
  const g = d.createLinearGradient(0, 0, 0, r * 2);
  g.addColorStop(0, palette.sun[0]);
  g.addColorStop(1, palette.sun[1]);
  d.fillStyle = g;
  d.beginPath();
  d.arc(r, r, r, 0, Math.PI * 2);
  d.fill();
  d.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) {
    const y = r * (1.0 + i * 0.15);
    d.fillRect(0, y, r * 2, r * (0.025 + i * 0.016));
  }
  ctx.drawImage(disc, cx - r, cy - r);
}

/** A palm silhouette: a curved trunk and drooping fronds. */
export function drawPalm(ctx, x, baseY, height, lean, color) {
  const topX = x + lean * height;
  const topY = baseY - height;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  // Trunk: a tapered quadratic curve built from both edges.
  const steps = 24;
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x + (topX - x) * t + Math.sin(t * Math.PI) * lean * height * -0.25;
    const cy = baseY + (topY - baseY) * t;
    const half = height * (0.032 - 0.018 * t);
    left.push([cx - half, cy]);
    right.push([cx + half, cy]);
  }
  ctx.beginPath();
  left.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  right.reverse().forEach(([px, py]) => ctx.lineTo(px, py));
  ctx.closePath();
  ctx.fill();
  // Fronds: each a drooping arc with leaflets along it.
  const fronds = 9;
  for (let f = 0; f < fronds; f++) {
    const ang = -Math.PI / 2 + ((f / (fronds - 1)) - 0.5) * Math.PI * 1.55;
    const len = height * (0.36 + 0.08 * Math.cos(f * 1.7));
    const ex = topX + Math.cos(ang) * len;
    const ey = topY + Math.sin(ang) * len * 0.55 + len * 0.42;
    const mx = topX + Math.cos(ang) * len * 0.55;
    const my = topY + Math.sin(ang) * len * 0.75 - len * 0.12;
    ctx.lineCap = 'round';
    ctx.lineWidth = height * 0.014;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    // Leaflets: thin blades swept back from the frond's direction on both sides, drooping, shorter toward the tip.
    for (let k = 1; k <= 14; k++) {
      const t = k / 15;
      const px = (1 - t) * (1 - t) * topX + 2 * (1 - t) * t * mx + t * t * ex;
      const py = (1 - t) * (1 - t) * topY + 2 * (1 - t) * t * my + t * t * ey;
      const tx = 2 * (1 - t) * (mx - topX) + 2 * t * (ex - mx);
      const ty = 2 * (1 - t) * (my - topY) + 2 * t * (ey - my);
      const dir = Math.atan2(ty, tx);
      const leaf = len * 0.24 * Math.sin(Math.PI * (0.15 + t * 0.85));
      ctx.lineWidth = height * 0.006;
      for (const s of [-1, 1]) {
        const a = dir + s * 0.75;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + Math.cos(a) * leaf * 0.6, py + Math.sin(a) * leaf * 0.6, px + Math.cos(a) * leaf, py + Math.sin(a) * leaf + leaf * 0.45);
        ctx.stroke();
      }
    }
  }
}

function drawSunsetBeach(ctx, w, h, palette, rng) {
  const horizon = h * 0.64;
  fillSky(ctx, w, horizon, palette);
  const r = Math.min(w, h) * 0.26;
  drawStripedSun(ctx, w * 0.5, horizon - r * 0.38, r, palette);
  // Thin cloud streaks across the sun.
  ctx.fillStyle = withAlpha(palette.sky[1], 0.55);
  for (let i = 0; i < 5; i++) {
    const y = horizon * (0.25 + rng() * 0.45);
    ctx.fillRect(w * rng() * 0.5, y, w * (0.25 + rng() * 0.4), h * 0.006);
  }
  const sea = ctx.createLinearGradient(0, horizon, 0, h);
  sea.addColorStop(0, palette.sky[2]);
  sea.addColorStop(0.15, palette.sea);
  sea.addColorStop(1, palette.ink);
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, h - horizon);
  // The sun's reflection: short glinting bars narrowing toward the viewer.
  ctx.fillStyle = withAlpha(palette.sun[0], 0.85);
  for (let i = 0; i < 18; i++) {
    const t = i / 18;
    const y = horizon + (h - horizon) * t * t * 0.9 + h * 0.008;
    const bw = r * (1.4 - t) * (0.6 + rng() * 0.5);
    ctx.globalAlpha = 0.9 - t * 0.7;
    ctx.fillRect(w * 0.5 - bw / 2 + (rng() - 0.5) * r * 0.3, y, bw, h * (0.004 + t * 0.008));
  }
  ctx.globalAlpha = 1;
  drawPalm(ctx, w * 0.12, h * 1.02, h * 0.78, 0.18, palette.ink);
  drawPalm(ctx, w * 0.9, h * 1.04, h * 0.62, -0.22, palette.ink);
  drawPalm(ctx, w * 0.98, h * 1.05, h * 0.9, -0.1, palette.ink);
}

function drawNeonSkyline(ctx, w, h, palette, rng) {
  const horizon = h * 0.78;
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, palette.sky[0]);
  g.addColorStop(0.45, palette.sky[1]);
  g.addColorStop(0.8, palette.sky[2]);
  g.addColorStop(1, palette.sky[3]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 70; i++) ctx.fillRect(rng() * w, rng() * horizon * 0.5, 1.5, 1.5);
  // A big striped neon sun setting behind the towers.
  drawStripedSun(ctx, w * (0.35 + rng() * 0.3), horizon * 0.62, Math.min(w, h) * 0.3, palette);
  // Two rows of towers: a hazy far row and a dark near row with lit windows.
  for (const row of [0, 1]) {
    let x = -w * 0.02;
    while (x < w) {
      const bw = w * (0.05 + rng() * 0.08);
      const bh = h * (row ? 0.22 + rng() * 0.38 : 0.3 + rng() * 0.32);
      const top = horizon - bh + (row ? h * 0.06 : 0);
      ctx.fillStyle = row ? palette.ink : withAlpha(palette.sky[0], 0.85);
      ctx.fillRect(x, top, bw, h - top);
      if (rng() < 0.35) ctx.fillRect(x + bw * 0.45, top - bh * 0.12, bw * 0.08, bh * 0.12);
      if (row) {
        const cell = Math.max(3, w * 0.008);
        for (let wy = top + cell; wy < h - cell; wy += cell * 2) {
          for (let wx = x + cell * 0.8; wx < x + bw - cell; wx += cell * 1.7) {
            if (rng() < 0.32) {
              ctx.fillStyle = rng() < 0.7 ? withAlpha(palette.sun[0], 0.85) : withAlpha(palette.neon, 0.9);
              ctx.fillRect(wx, wy, cell * 0.8, cell);
            }
          }
        }
        if (rng() < 0.5) {
          ctx.save();
          ctx.shadowColor = palette.neon;
          ctx.shadowBlur = w * 0.02;
          ctx.strokeStyle = rng() < 0.5 ? palette.neon : palette.glow;
          ctx.lineWidth = Math.max(2, w * 0.006);
          ctx.strokeRect(x + bw * 0.15, top + bh * 0.12, bw * 0.7, bh * 0.08);
          ctx.restore();
        }
      }
      x += bw + w * 0.004;
    }
  }
  // A neon glow line along the street.
  ctx.save();
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = h * 0.04;
  ctx.fillStyle = palette.glow;
  ctx.fillRect(0, h * 0.965, w, h * 0.008);
  ctx.restore();
}

function drawPalmHighway(ctx, w, h, palette, rng) {
  const horizon = h * 0.5;
  fillSky(ctx, w, horizon, palette);
  drawStripedSun(ctx, w * 0.5, horizon - Math.min(w, h) * 0.08, Math.min(w, h) * 0.22, palette);
  const ground = ctx.createLinearGradient(0, horizon, 0, h);
  ground.addColorStop(0, palette.sea);
  ground.addColorStop(1, palette.ink);
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, w, h - horizon);
  // Road narrowing to the vanishing point, with a dashed centre line and neon edges.
  const vx = w * 0.5;
  ctx.fillStyle = palette.ink;
  ctx.beginPath();
  ctx.moveTo(vx - w * 0.01, horizon);
  ctx.lineTo(vx + w * 0.01, horizon);
  ctx.lineTo(w * 0.95, h);
  ctx.lineTo(w * 0.05, h);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.shadowColor = palette.neon;
  ctx.shadowBlur = w * 0.015;
  ctx.strokeStyle = palette.neon;
  ctx.lineWidth = Math.max(2, w * 0.005);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(vx + side * w * 0.01, horizon);
    ctx.lineTo(vx + side * w * 0.45, h);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = palette.sun[0];
  for (let i = 0; i < 9; i++) {
    const t0 = Math.pow(i / 9, 2);
    const t1 = Math.pow((i + 0.45) / 9, 2);
    const y0 = horizon + (h - horizon) * t0;
    const y1 = horizon + (h - horizon) * t1;
    ctx.beginPath();
    ctx.moveTo(vx - w * 0.002 * (1 + t0 * 4), y0);
    ctx.lineTo(vx + w * 0.002 * (1 + t0 * 4), y0);
    ctx.lineTo(vx + w * 0.002 * (1 + t1 * 4), y1);
    ctx.lineTo(vx - w * 0.002 * (1 + t1 * 4), y1);
    ctx.fill();
  }
  // Palms marching to the horizon on both sides.
  for (let i = 6; i >= 0; i--) {
    const t = Math.pow((i + 1) / 7, 1.6);
    const y = horizon + (h - horizon) * t;
    const ph = h * 0.75 * t + h * 0.04;
    drawPalm(ctx, vx - w * 0.5 * t - w * 0.04, y, ph, 0.08 + rng() * 0.05, palette.ink);
    drawPalm(ctx, vx + w * 0.5 * t + w * 0.04, y, ph, -0.08 - rng() * 0.05, palette.ink);
  }
}
