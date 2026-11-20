// Painted scenes a panel can show instead of a photo: a striped sunset over the sea, a neon skyline, a palm-lined
// highway, a sports car at sunset, a marina with a speedboat and a neon motel sign at night, all drawn with the
// grade's palette so they sit in the same colour world as the graded photos.
import { createRandom } from './random.js';
import { withAlpha } from './grades.js';
import { deviceScale } from './geometry.js';
import { SCRIPT_FONT, TITLE_FONT } from './lettering.js';

export const SCENES = [
  { id: 'sunset-beach', name: 'Sunset beach' },
  { id: 'neon-skyline', name: 'Neon skyline' },
  { id: 'palm-highway', name: 'Palm highway' },
  { id: 'sunset-car', name: 'Sports car' },
  { id: 'marina', name: 'Marina speedboat' },
  { id: 'neon-motel', name: 'Neon motel' },
];

/** Paints scene `id` filling a w x h context (origin at its top left). */
export function drawScene(ctx, id, w, h, palette, seed = 7) {
  const rng = createRandom(seed);
  if (id === 'neon-skyline') drawNeonSkyline(ctx, w, h, palette, rng);
  else if (id === 'palm-highway') drawPalmHighway(ctx, w, h, palette, rng);
  else if (id === 'sunset-car') drawSunsetCar(ctx, w, h, palette, rng);
  else if (id === 'marina') drawMarina(ctx, w, h, palette, rng);
  else if (id === 'neon-motel') drawNeonMotel(ctx, w, h, palette, rng);
  else drawSunsetBeach(ctx, w, h, palette, rng);
}

/** Runs `draw` with a coloured glow of `blur` poster pixels around whatever it paints. */
function withGlow(ctx, color, blur, draw) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * deviceScale(ctx);
  draw();
  ctx.restore();
}

/** A soft round bloom of light, added on top of what is there. */
function bloom(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(0.35, withAlpha(color, alpha * 0.35));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** Thin, long cloud streaks lit from below, across the upper sky. */
function drawCloudStreaks(ctx, w, horizon, palette, rng, count = 7) {
  for (let i = 0; i < count; i++) {
    const y = horizon * (0.18 + rng() * 0.6);
    const x = w * (rng() * 0.9 - 0.15);
    const len = w * (0.25 + rng() * 0.45);
    const th = horizon * (0.006 + rng() * 0.012);
    const g = ctx.createLinearGradient(x, 0, x + len, 0);
    const c = rng() < 0.5 ? palette.sky[1] : palette.sky[3];
    g.addColorStop(0, withAlpha(c, 0));
    g.addColorStop(0.3, withAlpha(c, 0.55));
    g.addColorStop(1, withAlpha(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x + len / 2, y, len / 2, th, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A few faint stars in the top part of a sky. */
function drawStars(ctx, w, bottom, rng, count) {
  for (let i = 0; i < count; i++) {
    const s = 0.8 + rng() * 1.8;
    ctx.fillStyle = `rgba(255,255,255,${0.35 + rng() * 0.6})`;
    ctx.fillRect(rng() * w, rng() * bottom, s, s);
  }
}

/** Broken bars of reflected light on water or wet tarmac, narrowing away from the source. */
function drawReflectionColumn(ctx, x, top, bottom, width, color, rng, alpha = 0.8) {
  const n = Math.max(8, Math.round((bottom - top) / Math.max(3, width * 0.09)));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const y = top + (bottom - top) * t * t;
    const bw = width * (0.3 + rng() * 0.8) * (0.6 + t * 0.7);
    const bx = x - bw / 2 + Math.sin(t * 17 + x) * width * 0.2;
    const a = alpha * (1 - t * 0.8) * (0.4 + rng() * 0.6);
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, withAlpha(color, 0));
    g.addColorStop(0.5, withAlpha(color, a));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(bx, y, bw, Math.max(1, ((bottom - top) / n) * (0.18 + t * 0.5)));
  }
  ctx.restore();
}

/** The sports car's body seen side on, nose to the left, as a path in units of its length (y up is negative). */
function traceCarBody(ctx, x0, y0, L) {
  const p = (x, y) => [x0 + x * L, y0 + y * L];
  const arch = (cx) => {
    const r = 0.084;
    const cy = -0.066;
    const a = Math.asin((-0.046 - cy) / r);
    ctx.arc(x0 + cx * L, y0 + cy * L, r * L, a, Math.PI - a, true);
  };
  ctx.beginPath();
  ctx.moveTo(...p(0.03, -0.05));
  ctx.quadraticCurveTo(...p(-0.004, -0.06), ...p(0.004, -0.092));
  ctx.lineTo(...p(0.05, -0.112));
  ctx.quadraticCurveTo(...p(0.2, -0.13), ...p(0.34, -0.148));
  ctx.quadraticCurveTo(...p(0.42, -0.214), ...p(0.5, -0.232));
  ctx.quadraticCurveTo(...p(0.6, -0.244), ...p(0.68, -0.222));
  ctx.quadraticCurveTo(...p(0.82, -0.186), ...p(0.94, -0.164));
  ctx.lineTo(...p(0.99, -0.162));
  ctx.lineTo(...p(0.995, -0.145));
  ctx.quadraticCurveTo(...p(1.005, -0.1), ...p(0.99, -0.06));
  ctx.lineTo(...p(0.95, -0.046));
  ctx.lineTo(...p(0.8 + 0.084 * Math.cos(Math.asin(20 / 84)), -0.046));
  arch(0.8);
  ctx.lineTo(...p(0.2 + 0.084 * Math.cos(Math.asin(20 / 84)), -0.046));
  arch(0.2);
  ctx.lineTo(...p(0.05, -0.046));
  ctx.closePath();
}

/** A low sports car silhouette with a neon rim light along its roof and hood, glowing tail lights and light trails. */
function drawSportsCar(ctx, x0, y0, L, palette, rng) {
  const p = (x, y) => [x0 + x * L, y0 + y * L];
  // Light trails streaming back from the tail lights.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const y = y0 - L * (0.13 - i * 0.012) + rng() * L * 0.006;
    const g = ctx.createLinearGradient(x0 + L, 0, x0 + L * 2.2, 0);
    const c = i % 3 === 1 ? palette.glow : '#ff2448';
    g.addColorStop(0, withAlpha(c, 0.75));
    g.addColorStop(1, withAlpha(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x0 + L * 0.98, y, L * 1.3, Math.max(1.5, L * (0.002 + rng() * 0.003)));
  }
  ctx.restore();
  // The car's own shadow on the road.
  const sh = ctx.createRadialGradient(x0 + L * 0.5, y0, 0, x0 + L * 0.5, y0, L * 0.6);
  sh.addColorStop(0, withAlpha(palette.ink, 0.95));
  sh.addColorStop(1, withAlpha(palette.ink, 0));
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(x0 + L * 0.5, y0, L * 0.62, L * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: deep ink with the sunset sliding along its flank.
  traceCarBody(ctx, x0, y0, L);
  const body = ctx.createLinearGradient(0, y0 - L * 0.25, 0, y0);
  body.addColorStop(0, palette.ink);
  body.addColorStop(0.45, withAlpha(palette.sky[0], 1));
  body.addColorStop(1, palette.ink);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const flank = ctx.createLinearGradient(x0, 0, x0 + L, 0);
  flank.addColorStop(0, withAlpha(palette.sky[2], 0));
  flank.addColorStop(0.55, withAlpha(palette.sky[2], 0.55));
  flank.addColorStop(0.85, withAlpha(palette.sun[0], 0.7));
  flank.addColorStop(1, withAlpha(palette.sky[2], 0.1));
  ctx.fillStyle = flank;
  ctx.fillRect(x0, y0 - L * 0.118, L, L * 0.012);
  ctx.fillStyle = withAlpha(palette.sky[1], 0.35);
  ctx.fillRect(x0, y0 - L * 0.1, L, L * 0.03);
  // Door seam and side intake.
  ctx.strokeStyle = withAlpha(palette.ink, 0.9);
  ctx.lineWidth = L * 0.003;
  ctx.beginPath();
  ctx.moveTo(...p(0.36, -0.15));
  ctx.lineTo(...p(0.38, -0.06));
  ctx.moveTo(...p(0.62, -0.2));
  ctx.quadraticCurveTo(...p(0.66, -0.12), ...p(0.64, -0.06));
  ctx.stroke();
  ctx.restore();
  // Side glass reflecting the sky.
  ctx.beginPath();
  ctx.moveTo(...p(0.4, -0.158));
  ctx.quadraticCurveTo(...p(0.46, -0.21), ...p(0.52, -0.222));
  ctx.quadraticCurveTo(...p(0.6, -0.232), ...p(0.67, -0.214));
  ctx.quadraticCurveTo(...p(0.73, -0.196), ...p(0.78, -0.176));
  ctx.lineTo(...p(0.42, -0.156));
  ctx.closePath();
  const glass = ctx.createLinearGradient(x0 + L * 0.4, y0 - L * 0.23, x0 + L * 0.78, y0 - L * 0.16);
  glass.addColorStop(0, withAlpha(palette.sky[3], 0.85));
  glass.addColorStop(0.5, withAlpha(palette.sky[1], 0.7));
  glass.addColorStop(1, withAlpha(palette.sky[0], 0.9));
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.fillStyle = palette.ink;
  ctx.fillRect(...p(0.595, -0.232), L * 0.014, L * 0.08);
  // Neon rim light along the top of the body, and a warm rim on the tail from the sun behind.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - L * 0.05, y0 - L * 0.4, L * 1.1, L * 0.275);
  ctx.clip();
  traceCarBody(ctx, x0, y0, L);
  withGlow(ctx, palette.neon, L * 0.02, () => {
    ctx.strokeStyle = palette.neon;
    ctx.lineWidth = L * 0.0045;
    ctx.stroke();
  });
  ctx.strokeStyle = withAlpha('#ffffff', 0.8);
  ctx.lineWidth = L * 0.0015;
  ctx.stroke();
  ctx.restore();
  // Wheels: dark tyres, a lit rim and spokes.
  for (const cx of [0.2, 0.8]) {
    const [wx, wy] = p(cx, -0.066);
    const r = L * 0.066;
    ctx.fillStyle = '#05030a';
    ctx.beginPath();
    ctx.arc(wx, wy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(palette.sky[2], 0.75);
    ctx.lineWidth = L * 0.004;
    ctx.beginPath();
    ctx.arc(wx, wy, r * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = L * 0.0025;
    for (let s = 0; s < 5; s++) {
      const a = (s / 5) * Math.PI * 2 + cx;
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(a) * r * 0.15, wy + Math.sin(a) * r * 0.15);
      ctx.lineTo(wx + Math.cos(a) * r * 0.66, wy + Math.sin(a) * r * 0.66);
      ctx.stroke();
    }
    ctx.strokeStyle = withAlpha(palette.neon, 0.9);
    ctx.lineWidth = L * 0.002;
    ctx.beginPath();
    ctx.arc(wx, wy, r * 0.98, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
  }
  // Tail light bar and headlight.
  withGlow(ctx, '#ff2448', L * 0.03, () => {
    ctx.fillStyle = '#ff3b5c';
    ctx.fillRect(...p(0.945, -0.152), L * 0.05, L * 0.012);
  });
  ctx.fillStyle = '#ffd0d8';
  ctx.fillRect(...p(0.955, -0.149), L * 0.03, L * 0.004);
  bloom(ctx, ...p(0.985, -0.146), L * 0.16, '#ff2448', 0.6);
  bloom(ctx, ...p(0.985, -0.146), L * 0.06, palette.glow, 0.6);
  withGlow(ctx, '#ffffff', L * 0.02, () => {
    ctx.fillStyle = '#fff7e6';
    ctx.fillRect(...p(0.012, -0.1), L * 0.03, L * 0.007);
  });
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const beam = ctx.createLinearGradient(x0, 0, x0 - L * 0.5, 0);
  beam.addColorStop(0, 'rgba(255,245,225,0.35)');
  beam.addColorStop(1, 'rgba(255,245,225,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(...p(0.015, -0.1));
  ctx.lineTo(...p(-0.6, -0.16));
  ctx.lineTo(...p(-0.6, -0.02));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSunsetCar(ctx, w, h, palette, rng) {
  const u = Math.min(w, h);
  const horizon = h * 0.6;
  fillSky(ctx, w, horizon, palette);
  drawStars(ctx, w, horizon * 0.3, rng, 30);
  const sunX = w * 0.64;
  drawStripedSun(ctx, sunX, horizon - u * 0.07, u * 0.3, palette);
  drawCloudStreaks(ctx, w, horizon, palette, rng);
  // Far hills and a ragged line of palms along the horizon.
  ctx.fillStyle = withAlpha(palette.sky[0], 0.92);
  ctx.beginPath();
  ctx.moveTo(0, horizon + 1);
  for (let i = 0; i <= 30; i++) ctx.lineTo((w * i) / 30, horizon - u * (0.015 + 0.03 * Math.abs(Math.sin(i * 0.7 + 1))));
  ctx.lineTo(w, horizon + 1);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 9; i++) drawPalm(ctx, w * rng(), horizon + 2, u * (0.07 + rng() * 0.12), (rng() - 0.5) * 0.4, withAlpha(palette.ink, 0.9));
  // Wet tarmac with the sunset mirrored in it.
  const road = ctx.createLinearGradient(0, horizon, 0, h);
  road.addColorStop(0, palette.sky[2]);
  road.addColorStop(0.08, palette.sky[1]);
  road.addColorStop(0.35, palette.sea);
  road.addColorStop(1, palette.ink);
  ctx.fillStyle = road;
  ctx.fillRect(0, horizon, w, h - horizon);
  drawReflectionColumn(ctx, sunX, horizon + 2, h * 0.98, u * 0.32, palette.sun[0], rng, 0.55);
  // Kerb lines: a neon kerb in the distance and lane dashes rushing past in the foreground.
  withGlow(ctx, palette.neon, u * 0.02, () => {
    ctx.fillStyle = palette.neon;
    ctx.fillRect(0, horizon + (h - horizon) * 0.16, w, Math.max(2, u * 0.005));
  });
  ctx.fillStyle = withAlpha(palette.sun[0], 0.65);
  for (let x = -w * 0.05; x < w; x += w * 0.22) ctx.fillRect(x + rng() * w * 0.03, h * 0.955, w * 0.12, h * 0.012);
  // The car, as big as the panel allows, with its reflection on the wet road.
  // In a narrow panel the car runs off the left edge so its lit tail still fills the frame.
  const L = Math.min(Math.max(w * 0.9, Math.min(w * 1.45, h * 0.95)), h * 1.75);
  const x0 = L <= w * 0.92 ? w * 0.47 - L * 0.5 : w * 0.9 - L;
  const y0 = horizon + (h - horizon) * 0.66;
  ctx.save();
  ctx.translate(0, y0 * 2);
  ctx.scale(1, -1);
  ctx.globalAlpha = 0.28;
  traceCarBody(ctx, x0, y0, L);
  ctx.fillStyle = palette.ink;
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const streak = ctx.createLinearGradient(0, y0, 0, h);
  streak.addColorStop(0, 'rgba(255,36,72,0.55)');
  streak.addColorStop(1, 'rgba(255,36,72,0)');
  ctx.fillStyle = streak;
  ctx.fillRect(x0 + L * 0.95, y0, L * 0.05, h - y0);
  ctx.restore();
  drawSportsCar(ctx, x0, y0, L, palette, rng);
}

/** A sleek speedboat, bow to the left, with a racing stripe, a neon underglow, its wake and bow spray. */
function drawSpeedboat(ctx, x0, y0, B, palette, rng) {
  const p = (x, y) => [x0 + x * B, y0 + y * B];
  // Wake: a foaming V spreading back to the right, with flecks of spray.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const g = ctx.createLinearGradient(x0 + B, 0, x0 + B * 2.1, 0);
    g.addColorStop(0, withAlpha('#ffffff', 0.5 - i * 0.12));
    g.addColorStop(1, withAlpha(palette.glow, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(...p(0.92, -0.01));
    ctx.lineTo(...p(2.2, -0.05 - i * 0.03));
    ctx.lineTo(...p(2.2, 0.06 + i * 0.07));
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 160; i++) {
    const t = rng();
    const x = x0 + B * (0.95 + t * 1.1);
    const y = y0 + B * ((rng() - 0.5) * 0.06 * (0.3 + t * 2));
    ctx.fillStyle = withAlpha(rng() < 0.7 ? '#ffffff' : palette.glow, 0.25 + rng() * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, B * (0.002 + rng() * 0.004), 0, Math.PI * 2);
    ctx.fill();
  }
  // Neon underglow on the water.
  bloom(ctx, ...p(0.5, 0.0), B * 0.55, palette.neon, 0.5);
  ctx.restore();
  // Hull.
  const hull = () => {
    ctx.beginPath();
    ctx.moveTo(...p(0, -0.115));
    ctx.quadraticCurveTo(...p(0.3, -0.13), ...p(1, -0.112));
    ctx.lineTo(...p(0.99, -0.03));
    ctx.lineTo(...p(0.35, -0.004));
    ctx.quadraticCurveTo(...p(0.1, -0.01), ...p(0, -0.115));
    ctx.closePath();
  };
  hull();
  const hg = ctx.createLinearGradient(0, y0 - B * 0.12, 0, y0);
  hg.addColorStop(0, palette.sun[0]);
  hg.addColorStop(0.5, palette.sky[3]);
  hg.addColorStop(1, palette.sky[1]);
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = palette.slab;
  ctx.beginPath();
  ctx.moveTo(...p(0.05, -0.085));
  ctx.lineTo(...p(1, -0.08));
  ctx.lineTo(...p(1, -0.062));
  ctx.lineTo(...p(0.08, -0.07));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = palette.ink;
  ctx.fillRect(...p(0, -0.058), B, B * 0.006);
  ctx.fillStyle = withAlpha(palette.ink, 0.55);
  ctx.fillRect(...p(0, -0.035), B, B * 0.04);
  ctx.restore();
  hull();
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = B * 0.004;
  ctx.stroke();
  // Deck: windscreen, cockpit and engine cowl.
  ctx.fillStyle = palette.ink;
  ctx.beginPath();
  ctx.moveTo(...p(0.38, -0.124));
  ctx.lineTo(...p(0.48, -0.19));
  ctx.lineTo(...p(0.56, -0.19));
  ctx.lineTo(...p(0.6, -0.122));
  ctx.closePath();
  ctx.fill();
  withGlow(ctx, palette.neon, B * 0.015, () => {
    ctx.strokeStyle = palette.neon;
    ctx.lineWidth = B * 0.003;
    ctx.beginPath();
    ctx.moveTo(...p(0.38, -0.124));
    ctx.lineTo(...p(0.48, -0.19));
    ctx.lineTo(...p(0.56, -0.19));
    ctx.stroke();
  });
  ctx.fillStyle = palette.ink;
  ctx.fillRect(...p(0.62, -0.15), B * 0.22, B * 0.03);
  ctx.fillRect(...p(0.93, -0.17), B * 0.06, B * 0.06);
  ctx.fillStyle = withAlpha(palette.sun[0], 0.8);
  ctx.fillRect(...p(0.63, -0.15), B * 0.2, B * 0.004);
  // Bow spray.
  for (let i = 0; i < 70; i++) {
    const a = Math.PI * (0.9 + rng() * 0.5);
    const r = B * (0.02 + rng() * 0.12);
    ctx.fillStyle = withAlpha('#ffffff', 0.3 + rng() * 0.5);
    ctx.beginPath();
    ctx.arc(x0 + B * 0.08 + Math.cos(a) * r, y0 - B * 0.01 + Math.sin(a) * r * 0.6, B * (0.002 + rng() * 0.004), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMarina(ctx, w, h, palette, rng) {
  const u = Math.min(w, h);
  const horizon = h * 0.5;
  fillSky(ctx, w, horizon, palette);
  drawStars(ctx, w, horizon * 0.35, rng, 40);
  const sunX = w * 0.3;
  drawStripedSun(ctx, sunX, horizon - u * 0.02, u * 0.22, palette);
  drawCloudStreaks(ctx, w, horizon, palette, rng, 5);
  // Far shore: towers with lit windows and neon crowns, whose lights are reflected in the water.
  const lights = [];
  let x = w * 0.42;
  while (x < w) {
    const bw = u * (0.05 + rng() * 0.07);
    const bh = u * (0.1 + rng() * 0.3);
    const top = horizon - bh;
    ctx.fillStyle = withAlpha(palette.ink, 0.92);
    ctx.fillRect(x, top, bw, bh + 1);
    const cell = Math.max(2, u * 0.008);
    for (let wy = top + cell * 1.5; wy < horizon - cell; wy += cell * 2.2) {
      for (let wx = x + cell; wx < x + bw - cell; wx += cell * 1.8) {
        if (rng() < 0.4) {
          ctx.fillStyle = withAlpha(rng() < 0.75 ? palette.sun[0] : palette.neon, 0.8);
          ctx.fillRect(wx, wy, cell * 0.8, cell);
        }
      }
    }
    if (rng() < 0.6) {
      const c = rng() < 0.5 ? palette.neon : palette.glow;
      withGlow(ctx, c, u * 0.025, () => {
        ctx.fillStyle = c;
        ctx.fillRect(x + bw * 0.1, top + u * 0.006, bw * 0.8, Math.max(2, u * 0.006));
      });
      lights.push({ x: x + bw / 2, w: bw * 0.8, c });
    }
    x += bw + u * 0.008;
  }
  // A few low hills of trees on the far left shore.
  for (let i = 0; i < 6; i++) drawPalm(ctx, w * (0.02 + rng() * 0.35), horizon + 1, u * (0.06 + rng() * 0.08), (rng() - 0.5) * 0.4, withAlpha(palette.ink, 0.9));
  // Water: the sky's colour near the horizon, deep ink close by, ripples, the sun's path and the neon reflections.
  const sea = ctx.createLinearGradient(0, horizon, 0, h);
  sea.addColorStop(0, palette.sky[2]);
  sea.addColorStop(0.18, palette.sea);
  sea.addColorStop(1, palette.ink);
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, h - horizon);
  drawReflectionColumn(ctx, sunX, horizon + 1, h * 0.92, u * 0.26, palette.sun[0], rng, 0.7);
  for (const l of lights) drawReflectionColumn(ctx, l.x, horizon + 1, h * 0.95, l.w * 1.4, l.c, rng, 0.85);
  ctx.fillStyle = withAlpha(palette.ink, 0.35);
  for (let i = 0; i < 40; i++) {
    const t = rng();
    ctx.fillRect(rng() * w, horizon + (h - horizon) * t * t, w * (0.1 + rng() * 0.3), Math.max(1, u * 0.003 * (1 + t * 2)));
  }
  // Moored yachts in the middle distance.
  const yachtY = horizon + (h - horizon) * 0.22;
  for (let i = 0; i < 4; i++) {
    const yx = w * (0.05 + i * 0.12 + rng() * 0.04);
    const yl = u * (0.12 + rng() * 0.05);
    ctx.fillStyle = withAlpha(palette.sky[3], 0.9);
    ctx.beginPath();
    ctx.moveTo(yx, yachtY - yl * 0.12);
    ctx.lineTo(yx + yl, yachtY - yl * 0.12);
    ctx.lineTo(yx + yl * 0.9, yachtY);
    ctx.lineTo(yx + yl * 0.08, yachtY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = withAlpha(palette.ink, 0.85);
    ctx.fillRect(yx + yl * 0.3, yachtY - yl * 0.22, yl * 0.4, yl * 0.1);
    ctx.strokeStyle = withAlpha(palette.ink, 0.8);
    ctx.lineWidth = Math.max(1, u * 0.002);
    ctx.beginPath();
    ctx.moveTo(yx + yl * 0.5, yachtY - yl * 0.22);
    ctx.lineTo(yx + yl * 0.5, yachtY - yl * 0.9);
    ctx.lineTo(yx + yl * 0.95, yachtY - yl * 0.14);
    ctx.stroke();
    ctx.fillStyle = withAlpha(palette.glow, 0.9);
    ctx.fillRect(yx + yl * 0.35, yachtY - yl * 0.07, yl * 0.5, Math.max(1, u * 0.003));
  }
  // Dock pilings in the near left corner, lit by the neon.
  for (let i = 0; i < 4; i++) {
    const px = w * (0.02 + i * 0.07);
    const top = h * (0.6 + i * 0.05);
    const pw = u * (0.03 - i * 0.004);
    ctx.fillStyle = palette.ink;
    ctx.fillRect(px, top, pw, h - top);
    ctx.fillStyle = withAlpha(palette.neon, 0.8);
    ctx.fillRect(px + pw * 0.75, top, pw * 0.2, h - top);
  }
  const B = Math.min(w * 0.62, h * 1.25);
  drawSpeedboat(ctx, w * 0.62 - B * 0.62, horizon + (h - horizon) * 0.72, B, palette, rng);
}

/** A sign's neon tube: a wide coloured glow, the coloured tube, and a hot white core. */
function neonStroke(ctx, color, width) {
  withGlow(ctx, color, width * 6, () => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  });
  ctx.strokeStyle = withAlpha('#ffffff', 0.75);
  ctx.lineWidth = width * 0.35;
  ctx.stroke();
}

/** Neon lettering: the letters filled in the tube colour with a glow, and a white-hot centre line. */
function neonText(ctx, text, x, y, color, size) {
  withGlow(ctx, color, size * 0.4, () => {
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.fillText(text, x, y);
  });
  ctx.strokeStyle = withAlpha('#ffffff', 0.7);
  ctx.lineWidth = Math.max(1, size * 0.025);
  ctx.strokeText(text, x, y);
}

function drawNeonMotel(ctx, w, h, palette, rng) {
  const u = Math.min(w, h);
  const ground = h * 0.84;
  const sky = ctx.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, palette.ink);
  sky.addColorStop(0.45, palette.sky[0]);
  sky.addColorStop(0.85, palette.sky[1]);
  sky.addColorStop(1, palette.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, ground + 1);
  drawStars(ctx, w, ground * 0.6, rng, 90);
  // A thin crescent moon.
  const mx = w * 0.82;
  const my = h * 0.14;
  const mr = u * 0.06;
  withGlow(ctx, palette.sun[0], u * 0.04, () => {
    ctx.fillStyle = palette.sun[0];
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = palette.ink;
  ctx.beginPath();
  ctx.arc(mx + mr * 0.42, my - mr * 0.18, mr * 0.92, 0, Math.PI * 2);
  ctx.fill();
  // Palms behind the motel.
  for (let i = 0; i < 6; i++) drawPalm(ctx, w * (0.1 + rng() * 0.9), ground - h * 0.12, h * (0.28 + rng() * 0.25), (rng() - 0.5) * 0.35, withAlpha('#000000', 0.55));
  // The motel: a long low block with a neon roof line and a row of lit doors.
  const top = ground - h * 0.17;
  ctx.fillStyle = withAlpha(palette.ink, 0.97);
  ctx.fillRect(-2, top, w + 4, ground - top + 1);
  ctx.fillStyle = withAlpha(palette.sky[0], 0.9);
  ctx.fillRect(-2, top - h * 0.02, w + 4, h * 0.02);
  withGlow(ctx, palette.neon, u * 0.03, () => {
    ctx.fillStyle = palette.neon;
    ctx.fillRect(-2, top - h * 0.004, w + 4, Math.max(2, u * 0.006));
  });
  const doors = Math.max(4, Math.round(w / (u * 0.17)));
  for (let i = 0; i < doors; i++) {
    const dx = (w / doors) * (i + 0.2);
    const dw = (w / doors) * 0.22;
    const lit = rng() < 0.7;
    ctx.fillStyle = lit ? withAlpha(palette.sun[0], 0.85) : withAlpha(palette.sky[0], 0.9);
    ctx.fillRect(dx, top + h * 0.05, dw, ground - top - h * 0.05);
    ctx.fillStyle = lit ? withAlpha(palette.sun[1], 0.75) : withAlpha(palette.sky[1], 0.5);
    const winX = dx + dw * 1.35;
    ctx.fillRect(winX, top + h * 0.055, dw * 1.5, h * 0.06);
    ctx.fillStyle = withAlpha(palette.ink, 0.6);
    for (let s = 0; s < 5; s++) ctx.fillRect(winX, top + h * 0.06 + s * h * 0.012, dw * 1.5, h * 0.003);
    if (lit) bloom(ctx, dx + dw / 2, top + h * 0.05, u * 0.06, palette.sun[0], 0.25);
  }
  // Wet parking lot.
  const lot = ctx.createLinearGradient(0, ground, 0, h);
  lot.addColorStop(0, palette.sea);
  lot.addColorStop(1, palette.ink);
  ctx.fillStyle = lot;
  ctx.fillRect(0, ground, w, h - ground);
  // The roadside sign: a pole, a tall board outlined in neon with MOTEL stacked down it, a script name on a swoosh,
  // a VACANCY box, and an arrow of chasing bulbs pointing at the rooms.
  const sh = h * 0.6;
  const sw = sh * 0.3;
  const sx = w * (w > h * 1.1 ? 0.3 : 0.38) - sw / 2;
  const sy = h * 0.14;
  ctx.fillStyle = palette.ink;
  ctx.fillRect(sx + sw * 0.42, sy + sh * 0.9, sw * 0.16, ground - sy - sh * 0.9);
  const board = () => {
    ctx.beginPath();
    ctx.moveTo(sx, sy + sw * 0.4);
    ctx.quadraticCurveTo(sx, sy, sx + sw * 0.4, sy);
    ctx.lineTo(sx + sw, sy);
    ctx.lineTo(sx + sw, sy + sh * 0.92);
    ctx.lineTo(sx, sy + sh * 0.92);
    ctx.closePath();
  };
  board();
  ctx.fillStyle = withAlpha(palette.ink, 0.96);
  ctx.fill();
  neonStroke(ctx, palette.neon, Math.max(1.5, u * 0.006));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const letterSize = sh * 0.12;
  ctx.font = `${letterSize}px "${TITLE_FONT}"`;
  [...'MOTEL'].forEach((ch, i) => neonText(ctx, ch, sx + sw / 2, sy + sh * (0.16 + i * 0.145), palette.glow, letterSize));
  // The script name on a swoosh board crossing the top of the sign.
  ctx.save();
  ctx.translate(sx + sw * 0.9, sy + sh * 0.05);
  ctx.rotate(-0.12);
  const nw = sw * 2.4;
  const nh = sh * 0.14;
  ctx.beginPath();
  ctx.moveTo(-nw * 0.1, -nh / 2);
  ctx.lineTo(nw * 0.92, -nh / 2);
  ctx.lineTo(nw, 0);
  ctx.lineTo(nw * 0.92, nh / 2);
  ctx.lineTo(-nw * 0.1, nh / 2);
  ctx.closePath();
  ctx.fillStyle = withAlpha(palette.ink, 0.96);
  ctx.fill();
  neonStroke(ctx, palette.sun[1], Math.max(1.5, u * 0.005));
  const scriptSize = nh * 0.95;
  ctx.font = `${scriptSize}px "${SCRIPT_FONT}"`;
  neonText(ctx, 'Palm Court', nw * 0.42, nh * 0.08, palette.neon, scriptSize);
  ctx.restore();
  // VACANCY box.
  const vy = sy + sh * 0.97;
  const vw = sw * 1.5;
  const vh = sh * 0.09;
  ctx.fillStyle = withAlpha(palette.ink, 0.96);
  ctx.fillRect(sx + sw / 2 - vw / 2, vy, vw, vh);
  ctx.beginPath();
  ctx.rect(sx + sw / 2 - vw / 2, vy, vw, vh);
  neonStroke(ctx, palette.frame ?? palette.sun[0], Math.max(1, u * 0.004));
  ctx.font = `${vh * 0.62}px "${TITLE_FONT}"`;
  ctx.letterSpacing = `${vh * 0.08}px`;
  ctx.fillStyle = withAlpha(palette.sky[1], 0.45);
  ctx.fillText('NO', sx + sw / 2 - vw * 0.32, vy + vh * 0.54);
  neonText(ctx, 'VACANCY', sx + sw / 2 + vw * 0.1, vy + vh * 0.54, '#7dff9a', vh * 0.62);
  ctx.letterSpacing = '0px';
  // The arrow of bulbs.
  const ax = sx + sw;
  const ay = sy + sh * 0.45;
  const pts = [[ax, ay], [ax + sw * 1.6, ay + sh * 0.05], [ax + sw * 1.55, ay - sh * 0.02], [ax + sw * 2.1, ay + sh * 0.12], [ax + sw * 1.45, ay + sh * 0.2], [ax + sw * 1.5, ay + sh * 0.13], [ax, ay + sh * 0.09]];
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.fillStyle = withAlpha(palette.ink, 0.92);
  ctx.fill();
  neonStroke(ctx, palette.glow, Math.max(1.5, u * 0.005));
  for (let i = 0; i < pts.length; i++) {
    const [ax0, ay0] = pts[i];
    const [ax1, ay1] = pts[(i + 1) % pts.length];
    const n = Math.max(2, Math.round(Math.hypot(ax1 - ax0, ay1 - ay0) / (u * 0.03)));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const on = (i + k) % 3 !== 0;
      const bx = ax0 + (ax1 - ax0) * t;
      const by = ay0 + (ay1 - ay0) * t;
      ctx.fillStyle = on ? '#fff6d0' : withAlpha(palette.sky[1], 0.6);
      ctx.beginPath();
      ctx.arc(bx, by, Math.max(1, u * 0.006), 0, Math.PI * 2);
      ctx.fill();
      if (on) bloom(ctx, bx, by, u * 0.02, palette.sun[0], 0.45);
    }
  }
  // Neon smeared across the wet lot.
  drawReflectionColumn(ctx, sx + sw / 2, ground + 2, h, sw * 0.9, palette.glow, rng, 0.7);
  drawReflectionColumn(ctx, sx + sw * 1.6, ground + 2, h, sw * 1.2, palette.neon, rng, 0.45);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
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
